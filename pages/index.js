import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';

// ── Room layout (from user sketch) ─────────────────────────────
// Main Hall: 40W × 28D × 11H  (x=-20..20, z=-19..9)
// Corridor:   8W × 13D × 11H  (x=-4..4,  z=9..22)
// Entrance wall at z=9 (south hall wall) with arch center gap x=-4..4
// Plaque on south face of RIGHT section (x=12, z=9) — visible from corridor
// Inner dividers at x=±10, run z=-17..8

const SLOTS = [
  // LEFT WALL (x=-19.88, faces +X → rotY:+π/2)
  {id:0,  pos:[-19.88,4.5,-15.0], rotY: Math.PI/2},
  {id:1,  pos:[-19.88,4.5, -9.0], rotY: Math.PI/2},
  {id:2,  pos:[-19.88,4.5, -3.0], rotY: Math.PI/2},
  {id:3,  pos:[-19.88,4.5,  3.5], rotY: Math.PI/2},
  {id:4,  pos:[-19.88,4.5,  7.5], rotY: Math.PI/2},
  // RIGHT WALL (x=+19.88, faces -X → rotY:-π/2)
  {id:5,  pos:[ 19.88,4.5,-15.0], rotY:-Math.PI/2},
  {id:6,  pos:[ 19.88,4.5, -9.0], rotY:-Math.PI/2},
  {id:7,  pos:[ 19.88,4.5, -3.0], rotY:-Math.PI/2},
  {id:8,  pos:[ 19.88,4.5,  3.5], rotY:-Math.PI/2},
  {id:9,  pos:[ 19.88,4.5,  7.5], rotY:-Math.PI/2},
  // NORTH WALL (z=-18.88, faces +Z → rotY:0)
  {id:10, pos:[-12.0, 4.5,-18.88], rotY:0},
  {id:11, pos:[ -6.0, 4.5,-18.88], rotY:0},
  {id:12, pos:[  0.0, 4.5,-18.88], rotY:0},
  {id:13, pos:[  6.0, 4.5,-18.88], rotY:0},
  {id:14, pos:[ 12.0, 4.5,-18.88], rotY:0},
  // INNER LEFT DIVIDER (x=-9.88, east face → rotY:+π/2)
  {id:15, pos:[-9.88, 4.5,-10.5], rotY: Math.PI/2},
  {id:16, pos:[-9.88, 4.5, -2.5], rotY: Math.PI/2},
  {id:17, pos:[-9.88, 4.5,  5.5], rotY: Math.PI/2},
  // INNER RIGHT DIVIDER (x=+9.88, west face → rotY:-π/2)
  {id:18, pos:[ 9.88, 4.5,-10.5], rotY:-Math.PI/2},
  {id:19, pos:[ 9.88, 4.5, -2.5], rotY:-Math.PI/2},
  {id:20, pos:[ 9.88, 4.5,  5.5], rotY:-Math.PI/2},
  // CORRIDOR walls
  {id:21, pos:[-3.88, 4.5, 15.5], rotY: Math.PI/2},
  {id:22, pos:[ 3.88, 4.5, 15.5], rotY:-Math.PI/2},
];

// Vibrant frame colors
const FRAME_COLORS = [
  0x2980b9,0xe74c3c,0x27ae60,0xf39c12,0x8e44ad,
  0x1abc9c,0xe67e22,0x16a085,0x2c3e50,0xc0392b,
  0x8B6010,0xB8762A,0xC8A820,0x555555,0x7A3020,
  0x1a1a1a,0x4A2C10,0xd35400,0xff5722,0x673ab7,
  0x006064,0xf57f17,0x4e342e,
];

const AVATAR_COLORS=[0x3b82f6,0xef4444,0x10b981,0xf59e0b,0x8b5cf6,0xec4899,0x06b6d4,0x84cc16,0xf97316,0x6366f1];

function getVid(){
  if(typeof window==='undefined')return '';
  let id=sessionStorage.getItem('g_vid');
  if(!id){id=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem('g_vid',id);}
  return id;
}

// ── Canvas texture builders ─────────────────────────────────────
function mkWallCanvas(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=256;
  const c=cv.getContext('2d');
  c.fillStyle='#e2dcd4';c.fillRect(0,0,256,256);
  for(let i=0;i<2000;i++){
    c.fillStyle=Math.random()>.5?`rgba(240,235,228,${Math.random()*.022})`:`rgba(100,90,78,${Math.random()*.018})`;
    c.beginPath();c.arc(Math.random()*256,Math.random()*256,Math.random()*1.4+.2,0,Math.PI*2);c.fill();
  }
  return cv;
}
function mkFloorCanvas(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=256;
  const c=cv.getContext('2d');
  c.fillStyle='#6a6254';c.fillRect(0,0,256,256);
  for(let i=0;i<1500;i++){
    c.fillStyle=Math.random()>.5?`rgba(120,110,95,${Math.random()*.05})`:`rgba(30,24,18,${Math.random()*.04})`;
    c.beginPath();c.arc(Math.random()*256,Math.random()*256,Math.random()*2+.3,0,Math.PI*2);c.fill();
  }
  c.strokeStyle='rgba(30,24,18,0.25)';c.lineWidth=2;
  [0,128,256].forEach(v=>{c.beginPath();c.moveTo(v,0);c.lineTo(v,256);c.stroke();c.beginPath();c.moveTo(0,v);c.lineTo(256,v);c.stroke();});
  return cv;
}
function mkCarpetCanvas(){
  const cv=document.createElement('canvas');cv.width=128;cv.height=256;
  const c=cv.getContext('2d');
  c.fillStyle='#8b0000';c.fillRect(0,0,128,256);
  for(let i=0;i<1200;i++){
    c.fillStyle=Math.random()>.5?`rgba(170,20,20,${Math.random()*.1})`:`rgba(20,0,0,${Math.random()*.12})`;
    c.fillRect(Math.random()*128,Math.random()*256,Math.random()*2.5+.5,Math.random()*.6+.2);
  }
  c.fillStyle='rgba(210,170,40,0.72)';c.fillRect(5,0,3,256);c.fillRect(120,0,3,256);
  c.fillStyle='rgba(210,170,40,0.35)';c.fillRect(12,0,2,256);c.fillRect(114,0,2,256);
  return cv;
}
function mkPlaqueCanvas(){
  const W=1024,H=640;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d');
  c.fillStyle='#0c0b09';c.fillRect(0,0,W,H);
  for(let i=0;i<70;i++){
    c.strokeStyle=`rgba(${160+Math.random()*50},${148+Math.random()*40},${118+Math.random()*36},${Math.random()*.04+.008})`;
    c.lineWidth=Math.random()*2.5+.4;c.beginPath();
    const sx=Math.random()*W,sy=Math.random()*H;c.moveTo(sx,sy);
    c.bezierCurveTo(sx+(Math.random()*280-140),sy+(Math.random()*180-90),sx+(Math.random()*280-140),sy+(Math.random()*180-90),sx+(Math.random()*380-190),sy+(Math.random()*280-140));
    c.stroke();
  }
  c.strokeStyle='#c8a820';c.lineWidth=5.5;c.strokeRect(14,14,W-28,H-28);
  c.strokeStyle='#e8c840';c.lineWidth=1.5;c.strokeRect(24,24,W-48,H-48);
  c.strokeStyle='rgba(200,168,32,0.4)';c.lineWidth=.8;c.strokeRect(34,34,W-68,H-68);
  const t=(txt,y,sz,col,fnt='Georgia,serif',bold='')=>{c.fillStyle=col;c.font=`${bold}${sz}px ${fnt}`;c.textAlign='center';c.fillText(txt,W/2,y);};
  t('معرض الفوتوغرافيا الافتراضي',H*.16,W*.056,'#d4b040','Georgia,serif','bold ');
  t('VIRTUAL PHOTOGRAPHY EXHIBITION',H*.235,W*.038,'#e8c850');
  c.strokeStyle='#c8a820';c.lineWidth=1.2;c.beginPath();c.moveTo(W*.12,H*.295);c.lineTo(W*.88,H*.295);c.stroke();
  t('إعداد وإخراج',H*.375,W*.028,'#b0a898','Segoe UI,Tahoma,sans-serif');
  t('أنور محمد  ·  AnwarBMA',H*.455,W*.038,'#e0d0a0','Georgia,serif','bold ');
  c.strokeStyle='rgba(200,168,32,0.3)';c.lineWidth=.8;c.beginPath();c.moveTo(W*.18,H*.52);c.lineTo(W*.82,H*.52);c.stroke();
  t('بإشراف رئيس قسم التصوير الضوئي',H*.595,W*.026,'#b0a898','Segoe UI,Tahoma,sans-serif');
  t('عدنان الخمري',H*.662,W*.034,'#d8d0b8','Georgia,serif','bold ');
  c.strokeStyle='rgba(200,168,32,0.25)';c.lineWidth=.8;c.beginPath();c.moveTo(W*.24,H*.72);c.lineTo(W*.76,H*.72);c.stroke();
  t('بإدارة مدير جمعية الثقافة والفنون بالطائف',H*.792,W*.025,'#b0a898','Segoe UI,Tahoma,sans-serif');
  t('فيصل الخديدي',H*.856,W*.034,'#d8d0b8','Georgia,serif','bold ');
  t('✦  جمعية الثقافة والفنون — الطائف  ✦',H*.962,W*.022,'rgba(200,168,32,0.58)','Segoe UI,Tahoma,sans-serif');
  return cv;
}
function mkPlaceholder(id,col){
  const cv=document.createElement('canvas');cv.width=480;cv.height=360;
  const c=cv.getContext('2d');
  c.fillStyle='#ddd6cc';c.fillRect(0,0,480,360);
  c.strokeStyle='rgba(140,128,110,.28)';c.lineWidth=1.5;c.setLineDash([10,8]);c.strokeRect(18,18,444,324);
  c.fillStyle='#'+col.toString(16).padStart(6,'0')+'30';c.beginPath();c.arc(240,168,64,0,Math.PI*2);c.fill();
  c.fillStyle='rgba(80,65,50,.38)';c.font='bold 60px Georgia,serif';c.textAlign='center';c.fillText(id.toString(),240,186);
  c.fillStyle='rgba(130,115,98,.42)';c.font='italic 18px Georgia,serif';c.fillText('موقع رقم '+id,240,236);
  return cv;
}

// ── Avatar creator ──────────────────────────────────────────────
function createAvatar(T, name, idx){
  const col = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const hex = '#'+col.toString(16).padStart(6,'0');
  const g = new T.Group();
  const bM = new T.MeshBasicMaterial({color:col});
  const hM = new T.MeshBasicMaterial({color:0xffe8c8});
  const haM= new T.MeshBasicMaterial({color:0x1e1008});
  const lM = new T.MeshBasicMaterial({color:0x18182a});

  // Torso
  const body=new T.Mesh(new T.CylinderGeometry(.21,.25,.9,12),bM);body.position.y=.65;g.add(body);
  // Shoulder sphere
  const sh=new T.Mesh(new T.SphereGeometry(.23,10,7),bM);sh.position.y=1.1;g.add(sh);
  // Head
  const hd=new T.Mesh(new T.SphereGeometry(.2,12,9),hM);hd.position.y=1.56;g.add(hd);
  // Hair
  const ha=new T.Mesh(new T.SphereGeometry(.21,12,8,0,Math.PI*2,0,Math.PI*.52),haM);ha.position.y=1.57;g.add(ha);
  // Legs
  [-.1,.1].forEach(lx=>{
    const leg=new T.Mesh(new T.CylinderGeometry(.085,.085,.52,10),lM);leg.position.set(lx,.26,0);g.add(leg);
    const shoe=new T.Mesh(new T.BoxGeometry(.13,.055,.24),lM);shoe.position.set(lx,.01,.05);g.add(shoe);
  });
  // Name label — billboard
  const cv=document.createElement('canvas');cv.width=300;cv.height=84;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,0.84)';ctx.beginPath();ctx.roundRect(0,0,300,84,42);ctx.fill();
  ctx.fillStyle=hex;ctx.beginPath();ctx.arc(40,42,14,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.font='bold 28px Segoe UI,Tahoma,sans-serif';ctx.textAlign='center';
  ctx.fillText(name.slice(0,14),164,53);
  const tex=new T.CanvasTexture(cv);
  const label=new T.Mesh(new T.PlaneGeometry(1.15,.3),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide}));
  label.position.y=2.18;label.userData.isBillboard=true;
  g.add(label);
  return g;
}

// ── Component ───────────────────────────────────────────────────
export default function Gallery(){
  const mountRef  = useRef(null);
  const stateRef  = useRef({yaw:0,pitch:0,keys:{},isLocked:false,pos:{x:0,z:21},joystick:{active:false,dx:0,dy:0},lookTouch:{active:false,id:null,lastX:0,lastY:0}});
  // visitorsRef: { visitorId: { name, x, z, yaw, colorIdx } }
  // lerpTargets: { visitorId: { x, z, yaw } }  — smooth targets for render loop
  const visitorsRef  = useRef({});
  const lerpTargets  = useRef({});
  const jZoneRef  = useRef(null);
  const jKnobRef  = useRef(null);

  const [photos,setPhotos]         = useState([]);
  const [entered,setEntered]       = useState(false);
  const [nameInput,setNameInput]   = useState('');
  const [visitorName,setVisitorName]= useState('');
  const [loading,setLoading]       = useState(false);
  const [locked,setLocked]         = useState(false);
  const [isMobile,setIsMobile]     = useState(false);
  const [photoInfo,setPhotoInfo]   = useState(null);
  const [fullscreen,setFullscreen] = useState(null);
  const [visitorsUI,setVisitorsUI] = useState([]);
  const [visitCount,setVisitCount] = useState(0);

  useEffect(()=>{
    setIsMobile('ontouchstart' in window||navigator.maxTouchPoints>0);
    fetch('/api/photos').then(r=>r.json()).then(d=>setPhotos(Array.isArray(d)?d:[])).catch(()=>{});
    fetch('/api/visits').then(r=>r.json()).then(d=>setVisitCount(d?.count||0)).catch(()=>{});
  },[]);

  // ── Visitor presence: REST polling (reliable) + Lerp smoothing ─
  useEffect(()=>{
    if(!entered||!visitorName) return;

    // Log visit
    fetch('/api/visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor_name:visitorName})}).catch(()=>{});
    fetch('/api/visits').then(r=>r.json()).then(d=>setVisitCount(d?.count||0)).catch(()=>{});

    const myId   = getVid();
    const colors = {}; // stable colorIdx per visitor
    let nextColor = 0;
    let lastSend  = 0;
    let alive     = true;

    // Send MY position (throttled to 100ms min gap)
    const sendPos = async () => {
      const now = Date.now();
      if(now - lastSend < 100) return;
      lastSend = now;
      const s = stateRef.current;
      try {
        await fetch('/api/visitors',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({visitor_id:myId, name:visitorName,
            x:+s.pos.x.toFixed(3), z:+s.pos.z.toFixed(3), yaw:+s.yaw.toFixed(4)}),
        });
      } catch(e){}
    };

    // Fetch OTHER visitors (poll every 1s — lerp makes it look smooth)
    const getOthers = async () => {
      try {
        const r = await fetch('/api/visitors');
        if(!r.ok || !alive) return;
        const data  = await r.json();
        const others = (Array.isArray(data)?data:[]).filter(v=>v.visitor_id!==myId);

        // Stable color assignment
        const activeIds = new Set(others.map(v=>v.visitor_id));
        others.forEach(v=>{ if(colors[v.visitor_id]===undefined) colors[v.visitor_id]=nextColor++; });
        Object.keys(colors).forEach(k=>{ if(!activeIds.has(k)) delete colors[k]; });

        // Update LERP targets
        others.forEach(v=>{
          const k = v.visitor_id;
          if(!lerpTargets.current[k]){
            // New visitor: start them at exact position (no lerp glide from origin)
            lerpTargets.current[k] = { x:v.x||0, z:v.z||21, yaw:v.yaw||0 };
          } else {
            lerpTargets.current[k].x   = v.x   || 0;
            lerpTargets.current[k].z   = v.z   || 21;
            lerpTargets.current[k].yaw = v.yaw || 0;
          }
        });
        // Remove departed visitors
        Object.keys(lerpTargets.current).forEach(k=>{ if(!activeIds.has(k)) delete lerpTargets.current[k]; });

        // visitorsRef: id → {name, colorIdx} — render loop reads this
        visitorsRef.current = Object.fromEntries(
          others.map(v=>[v.visitor_id,{name:v.name||'زائر', colorIdx:colors[v.visitor_id]||0}])
        );
        setVisitorsUI(others.map(v=>({visitor_id:v.visitor_id, name:v.name||'زائر'})));
      } catch(e){}
    };

    sendPos(); getOthers();
    const t1 = setInterval(sendPos,   100);  // send every 100ms
    const t2 = setInterval(getOthers, 1000); // poll every 1s

    return()=>{
      alive = false;
      clearInterval(t1); clearInterval(t2);
      fetch('/api/visitors',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor_id:myId})}).catch(()=>{});
      visitorsRef.current = {}; lerpTargets.current = {};
    };
  },[entered,visitorName]);

  // ── Main 3D scene ─────────────────────────────────────────────
  useEffect(()=>{
    if(!entered||!visitorName)return;
    setLoading(true);
    const s=stateRef.current;
    let animId, renderer;
    const avatarMeshes={}; // visitorId → THREE.Group

    (async()=>{
      const T=await import('three');

      // Scene
      const scene=new T.Scene();
      scene.background=new T.Color(0xb8b0a8);
      scene.fog=new T.Fog(0xb8b0a8,28,62);

      const camera=new T.PerspectiveCamera(68,innerWidth/innerHeight,.05,80);
      camera.position.set(0,1.72,21);
      s.pos={x:0,z:21};

      renderer=new T.WebGLRenderer({antialias:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      renderer.setSize(innerWidth,innerHeight);
      renderer.shadowMap.enabled=false; // disabled to avoid MAX_TEXTURE_UNITS overflow
      renderer.toneMapping=T.LinearToneMapping;
      renderer.toneMappingExposure=1;
      mountRef.current?.appendChild(renderer.domElement);

      // ── Shared textures (only 3 total) ─────────────────────
      const wallTex=new T.CanvasTexture(mkWallCanvas());
      wallTex.wrapS=wallTex.wrapT=T.RepeatWrapping;wallTex.repeat.set(5,2);
      const floorTex=new T.CanvasTexture(mkFloorCanvas());
      floorTex.wrapS=floorTex.wrapT=T.RepeatWrapping;floorTex.repeat.set(8,14);
      const carpetTex=new T.CanvasTexture(mkCarpetCanvas());
      carpetTex.wrapS=carpetTex.wrapT=T.RepeatWrapping;carpetTex.repeat.set(1,4);

      // ── Materials — MeshBasicMaterial only (no texture units for lighting) ──
      const M={
        wall:   new T.MeshBasicMaterial({map:wallTex}),       // 1 texture unit
        floor:  new T.MeshBasicMaterial({map:floorTex}),      // 1 texture unit
        carpet: new T.MeshBasicMaterial({map:carpetTex}),     // 1 texture unit
        // Total texture units: 3 (well within limit of 16)
        ceil:   new T.MeshBasicMaterial({color:0xf4f0ec}),
        mold:   new T.MeshBasicMaterial({color:0xc8c0b2}),
        pillar: new T.MeshBasicMaterial({color:0xddd8d0}),
        gold:   new T.MeshBasicMaterial({color:0xc8a820}),
        dark:   new T.MeshBasicMaterial({color:0x181410}),
        brass:  new T.MeshBasicMaterial({color:0xb89028}),
        glow:   new T.MeshBasicMaterial({color:0xfffce0}),
        seat:   new T.MeshBasicMaterial({color:0xb89460}),
        legM:   new T.MeshBasicMaterial({color:0x282030}),
        track:  new T.MeshBasicMaterial({color:0x1a1822}),
      };

      const bx=(w,h,d,mat,px,py,pz)=>{
        const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
        m.position.set(px,py,pz);scene.add(m);return m;
      };

      // ── Room constants ──────────────────────────────────────
      const MHH=11; // main hall height
      const HCZ=-5; // hall center Z (z=-19..z=9 → center=-5)
      const HZ=9;   // junction z (south wall of hall)
      const CZ=15.5;// corridor center Z
      const CH=11;  // corridor height

      // MAIN HALL
      bx(40,.24,28,M.floor, 0,-.12,HCZ);  // floor
      bx(40,.1, 28,M.ceil,  0,MHH,HCZ);  // ceiling
      bx(.25,MHH,28,M.wall,-20,MHH/2,HCZ); // left wall
      bx(.25,MHH,28,M.wall, 20,MHH/2,HCZ); // right wall
      bx(40,MHH,.25,M.wall,  0,MHH/2,-19); // north wall

      // SOUTH WALL of hall (with arch opening x=-4..4, h=0..6)
      bx(16,MHH,.25,M.wall,-12,MHH/2,HZ);   // left section  x=-20..-4
      bx(16,MHH,.25,M.wall, 12,MHH/2,HZ);   // right section x=4..20
      bx( 8,(MHH-6),.25,M.wall, 0, 6+(MHH-6)/2,HZ); // lintel above arch h=6..11

      // CORRIDOR
      bx(8, .24,13,M.floor, 0,-.12,CZ);  // floor
      bx(8, .1, 13,M.ceil,  0, CH, CZ);  // ceiling
      bx(.25,CH,13,M.wall, -4, CH/2,CZ); // left wall
      bx(.25,CH,13,M.wall,  4, CH/2,CZ); // right wall
      bx(8,  CH,.25,M.wall,  0, CH/2,22.5); // north end wall

      // ARCH PILLARS (decorative columns at junction)
      bx(1.2,MHH,1.2,M.pillar,-5,MHH/2,HZ);
      bx(1.2,MHH,1.2,M.pillar, 5,MHH/2,HZ);

      // INNER DIVIDERS (x=±10, run z=-17..8, length=25)
      bx(.25,MHH,25,M.wall,-10,MHH/2,-4.5);
      bx(.25,MHH,25,M.wall, 10,MHH/2,-4.5);

      // CROWN MOLDING
      const mkCrown=(W,L,cx,cz,ry=0)=>{
        const c=new T.Mesh(new T.BoxGeometry(W,.18,.14),M.mold);
        c.position.set(cx,MHH-.09,cz);c.rotation.y=ry;scene.add(c);
      };
      mkCrown(40,0,0,-18.88);mkCrown(40,0,0,HZ+.12);
      mkCrown(.14,28,19.88,HCZ,Math.PI/2);mkCrown(.14,28,-19.88,HCZ,Math.PI/2);
      mkCrown(8,0,0,22.38);mkCrown(.14,13,-3.88,CZ,Math.PI/2);mkCrown(.14,13,3.88,CZ,Math.PI/2);

      // BASEBOARDS
      const mkBase=(W,cx,cz,ry=0)=>{
        const b=new T.Mesh(new T.BoxGeometry(W,.2,.1),M.mold);
        b.position.set(cx,.1,cz);b.rotation.y=ry;scene.add(b);
      };
      mkBase(40,0,-18.88);mkBase(40,0,HZ+.12);
      mkBase(.1,19.88,HCZ,Math.PI/2);mkBase(.1,-19.88,HCZ,Math.PI/2);
      mkBase(8,0,22.38);mkBase(.1,-3.88,CZ,Math.PI/2);mkBase(.1,3.88,CZ,Math.PI/2);

      // FLOOR INLAY BORDER
      const inM=new T.MeshBasicMaterial({color:0x3a3228});
      bx(38,.02,.14,inM, 0,.01,-18.4);bx(38,.02,.14,inM, 0,.01,HZ-.6);
      bx(.14,.02,26,inM,-19.4,.01,HCZ);bx(.14,.02,26,inM,19.4,.01,HCZ);

      // RED CARPET in corridor + entry area
      bx(4.2,.025,12,M.carpet, 0,.01,CZ); // corridor
      bx(4.2,.025, 7,M.carpet, 0,.01, 5); // hall entry
      // Gold border strips
      bx(4.5,.025,.1,M.gold, 0,.01,9.5);bx(4.5,.025,.1,M.gold, 0,.01,CZ-6.5);
      bx(.1,.025,12,M.gold,-2.22,.01,CZ);bx(.1,.025,12,M.gold, 2.22,.01,CZ);

      // ── SPOTLIGHT TRACK SYSTEM ──────────────────────────────
      const addTrack=(xs,zs,h)=>{
        xs.forEach(rx=>{
          const rail=new T.Mesh(new T.BoxGeometry(.044,.032,Math.abs(zs[zs.length-1]-zs[0])+2),M.track);
          rail.position.set(rx,h-.025,(zs[0]+zs[zs.length-1])/2);scene.add(rail);
          zs.forEach(rz=>{
            const g=new T.Group();g.position.set(rx,h-.025,rz);
            const ad=new T.Mesh(new T.BoxGeometry(.062,.044,.062),M.track);ad.position.y=-.022;g.add(ad);
            const st=new T.Mesh(new T.CylinderGeometry(.01,.01,.22,8),M.track);st.position.y=-.135;g.add(st);
            const kn=new T.Mesh(new T.SphereGeometry(.018,8,8),M.track);kn.position.y=-.258;g.add(kn);
            const ho=new T.Mesh(new T.CylinderGeometry(.022,.082,.18,14,1,true),M.track);ho.position.y=-.37;g.add(ho);
            const tc=new T.Mesh(new T.CircleGeometry(.022,14),M.track);tc.rotation.x=Math.PI/2;tc.position.y=-.28;g.add(tc);
            const ln=new T.Mesh(new T.CircleGeometry(.065,18),M.glow);ln.rotation.x=Math.PI/2;ln.position.y=-.462;g.add(ln);
            const lr=new T.Mesh(new T.TorusGeometry(.068,.005,7,18),M.track);lr.rotation.x=Math.PI/2;lr.position.y=-.462;g.add(lr);
            scene.add(g);
            // Spotlight — white, no shadow map
            const spot=new T.SpotLight(0xffffff,2.4,20,Math.PI/7.5,.24,1.3);
            spot.position.set(rx,h-.48,rz);spot.target.position.set(rx,0,rz);
            spot.castShadow=false;
            scene.add(spot);scene.add(spot.target);
          });
        });
      };
      addTrack([-1.5,1.5],[14,19],CH); // corridor
      addTrack([-12,0,12],[-15,-8,-1,6],MHH); // main hall

      // Ambient light (important since MeshBasicMaterial ignores it — only Lambert needs it)
      // But Lambert materials benefit from it, so let's add ambient for completeness
      scene.add(new T.AmbientLight(0xfff8f0,.6));
      scene.add(new T.HemisphereLight(0xfff5e8,0xa8a098,.4));

      // ── WELCOME PLAQUE (on south face of RIGHT section of south wall) ──
      // South wall right section: center x=12, z=9. South face = z=9.125
      // Plaque faces SOUTH (toward corridor viewer) = rotY=0 in world space
      const pW=7.5,pH=4.2,bw=.18;
      const pG=new T.Group();
      pG.position.set(0,4.5,HZ+.14); // centered on south wall face, slightly protruding
      // No rotation — the group faces south (+Z direction toward viewer)
      // Gold frame bars
      const goldM=M.gold;
      [[pW+bw*2,bw,0,pH/2+bw/2],[pW+bw*2,bw,0,-pH/2-bw/2],[bw,pH,-pW/2-bw/2,0],[bw,pH,pW/2+bw/2,0]].forEach(([w,h,x,y])=>{
        const bar=new T.Mesh(new T.BoxGeometry(w,h,.12),goldM);bar.position.set(x,y,.06);pG.add(bar);
      });
      // Corner ornaments
      [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([sx,sy])=>{
        const orn=new T.Mesh(new T.BoxGeometry(bw*1.6,bw*1.6,.15),goldM);
        orn.position.set(sx*(pW/2+bw/2),sy*(pH/2+bw/2),.075);pG.add(orn);
      });
      // Plaque surface
      const pTex=new T.CanvasTexture(mkPlaqueCanvas());
      const pSurf=new T.Mesh(new T.PlaneGeometry(pW,pH),new T.MeshBasicMaterial({map:pTex}));
      pSurf.position.z=.075;pG.add(pSurf);
      // Backing
      const pBk=new T.Mesh(new T.BoxGeometry(pW+bw*2+.04,pH+bw*2+.04,.08),M.dark);pBk.position.z=-.02;pG.add(pBk);
      // Spot on plaque
      const pLt=new T.SpotLight(0xfff8d0,2.2,10,Math.PI/9,.28,1.8);
      pLt.position.set(0,pH/2+1.2,2);pLt.target.position.set(0,0,.1);
      pG.add(pLt);pG.add(pLt.target);
      scene.add(pG);

      // ── BENCHES ────────────────────────────────────────────
      [[0,-8],[0,-14],[-14,-6],[14,-6],[0,2]].forEach(([bx2,bz])=>{
        const g=new T.Group();g.position.set(bx2,0,bz);
        [-0.13,0,.13].forEach(oz=>{const p=new T.Mesh(new T.BoxGeometry(2.1,.07,.17),M.seat);p.position.set(0,.48,oz);g.add(p);});
        [-.8,.8].forEach(lx2=>{const l=new T.Mesh(new T.BoxGeometry(.055,.48,.46),M.legM);l.position.set(lx2,.24,0);g.add(l);});
        const str=new T.Mesh(new T.BoxGeometry(1.7,.04,.04),M.legM);str.position.y=.1;g.add(str);
        scene.add(g);
      });

      // ── ARTWORKS ──────────────────────────────────────────
      const pm={};photos.forEach(p=>{pm[p.position_index]=p;});
      const hitGroups=[];

      const buildFrame=(group,fw,fh,col)=>{
        const fM=new T.MeshBasicMaterial({color:col});
        const sM=new T.MeshBasicMaterial({color:Math.max(0,col-0x282828)});
        const mats=[sM,sM,sM,sM,fM,sM];
        const bw2=.16,fd=.065;
        [{w:fw+bw2*2,h:bw2,x:0,y:fh/2+bw2/2},{w:fw+bw2*2,h:bw2,x:0,y:-fh/2-bw2/2},
         {w:bw2,h:fh,x:-fw/2-bw2/2,y:0},{w:bw2,h:fh,x:fw/2+bw2/2,y:0}]
        .forEach(b=>{const m=new T.Mesh(new T.BoxGeometry(b.w,b.h,fd),mats);m.position.set(b.x,b.y,fd/2);group.add(m);});
        // Shadow gap (inner dark line)
        const gM=new T.MeshBasicMaterial({color:0x040404});
        const gaps=[{w:fw+bw2*2,h:.012,x:0,y:fh/2},{w:fw+bw2*2,h:.012,x:0,y:-fh/2},{w:.012,h:fh,x:-fw/2,y:0},{w:.012,h:fh,x:fw/2,y:0}];
        gaps.forEach(b=>{const m=new T.Mesh(new T.BoxGeometry(b.w,b.h,.025),gM);m.position.set(b.x,b.y,.08);group.add(m);});
        // White mat (passepartout)
        const matM=new T.MeshBasicMaterial({color:0xf5f1ea});
        const mBW=.045;
        [{w:fw+mBW*2,h:mBW,x:0,y:fh/2+mBW/2},{w:fw+mBW*2,h:mBW,x:0,y:-fh/2-mBW/2},
         {w:mBW,h:fh,x:-fw/2-mBW/2,y:0},{w:mBW,h:fh,x:fw/2+mBW/2,y:0}]
        .forEach(b=>{const m=new T.Mesh(new T.BoxGeometry(b.w,b.h,.007),matM);m.position.set(b.x,b.y,.074);group.add(m);});
      };

      const addPicLight=(group,fw,fh,lit)=>{
        const glM=new T.MeshBasicMaterial({color:lit?0xfffee0:0x444434});
        const g=new T.Group();g.position.set(0,fh/2+.22,.14);
        g.add(new T.Mesh(new T.BoxGeometry(fw*.48,.05,.038),M.brass));
        const arm=new T.Mesh(new T.CylinderGeometry(.01,.01,.15,8),M.brass);arm.rotation.x=Math.PI/2;arm.position.z=.075;g.add(arm);
        const shade=new T.Mesh(new T.CylinderGeometry(.042,.075,fw*.4,16,1,true,0,Math.PI),M.track);shade.rotation.x=-Math.PI/2;shade.position.z=.15;g.add(shade);
        const sCap=new T.Mesh(new T.PlaneGeometry(fw*.4,.09),M.track);sCap.position.z=.15;g.add(sCap);
        const glow=new T.Mesh(new T.CylinderGeometry(.006,.006,fw*.34,8),glM);glow.rotation.z=Math.PI/2;glow.position.set(0,.027,.15);g.add(glow);
        [-fw*.17,fw*.17].forEach(ex=>{const ec=new T.Mesh(new T.BoxGeometry(.005,.072,.072),M.track);ec.position.set(ex,.022,.15);g.add(ec);});
        group.add(g);
        if(lit){
          const pl=new T.SpotLight(0xffffff,4.2,8,Math.PI/9,.2,1.8);
          pl.position.set(0,fh/2+.3,.34);pl.target.position.set(0,-fh*.26,.08);
          group.add(pl);group.add(pl.target);
        }
      };

      const addLabel=(group,slotId,fh,hasPhoto)=>{
        const cv=document.createElement('canvas');cv.width=160;cv.height=56;
        const ctx=cv.getContext('2d');
        ctx.fillStyle=hasPhoto?'rgba(14,11,8,.92)':'rgba(82,76,68,.74)';
        ctx.beginPath();ctx.roundRect(0,0,160,56,28);ctx.fill();
        const sh=ctx.createLinearGradient(0,0,0,28);sh.addColorStop(0,'rgba(255,255,255,.12)');sh.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sh;ctx.beginPath();ctx.roundRect(0,0,160,28,28);ctx.fill();
        ctx.fillStyle=hasPhoto?'#fff':'#b8b0a8';ctx.font='bold 24px -apple-system,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('#'+slotId,80,37);
        const t=new T.CanvasTexture(cv);
        const sp=new T.Mesh(new T.PlaneGeometry(.52,.18),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));
        sp.position.set(0,fh/2+.65,.09);group.add(sp);
      };

      for(const slot of SLOTS){
        const ph=pm[slot.id];
        const group=new T.Group();
        group.position.set(...slot.pos);
        group.rotation.y=slot.rotY;

        await new Promise(resolve=>{
          const finish=(fw,fh,tex,hasPhoto)=>{
            buildFrame(group,fw,fh,FRAME_COLORS[slot.id%FRAME_COLORS.length]);
            const imgM=new T.Mesh(new T.PlaneGeometry(fw,fh),new T.MeshBasicMaterial({map:tex}));
            imgM.position.z=.078;group.add(imgM);
            addPicLight(group,fw,fh,hasPhoto);
            addLabel(group,slot.id,fh,hasPhoto);
            group.userData={title:ph?.title||'',sub:ph?.subtitle||'',hasPhoto,imageUrl:ph?.image_url||null};
            if(hasPhoto)hitGroups.push(group);
            scene.add(group);resolve();
          };
          if(ph?.image_url){
            const img=new Image();img.crossOrigin='anonymous';
            img.onload=()=>{
              const asp=img.naturalWidth/img.naturalHeight;
              const mH=2.2,mW=3.2;
              const fw=asp>=1?Math.min(mW,asp*mH):mH*asp;
              const fh=asp>=1?fw/asp:mH;
              const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;
              cv.getContext('2d').drawImage(img,0,0);
              finish(fw,fh,new T.CanvasTexture(cv),true);
            };
            img.onerror=()=>{const cv=mkPlaceholder(slot.id,FRAME_COLORS[slot.id%FRAME_COLORS.length]);finish(2.1,1.58,new T.CanvasTexture(cv),false);};
            img.src=ph.image_url;
          } else {
            const cv=mkPlaceholder(slot.id,FRAME_COLORS[slot.id%FRAME_COLORS.length]);
            finish(2.1,1.58,new T.CanvasTexture(cv),false);
          }
        });
      }

      // ── Controls ──────────────────────────────────────────
      if(!isMobile){
        renderer.domElement.addEventListener('click',()=>renderer.domElement.requestPointerLock());
        document.addEventListener('pointerlockchange',()=>{s.isLocked=document.pointerLockElement===renderer.domElement;setLocked(s.isLocked);});
        document.addEventListener('mousemove',e=>{if(!s.isLocked)return;s.yaw-=e.movementX*.0018;s.pitch-=e.movementY*.0018;s.pitch=Math.max(-1.1,Math.min(1.1,s.pitch));});
      } else {
        renderer.domElement.addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.clientX>innerWidth/2&&!s.lookTouch.active)s.lookTouch={active:true,id:t.identifier,lastX:t.clientX,lastY:t.clientY};},{passive:false});
        renderer.domElement.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===s.lookTouch.id){s.yaw-=(t.clientX-s.lookTouch.lastX)*.004;s.pitch-=(t.clientY-s.lookTouch.lastY)*.004;s.pitch=Math.max(-1.1,Math.min(1.1,s.pitch));s.lookTouch.lastX=t.clientX;s.lookTouch.lastY=t.clientY;}},{passive:false});
        renderer.domElement.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===s.lookTouch.id)s.lookTouch={active:false,id:null,lastX:0,lastY:0};});
      }
      document.addEventListener('keydown',e=>{s.keys[e.code]=true;});
      document.addEventListener('keyup',e=>{s.keys[e.code]=false;});

      // ── Render loop ──────────────────────────────────────
      const rc=new T.Raycaster();
      let last=performance.now();
      let frameN=0;

      const loop=()=>{
        animId=requestAnimationFrame(loop);
        const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
        frameN++;

        // Move camera
        if(s.isLocked||isMobile){
          const spd=s.keys['ShiftLeft']?8:4.5;
          const fw3=new T.Vector3(-Math.sin(s.yaw),0,-Math.cos(s.yaw));
          const rt3=new T.Vector3(Math.cos(s.yaw),0,-Math.sin(s.yaw));
          const mv=new T.Vector3();
          if(s.keys['KeyW']||s.keys['ArrowUp'])    mv.addScaledVector(fw3, spd*dt);
          if(s.keys['KeyS']||s.keys['ArrowDown'])  mv.addScaledVector(fw3,-spd*dt);
          if(s.keys['KeyA']||s.keys['ArrowLeft'])  mv.addScaledVector(rt3,-spd*dt);
          if(s.keys['KeyD']||s.keys['ArrowRight']) mv.addScaledVector(rt3, spd*dt);
          if(s.joystick.active){mv.addScaledVector(fw3,-s.joystick.dy/40*4*dt);mv.addScaledVector(rt3,s.joystick.dx/40*4*dt);}
          camera.position.add(mv);
          camera.position.x=Math.max(-19.4,Math.min(19.4,camera.position.x));
          camera.position.z=Math.max(-18.4,Math.min(22,camera.position.z));
          camera.position.y=1.72;
          s.pos={x:camera.position.x,z:camera.position.z};
          camera.rotation.order='YXZ';camera.rotation.y=s.yaw;camera.rotation.x=s.pitch;

          // Raycast for photo info
          rc.setFromCamera({x:0,y:0},camera);
          const hh=rc.intersectObjects(hitGroups,true);
          if(hh.length&&hh[0].distance<7){
            let obj=hh[0].object;while(obj&&!obj.userData?.hasPhoto)obj=obj.parent;
            if(obj?.userData?.hasPhoto)setPhotoInfo({title:obj.userData.title,sub:obj.userData.sub,imageUrl:obj.userData.imageUrl});
            else setPhotoInfo(null);
          } else setPhotoInfo(null);
        }

        // ── VISITOR AVATARS with LERP smoothing ──────────────────
        const currentVisitors = visitorsRef.current; // { id: {name,x,z,yaw,colorIdx} }
        const activeIds = new Set(Object.keys(currentVisitors));

        // Remove avatars of visitors who left
        Object.keys(avatarMeshes).forEach(id=>{
          if(!activeIds.has(id)){scene.remove(avatarMeshes[id]);delete avatarMeshes[id];}
        });

        // Add/update with Lerp smoothing
        Object.entries(currentVisitors).forEach(([id, v])=>{
          // Create avatar if new visitor
          if(!avatarMeshes[id]){
            avatarMeshes[id]=createAvatar(T, v.name, v.colorIdx||0);
            scene.add(avatarMeshes[id]);
            // Initialize at target position (no lerp on first frame)
            const lt = lerpTargets.current[id];
            if(lt){ avatarMeshes[id].position.set(lt.x||0, 0, lt.z||21); avatarMeshes[id].rotation.y=(lt.yaw||0)+Math.PI; }
          }

          const av = avatarMeshes[id];
          const lt = lerpTargets.current[id];
          if(lt){
            // LERP: CurrentPos = CurrentPos + (Target - Current) × 0.12
            const LERP = 0.12;
            av.position.x += (lt.x - av.position.x) * LERP;
            av.position.z += (lt.z - av.position.z) * LERP;
            av.position.y = 0;

            // Lerp rotation (handle wraparound)
            let targetYaw = (lt.yaw||0) + Math.PI;
            let curYaw = av.rotation.y;
            let diff = targetYaw - curYaw;
            // Normalize to [-π, π] to avoid spinning the long way
            while(diff > Math.PI)  diff -= Math.PI*2;
            while(diff < -Math.PI) diff += Math.PI*2;
            av.rotation.y = curYaw + diff * LERP;
          }

          // Billboard: name label always faces camera
          av.children.forEach(ch=>{
            if(ch.userData?.isBillboard){
              const wp=new T.Vector3();av.getWorldPosition(wp);
              ch.rotation.y=Math.atan2(camera.position.x-wp.x,camera.position.z-wp.z)-av.rotation.y;
            }
          });
          // Idle animation: body bob
          if(av.children[0]) av.children[0].position.y=.65+Math.sin(now*.0024)*0.013;
        });

        renderer.render(scene,camera);
      };
      loop();

      window.addEventListener('resize',()=>{
        if(!camera||!renderer)return;
        camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
      });
      setLoading(false);
    })();

    return()=>{
      cancelAnimationFrame(animId);
      document.exitPointerLock?.();
      renderer?.dispose();
      if(mountRef.current&&renderer?.domElement?.parentNode===mountRef.current)mountRef.current.removeChild(renderer.domElement);
    };
  },[entered,visitorName,photos]);

  // Joystick handlers
  const onJoyStart=useCallback(e=>{e.preventDefault();stateRef.current.joystick={active:true,dx:0,dy:0};if(jKnobRef.current)jKnobRef.current.style.transform='translate(-50%,-50%)';},[]);
  const onJoyMove=useCallback(e=>{e.preventDefault();const s=stateRef.current;if(!s.joystick.active)return;const t=e.changedTouches[0];const z=jZoneRef.current?.getBoundingClientRect();if(!z)return;const cx=z.left+z.width/2,cy=z.top+z.height/2;let dx=t.clientX-cx,dy=t.clientY-cy;const mR=44,d=Math.sqrt(dx*dx+dy*dy);if(d>mR){dx=dx/d*mR;dy=dy/d*mR;}s.joystick.dx=dx;s.joystick.dy=dy;if(jKnobRef.current)jKnobRef.current.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;},[]);
  const onJoyEnd=useCallback(e=>{e.preventDefault();stateRef.current.joystick={active:false,dx:0,dy:0};if(jKnobRef.current)jKnobRef.current.style.transform='translate(-50%,-50%)';},[]);
  useEffect(()=>{const z=jZoneRef.current;if(!z||!entered)return;z.addEventListener('touchstart',onJoyStart,{passive:false});z.addEventListener('touchmove',onJoyMove,{passive:false});z.addEventListener('touchend',onJoyEnd,{passive:false});return()=>{z.removeEventListener('touchstart',onJoyStart);z.removeEventListener('touchmove',onJoyMove);z.removeEventListener('touchend',onJoyEnd);};},[entered,onJoyStart,onJoyMove,onJoyEnd]);

  const FF={fontFamily:'Segoe UI,Tahoma,sans-serif'};

  return(
    <>
      <Head>
        <title>معرض الفوتوغرافيا — AnwarBMA</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
        <meta name="mobile-web-app-capable" content="yes"/>
      </Head>
      <div ref={mountRef} style={{width:'100vw',height:'100dvh',touchAction:'none'}}/>

      {/* LOADING */}
      {entered&&loading&&(
        <div style={{position:'fixed',inset:0,zIndex:300,background:'#b8b0a8',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif'}}>
          <div style={{width:56,height:56,border:'2px solid #c8a820',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',marginBottom:24}}/>
          <p style={{color:'#3a3028',letterSpacing:'.2em',fontSize:'.82rem'}}>جاري تحميل المعرض...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ENTRY + NAME INPUT */}
      {!entered&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'linear-gradient(155deg,#ede8e0 0%,#e4ddd5 55%,#dad4cb 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',...FF,padding:20,overflowY:'auto'}}>
          {[[-170,-115,220],[155,135,178],[-95,170,150],[142,-188,162]].map(([x,y,sz],i)=>(
            <div key={i} style={{position:'absolute',left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,width:sz,height:sz,borderRadius:'50%',border:'1px solid rgba(148,132,105,.16)',transform:'translate(-50%,-50%)'}}/>
          ))}
          <div style={{position:'relative',textAlign:'center',maxWidth:460,width:'100%'}}>
            <div style={{width:52,height:52,margin:'0 auto 20px',border:'1.5px solid #a88e6e',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:26,height:26,background:'#8a7250'}}/>
            </div>
            <h1 style={{fontSize:'clamp(1.6rem,6vw,2.5rem)',fontWeight:400,letterSpacing:'.35em',color:'#1e1a12',marginBottom:5,fontFamily:'Georgia,serif'}}>GALLERY</h1>
            <div style={{width:48,height:1,background:'#a88e6e',margin:'10px auto'}}/>
            <p style={{color:'#78705e',fontSize:'clamp(.72rem,2.2vw,.9rem)',letterSpacing:'.14em',marginBottom:5}}>معرض الفوتوغرافيا الافتراضي — AnwarBMA</p>
            <p style={{color:'#a89880',fontSize:'.72rem',marginBottom:4}}>{photos.length} عمل فني · 23 موقع عرض</p>
            <p style={{color:'#c8a820',fontSize:'.78rem',fontWeight:600,marginBottom:28}}>👁 {visitCount.toLocaleString('ar-SA')} زيارة</p>

            <div style={{background:'rgba(255,252,246,.9)',border:'1px solid #d8d0c0',borderRadius:12,padding:'20px 22px',marginBottom:22,textAlign:'right'}}>
              <label style={{display:'block',fontSize:'.8rem',color:'#78705e',marginBottom:9,letterSpacing:'.06em'}}>اكتب اسمك — ستظهر شخصيتك للزوار الآخرين في المعرض</label>
              <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&nameInput.trim()){setVisitorName(nameInput.trim());setEntered(true);}}}
                placeholder="اسمك هنا..." maxLength={20}
                style={{width:'100%',padding:'11px 14px',border:'1.5px solid #d8d0c0',borderRadius:7,fontSize:'.96rem',color:'#1e1a12',background:'#faf8f4',outline:'none',textAlign:'right',fontFamily:'inherit',marginBottom:12}}
                autoFocus/>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(nameInput.trim()){setVisitorName(nameInput.trim());setEntered(true);}}} disabled={!nameInput.trim()}
                  style={{flex:1,background:nameInput.trim()?'#1e1a12':'#ddd5c8',color:nameInput.trim()?'#f4f0e6':'#a09888',border:'none',padding:'12px',fontSize:'.88rem',letterSpacing:'.15em',cursor:nameInput.trim()?'pointer':'not-allowed',fontFamily:'inherit',borderRadius:4}}>
                  دخول المعرض →
                </button>
                <button onClick={()=>{const n='زائر'+Math.floor(Math.random()*9999);setNameInput(n);setVisitorName(n);setEntered(true);}}
                  style={{background:'transparent',border:'1.5px solid #d8d0c0',color:'#988880',padding:'12px 14px',cursor:'pointer',borderRadius:4,fontSize:'.78rem',...FF}}>
                  دخول مجهول
                </button>
              </div>
            </div>

            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:20}}>
              {(isMobile?[['↕↔ يسار','تحرك'],['سحب يمين','انظر']]:[['W A S D','التحرك'],['ماوس','النظر'],['Shift','ركض'],['ESC','إيقاف']]).map(([k,l])=>(
                <div key={k} style={{textAlign:'center'}}>
                  <div style={{background:'rgba(255,250,242,.85)',border:'1px solid #d5cdc0',padding:'4px 10px',fontSize:'.7rem',color:'#2a2010',fontFamily:'monospace',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:'.63rem',color:'#a09080'}}>{l}</div>
                </div>
              ))}
            </div>
            <a href="/admin/login" style={{color:'#a09078',fontSize:'.7rem',letterSpacing:'.1em',textDecoration:'none',borderBottom:'1px solid #c0b8a0',paddingBottom:1}}>⚙ لوحة الإدارة</a>
          </div>
        </div>
      )}

      {/* CROSSHAIR */}
      {entered&&locked&&!isMobile&&(
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:20,height:20,pointerEvents:'none',zIndex:50}}>
          <div style={{position:'absolute',width:1,height:20,background:'rgba(255,250,235,.52)',left:9.5,top:0}}/>
          <div style={{position:'absolute',width:20,height:1,background:'rgba(255,250,235,.52)',left:0,top:9.5}}/>
          <div style={{position:'absolute',width:4,height:4,borderRadius:'50%',background:'rgba(255,250,235,.7)',left:8,top:8}}/>
        </div>
      )}
      {entered&&isMobile&&(<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:7,height:7,borderRadius:'50%',background:'rgba(255,250,235,.58)',pointerEvents:'none',zIndex:50}}/>)}

      {/* PHOTO INFO */}
      {entered&&photoInfo&&(
        <div style={{position:'fixed',bottom:isMobile?175:62,left:'50%',transform:'translateX(-50%)',zIndex:50,cursor:photoInfo.imageUrl?'pointer':'default'}}
          onClick={()=>photoInfo.imageUrl&&setFullscreen(photoInfo)}>
          <div style={{background:'rgba(12,10,7,.88)',backdropFilter:'blur(10px)',border:'1px solid rgba(200,168,80,.16)',padding:'11px 28px',color:'#f4f0e6',textAlign:'center',fontFamily:'Georgia,serif'}}>
            <div style={{fontWeight:400,fontSize:'.95rem',marginBottom:3}}>{photoInfo.title}</div>
            <div style={{fontSize:'.7rem',color:'#c0b088',letterSpacing:'.13em',...FF}}>{photoInfo.sub}</div>
            {photoInfo.imageUrl&&<div style={{fontSize:'.6rem',color:'#a88c60',marginTop:4,...FF}}>اضغط للعرض الكامل</div>}
          </div>
        </div>
      )}

      {/* FULLSCREEN */}
      {fullscreen&&(
        <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,.96)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setFullscreen(null)}>
          <img src={fullscreen.imageUrl} alt={fullscreen.title} style={{maxWidth:'90vw',maxHeight:'80vh',objectFit:'contain',boxShadow:'0 0 80px rgba(0,0,0,.9)'}}/>
          <div style={{marginTop:18,textAlign:'center'}}>
            <div style={{color:'#f4f0e6',fontSize:'1.05rem',fontFamily:'Georgia,serif',marginBottom:4}}>{fullscreen.title}</div>
            <div style={{color:'#a09070',fontSize:'.76rem',...FF,letterSpacing:'.12em'}}>{fullscreen.sub}</div>
          </div>
          <div style={{position:'absolute',top:20,right:24,color:'rgba(255,250,235,.4)',fontSize:'1.5rem',cursor:'pointer'}}>✕</div>
        </div>
      )}

      {/* VISITORS LIST */}
      {entered&&visitorsUI.length>0&&(
        <div style={{position:'fixed',top:60,left:14,zIndex:50,background:'rgba(12,10,7,.76)',backdropFilter:'blur(8px)',border:'1px solid rgba(200,168,80,.14)',padding:'10px 14px',borderRadius:8,minWidth:148}}>
          <div style={{fontSize:'.6rem',color:'#a88c60',letterSpacing:'.12em',marginBottom:7,...FF}}>زوار الآن ({visitorsUI.length})</div>
          {visitorsUI.slice(0,8).map((v,i)=>(
            <div key={v.visitor_id} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
              <div style={{width:9,height:9,borderRadius:'50%',background:'#'+AVATAR_COLORS[i%AVATAR_COLORS.length].toString(16).padStart(6,'0'),flexShrink:0}}/>
              <div style={{fontSize:'.74rem',color:'#ddd4c2',...FF,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',maxWidth:108}}>{v.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* MY BADGE + VISIT COUNT */}
      {entered&&(
        <div style={{position:'fixed',top:60,right:14,zIndex:50,display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
          <div style={{background:'rgba(12,10,7,.76)',backdropFilter:'blur(8px)',border:'1px solid rgba(200,168,80,.14)',padding:'8px 14px',borderRadius:8,...FF,fontSize:'.72rem',color:'#ddd4c2'}}>
            👤 {visitorName}
          </div>
          <div style={{background:'rgba(12,10,7,.76)',backdropFilter:'blur(8px)',border:'1px solid rgba(200,168,80,.14)',padding:'6px 12px',borderRadius:8,...FF,fontSize:'.68rem',color:'#c8a820'}}>
            👁 {visitCount.toLocaleString('ar-SA')} زيارة
          </div>
        </div>
      )}

      {/* HUD */}
      {entered&&!isMobile&&(<div style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',fontSize:'.65rem',color:'rgba(255,250,235,.25)',letterSpacing:'.14em',pointerEvents:'none',zIndex:50,...FF}}>{locked?'ESC للتوقف · Shift للركض':'انقر على المشهد للتحكم'}</div>)}

      {/* TOP BUTTONS */}
      {entered&&(
        <div style={{position:'fixed',top:14,right:14,zIndex:50,display:'flex',gap:8}}>
          <a href="/admin/login" target="_blank" style={{background:'rgba(14,12,8,.8)',border:'1px solid rgba(200,170,100,.18)',color:'#d4cbb8',padding:isMobile?'9px 13px':'7px 13px',borderRadius:2,fontSize:'.7rem',letterSpacing:'.1em',textDecoration:'none',backdropFilter:'blur(6px)',...FF,WebkitTapHighlightColor:'transparent'}}>⚙ إدارة</a>
          <button onClick={()=>{document.exitPointerLock?.();setEntered(false);setLocked(false);}} style={{background:'rgba(14,12,8,.8)',border:'1px solid rgba(200,170,100,.18)',color:'#d4cbb8',padding:isMobile?'9px 13px':'7px 13px',cursor:'pointer',fontSize:'.7rem',letterSpacing:'.1em',borderRadius:2,backdropFilter:'blur(6px)',...FF,WebkitTapHighlightColor:'transparent'}}>← خروج</button>
        </div>
      )}

      {/* JOYSTICK */}
      {entered&&isMobile&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,height:158,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px 16px',pointerEvents:'none',background:'linear-gradient(to top,rgba(12,10,7,.38),transparent)'}}>
          <div style={{pointerEvents:'auto'}}>
            <div ref={jZoneRef} style={{width:118,height:118,borderRadius:'50%',background:'rgba(255,252,235,.1)',border:'1.5px solid rgba(255,252,235,.24)',backdropFilter:'blur(4px)',position:'relative',touchAction:'none',WebkitTapHighlightColor:'transparent'}}>
              <div style={{position:'absolute',width:1,height:'55%',background:'rgba(255,252,235,.14)',left:'50%',top:'22.5%'}}/><div style={{position:'absolute',height:1,width:'55%',background:'rgba(255,252,235,.14)',top:'50%',left:'22.5%'}}/>
              <div ref={jKnobRef} style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:48,height:48,borderRadius:'50%',background:'rgba(255,252,235,.64)',border:'1.5px solid rgba(200,170,100,.44)',boxShadow:'0 2px 14px rgba(0,0,0,.2)'}}/>
            </div>
            <div style={{textAlign:'center',marginTop:5,fontSize:'.58rem',color:'rgba(255,252,235,.3)',letterSpacing:'.1em',...FF}}>تحرك</div>
          </div>
          <div style={{textAlign:'center',opacity:.3}}><div style={{fontSize:'1.3rem',marginBottom:4}}>👁</div><div style={{fontSize:'.58rem',color:'rgba(255,252,235,.5)',letterSpacing:'.1em',...FF}}>اسحب للنظر</div></div>
        </div>
      )}
    </>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';

const SLOTS = [
  { id:0,  pos:[-3.85,3.5,17.0],  rotY: Math.PI/2 },
  { id:1,  pos:[-3.85,3.5,11.5],  rotY: Math.PI/2 },
  { id:2,  pos:[ 3.85,3.5,17.0],  rotY:-Math.PI/2 },
  { id:3,  pos:[ 3.85,3.5,11.5],  rotY:-Math.PI/2 },
  { id:4,  pos:[-13.85,3.2, 4.0], rotY: Math.PI/2 },
  { id:5,  pos:[-13.85,3.2,-2.0], rotY: Math.PI/2 },
  { id:6,  pos:[-13.85,3.2,-8.0], rotY: Math.PI/2 },
  { id:7,  pos:[-13.85,3.2,-12.5],rotY: Math.PI/2 },
  { id:8,  pos:[ 13.85,3.2, 4.0], rotY:-Math.PI/2 },
  { id:9,  pos:[ 13.85,3.2,-2.0], rotY:-Math.PI/2 },
  { id:10, pos:[ 13.85,3.2,-8.0], rotY:-Math.PI/2 },
  { id:11, pos:[ 13.85,3.2,-12.5],rotY:-Math.PI/2 },
  { id:12, pos:[-10.0,3.2,-13.85],rotY: 0 },
  { id:13, pos:[ -5.0,3.2,-13.85],rotY: 0 },
  { id:14, pos:[  0.0,3.2,-13.85],rotY: 0 },
  { id:15, pos:[  5.0,3.2,-13.85],rotY: 0 },
  { id:16, pos:[ 10.0,3.2,-13.85],rotY: 0 },
  { id:17, pos:[ -9.0,3.2, 6.38], rotY: Math.PI },
  { id:18, pos:[  9.0,3.2, 6.38], rotY: Math.PI },
  { id:19, pos:[-7.05,3.2,-4.5],  rotY:-Math.PI/2 },
  { id:20, pos:[-7.05,3.2, 1.0],  rotY:-Math.PI/2 },
  { id:21, pos:[ 7.05,3.2,-4.5],  rotY: Math.PI/2 },
  { id:22, pos:[ 7.05,3.2, 1.0],  rotY: Math.PI/2 },
];

const FRAME_COLORS = [
  0x6B3A1F,0xB8762A,0x1a1a1a,0x7A3020,0xD4A83A,
  0xC8A820,0x888888,0x3A2810,0x8B6010,0x4A2C10,
  0x6B3A1F,0xB8762A,0xD4A83A,0xC8A820,0x7A3020,
  0x1a1a1a,0x888888,0x8B6010,0x3A2810,0x4A2C10,
  0x6B3A1F,0xB8762A,0xD4A83A,
];

const AVATAR_COLORS=[0x3b82f6,0xef4444,0x10b981,0xf59e0b,0x8b5cf6,0xec4899,0x06b6d4,0x84cc16,0xf97316,0x6366f1];

function getVid(){if(typeof window==='undefined')return '';let id=sessionStorage.getItem('g_vid');if(!id){id=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem('g_vid',id);}return id;}

// ── Texture builders ─────────────────────────────────────────────
function mkWall(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=256;
  const c=cv.getContext('2d');
  // Warm gray base — NOT white
  c.fillStyle='#b8b0a4';c.fillRect(0,0,256,256);
  for(let i=0;i<3000;i++){c.fillStyle=Math.random()>.5?`rgba(210,200,185,${Math.random()*.025})`:`rgba(80,70,60,${Math.random()*.02})`;c.beginPath();c.arc(Math.random()*256,Math.random()*256,Math.random()*1.5+.2,0,Math.PI*2);c.fill();}
  for(let i=0;i<40;i++){c.fillStyle=`rgba(100,90,78,${Math.random()*.01})`;c.fillRect(0,Math.random()*256,256,Math.random()*.8+.2);}
  return cv;
}
function mkFloor(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=256;
  const c=cv.getContext('2d');
  c.fillStyle='#7a7060';c.fillRect(0,0,256,256);
  for(let i=0;i<2000;i++){c.fillStyle=Math.random()>.5?`rgba(155,142,122,${Math.random()*.05})`:`rgba(40,32,22,${Math.random()*.04})`;c.beginPath();c.arc(Math.random()*256,Math.random()*256,Math.random()*2+.3,0,Math.PI*2);c.fill();}
  c.strokeStyle='rgba(40,32,22,0.28)';c.lineWidth=2;
  [0,128,256].forEach(v=>{c.beginPath();c.moveTo(v,0);c.lineTo(v,256);c.stroke();c.beginPath();c.moveTo(0,v);c.lineTo(256,v);c.stroke();});
  return cv;
}
function mkCarpet(){
  const cv=document.createElement('canvas');cv.width=128;cv.height=256;
  const c=cv.getContext('2d');
  c.fillStyle='#7a0000';c.fillRect(0,0,128,256);
  for(let i=0;i<1500;i++){c.fillStyle=Math.random()>.5?`rgba(160,10,10,${Math.random()*.1})`:`rgba(20,0,0,${Math.random()*.12})`;c.fillRect(Math.random()*128,Math.random()*256,Math.random()*2.5+.5,Math.random()*.6+.2);}
  c.fillStyle='rgba(200,160,40,0.7)';c.fillRect(5,0,3,256);c.fillRect(120,0,3,256);
  return cv;
}
function mkPlaque(){
  const W=1024,H=640,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d');
  c.fillStyle='#0d0c0a';c.fillRect(0,0,W,H);
  for(let i=0;i<60;i++){c.strokeStyle=`rgba(${165+Math.random()*40},${155+Math.random()*30},${125+Math.random()*30},${Math.random()*.035+.008})`;c.lineWidth=Math.random()*2+.4;c.beginPath();const sx=Math.random()*W,sy=Math.random()*H;c.moveTo(sx,sy);c.bezierCurveTo(sx+(Math.random()*300-150),sy+(Math.random()*200-100),sx+(Math.random()*300-150),sy+(Math.random()*200-100),sx+(Math.random()*400-200),sy+(Math.random()*300-150));c.stroke();}
  c.strokeStyle='#c8a820';c.lineWidth=5;c.strokeRect(16,16,W-32,H-32);
  c.strokeStyle='#e8c840';c.lineWidth=1.2;c.strokeRect(26,26,W-52,H-52);
  const t=(text,y,sz,col,fnt='Georgia,serif')=>{c.fillStyle=col;c.font=`${sz}px ${fnt}`;c.textAlign='center';c.fillText(text,W/2,y);};
  t('معرض الفوتوغرافيا الافتراضي',H*.16,W*.054,'#d4b040');
  t('VIRTUAL PHOTOGRAPHY EXHIBITION',H*.23,W*.038,'#e8c850');
  c.strokeStyle='#c8a820';c.lineWidth=1.2;c.beginPath();c.moveTo(W*.14,H*.29);c.lineTo(W*.86,H*.29);c.stroke();
  t('إعداد وإخراج',H*.37,W*.027,'#b0a898','Segoe UI,Tahoma,sans-serif');
  t('أنور محمد  ·  AnwarBMA',H*.45,W*.036,'#e0d0a0');
  c.strokeStyle='rgba(200,168,32,0.3)';c.lineWidth=.8;c.beginPath();c.moveTo(W*.2,H*.51);c.lineTo(W*.8,H*.51);c.stroke();
  t('بإشراف',H*.58,W*.024,'#a09880','Segoe UI,Tahoma,sans-serif');
  t('رئيس قسم التصوير الضوئي',H*.645,W*.026,'#c0b8a8','Segoe UI,Tahoma,sans-serif');
  t('عدنان الخمري',H*.71,W*.03,'#d8d0b8');
  c.strokeStyle='rgba(200,168,32,0.25)';c.lineWidth=.8;c.beginPath();c.moveTo(W*.25,H*.755);c.lineTo(W*.75,H*.755);c.stroke();
  t('بإدارة',H*.81,W*.022,'#a09880','Segoe UI,Tahoma,sans-serif');
  t('مدير جمعية الثقافة والفنون بالطائف',H*.865,W*.024,'#c0b8a8','Segoe UI,Tahoma,sans-serif');
  t('فيصل الخديدي',H*.925,W*.03,'#d8d0b8');
  t('✦  جمعية الثقافة والفنون — الطائف  ✦',H*.968,W*.022,'rgba(200,168,32,0.55)','Segoe UI,Tahoma,sans-serif');
  return cv;
}
function mkPlaceholder(id){
  const cv=document.createElement('canvas');cv.width=400;cv.height=300;
  const c=cv.getContext('2d');
  c.fillStyle='#d8d0c4';c.fillRect(0,0,400,300);
  for(let i=0;i<800;i++){c.fillStyle=`rgba(${110+Math.random()*30},${100+Math.random()*20},${85+Math.random()*20},${Math.random()*.04})`;c.fillRect(Math.random()*400,Math.random()*300,Math.random()*2,Math.random()*2);}
  c.strokeStyle='rgba(120,108,90,.28)';c.lineWidth=1.2;c.setLineDash([8,7]);c.strokeRect(14,14,372,272);
  c.fillStyle='rgba(80,65,48,.35)';c.font='bold 52px Georgia,serif';c.textAlign='center';c.fillText(id.toString(),200,165);
  c.fillStyle='rgba(120,108,90,.4)';c.font='italic 16px Georgia,serif';c.fillText('موقع رقم '+id,200,208);
  return cv;
}

// ── Component ────────────────────────────────────────────────────
export default function Gallery() {
  const mountRef   = useRef(null);
  const stateRef   = useRef({yaw:0,pitch:0,keys:{},isLocked:false,joystick:{active:false,dx:0,dy:0},lookTouch:{active:false,id:null,lastX:0,lastY:0},pos:{x:0,z:19}});
  const sceneRef   = useRef(null);
  const cameraRef  = useRef(null);
  const THREERef   = useRef(null);
  const avatarsRef = useRef({});

  const [photos,setPhotos]         = useState([]);
  const [entered,setEntered]       = useState(false);
  const [visitorName,setVisitorName] = useState('');
  const [nameInput,setNameInput]   = useState('');
  const [photoInfo,setPhotoInfo]   = useState(null);
  const [locked,setLocked]         = useState(false);
  const [isMobile,setIsMobile]     = useState(false);
  const [loading,setLoading]       = useState(false);
  const [fullscreen,setFullscreen] = useState(null);
  const [visitors,setVisitors]     = useState([]);
  const [visitorError,setVisitorError] = useState(false);
  const jZoneRef=useRef(null),jKnobRef=useRef(null);
  const presRef=useRef(null),pollRef=useRef(null);

  useEffect(()=>{
    setIsMobile('ontouchstart' in window||navigator.maxTouchPoints>0);
    fetch('/api/photos').then(r=>r.json()).then(d=>setPhotos(Array.isArray(d)?d:[])).catch(()=>{});
  },[]);

  // ── Visitor presence ─────────────────────────────────────────
  const broadcast=useCallback(async(name)=>{
    const s=stateRef.current;
    try{
      await fetch('/api/visitors',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({visitor_id:getVid(),name,x:s.pos.x,z:s.pos.z,yaw:s.yaw})});
    }catch(e){}
  },[]);

  const poll=useCallback(async()=>{
    try{
      const r=await fetch('/api/visitors');
      if(!r.ok) return; // silent - don't update state on error
      const d=await r.json();
      setVisitors((Array.isArray(d)?d:[]).filter(v=>v.visitor_id!==getVid()));
    }catch(e){/* silent */}
  },[]);

  useEffect(()=>{
    if(!entered||!visitorName) return;
    broadcast(visitorName);
    presRef.current=setInterval(()=>broadcast(visitorName),2500);
    pollRef.current=setInterval(poll,2500);
    poll();
    return ()=>{
      clearInterval(presRef.current);clearInterval(pollRef.current);
      fetch('/api/visitors',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor_id:getVid()})}).catch(()=>{});
    };
  },[entered,visitorName,broadcast,poll]);

  // ── Update avatar meshes ─────────────────────────────────────
  useEffect(()=>{
    const scene=sceneRef.current;
    const T=THREERef.current;
    if(!scene||!T) return;
    const activeIds=new Set(visitors.map(v=>v.visitor_id));
    Object.keys(avatarsRef.current).forEach(id=>{
      if(!activeIds.has(id)){scene.remove(avatarsRef.current[id]);delete avatarsRef.current[id];}
    });
    visitors.forEach((v,i)=>{
      if(!avatarsRef.current[v.visitor_id]){
        const av=createAvatar(T,v.name,i);
        avatarsRef.current[v.visitor_id]=av;scene.add(av);
      }
      const av=avatarsRef.current[v.visitor_id];
      av.position.set(v.x,0,v.z);av.rotation.y=v.yaw+Math.PI;
    });
  },[visitors]);

  function createAvatar(T,name,ci){
    const col=AVATAR_COLORS[ci%AVATAR_COLORS.length];
    const g=new T.Group();
    const bM=new T.MeshStandardMaterial({color:col,roughness:.7,metalness:.1});
    const hM=new T.MeshStandardMaterial({color:0xfddbb4,roughness:.8});
    const haM=new T.MeshStandardMaterial({color:0x2a1a0a,roughness:.9});
    const lM=new T.MeshStandardMaterial({color:0x1a1a2e,roughness:.8});
    // Body
    const body=new T.Mesh(new T.CylinderGeometry(.22,.22,.88,14),bM);body.position.y=.64;g.add(body);
    // Shoulders
    const sh=new T.Mesh(new T.SphereGeometry(.23,12,8),bM);sh.position.y=1.08;g.add(sh);
    // Head
    const head=new T.Mesh(new T.SphereGeometry(.19,14,10),hM);head.position.y=1.52;g.add(head);
    // Hair
    const hair=new T.Mesh(new T.SphereGeometry(.2,14,8,0,Math.PI*2,0,Math.PI*.5),haM);hair.position.y=1.52;g.add(hair);
    // Legs
    [-.1,.1].forEach(lx=>{
      const leg=new T.Mesh(new T.CylinderGeometry(.082,.082,.52,10),lM);leg.position.set(lx,.26,0);g.add(leg);
      const shoe=new T.Mesh(new T.BoxGeometry(.11,.055,.2),lM);shoe.position.set(lx,.01,.04);g.add(shoe);
    });
    // Name label (billboard)
    const cv=document.createElement('canvas');cv.width=256;cv.height=68;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='rgba(0,0,0,0.78)';ctx.beginPath();ctx.roundRect(0,0,256,68,34);ctx.fill();
    ctx.fillStyle='#'+col.toString(16).padStart(6,'0');ctx.beginPath();ctx.arc(34,34,11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.font='bold 26px Segoe UI,Tahoma,sans-serif';ctx.textAlign='center';ctx.fillText(name.slice(0,14),136,43);
    const tex=new T.CanvasTexture(cv);
    const label=new T.Mesh(new T.PlaneGeometry(.9,.24),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide}));
    label.position.y=2.08;label.userData.isBillboard=true;
    g.add(label);g.castShadow=true;
    return g;
  }

  // ── Main scene ───────────────────────────────────────────────
  useEffect(()=>{
    if(!entered||!visitorName) return;
    setLoading(true);
    const s=stateRef.current;
    let animId,renderer;

    (async()=>{
      // ── Dynamic import of Three.js ──────────────────────────
      const THREE=await import('three');
      THREERef.current=THREE;

      const scene=new THREE.Scene();
      scene.background=new THREE.Color(0x9e9890); // medium warm gray — NOT white
      scene.fog=new THREE.Fog(0x9e9890,24,54);
      sceneRef.current=scene;

      const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.05,80);
      s.pos={x:0,z:19};camera.position.set(0,1.72,19);
      cameraRef.current=camera;

      renderer=new THREE.WebGLRenderer({antialias:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      renderer.setSize(innerWidth,innerHeight);
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      // NO tone mapping — pure linear colors look correct
      renderer.toneMapping=THREE.LinearToneMapping;
      renderer.toneMappingExposure=1.0;
      mountRef.current?.appendChild(renderer.domElement);

      // ── Shared textures (only 4 total) ──────────────────────
      const wallTex=new THREE.CanvasTexture(mkWall());
      wallTex.wrapS=wallTex.wrapT=THREE.RepeatWrapping;wallTex.repeat.set(5,2);

      const floorTex=new THREE.CanvasTexture(mkFloor());
      floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(7,11);

      const carpetTex=new THREE.CanvasTexture(mkCarpet());
      carpetTex.wrapS=carpetTex.wrapT=THREE.RepeatWrapping;carpetTex.repeat.set(1,4);

      // ── Shared materials (NO per-object texture) ────────────
      const M={
        wall:   new THREE.MeshStandardMaterial({map:wallTex,roughness:.92,metalness:0}),
        floor:  new THREE.MeshStandardMaterial({map:floorTex,roughness:.5,metalness:.06}),
        ceil:   new THREE.MeshStandardMaterial({color:0xddd6cc,roughness:.95}),
        carpet: new THREE.MeshStandardMaterial({map:carpetTex,roughness:.9}),
        mold:   new THREE.MeshStandardMaterial({color:0xc8c0b0,roughness:.6,metalness:.03}),
        base:   new THREE.MeshStandardMaterial({color:0xb8b0a0,roughness:.65}),
        track:  new THREE.MeshStandardMaterial({color:0x181820,roughness:.1,metalness:.97}),
        cone:   new THREE.MeshStandardMaterial({color:0x0e0e16,roughness:.06,metalness:.98}),
        lens:   new THREE.MeshStandardMaterial({color:0xfffce0,emissive:0xfffce0,emissiveIntensity:2.4,roughness:0,metalness:0}),
        gold:   new THREE.MeshStandardMaterial({color:0xc8a820,roughness:.14,metalness:.9}),
        pillar: new THREE.MeshStandardMaterial({color:0xd8d0c4,roughness:.55,metalness:.04}),
        wain:   new THREE.MeshStandardMaterial({color:0x1e1c18,roughness:.92}),
        dark:   new THREE.MeshStandardMaterial({color:0x0e0c0a,roughness:.9}),
        brass:  new THREE.MeshStandardMaterial({color:0xb89030,roughness:.12,metalness:.93}),
        shade:  new THREE.MeshStandardMaterial({color:0x080810,roughness:.06,metalness:.97}),
        seat:   new THREE.MeshStandardMaterial({color:0xb89658,roughness:.62,metalness:.02}),
        leg:    new THREE.MeshStandardMaterial({color:0x1a1a24,roughness:.12,metalness:.92}),
      };

      const box=(w,h,d,mat,px,py,pz)=>{
        const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
        m.position.set(px,py,pz);m.receiveShadow=m.castShadow=true;scene.add(m);return m;
      };

      // ── Room constants ──────────────────────────────────────
      const MHW=28,MHL=20.5,MHH=6.5,CW=8,CL=15,CH=8.5,CZ=12.5;

      // MAIN HALL
      box(MHW,.22,MHL,M.floor, 0,-.11,-.75);
      box(MHW,.1, MHL,M.ceil,  0,MHH, -.75);
      box(.25,MHH,MHL,M.wall, -14,MHH/2,-.75);
      box(.25,MHH,MHL,M.wall,  14,MHH/2,-.75);
      box(MHW,MHH,.25,M.wall,   0,MHH/2,-13.88);
      box(10, MHH,.25,M.wall,  -9,MHH/2, 6.38);
      box(10, MHH,.25,M.wall,   9,MHH/2, 6.38);
      box(.22,MHH,11,M.wall,   -7,MHH/2,-7);
      box(.22,MHH,11,M.wall,    7,MHH/2,-7);

      // CORRIDOR
      box(CW,.22,CL,M.floor,  0,-.11,CZ);
      box(CW,.1, CL,M.ceil,   0,CH,  CZ);
      box(.25,CH,CL,M.wall,  -4,CH/2,CZ);
      box(.25,CH,CL,M.wall,   4,CH/2,CZ);
      box(CW, CH,.25,M.wall,  0,CH/2,20.5);

      // ARCH + PILLARS
      box(1.2,MHH,1.2,M.pillar,-5,MHH/2,6);
      box(1.2,MHH,1.2,M.pillar, 5,MHH/2,6);
      box(10.4,.8,1.2,M.pillar, 0,MHH-.4,6);
      box(10.4,.2,1.4,M.mold,   0,MHH-.82,6);

      // RED CARPET
      box(4,.025,CL-1,M.carpet, 0,.01,CZ);
      box(5,.025,6,   M.carpet, 0,.01,3);
      box(4.3,.025,.08,M.gold,  0,.005,CZ-CL/2+.5);
      box(4.3,.025,.08,M.gold,  0,.005,CZ+CL/2-.5);
      box(.08,.025,CL,M.gold,  -2.18,.005,CZ);
      box(.08,.025,CL,M.gold,   2.18,.005,CZ);

      // BASEBOARDS
      [[MHL,true,-14,-.75],[MHL,true,14,-.75],[MHW,false,0,-13.88],[10,false,-9,6.38],[10,false,9,6.38],[CL,true,-4,CZ],[CL,true,4,CZ]]
      .forEach(([w,rot,px,pz])=>{
        if(rot){box(.09,.26,w,M.base,px,.13,pz);box(.1,.055,w,M.mold,px,.275,pz);}
        else{box(w,.26,.09,M.base,px,.13,pz);box(w,.055,.1,M.mold,px,.275,pz);}
      });

      // CROWN MOLDING
      [[MHW,MHH,0,-.75,MHL],[CW,CH,0,CZ,CL]].forEach(([w,h,px,pz,l])=>{
        box(w,.18,.1,M.mold,px,h-.09,pz-l/2+.12);box(w,.18,.1,M.mold,px,h-.09,pz+l/2-.12);
      });

      // WAINSCOTING (dark lower panels)
      box(MHL,1.1,.18,M.wain,-14,.55,-.75);box(MHL,1.1,.18,M.wain,14,.55,-.75);
      box(MHW,1.1,.18,M.wain,0,.55,-13.88);
      box(CL,1.1,.18,M.wain,-4,.55,CZ);box(CL,1.1,.18,M.wain,4,.55,CZ);

      // FLOOR INLAY BORDER
      const inM=new THREE.MeshStandardMaterial({color:0x5a5040,roughness:.45,metalness:.1});
      box(MHW-1,.015,.1,inM,0,.01,-13.38);box(MHW-1,.015,.1,inM,0,.01,5.88);
      box(.1,.015,MHL-1,inM,-13.38,.01,-.75);box(.1,.015,MHL-1,inM,13.38,.01,-.75);

      // CEILING TRACK LIGHTS
      const addSpots=(xs,zs,h)=>{
        xs.forEach(rx=>{
          const rail=new THREE.Mesh(new THREE.BoxGeometry(.042,.03,Math.abs(zs[zs.length-1]-zs[0])+2),M.track);
          rail.position.set(rx,h-.025,(zs[0]+zs[zs.length-1])/2);scene.add(rail);
          zs.forEach(rz=>{
            const g=new THREE.Group();g.position.set(rx,h-.025,rz);
            const ad=new THREE.Mesh(new THREE.BoxGeometry(.06,.046,.06),M.track);ad.position.y=-.023;g.add(ad);
            const st=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.24,8),M.track);st.position.y=-.145;g.add(st);
            const kn=new THREE.Mesh(new THREE.SphereGeometry(.019,8,8),M.track);kn.position.y=-.275;g.add(kn);
            const ho=new THREE.Mesh(new THREE.CylinderGeometry(.024,.088,.2,16,1,true),M.cone);ho.position.y=-.4;g.add(ho);
            const tc=new THREE.Mesh(new THREE.CircleGeometry(.024,16),M.cone);tc.rotation.x=Math.PI/2;tc.position.y=-.3;g.add(tc);
            const ln=new THREE.Mesh(new THREE.CircleGeometry(.07,20),M.lens);ln.rotation.x=Math.PI/2;ln.position.y=-.505;g.add(ln);
            const lr=new THREE.Mesh(new THREE.TorusGeometry(.074,.006,8,20),M.cone);lr.rotation.x=Math.PI/2;lr.position.y=-.505;g.add(lr);
            scene.add(g);
            const spot=new THREE.SpotLight(0xfff8f0,2.2,18,Math.PI/7,.22,1.3);
            spot.position.set(rx,h-.52,rz);spot.target.position.set(rx,0,rz);
            spot.castShadow=true;spot.shadow.mapSize.set(256,256);spot.shadow.bias=-.002;
            scene.add(spot);scene.add(spot.target);
          });
        });
      };
      addSpots([-1.5,1.5],[8,13,18],CH);
      addSpots([-9,0,9],[-12,-7,-2,3],MHH);

      // LIGHTING — calibrated for visible walls
      scene.add(new THREE.AmbientLight(0xfff0e0,.45));
      scene.add(new THREE.HemisphereLight(0xfff0e0,0xb0a898,.35));
      const fill=new THREE.PointLight(0xfff0e0,.5,26,2);fill.position.set(0,3,13);scene.add(fill);

      // WELCOME PLAQUE
      const PW=6.5,PH=3.8,bw=.18,fd=.1;
      const pG=new THREE.Group();pG.position.set(0,3.2,7.5);
      [[-PW/2-bw/2,PH/2+bw/2],[PW/2+bw/2,PH/2+bw/2],[-PW/2-bw/2,-PH/2-bw/2],[PW/2+bw/2,-PH/2-bw/2]].forEach(([x,y])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(bw,bw,fd+.04),M.gold);b.position.set(x,y,fd/2);pG.add(b);});
      const pTop=new THREE.Mesh(new THREE.BoxGeometry(PW+bw*2,bw,fd),M.gold);pTop.position.set(0,PH/2+bw/2,fd/2);pG.add(pTop);
      const pBot=new THREE.Mesh(new THREE.BoxGeometry(PW+bw*2,bw,fd),M.gold);pBot.position.set(0,-PH/2-bw/2,fd/2);pG.add(pBot);
      const pL2=new THREE.Mesh(new THREE.BoxGeometry(bw,PH,fd),M.gold);pL2.position.set(-PW/2-bw/2,0,fd/2);pG.add(pL2);
      const pR2=new THREE.Mesh(new THREE.BoxGeometry(bw,PH,fd),M.gold);pR2.position.set(PW/2+bw/2,0,fd/2);pG.add(pR2);
      const pTex=new THREE.CanvasTexture(mkPlaque());
      const pMesh=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),new THREE.MeshStandardMaterial({map:pTex,roughness:.75}));
      pMesh.position.z=fd+.01;pG.add(pMesh);
      const pBk=new THREE.Mesh(new THREE.BoxGeometry(PW+bw*2+.04,PH+bw*2+.04,.04),M.dark);pBk.position.z=-.01;pG.add(pBk);
      const pLt=new THREE.SpotLight(0xfff5c0,2.0,8,Math.PI/9,.28,1.8);pLt.position.set(0,PH/2+1,2);pLt.target.position.set(0,0,0);pG.add(pLt);pG.add(pLt.target);
      scene.add(pG);

      // BENCHES
      [[0,-5],[0,-11],[-10,-5],[10,-5],[0,2]].forEach(([bx,bz])=>{
        const g=new THREE.Group();g.position.set(bx,0,bz);
        [-0.13,0,.13].forEach(oz=>{const p=new THREE.Mesh(new THREE.BoxGeometry(2,.06,.16),M.seat);p.position.set(0,.465,oz);p.castShadow=p.receiveShadow=true;g.add(p);});
        [-.78,.78].forEach(lx=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.05,.46,.44),M.leg);l.position.set(lx,.23,0);l.castShadow=true;g.add(l);});
        const str=new THREE.Mesh(new THREE.BoxGeometry(1.6,.03,.03),M.leg);str.position.y=.11;g.add(str);
        scene.add(g);
      });

      // ── ARTWORKS ──────────────────────────────────────────────
      const pm={};photos.forEach(p=>{pm[p.position_index]=p;});
      const hitGroups=[];

      const buildFrame=(group,fw,fh,col)=>{
        const fMat=new THREE.MeshStandardMaterial({color:col,roughness:.5,metalness:.05});
        const sMat=new THREE.MeshStandardMaterial({color:Math.max(0,col-0x303030),roughness:.68,metalness:.01});
        const mats=[sMat,sMat,sMat,sMat,fMat,sMat];
        const bw=.15,fd=.06;
        [{w:fw+bw*2,h:bw,x:0,y:fh/2+bw/2},{w:fw+bw*2,h:bw,x:0,y:-fh/2-bw/2},{w:bw,h:fh,x:-fw/2-bw/2,y:0},{w:bw,h:fh,x:fw/2+bw/2,y:0}]
        .forEach(b=>{const m=new THREE.Mesh(new THREE.BoxGeometry(b.w,b.h,fd),mats);m.position.set(b.x,b.y,fd/2);m.castShadow=true;group.add(m);});
        // Gap
        const gM=new THREE.MeshStandardMaterial({color:0x040404,roughness:1});
        [{w:fw+bw*2,h:.01,x:0,y:fh/2},{w:fw+bw*2,h:.01,x:0,y:-fh/2},{w:.01,h:fh,x:-fw/2,y:0},{w:.01,h:fh,x:fw/2,y:0}]
        .forEach(b=>{const m=new THREE.Mesh(new THREE.BoxGeometry(b.w,b.h,.02),gM);m.position.set(b.x,b.y,.08);group.add(m);});
        // Mat
        const mBW=.04,matM=new THREE.MeshStandardMaterial({color:0xf2eee8,roughness:.92});
        [{w:fw+mBW*2,h:mBW,x:0,y:fh/2+mBW/2},{w:fw+mBW*2,h:mBW,x:0,y:-fh/2-mBW/2},{w:mBW,h:fh,x:-fw/2-mBW/2,y:0},{w:mBW,h:fh,x:fw/2+mBW/2,y:0}]
        .forEach(b=>{const m=new THREE.Mesh(new THREE.BoxGeometry(b.w,b.h,.006),matM);m.position.set(b.x,b.y,.072);group.add(m);});
        // back panel — plain mesh, no Object.assign on position
        // back
        const bk=new THREE.Mesh(new THREE.BoxGeometry(fw+bw*2+.02,fh+bw*2+.02,.01),M.dark);bk.position.z=-.003;group.add(bk);
      };

      const addPicLight=(group,fw,fh,lit)=>{
        const glM=new THREE.MeshStandardMaterial({color:0xfff8e0,emissive:0xfff8e0,emissiveIntensity:lit?1.8:.06,roughness:0,metalness:0});
        const g=new THREE.Group();g.position.set(0,fh/2+.2,.12);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(fw*.44,.048,.036),M.brass));
        const arm=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.14,8),M.brass);arm.rotation.x=Math.PI/2;arm.position.z=.07;g.add(arm);
        const sh=new THREE.Mesh(new THREE.CylinderGeometry(.04,.072,fw*.38,16,1,true,0,Math.PI),M.shade);sh.rotation.x=-Math.PI/2;sh.position.z=.14;g.add(sh);
        const sc=new THREE.Mesh(new THREE.PlaneGeometry(fw*.38,.08),M.shade);sc.position.z=.14;g.add(sc);
        const gl=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,fw*.32,8),glM);gl.rotation.z=Math.PI/2;gl.position.set(0,.025,.14);g.add(gl);
        [-fw*.16,fw*.16].forEach(ex=>{const ec=new THREE.Mesh(new THREE.BoxGeometry(.004,.07,.07),M.shade);ec.position.set(ex,.02,.14);g.add(ec);});
        group.add(g);
        if(lit){
          const pl=new THREE.SpotLight(0xffffff,3.5,7,Math.PI/9,.2,1.8);
          pl.position.set(0,fh/2+.28,.32);pl.target.position.set(0,-fh*.26,.06);
          group.add(pl);group.add(pl.target);
        }
      };

      const addLabel=(group,slotId,fh,hasPhoto)=>{
        const cv=document.createElement('canvas');cv.width=160;cv.height=54;
        const ctx=cv.getContext('2d');
        ctx.fillStyle=hasPhoto?'rgba(14,11,8,.9)':'rgba(80,74,66,.72)';
        ctx.beginPath();ctx.roundRect(0,0,160,54,27);ctx.fill();
        const sh=ctx.createLinearGradient(0,0,0,27);sh.addColorStop(0,'rgba(255,255,255,.12)');sh.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sh;ctx.beginPath();ctx.roundRect(0,0,160,27,27);ctx.fill();
        ctx.fillStyle=hasPhoto?'#fff':'#b8b0a8';ctx.font='bold 24px -apple-system,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('#'+slotId,80,36);
        const t=new THREE.CanvasTexture(cv);
        const sp=new THREE.Mesh(new THREE.PlaneGeometry(.5,.17),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));
        sp.position.set(0,fh/2+.62,.08);group.add(sp);
      };

      for(const slot of SLOTS){
        const ph=pm[slot.id];
        const group=new THREE.Group();
        group.position.set(...slot.pos);group.rotation.y=slot.rotY;

        await new Promise(resolve=>{
          const finish=(fw,fh,tex,hasPhoto)=>{
            buildFrame(group,fw,fh,FRAME_COLORS[slot.id%FRAME_COLORS.length]);
            const img=new THREE.Mesh(new THREE.PlaneGeometry(fw,fh),new THREE.MeshStandardMaterial({map:tex,roughness:.82}));
            img.position.z=.066;group.add(img);
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
              const mH=2.1,mW=3.0;
              const fw=asp>=1?Math.min(mW,asp*mH):mH*asp,fh=asp>=1?fw/asp:mH;
              const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;
              cv.getContext('2d').drawImage(img,0,0);
              finish(fw,fh,new THREE.CanvasTexture(cv),true);
            };
            img.onerror=()=>finish(2.0,1.5,new THREE.CanvasTexture(mkPlaceholder(slot.id)),false);
            img.src=ph.image_url;
          } else finish(2.0,1.5,new THREE.CanvasTexture(mkPlaceholder(slot.id)),false);
        });
      }

      // ── Controls ──────────────────────────────────────────────
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

      // ── Render loop ───────────────────────────────────────────
      const rc=new THREE.Raycaster();let last=performance.now();
      const loop=()=>{
        animId=requestAnimationFrame(loop);
        const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
        if(s.isLocked||isMobile){
          const spd=s.keys['ShiftLeft']?7:4;
          const fw3=new THREE.Vector3(-Math.sin(s.yaw),0,-Math.cos(s.yaw));
          const rt3=new THREE.Vector3(Math.cos(s.yaw),0,-Math.sin(s.yaw));
          const mv=new THREE.Vector3();
          if(s.keys['KeyW']||s.keys['ArrowUp'])    mv.addScaledVector(fw3, spd*dt);
          if(s.keys['KeyS']||s.keys['ArrowDown'])  mv.addScaledVector(fw3,-spd*dt);
          if(s.keys['KeyA']||s.keys['ArrowLeft'])  mv.addScaledVector(rt3,-spd*dt);
          if(s.keys['KeyD']||s.keys['ArrowRight']) mv.addScaledVector(rt3, spd*dt);
          if(s.joystick.active){mv.addScaledVector(fw3,-s.joystick.dy/40*3.5*dt);mv.addScaledVector(rt3,s.joystick.dx/40*3.5*dt);}
          camera.position.add(mv);
          camera.position.x=Math.max(-13.4,Math.min(13.4,camera.position.x));
          camera.position.z=Math.max(-13.8,Math.min(20,camera.position.z));
          camera.position.y=1.72;
          s.pos={x:camera.position.x,z:camera.position.z};
          camera.rotation.order='YXZ';camera.rotation.y=s.yaw;camera.rotation.x=s.pitch;
          rc.setFromCamera({x:0,y:0},camera);
          const hh=rc.intersectObjects(hitGroups,true);
          if(hh.length&&hh[0].distance<6.5){
            let obj=hh[0].object;while(obj&&!obj.userData?.hasPhoto)obj=obj.parent;
            if(obj?.userData?.hasPhoto)setPhotoInfo({title:obj.userData.title,sub:obj.userData.sub,imageUrl:obj.userData.imageUrl});
            else setPhotoInfo(null);
          } else setPhotoInfo(null);
        }
        // Billboard labels
        Object.values(avatarsRef.current).forEach(av=>{
          av.children.forEach(ch=>{if(ch.userData?.isBillboard)ch.rotation.y=camera.rotation.y-av.rotation.y;});
          // idle bob
          if(av.children[0])av.children[0].position.y=.64+Math.sin(now*.0018)*.012;
        });
        renderer.render(scene,camera);
      };loop();

      window.addEventListener('resize',()=>{if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
      setLoading(false);
    })();

    return()=>{
      cancelAnimationFrame(animId);
      document.exitPointerLock?.();
      renderer?.dispose();
      if(mountRef.current&&renderer?.domElement?.parentNode===mountRef.current)mountRef.current.removeChild(renderer.domElement);
      sceneRef.current=null;THREERef.current=null;avatarsRef.current={};
    };
  },[entered,visitorName,photos]);

  // Joystick
  const onJoyStart=useCallback(e=>{e.preventDefault();stateRef.current.joystick={active:true,dx:0,dy:0};if(jKnobRef.current)jKnobRef.current.style.transform='translate(-50%,-50%)';},[]);
  const onJoyMove=useCallback(e=>{e.preventDefault();const s=stateRef.current;if(!s.joystick.active)return;const t=e.changedTouches[0];const z=jZoneRef.current?.getBoundingClientRect();if(!z)return;const cx=z.left+z.width/2,cy=z.top+z.height/2;let dx=t.clientX-cx,dy=t.clientY-cy;const mR=42,d=Math.sqrt(dx*dx+dy*dy);if(d>mR){dx=dx/d*mR;dy=dy/d*mR;}s.joystick.dx=dx;s.joystick.dy=dy;if(jKnobRef.current)jKnobRef.current.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;},[]);
  const onJoyEnd=useCallback(e=>{e.preventDefault();stateRef.current.joystick={active:false,dx:0,dy:0};if(jKnobRef.current)jKnobRef.current.style.transform='translate(-50%,-50%)';},[]);
  useEffect(()=>{const z=jZoneRef.current;if(!z||!entered)return;z.addEventListener('touchstart',onJoyStart,{passive:false});z.addEventListener('touchmove',onJoyMove,{passive:false});z.addEventListener('touchend',onJoyEnd,{passive:false});return()=>{z.removeEventListener('touchstart',onJoyStart);z.removeEventListener('touchmove',onJoyMove);z.removeEventListener('touchend',onJoyEnd);};},[entered,onJoyStart,onJoyMove,onJoyEnd]);

  const FF={fontFamily:'Segoe UI,Tahoma,sans-serif'};

  return(
    <>
      <Head>
        <title>معرض الفوتوغرافيا — AnwarBMA</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
      </Head>
      <div ref={mountRef} style={{width:'100vw',height:'100dvh',touchAction:'none'}}/>

      {/* LOADING */}
      {entered&&loading&&(
        <div style={{position:'fixed',inset:0,zIndex:300,background:'#9e9890',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif'}}>
          <div style={{width:54,height:54,border:'2px solid #c8a820',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',marginBottom:22}}/>
          <p style={{color:'#2a2218',letterSpacing:'.2em',fontSize:'.82rem'}}>جاري تحميل المعرض...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* NAME ENTRY */}
      {!entered&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'linear-gradient(155deg,#eee8e0 0%,#e4ddd5 55%,#dad5cc 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',...FF,padding:20,overflowY:'auto'}}>
          {[[-175,-115,225],[155,138,182],[-98,172,152],[145,-192,165]].map(([x,y,sz],i)=>(
            <div key={i} style={{position:'absolute',left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,width:sz,height:sz,borderRadius:'50%',border:'1px solid rgba(148,132,105,.16)',transform:'translate(-50%,-50%)'}}/>
          ))}
          <div style={{position:'relative',textAlign:'center',maxWidth:450,width:'100%'}}>
            <div style={{width:52,height:52,margin:'0 auto 20px',border:'1.5px solid #a08868',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:26,height:26,background:'#8a7250'}}/>
            </div>
            <h1 style={{fontSize:'clamp(1.6rem,6vw,2.5rem)',fontWeight:400,letterSpacing:'.35em',color:'#1e1a12',marginBottom:4,fontFamily:'Georgia,serif'}}>GALLERY</h1>
            <div style={{width:48,height:1,background:'#a08868',margin:'10px auto'}}/>
            <p style={{color:'#78705e',fontSize:'clamp(.72rem,2.2vw,.88rem)',letterSpacing:'.14em',marginBottom:4}}>معرض الفوتوغرافيا الافتراضي</p>
            <p style={{color:'#a89880',fontSize:'.72rem',marginBottom:10}}>إعداد: أنور محمد — AnwarBMA</p>
            <p style={{color:'#a89880',fontSize:'.7rem',marginBottom:28}}>{photos.length} عمل فني · 23 موقع</p>

            <div style={{background:'rgba(255,250,244,.88)',border:'1px solid #d8d0c0',borderRadius:10,padding:'20px 22px',marginBottom:22,textAlign:'right'}}>
              <label style={{display:'block',fontSize:'.78rem',color:'#78705e',marginBottom:9,letterSpacing:'.06em'}}>اكتب اسمك لتظهر شخصيتك في المعرض للزوار الآخرين</label>
              <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&nameInput.trim()){setVisitorName(nameInput.trim());setEntered(true);}}}
                placeholder="اسمك هنا..." maxLength={20}
                style={{width:'100%',padding:'11px 14px',border:'1.5px solid #d8d0c0',borderRadius:7,fontSize:'.96rem',color:'#1e1a12',background:'#faf8f4',outline:'none',textAlign:'right',fontFamily:'inherit',marginBottom:12}}
                autoFocus/>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{if(nameInput.trim()){setVisitorName(nameInput.trim());setEntered(true);}}} disabled={!nameInput.trim()}
                  style={{flex:1,background:nameInput.trim()?'#1e1a12':'#ddd5c8',color:nameInput.trim()?'#f4f0e6':'#a09888',border:'none',padding:'12px',fontSize:'.86rem',letterSpacing:'.15em',cursor:nameInput.trim()?'pointer':'not-allowed',fontFamily:'inherit',borderRadius:4,transition:'all .25s'}}>
                  دخول المعرض →
                </button>
                <button onClick={()=>{const n='زائر'+Math.floor(Math.random()*9999);setNameInput(n);setVisitorName(n);setEntered(true);}}
                  style={{background:'transparent',border:'1.5px solid #d8d0c0',color:'#988880',padding:'12px 14px',cursor:'pointer',borderRadius:4,fontSize:'.76rem',...FF}}>
                  익명
                </button>
              </div>
            </div>

            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:20}}>
              {(isMobile?[['↕↔ يسار','تحرك'],['سحب يمين','انظر']]:[['W A S D','التحرك'],['ماوس','النظر'],['Shift','ركض']]).map(([k,l])=>(
                <div key={k} style={{textAlign:'center'}}>
                  <div style={{background:'rgba(255,250,242,.85)',border:'1px solid #d5cdc0',padding:'4px 10px',fontSize:'.7rem',color:'#2a2010',fontFamily:'monospace',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:'.63rem',color:'#a09888'}}>{l}</div>
                </div>
              ))}
            </div>
            <a href="/admin/login" style={{color:'#a09070',fontSize:'.7rem',letterSpacing:'.1em',textDecoration:'none',borderBottom:'1px solid #c0b8a0',paddingBottom:1}}>⚙ لوحة الإدارة</a>
          </div>
        </div>
      )}

      {/* CROSSHAIR */}
      {entered&&locked&&!isMobile&&(<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:20,height:20,pointerEvents:'none',zIndex:50}}><div style={{position:'absolute',width:1,height:20,background:'rgba(255,250,238,.52)',left:9.5,top:0}}/><div style={{position:'absolute',width:20,height:1,background:'rgba(255,250,238,.52)',left:0,top:9.5}}/><div style={{position:'absolute',width:4,height:4,borderRadius:'50%',background:'rgba(255,250,238,.68)',left:8,top:8}}/></div>)}
      {entered&&isMobile&&(<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:7,height:7,borderRadius:'50%',background:'rgba(255,250,238,.55)',pointerEvents:'none',zIndex:50}}/>)}

      {/* PHOTO INFO */}
      {entered&&photoInfo&&(
        <div style={{position:'fixed',bottom:isMobile?172:60,left:'50%',transform:'translateX(-50%)',zIndex:50,cursor:photoInfo.imageUrl?'pointer':'default'}}
          onClick={()=>photoInfo.imageUrl&&setFullscreen(photoInfo)}>
          <div style={{background:'rgba(12,10,7,.86)',backdropFilter:'blur(10px)',border:'1px solid rgba(200,168,80,.15)',padding:'11px 26px',color:'#f2ece2',textAlign:'center',fontFamily:'Georgia,serif'}}>
            <div style={{fontWeight:400,fontSize:'.93rem',marginBottom:3}}>{photoInfo.title}</div>
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
            <div style={{color:'#f2ece2',fontSize:'1.05rem',fontFamily:'Georgia,serif',marginBottom:4}}>{fullscreen.title}</div>
            <div style={{color:'#a09070',fontSize:'.76rem',...FF,letterSpacing:'.12em'}}>{fullscreen.sub}</div>
          </div>
          <div style={{position:'absolute',top:20,right:24,color:'rgba(255,250,238,.38)',fontSize:'1.5rem',cursor:'pointer'}}>✕</div>
        </div>
      )}

      {/* HUD */}
      {entered&&!isMobile&&(<div style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',fontSize:'.65rem',color:'rgba(255,250,238,.25)',letterSpacing:'.15em',pointerEvents:'none',zIndex:50,...FF}}>{locked?'ESC للتوقف · Shift للركض':'انقر على المشهد للتحكم'}</div>)}

      {/* VISITORS */}
      {entered&&visitors.length>0&&!visitorError&&(
        <div style={{position:'fixed',top:60,left:14,zIndex:50,background:'rgba(12,10,7,.74)',backdropFilter:'blur(8px)',border:'1px solid rgba(200,168,80,.14)',padding:'10px 14px',borderRadius:8,minWidth:148}}>
          <div style={{fontSize:'.6rem',color:'#a88c60',letterSpacing:'.12em',marginBottom:7,...FF}}>زوار الآن</div>
          {visitors.map((v,i)=>(
            <div key={v.visitor_id} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
              <div style={{width:9,height:9,borderRadius:'50%',background:'#'+AVATAR_COLORS[i%AVATAR_COLORS.length].toString(16).padStart(6,'0'),flexShrink:0}}/>
              <div style={{fontSize:'.74rem',color:'#ddd4c2',...FF,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',maxWidth:108}}>{v.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* MY BADGE */}
      {entered&&visitorName&&(
        <div style={{position:'fixed',top:60,right:14,zIndex:50,background:'rgba(12,10,7,.74)',backdropFilter:'blur(8px)',border:'1px solid rgba(200,168,80,.14)',padding:'8px 14px',borderRadius:8,...FF,fontSize:'.72rem',color:'#ddd4c2'}}>
          👤 {visitorName}
        </div>
      )}

      {/* TOP BUTTONS */}
      {entered&&(
        <div style={{position:'fixed',top:14,right:14,zIndex:50,display:'flex',gap:8}}>
          <a href="/admin/login" target="_blank" style={{background:'rgba(14,12,8,.78)',border:'1px solid rgba(200,170,100,.18)',color:'#d4cbb8',padding:isMobile?'9px 13px':'7px 13px',borderRadius:2,fontSize:'.7rem',letterSpacing:'.1em',textDecoration:'none',backdropFilter:'blur(6px)',...FF,WebkitTapHighlightColor:'transparent'}}>⚙ إدارة</a>
          <button onClick={()=>{document.exitPointerLock?.();setEntered(false);setLocked(false);}} style={{background:'rgba(14,12,8,.78)',border:'1px solid rgba(200,170,100,.18)',color:'#d4cbb8',padding:isMobile?'9px 13px':'7px 13px',cursor:'pointer',fontSize:'.7rem',letterSpacing:'.1em',borderRadius:2,backdropFilter:'blur(6px)',...FF,WebkitTapHighlightColor:'transparent'}}>← خروج</button>
        </div>
      )}

      {/* JOYSTICK */}
      {entered&&isMobile&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,height:155,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px 16px',pointerEvents:'none',background:'linear-gradient(to top,rgba(12,10,7,.36),transparent)'}}>
          <div style={{pointerEvents:'auto'}}>
            <div ref={jZoneRef} style={{width:115,height:115,borderRadius:'50%',background:'rgba(255,250,238,.1)',border:'1.5px solid rgba(255,250,238,.24)',backdropFilter:'blur(4px)',position:'relative',touchAction:'none',WebkitTapHighlightColor:'transparent'}}>
              <div style={{position:'absolute',width:1,height:'55%',background:'rgba(255,250,238,.14)',left:'50%',top:'22.5%'}}/><div style={{position:'absolute',height:1,width:'55%',background:'rgba(255,250,238,.14)',top:'50%',left:'22.5%'}}/>
              <div ref={jKnobRef} style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:46,height:46,borderRadius:'50%',background:'rgba(255,250,238,.62)',border:'1.5px solid rgba(200,168,100,.42)',boxShadow:'0 2px 14px rgba(0,0,0,.2)'}}/>
            </div>
            <div style={{textAlign:'center',marginTop:5,fontSize:'.58rem',color:'rgba(255,250,238,.3)',letterSpacing:'.1em',...FF}}>تحرك</div>
          </div>
          <div style={{textAlign:'center',opacity:.3}}><div style={{fontSize:'1.3rem',marginBottom:4}}>👁</div><div style={{fontSize:'.58rem',color:'rgba(255,250,238,.48)',letterSpacing:'.1em',...FF}}>اسحب للنظر</div></div>
        </div>
      )}
    </>
  );
}

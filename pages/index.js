import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';

// ── Slots ────────────────────────────────────────────────────────
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
  0x6B3A1F,0xB8762A,0x111111,0x7A3020,0xD4A83A,
  0xC8A820,0xB8B8B8,0x3A2810,0x8B6010,0x4A2C10,
  0x6B3A1F,0xB8762A,0xD4A83A,0xC8A820,0x7A3020,
  0x111111,0xB8B8B8,0x8B6010,0x3A2810,0x4A2C10,
  0x6B3A1F,0xB8762A,0xD4A83A,
];

// Avatar colors per visitor
const AVATAR_COLORS = [
  0x3b82f6,0xef4444,0x10b981,0xf59e0b,0x8b5cf6,
  0xec4899,0x06b6d4,0x84cc16,0xf97316,0x6366f1,
];

// ── SINGLE shared canvas textures (created once) ─────────────────
function makeWallCanvas() {
  const cv = document.createElement('canvas'); cv.width=256; cv.height=256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#dad4ca'; ctx.fillRect(0,0,256,256);
  for(let i=0;i<2000;i++){
    ctx.fillStyle=Math.random()>.5?`rgba(255,248,238,${Math.random()*.018})`:`rgba(130,118,104,${Math.random()*.02})`;
    ctx.beginPath();ctx.arc(Math.random()*256,Math.random()*256,Math.random()*1.8+.2,0,Math.PI*2);ctx.fill();
  }
  return cv;
}

function makeFloorCanvas() {
  const cv = document.createElement('canvas'); cv.width=256; cv.height=256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#9e9080'; ctx.fillRect(0,0,256,256);
  for(let i=0;i<2000;i++){
    ctx.fillStyle=Math.random()>.5?`rgba(190,175,155,${Math.random()*.04})`:`rgba(55,44,32,${Math.random()*.035})`;
    ctx.beginPath();ctx.arc(Math.random()*256,Math.random()*256,Math.random()*2+.3,0,Math.PI*2);ctx.fill();
  }
  // Tile lines
  ctx.strokeStyle='rgba(55,44,32,0.22)'; ctx.lineWidth=2;
  [0,128,256].forEach(v=>{
    ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,256);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,v);ctx.lineTo(256,v);ctx.stroke();
  });
  return cv;
}

function makeCarpetCanvas() {
  const cv = document.createElement('canvas'); cv.width=128; cv.height=256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#8B0000'; ctx.fillRect(0,0,128,256);
  for(let i=0;i<1500;i++){
    ctx.fillStyle=Math.random()>.5?`rgba(170,15,15,${Math.random()*.1})`:`rgba(30,0,0,${Math.random()*.12})`;
    ctx.fillRect(Math.random()*128,Math.random()*256,Math.random()*2.5+.5,Math.random()*.7+.2);
  }
  ctx.fillStyle='rgba(210,170,50,0.65)';
  ctx.fillRect(5,0,3,256); ctx.fillRect(120,0,3,256);
  return cv;
}

function makePlaqueCanvas() {
  const W=1024,H=640;
  const cv = document.createElement('canvas'); cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#0d0c0a'; ctx.fillRect(0,0,W,H);
  for(let i=0;i<60;i++){
    ctx.strokeStyle=`rgba(${170+Math.random()*40},${160+Math.random()*30},${130+Math.random()*30},${Math.random()*.035+.008})`;
    ctx.lineWidth=Math.random()*2+.4;
    ctx.beginPath();const sx=Math.random()*W,sy=Math.random()*H;ctx.moveTo(sx,sy);
    ctx.bezierCurveTo(sx+(Math.random()*300-150),sy+(Math.random()*200-100),sx+(Math.random()*300-150),sy+(Math.random()*200-100),sx+(Math.random()*400-200),sy+(Math.random()*300-150));
    ctx.stroke();
  }
  ctx.strokeStyle='#c8a820';ctx.lineWidth=5;ctx.strokeRect(16,16,W-32,H-32);
  ctx.strokeStyle='#e8c840';ctx.lineWidth=1.2;ctx.strokeRect(26,26,W-52,H-52);

  const txt=(text,y,size,color,font='Georgia,serif')=>{ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textAlign='center';ctx.fillText(text,W/2,y);};
  txt('معرض الفوتوغرافيا الافتراضي', H*.16, W*.054, '#d4b040');
  txt('VIRTUAL PHOTOGRAPHY EXHIBITION', H*.23, W*.038, '#e8c850');
  ctx.strokeStyle='#c8a820';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(W*.14,H*.29);ctx.lineTo(W*.86,H*.29);ctx.stroke();
  txt('إعداد وإخراج', H*.37, W*.027, '#b0a898', 'Segoe UI,Tahoma,sans-serif');
  txt('أنور محمد  ·  AnwarBMA', H*.45, W*.036, '#e0d0a0');
  ctx.strokeStyle='rgba(200,168,32,0.3)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(W*.2,H*.51);ctx.lineTo(W*.8,H*.51);ctx.stroke();
  txt('بإشراف', H*.58, W*.024, '#a09880', 'Segoe UI,Tahoma,sans-serif');
  txt('رئيس قسم التصوير الضوئي', H*.645, W*.026, '#c0b8a8', 'Segoe UI,Tahoma,sans-serif');
  txt('عدنان الخمري', H*.71, W*.03, '#d8d0b8');
  ctx.strokeStyle='rgba(200,168,32,0.25)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(W*.25,H*.755);ctx.lineTo(W*.75,H*.755);ctx.stroke();
  txt('بإدارة', H*.81, W*.022, '#a09880', 'Segoe UI,Tahoma,sans-serif');
  txt('مدير جمعية الثقافة والفنون بالطائف', H*.865, W*.024, '#c0b8a8', 'Segoe UI,Tahoma,sans-serif');
  txt('فيصل الخديدي', H*.925, W*.03, '#d8d0b8');
  txt('✦  جمعية الثقافة والفنون — الطائف  ✦', H*.968, W*.022, 'rgba(200,168,32,0.55)', 'Segoe UI,Tahoma,sans-serif');
  return cv;
}

// ── Visitor ID ───────────────────────────────────────────────────
function getVisitorId() {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('gallery_visitor_id');
  if (!id) { id = Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem('gallery_visitor_id',id); }
  return id;
}

// ── Component ────────────────────────────────────────────────────
export default function Gallery() {
  const mountRef = useRef(null);
  const stateRef = useRef({
    yaw:0, pitch:0, keys:{}, isLocked:false,
    joystick:{active:false,dx:0,dy:0},
    lookTouch:{active:false,id:null,lastX:0,lastY:0},
    pos:{x:0,y:1.72,z:19},
  });
  const threeRef   = useRef({}); // shared THREE objects
  const avatarsRef = useRef({}); // visitorId -> Three.Group

  const [photos, setPhotos]       = useState([]);
  const [entered, setEntered]     = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [photoInfo, setPhotoInfo] = useState(null);
  const [locked, setLocked]       = useState(false);
  const [isMobile, setIsMobile]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [fullscreen, setFullscreen] = useState(null);
  const [visitors, setVisitors]   = useState([]);
  const jZoneRef = useRef(null), jKnobRef = useRef(null);
  const presenceTimer = useRef(null);
  const pollTimer     = useRef(null);

  useEffect(()=>{
    setIsMobile('ontouchstart' in window||navigator.maxTouchPoints>0);
    fetch('/api/photos').then(r=>r.json()).then(d=>setPhotos(Array.isArray(d)?d:[]));
  },[]);

  // ── Visitor presence broadcasting ────────────────────────────
  const broadcastPosition = useCallback(async (name)=>{
    const s = stateRef.current;
    await fetch('/api/visitors',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({visitor_id:getVisitorId(),name,x:s.pos.x,z:s.pos.z,yaw:s.yaw}),
    }).catch(()=>{});
  },[]);

  const pollVisitors = useCallback(async ()=>{
    const res = await fetch('/api/visitors').catch(()=>null);
    if(!res||!res.ok) return;
    const data = await res.json();
    const myId = getVisitorId();
    setVisitors(data.filter(v=>v.visitor_id!==myId));
  },[]);

  useEffect(()=>{
    if(!entered||!visitorName) return;
    broadcastPosition(visitorName);
    presenceTimer.current = setInterval(()=>broadcastPosition(visitorName),2000);
    pollTimer.current     = setInterval(pollVisitors,2000);
    pollVisitors();
    return ()=>{
      clearInterval(presenceTimer.current);
      clearInterval(pollTimer.current);
      fetch('/api/visitors',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor_id:getVisitorId()})}).catch(()=>{});
    };
  },[entered,visitorName,broadcastPosition,pollVisitors]);

  // ── Update avatar meshes when visitor list changes ───────────
  useEffect(()=>{
    const {scene, THREE} = threeRef.current;
    if(!scene||!THREE) return;
    const myId = getVisitorId();
    const activeIds = new Set(visitors.map(v=>v.visitor_id));

    // Remove gone avatars
    Object.keys(avatarsRef.current).forEach(id=>{
      if(!activeIds.has(id)){ scene.remove(avatarsRef.current[id]); delete avatarsRef.current[id]; }
    });

    // Add/update avatars
    visitors.forEach((v,i)=>{
      if(!avatarsRef.current[v.visitor_id]){
        avatarsRef.current[v.visitor_id] = createAvatar(THREE, v.name, i);
        scene.add(avatarsRef.current[v.visitor_id]);
      }
      const av = avatarsRef.current[v.visitor_id];
      av.position.set(v.x, 0, v.z);
      av.rotation.y = v.yaw + Math.PI;
    });
  },[visitors]);

  function createAvatar(T, name, colorIdx) {
    const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
    const g = new T.Group();

    // Body (capsule approximation)
    const bodyM = new T.MeshStandardMaterial({color, roughness:.7,metalness:.1});
    const body  = new T.Mesh(new T.CylinderGeometry(.22,.22,.9,16), bodyM);
    body.position.y = .65; g.add(body);

    // Shoulders rounded top
    const shou = new T.Mesh(new T.SphereGeometry(.24,12,8), bodyM);
    shou.position.y = 1.1; g.add(shou);

    // Head
    const headM = new T.MeshStandardMaterial({color:0xfddbb4, roughness:.8});
    const head  = new T.Mesh(new T.SphereGeometry(.2,14,10), headM);
    head.position.y = 1.55; g.add(head);

    // Hair
    const hairM = new T.MeshStandardMaterial({color:0x2a1a0a, roughness:.9});
    const hair  = new T.Mesh(new T.SphereGeometry(.21,14,8,0,Math.PI*2,0,Math.PI*.5), hairM);
    hair.position.y = 1.55; g.add(hair);

    // Legs
    const legM = new T.MeshStandardMaterial({color:0x1a1a2e, roughness:.8});
    [-.1,.1].forEach(lx=>{
      const leg=new T.Mesh(new T.CylinderGeometry(.085,.085,.55,10),legM);
      leg.position.set(lx,.27,0); g.add(leg);
      // Feet
      const shoe=new T.Mesh(new T.BoxGeometry(.12,.06,.22),legM);
      shoe.position.set(lx,.01,.04); g.add(shoe);
    });

    // Name label
    const cv = document.createElement('canvas'); cv.width=256; cv.height=72;
    const ctx = cv.getContext('2d');
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.beginPath();ctx.roundRect(0,0,256,72,36);ctx.fill();
    // color dot
    ctx.fillStyle='#'+color.toString(16).padStart(6,'0');
    ctx.beginPath();ctx.arc(36,36,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffff';
    ctx.font='bold 28px Segoe UI,Tahoma,sans-serif';
    ctx.textAlign='center';
    ctx.fillText(name.slice(0,14), 136, 46);
    const tex=new T.CanvasTexture(cv);
    const label=new T.Mesh(
      new T.PlaneGeometry(.9,.25),
      new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide})
    );
    label.position.y=2.1;
    // Billboard will be handled in animate loop
    label.userData.billboard=true;
    g.add(label);

    g.castShadow=true;
    return g;
  }

  // ── Main 3D setup ─────────────────────────────────────────────
  useEffect(()=>{
    if(!entered||!visitorName) return;
    setLoading(true);
    const s = stateRef.current;
    let animId;
    const hitGroups = [];

    const run = async ()=>{
      const T = await import('three');
      threeRef.current.THREE = T;

      const scene = new T.Scene();
      scene.background = new T.Color(0xccc5bc);
      scene.fog = new T.Fog(0xccc5bc, 22, 52);
      threeRef.current.scene = scene;

      const camera = new T.PerspectiveCamera(68,innerWidth/innerHeight,.05,80);
      s.pos = {x:0,y:1.72,z:19};
      camera.position.set(0,1.72,19);
      threeRef.current.camera = camera;

      const renderer = new T.WebGLRenderer({antialias:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); // cap pixel ratio
      renderer.setSize(innerWidth,innerHeight);
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=T.PCFSoftShadowMap;
      renderer.toneMapping=T.ACESFilmicToneMapping;
      renderer.toneMappingExposure=0.9;
      mountRef.current?.appendChild(renderer.domElement);

      // ── CREATE SHARED MATERIALS (max ~8 textures total) ──
      const wallTex = new T.CanvasTexture(makeWallCanvas());
      wallTex.wrapS=wallTex.wrapT=T.RepeatWrapping; wallTex.repeat.set(4,2);

      const floorTex = new T.CanvasTexture(makeFloorCanvas());
      floorTex.wrapS=floorTex.wrapT=T.RepeatWrapping; floorTex.repeat.set(6,9);

      const carpetTex = new T.CanvasTexture(makeCarpetCanvas());
      carpetTex.wrapS=carpetTex.wrapT=T.RepeatWrapping; carpetTex.repeat.set(1,3);

      // Single shared materials — no per-object texture creation
      const MAT = {
        wall:   new T.MeshBasicMaterial({map: wallTex}),
        floor:  new T.MeshBasicMaterial({map: floorTex}),
        ceil:   new T.MeshBasicMaterial({color: 0xf0ede8}),
        carpet: new T.MeshBasicMaterial({map: carpetTex}),
        mold:   new T.MeshStandardMaterial({color:0xd8d0c0, roughness:.6, metalness:.03}),
        base:   new T.MeshStandardMaterial({color:0xccc4b2, roughness:.65}),
        track:  new T.MeshStandardMaterial({color:0x181820, roughness:.1, metalness:.97}),
        cone:   new T.MeshStandardMaterial({color:0x0e0e16, roughness:.06, metalness:.98}),
        lens:   new T.MeshStandardMaterial({color:0xfff8e8,emissive:0xfff8e8,emissiveIntensity:2.2,roughness:0,metalness:0}),
        gold:   new T.MeshStandardMaterial({color:0xc8a820, roughness:.14, metalness:.9}),
        pillar: new T.MeshStandardMaterial({color:0xe8e0d4, roughness:.55, metalness:.04}),
        wain:   new T.MeshStandardMaterial({color:0x2a2420, roughness:.9}),
        dark:   new T.MeshStandardMaterial({color:0x100e0c, roughness:.9}),
        brass:  new T.MeshStandardMaterial({color:0xb89030, roughness:.12, metalness:.93}),
        shadeMat: new T.MeshStandardMaterial({color:0x080810, roughness:.06, metalness:.97}),
        legM:   new T.MeshStandardMaterial({color:0x1a1a24, roughness:.12, metalness:.92}),
        seatM:  new T.MeshStandardMaterial({color:0xb89658, roughness:.62, metalness:.02}),
      };

      const box=(w,h,d,mat,px,py,pz)=>{
        const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
        mesh.position.set(px,py,pz);
        mesh.receiveShadow=mesh.castShadow=true;
        scene.add(mesh);return mesh;
      };

      // ── MAIN HALL ─────────────────────────────────────────
      const MHW=28,MHL=20.5,MHH=6.5,CW=8,CL=15,CH=8.5,CZ=12.5;

      box(MHW,.22,MHL,MAT.floor, 0,-.11,-.75);
      box(MHW,.1, MHL,MAT.ceil,  0,MHH, -.75);
      box(.25,MHH,MHL,MAT.wall, -14,MHH/2,-.75);
      box(.25,MHH,MHL,MAT.wall,  14,MHH/2,-.75);
      box(MHW,MHH,.25,MAT.wall,   0,MHH/2,-13.88);
      box(10, MHH,.25,MAT.wall,  -9,MHH/2, 6.38);
      box(10, MHH,.25,MAT.wall,   9,MHH/2, 6.38);
      box(.22,MHH,11,MAT.wall,  -7,MHH/2,-7);
      box(.22,MHH,11,MAT.wall,   7,MHH/2,-7);

      // ── CORRIDOR ──────────────────────────────────────────
      box(CW,.22,CL,MAT.floor,  0,-.11,CZ);
      box(CW,.1, CL,MAT.ceil,   0,CH,  CZ);
      box(.25,CH,CL,MAT.wall,  -4,CH/2,CZ);
      box(.25,CH,CL,MAT.wall,   4,CH/2,CZ);
      box(CW, CH,.25,MAT.wall,  0,CH/2,20.5);

      // ── ARCH + PILLARS ─────────────────────────────────────
      box(1.2,MHH,1.2,MAT.pillar, -5,MHH/2,6);
      box(1.2,MHH,1.2,MAT.pillar,  5,MHH/2,6);
      box(10.4,.8,1.2,MAT.pillar,  0,MHH-.4,6);
      box(10.4,.2,1.4,MAT.mold,    0,MHH-.82,6);

      // ── RED CARPET ─────────────────────────────────────────
      box(4,.025,CL-1,MAT.carpet, 0,.01,CZ);
      box(5,.025,6,   MAT.carpet, 0,.01,3);
      box(4.3,.025,.08,MAT.gold,  0,.005,CZ-CL/2+.5);
      box(4.3,.025,.08,MAT.gold,  0,.005,CZ+CL/2-.5);
      box(.08,.025,CL,MAT.gold,  -2.18,.005,CZ);
      box(.08,.025,CL,MAT.gold,   2.18,.005,CZ);

      // ── BASEBOARDS ────────────────────────────────────────
      [[MHL,.09,-14,.0,-.75,true],[MHL,.09,14,.0,-.75,true],[MHW,.09,0,.0,-13.88,false],[10,.09,-9,.0,6.38,false],[10,.09,9,.0,6.38,false],[CL,.09,-4,.0,CZ,true],[CL,.09,4,.0,CZ,true]].forEach(([w,d,px,py,pz,rot])=>{
        if(rot){box(d,0.24,w,MAT.base,px,.12,pz);box(d,0.055,w+.04,MAT.mold,px,.275,pz);}
        else{box(w,0.24,d,MAT.base,px,.12,pz);box(w,0.055,d+.04,MAT.mold,px,.275,pz);}
      });

      // ── CROWN MOLDING ────────────────────────────────────
      [[MHW,MHH,0,-.75],[CW,CH,0,CZ]].forEach(([w,h,px,pz])=>{
        box(w,.18,.1,MAT.mold,px,h-.09,pz-((h===MHH?MHL:CL)/2)+.12);
        box(w,.18,.1,MAT.mold,px,h-.09,pz+((h===MHH?MHL:CL)/2)-.12);
      });

      // ── WAINSCOTING ──────────────────────────────────────
      box(MHL,1.1,.2,MAT.wain,-14,.55,-.75);box(MHL,1.1,.2,MAT.wain,14,.55,-.75);
      box(MHW,1.1,.2,MAT.wain,0,.55,-13.88);
      box(CL,1.1,.2,MAT.wain,-4,.55,CZ);box(CL,1.1,.2,MAT.wain,4,.55,CZ);

      // ── SPOTLIGHT ROWS (shared material, no textures) ─────
      const addSpots=(xs,zs,h)=>{
        xs.forEach(rx=>{
          const rail=new T.Mesh(new T.BoxGeometry(.042,.03,Math.abs(zs[zs.length-1]-zs[0])+2),MAT.track);
          rail.position.set(rx,h-.025,(zs[0]+zs[zs.length-1])/2);scene.add(rail);
          zs.forEach(rz=>{
            const g=new T.Group();g.position.set(rx,h-.025,rz);
            const adapt=new T.Mesh(new T.BoxGeometry(.06,.046,.06),MAT.track);adapt.position.y=-.023;g.add(adapt);
            const stem=new T.Mesh(new T.CylinderGeometry(.01,.01,.24,8),MAT.track);stem.position.y=-.145;g.add(stem);
            const knuck=new T.Mesh(new T.SphereGeometry(.019,8,8),MAT.track);knuck.position.y=-.275;g.add(knuck);
            const hous=new T.Mesh(new T.CylinderGeometry(.024,.088,.2,16,1,true),MAT.cone);hous.position.y=-.4;g.add(hous);
            const topC=new T.Mesh(new T.CircleGeometry(.024,16),MAT.cone);topC.rotation.x=Math.PI/2;topC.position.y=-.3;g.add(topC);
            const lens=new T.Mesh(new T.CircleGeometry(.07,20),MAT.lens);lens.rotation.x=Math.PI/2;lens.position.y=-.505;g.add(lens);
            const lRing=new T.Mesh(new T.TorusGeometry(.074,.006,8,20),MAT.cone);lRing.rotation.x=Math.PI/2;lRing.position.y=-.505;g.add(lRing);
            scene.add(g);
            const spot=new T.SpotLight(0xffffff,2.6,18,Math.PI/7,.22,1.3);
            spot.position.set(rx,h-.52,rz);spot.target.position.set(rx,0,rz);
            spot.castShadow=true;spot.shadow.mapSize.set(256,256);spot.shadow.bias=-.002;
            scene.add(spot);scene.add(spot.target);
          });
        });
      };
      addSpots([-1.5,1.5],[8,13,18],CH);
      addSpots([-9,0,9],[-12,-7,-2,3],MHH);

      // Ambient
      scene.add(new T.AmbientLight(0xfff8f0,.62));
      scene.add(new T.HemisphereLight(0xfff5ee,0xd0c8bc,.4));
      const fill=new T.PointLight(0xfff8f0,.7,25,2);fill.position.set(0,3,13);scene.add(fill);

      // ── WELCOME PLAQUE ────────────────────────────────────
      const PW=6.5,PH=3.8,bw=.18,fd=.1;
      const pGroup=new T.Group();pGroup.position.set(0,3.2,7.5);
      [[-PW/2-bw/2,0],[ PW/2+bw/2,0]].forEach(([x,y])=>{const b=new T.Mesh(new T.BoxGeometry(bw,PH,fd),MAT.gold);b.position.set(x,y,fd/2);pGroup.add(b);});
      [{y:PH/2+bw/2},{y:-PH/2-bw/2}].forEach(({y})=>{const b=new T.Mesh(new T.BoxGeometry(PW+bw*2,bw,fd),MAT.gold);b.position.set(0,y,fd/2);pGroup.add(b);});
      const pTex=new T.CanvasTexture(makePlaqueCanvas());
      const pMesh=new T.Mesh(new T.PlaneGeometry(PW,PH),new T.MeshStandardMaterial({map:pTex,roughness:.75}));
      pMesh.position.z=fd+.01;pGroup.add(pMesh);
      const backP=new T.Mesh(new T.BoxGeometry(PW+bw*2+.04,PH+bw*2+.04,.04),MAT.dark);backP.position.z=-.01;pGroup.add(backP);
      const pL=new T.SpotLight(0xfff5c0,2.2,8,Math.PI/9,.28,1.8);pL.position.set(0,PH/2+1,2);pL.target.position.set(0,0,0);pGroup.add(pL);pGroup.add(pL.target);
      scene.add(pGroup);

      // ── BENCHES ───────────────────────────────────────────
      [[0,-5],[0,-11],[-10,-5],[10,-5],[0,2]].forEach(([bx,bz])=>{
        const g=new T.Group();g.position.set(bx,0,bz);
        [-0.13,0,.13].forEach(oz=>{const p=new T.Mesh(new T.BoxGeometry(2,.06,.16),MAT.seatM);p.position.set(0,.465,oz);p.castShadow=p.receiveShadow=true;g.add(p);});
        [-.78,.78].forEach(lx=>{const leg=new T.Mesh(new T.BoxGeometry(.05,.46,.44),MAT.legM);leg.position.set(lx,.23,0);leg.castShadow=true;g.add(leg);});
        const str=new T.Mesh(new T.BoxGeometry(1.6,.03,.03),MAT.legM);str.position.y=.11;g.add(str);
        scene.add(g);
      });

      // ── ARTWORKS ─────────────────────────────────────────
      const pm={};photos.forEach(p=>{pm[p.position_index]=p;});

      const buildFrame=(group,fw,fh,colorHex)=>{
        const fMat=new T.MeshStandardMaterial({color:colorHex,roughness:.52,metalness:.06});
        const sMat=new T.MeshStandardMaterial({color:Math.floor(colorHex*.55),roughness:.68,metalness:.01});
        const mats=[sMat,sMat,sMat,sMat,fMat,sMat];
        const bw=.15,fd=.06;
        [{w:fw+bw*2,h:bw,x:0,y: fh/2+bw/2},{w:fw+bw*2,h:bw,x:0,y:-fh/2-bw/2},{w:bw,h:fh,x:-fw/2-bw/2,y:0},{w:bw,h:fh,x:fw/2+bw/2,y:0}]
        .forEach(b=>{const m=new T.Mesh(new T.BoxGeometry(b.w,b.h,fd),mats);m.position.set(b.x,b.y,fd/2);m.castShadow=true;group.add(m);});
        // Shadow gap
        const gM=new T.MeshStandardMaterial({color:0x060606,roughness:1});
        [{w:fw+bw*2,h:.01,x:0,y:fh/2},{w:fw+bw*2,h:.01,x:0,y:-fh/2},{w:.01,h:fh,x:-fw/2,y:0},{w:.01,h:fh,x:fw/2,y:0}]
        .forEach(b=>{const m=new T.Mesh(new T.BoxGeometry(b.w,b.h,.02),gM);m.position.set(b.x,b.y,.08);group.add(m);});
        // White mat
        const matM=new T.MeshStandardMaterial({color:0xf4f0ea,roughness:.92});
        const mBW=.04;
        [{w:fw+mBW*2,h:mBW,x:0,y:fh/2+mBW/2},{w:fw+mBW*2,h:mBW,x:0,y:-fh/2-mBW/2},{w:mBW,h:fh,x:-fw/2-mBW/2,y:0},{w:mBW,h:fh,x:fw/2+mBW/2,y:0}]
        .forEach(b=>{const m=new T.Mesh(new T.BoxGeometry(b.w,b.h,.006),matM);m.position.set(b.x,b.y,.072);group.add(m);});
        const back=new T.Mesh(new T.BoxGeometry(fw+bw*2+.02,fh+bw*2+.02,.01),MAT.dark);back.position.z=-.003;group.add(back);
      };

      const addPicLight=(group,fw,fh,lit)=>{
        const glowM=new T.MeshStandardMaterial({color:0xfff8e0,emissive:0xfff8e0,emissiveIntensity:lit?1.8:.08,roughness:0,metalness:0});
        const g=new T.Group();g.position.set(0,fh/2+.2,.12);
        g.add(new T.Mesh(new T.BoxGeometry(fw*.44,.048,.036),MAT.brass));
        const arm=new T.Mesh(new T.CylinderGeometry(.009,.009,.14,8),MAT.brass);arm.rotation.x=Math.PI/2;arm.position.z=.07;g.add(arm);
        const shade=new T.Mesh(new T.CylinderGeometry(.04,.072,fw*.38,16,1,true,0,Math.PI),MAT.shadeMat);shade.rotation.x=-Math.PI/2;shade.position.z=.14;g.add(shade);
        const sCap=new T.Mesh(new T.PlaneGeometry(fw*.38,.08),MAT.shadeMat);sCap.position.z=.14;g.add(sCap);
        const glow=new T.Mesh(new T.CylinderGeometry(.006,.006,fw*.32,8),glowM);glow.rotation.z=Math.PI/2;glow.position.set(0,.025,.14);g.add(glow);
        [-fw*.16,fw*.16].forEach(ex=>{const ec=new T.Mesh(new T.BoxGeometry(.004,.07,.07),MAT.shadeMat);ec.position.set(ex,.02,.14);g.add(ec);});
        group.add(g);
        if(lit){
          const pl=new T.SpotLight(0xffffff,3.8,7,Math.PI/9,.2,1.8);
          pl.position.set(0,fh/2+.28,.32);pl.target.position.set(0,-fh*.26,.06);
          group.add(pl);group.add(pl.target);
        }
      };

      const addLabel=(group,slotId,fw,fh,hasPhoto)=>{
        const cv=document.createElement('canvas');cv.width=160;cv.height=54;
        const ctx2=cv.getContext('2d');
        ctx2.fillStyle=hasPhoto?'rgba(16,13,8,.9)':'rgba(88,82,74,.72)';
        ctx2.beginPath();ctx2.roundRect(0,0,160,54,27);ctx2.fill();
        const sh=ctx2.createLinearGradient(0,0,0,27);sh.addColorStop(0,'rgba(255,255,255,.13)');sh.addColorStop(1,'rgba(255,255,255,0)');
        ctx2.fillStyle=sh;ctx2.beginPath();ctx2.roundRect(0,0,160,27,27);ctx2.fill();
        ctx2.fillStyle=hasPhoto?'#fff':'#c0b8b0';ctx2.font='bold 25px -apple-system,Segoe UI,sans-serif';ctx2.textAlign='center';ctx2.fillText('#'+slotId,80,37);
        const t=new T.CanvasTexture(cv);
        const sp=new T.Mesh(new T.PlaneGeometry(.5,.17),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));
        sp.position.set(0,fh/2+.62,.08);group.add(sp);
      };

      for(const slot of SLOTS){
        const ph=pm[slot.id];
        const group=new T.Group();
        group.position.set(...slot.pos);
        group.rotation.y=slot.rotY;

        const finalize=(fw,fh,tex,hasPhoto)=>{
          buildFrame(group,fw,fh,FRAME_COLORS[slot.id%FRAME_COLORS.length]);
          const imgM = new T.Mesh(new T.PlaneGeometry(fw, fh), new T.MeshBasicMaterial({ map: tex, transparent: true }));          imgM.position.z=.066;group.add(imgM);
          addPicLight(group,fw,fh,hasPhoto);
          addLabel(group,slot.id,fw,fh,hasPhoto);
          group.userData={title:ph?.title||'',sub:ph?.subtitle||'',hasPhoto,imageUrl:ph?.image_url||null};
          if(hasPhoto)hitGroups.push(group);
          scene.add(group);
        };

        if(ph?.image_url){
          await new Promise(res=>{
            const img=new Image();img.crossOrigin='anonymous';
            img.onload=()=>{
              const asp=img.naturalWidth/img.naturalHeight;
              const mH=2.1,mW=3.0;
              const fw=asp>=1?Math.min(mW,asp*mH):mH*asp,fh=asp>=1?fw/asp:mH;
              const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;
              cv.getContext('2d').drawImage(img,0,0);
              finalize(fw,fh,new T.CanvasTexture(cv),true);res();
            };
            img.onerror=()=>{
              const cv=mkPlaceholderCanvas(slot.id);
              finalize(2.0,1.5,new T.CanvasTexture(cv),false);res();
            };
            img.src=ph.image_url;
          });
        } else {
          const cv=mkPlaceholderCanvas(slot.id);
          finalize(2.0,1.5,new T.CanvasTexture(cv),false);
        }
      }

      // Controls
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

      // Animate
      const rc=new T.Raycaster();let last=performance.now();
      const loop=()=>{
        animId=requestAnimationFrame(loop);
        const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
        if(s.isLocked||isMobile){
          const spd=s.keys['ShiftLeft']?7:4;
          const fw3=new T.Vector3(-Math.sin(s.yaw),0,-Math.cos(s.yaw));
          const rt3=new T.Vector3(Math.cos(s.yaw),0,-Math.sin(s.yaw));
          const mv=new T.Vector3();
          if(s.keys['KeyW']||s.keys['ArrowUp'])    mv.addScaledVector(fw3, spd*dt);
          if(s.keys['KeyS']||s.keys['ArrowDown'])  mv.addScaledVector(fw3,-spd*dt);
          if(s.keys['KeyA']||s.keys['ArrowLeft'])  mv.addScaledVector(rt3,-spd*dt);
          if(s.keys['KeyD']||s.keys['ArrowRight']) mv.addScaledVector(rt3, spd*dt);
          if(s.joystick.active){mv.addScaledVector(fw3,-s.joystick.dy/40*3.5*dt);mv.addScaledVector(rt3,s.joystick.dx/40*3.5*dt);}
          camera.position.add(mv);
          camera.position.x=Math.max(-13.4,Math.min(13.4,camera.position.x));
          camera.position.z=Math.max(-13.8,Math.min(20,camera.position.z));
          camera.position.y=1.72;
          s.pos={x:camera.position.x,y:camera.position.y,z:camera.position.z};
          camera.rotation.order='YXZ';camera.rotation.y=s.yaw;camera.rotation.x=s.pitch;
          rc.setFromCamera({x:0,y:0},camera);
          const hh=rc.intersectObjects(hitGroups,true);
          if(hh.length&&hh[0].distance<6.5){
            let obj=hh[0].object;while(obj&&!obj.userData?.hasPhoto)obj=obj.parent;
            if(obj?.userData?.hasPhoto)setPhotoInfo({title:obj.userData.title,sub:obj.userData.sub,imageUrl:obj.userData.imageUrl});
            else setPhotoInfo(null);
          } else setPhotoInfo(null);
        }
        // Billboard labels for avatars
        Object.values(avatarsRef.current).forEach(av=>{
          av.children.forEach(child=>{if(child.userData?.billboard)child.rotation.y=camera.rotation.y-av.rotation.y;});
        });
        // Animate avatar legs (simple bob)
        Object.values(avatarsRef.current).forEach(av=>{
          // small idle bob
          av.children[0].position.y = .65 + Math.sin(now*.002)*0.015;
        });
        renderer.render(scene,camera);
      };
      loop();
      window.addEventListener('resize',()=>{if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
      setLoading(false);
    };

    run();
    return()=>{
      cancelAnimationFrame(animId);
      document.exitPointerLock?.();
      const rdr=threeRef.current?.renderer;
      rdr?.dispose();
      if(mountRef.current&&rdr?.domElement?.parentNode===mountRef.current)mountRef.current.removeChild(rdr.domElement);
      threeRef.current={};
      avatarsRef.current={};
    };
  },[entered,visitorName,photos]);

  function mkPlaceholderCanvas(slotId){
    const cv=document.createElement('canvas');cv.width=400;cv.height=300;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#ede8e0';ctx.fillRect(0,0,400,300);
    for(let i=0;i<1500;i++){ctx.fillStyle=`rgba(${130+Math.random()*30},${120+Math.random()*20},${100+Math.random()*20},${Math.random()*.04})`;ctx.fillRect(Math.random()*400,Math.random()*300,Math.random()*2,Math.random()*2);}
    ctx.strokeStyle='rgba(150,135,115,.3)';ctx.lineWidth=1.2;ctx.setLineDash([8,7]);ctx.strokeRect(16,16,368,268);
    ctx.fillStyle='rgba(80,65,48,.38)';ctx.font='bold 55px Georgia,serif';ctx.textAlign='center';ctx.fillText(slotId.toString(),200,168);
    ctx.fillStyle='rgba(130,115,95,.42)';ctx.font='italic 17px Georgia,serif';ctx.fillText('موقع رقم '+slotId,200,212);
    return cv;
  }

  // Joystick
  const onJoyStart=useCallback(e=>{e.preventDefault();stateRef.current.joystick={active:true,dx:0,dy:0};if(jKnobRef.current)jKnobRef.current.style.transform='translate(-50%,-50%)';},[]);
  const onJoyMove=useCallback(e=>{e.preventDefault();const s=stateRef.current;if(!s.joystick.active)return;const t=e.changedTouches[0];const zone=jZoneRef.current?.getBoundingClientRect();if(!zone)return;const cx=zone.left+zone.width/2,cy=zone.top+zone.height/2;let dx=t.clientX-cx,dy=t.clientY-cy;const maxR=42,dist=Math.sqrt(dx*dx+dy*dy);if(dist>maxR){dx=dx/dist*maxR;dy=dy/dist*maxR;}s.joystick.dx=dx;s.joystick.dy=dy;if(jKnobRef.current)jKnobRef.current.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;},[]);
  const onJoyEnd=useCallback(e=>{e.preventDefault();stateRef.current.joystick={active:false,dx:0,dy:0};if(jKnobRef.current)jKnobRef.current.style.transform='translate(-50%,-50%)';},[]);
  useEffect(()=>{const z=jZoneRef.current;if(!z||!entered)return;z.addEventListener('touchstart',onJoyStart,{passive:false});z.addEventListener('touchmove',onJoyMove,{passive:false});z.addEventListener('touchend',onJoyEnd,{passive:false});return()=>{z.removeEventListener('touchstart',onJoyStart);z.removeEventListener('touchmove',onJoyMove);z.removeEventListener('touchend',onJoyEnd);};},[entered,onJoyStart,onJoyMove,onJoyEnd]);

  const F={fontFamily:'Segoe UI,Tahoma,sans-serif'};

  return(
    <>
      <Head>
        <title>معرض الفوتوغرافيا — AnwarBMA</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
      </Head>
      <div ref={mountRef} style={{width:'100vw',height:'100dvh',touchAction:'none'}}/>

      {/* LOADING */}
      {entered&&loading&&(
        <div style={{position:'fixed',inset:0,zIndex:300,background:'#c8c0b4',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif'}}>
          <div style={{width:54,height:54,border:'2px solid #c8a820',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',marginBottom:22}}/>
          <p style={{color:'#6a6050',letterSpacing:'.2em',fontSize:'.82rem'}}>جاري تحميل المعرض...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* NAME INPUT SCREEN */}
      {!entered&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'linear-gradient(155deg,#f0ebe2 0%,#e5dfd4 55%,#dcd6cd 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',...F,padding:20,overflowY:'auto'}}>
          {[[-180,-120,230],[160,140,185],[-100,175,155],[148,-195,168]].map(([x,y,sz],i)=>(
            <div key={i} style={{position:'absolute',left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,width:sz,height:sz,borderRadius:'50%',border:'1px solid rgba(155,135,100,.16)',transform:'translate(-50%,-50%)'}}/>
          ))}
          <div style={{position:'relative',textAlign:'center',maxWidth:460,width:'100%'}}>
            <div style={{width:52,height:52,margin:'0 auto 22px',border:'1.5px solid #a89070',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:26,height:26,background:'#8a7458'}}/>
            </div>
            <h1 style={{fontSize:'clamp(1.6rem,6vw,2.6rem)',fontWeight:400,letterSpacing:'.35em',color:'#1e1a12',marginBottom:4,fontFamily:'Georgia,serif'}}>GALLERY</h1>
            <div style={{width:50,height:1,background:'#a89070',margin:'10px auto'}}/>
            <p style={{color:'#7a6e5e',fontSize:'clamp(.72rem,2.2vw,.88rem)',letterSpacing:'.14em',marginBottom:4}}>معرض الفوتوغرافيا الافتراضي</p>
            <p style={{color:'#b0a090',fontSize:'.72rem',marginBottom:32}}>{photos.length} عمل فني · 23 موقع · {visitors.length+1} زائر الآن</p>

            {/* Name input */}
            <div style={{background:'rgba(255,252,248,.9)',border:'1px solid #ddd5c5',borderRadius:12,padding:'22px 24px',marginBottom:24,textAlign:'right'}}>
              <label style={{display:'block',fontSize:'.8rem',color:'#7a6e5e',marginBottom:10,letterSpacing:'.06em'}}>اكتب اسمك لتظهر شخصيتك في المعرض</label>
              <input
                value={nameInput}
                onChange={e=>setNameInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&nameInput.trim()){setVisitorName(nameInput.trim());setEntered(true);} }}
                placeholder="اسمك هنا..."
                maxLength={20}
                style={{width:'100%',padding:'12px 16px',border:'1.5px solid #ddd5c5',borderRadius:8,fontSize:'1rem',color:'#1e1a12',background:'#faf8f5',outline:'none',textAlign:'right',fontFamily:'inherit',marginBottom:14}}
                autoFocus
              />
              <div style={{display:'flex',gap:10}}>
                <button
                  onClick={()=>{if(nameInput.trim()){setVisitorName(nameInput.trim());setEntered(true);}}}
                  disabled={!nameInput.trim()}
                  style={{flex:1,background:nameInput.trim()?'#1e1a12':'#e0d8d0',color:nameInput.trim()?'#f4f0e8':'#a0988e',border:'none',padding:'13px',fontSize:'.88rem',letterSpacing:'.18em',cursor:nameInput.trim()?'pointer':'not-allowed',fontFamily:'inherit',borderRadius:4,transition:'all .25s'}}>
                  دخول المعرض →
                </button>
                <button
                  onClick={()=>{const n='زائر_'+Math.floor(Math.random()*9999);setNameInput(n);setVisitorName(n);setEntered(true);}}
                  style={{background:'transparent',border:'1.5px solid #ddd5c5',color:'#9a9080',padding:'13px 16px',cursor:'pointer',borderRadius:4,fontSize:'.78rem',...F}}>
                  دخول كزائر
                </button>
              </div>
            </div>

            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:22}}>
              {(isMobile?[['↕↔ يسار','تحرك'],['سحب يمين','انظر']]:[['W A S D','التحرك'],['ماوس','النظر'],['Shift','ركض']]).map(([k,l])=>(
                <div key={k} style={{textAlign:'center'}}>
                  <div style={{background:'rgba(255,250,242,.85)',border:'1px solid #d8d0c4',padding:'4px 11px',fontSize:'.7rem',color:'#2a2010',fontFamily:'monospace',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:'.64rem',color:'#a09080'}}>{l}</div>
                </div>
              ))}
            </div>
            <a href="/admin/login" style={{color:'#a09078',fontSize:'.72rem',letterSpacing:'.1em',textDecoration:'none',borderBottom:'1px solid #c0b8a8',paddingBottom:1}}>⚙ لوحة الإدارة</a>
          </div>
        </div>
      )}

      {/* CROSSHAIR */}
      {entered&&locked&&!isMobile&&(<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:20,height:20,pointerEvents:'none',zIndex:50}}><div style={{position:'absolute',width:1,height:20,background:'rgba(255,250,240,.5)',left:9.5,top:0}}/><div style={{position:'absolute',width:20,height:1,background:'rgba(255,250,240,.5)',left:0,top:9.5}}/><div style={{position:'absolute',width:4,height:4,borderRadius:'50%',background:'rgba(255,250,240,.65)',left:8,top:8}}/></div>)}
      {entered&&isMobile&&(<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:7,height:7,borderRadius:'50%',background:'rgba(255,250,240,.55)',pointerEvents:'none',zIndex:50}}/>)}

      {/* PHOTO INFO */}
      {entered&&photoInfo&&(
        <div style={{position:'fixed',bottom:isMobile?172:62,left:'50%',transform:'translateX(-50%)',zIndex:50,cursor:photoInfo.imageUrl?'pointer':'default'}} onClick={()=>photoInfo.imageUrl&&setFullscreen(photoInfo)}>
          <div style={{background:'rgba(14,11,7,.85)',backdropFilter:'blur(10px)',border:'1px solid rgba(200,168,80,.16)',padding:'11px 26px',color:'#f4f0e8',textAlign:'center',fontFamily:'Georgia,serif'}}>
            <div style={{fontWeight:400,fontSize:'.94rem',marginBottom:3}}>{photoInfo.title}</div>
            <div style={{fontSize:'.7rem',color:'#c0b088',letterSpacing:'.13em',...F}}>{photoInfo.sub}</div>
            {photoInfo.imageUrl&&<div style={{fontSize:'.62rem',color:'#a89060',marginTop:4,...F}}>اضغط للعرض الكامل</div>}
          </div>
        </div>
      )}

      {/* FULLSCREEN */}
      {fullscreen&&(
        <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,.96)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setFullscreen(null)}>
          <img src={fullscreen.imageUrl} alt={fullscreen.title} style={{maxWidth:'90vw',maxHeight:'80vh',objectFit:'contain',boxShadow:'0 0 80px rgba(0,0,0,.9)'}}/>
          <div style={{marginTop:18,textAlign:'center'}}><div style={{color:'#f4f0e8',fontSize:'1.05rem',fontFamily:'Georgia,serif',marginBottom:4}}>{fullscreen.title}</div><div style={{color:'#a09070',fontSize:'.76rem',...F,letterSpacing:'.12em'}}>{fullscreen.sub}</div></div>
          <div style={{position:'absolute',top:20,right:24,color:'rgba(255,250,240,.38)',fontSize:'1.4rem',cursor:'pointer'}}>✕</div>
        </div>
      )}

      {/* VISITORS PANEL */}
      {entered&&visitors.length>0&&(
        <div style={{position:'fixed',top:60,left:14,zIndex:50,background:'rgba(14,11,7,.72)',backdropFilter:'blur(8px)',border:'1px solid rgba(200,168,80,.14)',padding:'10px 14px',borderRadius:8,minWidth:150}}>
          <div style={{fontSize:'.62rem',color:'#a89060',letterSpacing:'.12em',marginBottom:8,...F}}>زوار الآن</div>
          {visitors.map((v,i)=>(
            <div key={v.visitor_id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'#'+AVATAR_COLORS[i%AVATAR_COLORS.length].toString(16).padStart(6,'0'),flexShrink:0}}/>
              <div style={{fontSize:'.76rem',color:'#e0d8c8',...F,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',maxWidth:110}}>{v.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* MY NAME BADGE */}
      {entered&&visitorName&&(
        <div style={{position:'fixed',top:60,right:14,zIndex:50,background:'rgba(14,11,7,.72)',backdropFilter:'blur(8px)',border:'1px solid rgba(200,168,80,.14)',padding:'8px 14px',borderRadius:8,...F,fontSize:'.74rem',color:'#e0d8c8'}}>
          👤 {visitorName}
        </div>
      )}

      {/* HUD */}
      {entered&&!isMobile&&(<div style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',fontSize:'.66rem',color:'rgba(255,250,240,.26)',letterSpacing:'.14em',pointerEvents:'none',zIndex:50,...F}}>{locked?'ESC للتوقف · Shift للركض':'انقر على المشهد للتحكم'}</div>)}

      {/* TOP BUTTONS */}
      {entered&&(
        <div style={{position:'fixed',top:14,right:14,zIndex:50,display:'flex',gap:8}}>
          <a href="/admin/login" target="_blank" style={{background:'rgba(18,14,8,.76)',border:'1px solid rgba(200,170,100,.18)',color:'#d8cfc0',padding:isMobile?'9px 13px':'7px 13px',borderRadius:2,fontSize:'.7rem',letterSpacing:'.1em',textDecoration:'none',backdropFilter:'blur(6px)',...F,WebkitTapHighlightColor:'transparent'}}>⚙ إدارة</a>
          <button onClick={()=>{document.exitPointerLock?.();setEntered(false);setLocked(false);}} style={{background:'rgba(18,14,8,.76)',border:'1px solid rgba(200,170,100,.18)',color:'#d8cfc0',padding:isMobile?'9px 13px':'7px 13px',cursor:'pointer',fontSize:'.7rem',letterSpacing:'.1em',borderRadius:2,backdropFilter:'blur(6px)',...F,WebkitTapHighlightColor:'transparent'}}>← خروج</button>
        </div>
      )}

      {/* JOYSTICK */}
      {entered&&isMobile&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,height:155,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px 16px',pointerEvents:'none',background:'linear-gradient(to top,rgba(14,11,8,.35),transparent)'}}>
          <div style={{pointerEvents:'auto'}}>
            <div ref={jZoneRef} style={{width:115,height:115,borderRadius:'50%',background:'rgba(255,250,240,.1)',border:'1.5px solid rgba(255,250,240,.24)',backdropFilter:'blur(4px)',position:'relative',touchAction:'none',WebkitTapHighlightColor:'transparent'}}>
              <div style={{position:'absolute',width:1,height:'55%',background:'rgba(255,250,240,.14)',left:'50%',top:'22.5%'}}/><div style={{position:'absolute',height:1,width:'55%',background:'rgba(255,250,240,.14)',top:'50%',left:'22.5%'}}/>
              <div ref={jKnobRef} style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:46,height:46,borderRadius:'50%',background:'rgba(255,250,240,.6)',border:'1.5px solid rgba(200,168,100,.42)',boxShadow:'0 2px 14px rgba(0,0,0,.2)'}}/>
            </div>
            <div style={{textAlign:'center',marginTop:5,fontSize:'.58rem',color:'rgba(255,250,240,.3)',letterSpacing:'.1em',...F}}>تحرك</div>
          </div>
          <div style={{textAlign:'center',opacity:.3}}><div style={{fontSize:'1.3rem',marginBottom:4}}>👁</div><div style={{fontSize:'.58rem',color:'rgba(255,250,240,.48)',letterSpacing:'.1em',...F}}>اسحب للنظر</div></div>
        </div>
      )}
    </>
  );
}

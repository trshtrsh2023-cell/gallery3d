import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';

// ── Layout ──────────────────────────────────────────────────────
// Corridor: x=-4..4, z=5..20, H=8.5 (tall, red carpet)
// Main Hall: x=-14..14, z=-14..6.5, H=6.5
// Inner alcoves via dividers at x=±7, z=-13..-2

const SLOTS = [
  // CORRIDOR — left wall (rotY=+PI/2 → faces +X)
  { id:0,  pos:[-3.85,3.5,17.0], rotY: Math.PI/2 },
  { id:1,  pos:[-3.85,3.5,11.5], rotY: Math.PI/2 },
  // CORRIDOR — right wall
  { id:2,  pos:[ 3.85,3.5,17.0], rotY:-Math.PI/2 },
  { id:3,  pos:[ 3.85,3.5,11.5], rotY:-Math.PI/2 },
  // MAIN HALL — left wall
  { id:4,  pos:[-13.85,3.2, 4.0], rotY: Math.PI/2 },
  { id:5,  pos:[-13.85,3.2,-2.0], rotY: Math.PI/2 },
  { id:6,  pos:[-13.85,3.2,-8.0], rotY: Math.PI/2 },
  { id:7,  pos:[-13.85,3.2,-12.5],rotY: Math.PI/2 },
  // MAIN HALL — right wall
  { id:8,  pos:[ 13.85,3.2, 4.0], rotY:-Math.PI/2 },
  { id:9,  pos:[ 13.85,3.2,-2.0], rotY:-Math.PI/2 },
  { id:10, pos:[ 13.85,3.2,-8.0], rotY:-Math.PI/2 },
  { id:11, pos:[ 13.85,3.2,-12.5],rotY:-Math.PI/2 },
  // MAIN HALL — back (north) wall (rotY=0 → faces +Z toward viewer)
  { id:12, pos:[-10.0,3.2,-13.85], rotY:0 },
  { id:13, pos:[ -5.0,3.2,-13.85], rotY:0 },
  { id:14, pos:[  0.0,3.2,-13.85], rotY:0 },
  { id:15, pos:[  5.0,3.2,-13.85], rotY:0 },
  { id:16, pos:[ 10.0,3.2,-13.85], rotY:0 },
  // MAIN HALL — south wall (rotY=PI → normal=-Z, visible from inside)
  { id:17, pos:[-9.0,3.2, 6.38], rotY:Math.PI },
  { id:18, pos:[ 9.0,3.2, 6.38], rotY:Math.PI },
  // INNER DIVIDERS — left faces right
  { id:19, pos:[-7.05,3.2,-4.5], rotY:-Math.PI/2 },
  { id:20, pos:[-7.05,3.2, 1.0], rotY:-Math.PI/2 },
  // INNER DIVIDERS — right faces left
  { id:21, pos:[ 7.05,3.2,-4.5], rotY: Math.PI/2 },
  { id:22, pos:[ 7.05,3.2, 1.0], rotY: Math.PI/2 },
];

const FRAME_STYLES = [
  { color:0x6B3A1F, dark:0x3D2010 }, // dark walnut
  { color:0xB8762A, dark:0x7A4D15 }, // oak
  { color:0x111111, dark:0x080808 }, // matte black
  { color:0x7A3020, dark:0x4A1C10 }, // mahogany
  { color:0xD4A83A, dark:0x9B7820 }, // maple
  { color:0xC8A820, dark:0x8B7010, metal:true }, // gold
  { color:0xB8B8B8, dark:0x888888, metal:true }, // silver
  { color:0x3A2810, dark:0x1E1408 }, // ebony
  { color:0x8B6010, dark:0x5A3C08 }, // antique gold
  { color:0x4A2C10, dark:0x2A1808 }, // dark oak
  { color:0x6B3A1F, dark:0x3D2010 },
  { color:0xB8762A, dark:0x7A4D15 },
  { color:0xD4A83A, dark:0x9B7820 },
  { color:0xC8A820, dark:0x8B7010, metal:true },
  { color:0x7A3020, dark:0x4A1C10 },
  { color:0x111111, dark:0x080808 },
  { color:0xB8B8B8, dark:0x888888, metal:true },
  { color:0x8B6010, dark:0x5A3C08 },
  { color:0x3A2810, dark:0x1E1408 },
  { color:0x4A2C10, dark:0x2A1808 },
  { color:0x6B3A1F, dark:0x3D2010 },
  { color:0xB8762A, dark:0x7A4D15 },
  { color:0xD4A83A, dark:0x9B7820 },
];

// ── Texture Generators ──────────────────────────────────────────
function mkWallTex() {
  const cv = document.createElement('canvas'); cv.width=512; cv.height=512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#ddd6cc'; ctx.fillRect(0,0,512,512);
  for(let i=0;i<7000;i++){
    const x=Math.random()*512,y=Math.random()*512;
    ctx.fillStyle=Math.random()>.5?`rgba(255,250,242,${Math.random()*.022})`:`rgba(140,125,110,${Math.random()*.025})`;
    ctx.beginPath();ctx.arc(x,y,Math.random()*2+.3,0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<60;i++){ctx.fillStyle=`rgba(170,155,138,${Math.random()*.01})`;ctx.fillRect(0,Math.random()*512,512,Math.random()*1.2+.2);}
  return cv;
}

function mkFloorTex() {
  const cv = document.createElement('canvas'); cv.width=1024; cv.height=1024;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#9e9080'; ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<9000;i++){
    ctx.fillStyle=Math.random()>.5?`rgba(200,185,165,${Math.random()*.045})`:`rgba(60,48,36,${Math.random()*.04})`;
    ctx.beginPath();ctx.arc(Math.random()*1024,Math.random()*1024,Math.random()*2.5+.4,0,Math.PI*2);ctx.fill();
  }
  const tW=256,tH=256;
  ctx.strokeStyle='rgba(60,48,36,0.28)';ctx.lineWidth=3.5;
  for(let x=0;x<=1024;x+=tW){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1024);ctx.stroke();}
  for(let y=0;y<=1024;y+=tH){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke();}
  ctx.strokeStyle='rgba(60,48,36,0.12)';ctx.lineWidth=1.2;
  for(let x=0;x<=1024;x+=tW){ctx.beginPath();ctx.moveTo(x-1.5,0);ctx.lineTo(x-1.5,1024);ctx.stroke();}
  for(let y=0;y<=1024;y+=tH){ctx.beginPath();ctx.moveTo(0,y-1.5);ctx.lineTo(1024,y-1.5);ctx.stroke();}
  for(let tx=0;tx<4;tx++)for(let ty=0;ty<4;ty++){
    const x0=tx*tW,y0=ty*tH;
    const g=ctx.createLinearGradient(x0,y0,x0+tW,y0+tH);
    g.addColorStop(0,'rgba(255,245,230,0.055)');g.addColorStop(.5,'rgba(255,245,230,0.018)');g.addColorStop(1,'rgba(50,38,26,0.04)');
    ctx.fillStyle=g;ctx.fillRect(x0+3,y0+3,tW-6,tH-6);
  }
  return cv;
}

function mkCarpetTex() {
  const cv = document.createElement('canvas'); cv.width=256; cv.height=512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle='#8B0000'; ctx.fillRect(0,0,256,512);
  // Pile texture
  for(let i=0;i<5000;i++){
    const x=Math.random()*256,y=Math.random()*512;
    ctx.fillStyle=Math.random()>.5?`rgba(180,20,20,${Math.random()*.12})`:`rgba(40,0,0,${Math.random()*.15})`;
    ctx.fillRect(x,y,Math.random()*3+1,Math.random()*.8+.3);
  }
  // Border stripes
  ctx.fillStyle='rgba(220,180,60,0.7)';ctx.fillRect(8,0,4,512);ctx.fillRect(244,0,4,512);
  ctx.fillStyle='rgba(220,180,60,0.4)';ctx.fillRect(16,0,2,512);ctx.fillRect(238,0,2,512);
  // Pattern dots
  for(let y=20;y<512;y+=40){
    for(let x=30;x<226;x+=30){
      ctx.fillStyle='rgba(180,120,30,0.18)';
      ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
    }
  }
  return cv;
}

function mkCeilTex() {
  const cv=document.createElement('canvas');cv.width=512;cv.height=512;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#f2ede8';ctx.fillRect(0,0,512,512);
  for(let i=0;i<2500;i++){ctx.fillStyle=`rgba(170,160,145,${Math.random()*.012})`;ctx.beginPath();ctx.arc(Math.random()*512,Math.random()*512,Math.random()*1.8,0,Math.PI*2);ctx.fill();}
  return cv;
}

function mkWoodTex(style) {
  const cv=document.createElement('canvas');cv.width=256;cv.height=64;
  const ctx=cv.getContext('2d');
  const c1='#'+style.color.toString(16).padStart(6,'0');
  const c2='#'+style.dark.toString(16).padStart(6,'0');
  if(style.metal){
    const g=ctx.createLinearGradient(0,0,256,64);
    const light=style.color===0xC8A820?'#f8e86a':'#f0f0f0';
    g.addColorStop(0,c2);g.addColorStop(.25,c1);g.addColorStop(.5,light);g.addColorStop(.75,c1);g.addColorStop(1,c2);
    ctx.fillStyle=g;ctx.fillRect(0,0,256,64);
    for(let i=0;i<30;i++){ctx.strokeStyle=`rgba(255,248,200,${Math.random()*.18})`;ctx.lineWidth=Math.random()*1.5;ctx.beginPath();ctx.moveTo(Math.random()*256,0);ctx.lineTo(Math.random()*256,64);ctx.stroke();}
  } else {
    const g=ctx.createLinearGradient(0,0,0,64);
    g.addColorStop(0,c1);g.addColorStop(.4,c2);g.addColorStop(.7,c1);g.addColorStop(1,c2);
    ctx.fillStyle=g;ctx.fillRect(0,0,256,64);
    for(let i=0;i<55;i++){
      const y=Math.random()*128-32,amp=Math.random()*4+1,freq=Math.random()*.05+.008;
      ctx.strokeStyle=Math.random()>.5?`rgba(255,225,170,${Math.random()*.09+.02})`:`rgba(30,12,0,${Math.random()*.1+.03})`;
      ctx.lineWidth=Math.random()*1.3+.2;
      ctx.beginPath();
      for(let x=0;x<256;x+=2){const wy=y+Math.sin(x*freq)*amp+Math.sin(x*freq*2.4)*amp*.4;x===0?ctx.moveTo(x,wy):ctx.lineTo(x,wy);}
      ctx.stroke();
    }
    const h=ctx.createLinearGradient(0,0,0,64);
    h.addColorStop(0,'rgba(255,235,190,0.16)');h.addColorStop(.2,'rgba(255,235,190,0.05)');h.addColorStop(1,'rgba(0,0,0,0.14)');
    ctx.fillStyle=h;ctx.fillRect(0,0,256,64);
  }
  return cv;
}

function mkPlaqueCanvas(W,H) {
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d');
  // Dark marble background
  ctx.fillStyle='#0d0c0a';ctx.fillRect(0,0,W,H);
  // Marble veins
  for(let i=0;i<80;i++){
    ctx.strokeStyle=`rgba(${180+Math.random()*40},${170+Math.random()*30},${140+Math.random()*30},${Math.random()*.04+.01})`;
    ctx.lineWidth=Math.random()*2.5+.5;
    ctx.beginPath();const sx=Math.random()*W,sy=Math.random()*H;ctx.moveTo(sx,sy);
    ctx.bezierCurveTo(sx+Math.random()*300-150,sy+Math.random()*200-100,sx+Math.random()*300-150,sy+Math.random()*200-100,sx+Math.random()*400-200,sy+Math.random()*300-150);
    ctx.stroke();
  }
  // Gold border
  ctx.strokeStyle='#c8a820';ctx.lineWidth=6;ctx.strokeRect(18,18,W-36,H-36);
  ctx.strokeStyle='#e8c840';ctx.lineWidth=1.5;ctx.strokeRect(28,28,W-56,H-56);
  // Inner gold line
  ctx.strokeStyle='rgba(200,168,32,0.5)';ctx.lineWidth=1;ctx.strokeRect(38,38,W-76,H-76);

  // Gallery name
  ctx.fillStyle='#d4b040';
  ctx.font=`bold ${Math.floor(W*.055)}px Georgia,serif`;
  ctx.textAlign='center';ctx.letterSpacing='0.3em';
  ctx.fillText('معرض الفوتوغرافيا',W/2,H*.18);
  ctx.font=`${Math.floor(W*.04)}px Georgia,serif`;
  ctx.fillStyle='#e8c850';
  ctx.fillText('PHOTOGRAPHY EXHIBITION',W/2,H*.25);

  // Divider line
  ctx.strokeStyle='#c8a820';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(W*.15,H*.3);ctx.lineTo(W*.85,H*.3);ctx.stroke();

  // Director info
  ctx.fillStyle='#c8c0b0';
  ctx.font=`${Math.floor(W*.028)}px Segoe UI,Tahoma,sans-serif`;
  ctx.fillText('إعداد وإخراج',W/2,H*.38);
  ctx.fillStyle='#e0d0a0';
  ctx.font=`bold ${Math.floor(W*.036)}px Georgia,serif`;
  ctx.fillText('أنور محمد  •  AnwarBMA',W/2,H*.46);

  // Divider
  ctx.strokeStyle='rgba(200,168,32,0.35)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(W*.2,H*.52);ctx.lineTo(W*.8,H*.52);ctx.stroke();

  // Supervisor
  ctx.fillStyle='#a09880';
  ctx.font=`${Math.floor(W*.024)}px Segoe UI,Tahoma,sans-serif`;
  ctx.fillText('بإشراف',W/2,H*.59);
  ctx.fillStyle='#c8c0b0';
  ctx.font=`bold ${Math.floor(W*.028)}px Segoe UI,Tahoma,sans-serif`;
  ctx.fillText('رئيس قسم التصوير الضوئي',W/2,H*.655);
  ctx.fillStyle='#d8d0b8';
  ctx.font=`bold ${Math.floor(W*.03)}px Georgia,serif`;
  ctx.fillText('عدنان الخمري',W/2,H*.72);

  // Divider
  ctx.strokeStyle='rgba(200,168,32,0.3)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(W*.25,H*.76);ctx.lineTo(W*.75,H*.76);ctx.stroke();

  // Manager
  ctx.fillStyle='#a09880';
  ctx.font=`${Math.floor(W*.022)}px Segoe UI,Tahoma,sans-serif`;
  ctx.fillText('بإدارة',W/2,H*.82);
  ctx.fillStyle='#c8c0b0';
  ctx.font=`bold ${Math.floor(W*.026)}px Segoe UI,Tahoma,sans-serif`;
  ctx.fillText('مدير جمعية الثقافة والفنون بالطائف',W/2,H*.875);
  ctx.fillStyle='#d8d0b8';
  ctx.font=`bold ${Math.floor(W*.03)}px Georgia,serif`;
  ctx.fillText('فيصل الخديدي',W/2,H*.935);

  // Bottom ornament
  ctx.fillStyle='rgba(200,168,32,0.6)';
  ctx.font=`${Math.floor(W*.025)}px serif`;
  ctx.fillText('✦   جمعية الثقافة والفنون — الطائف   ✦',W/2,H*.97);

  return cv;
}

function mkPlaceholder(slotId,style){
  const cv=document.createElement('canvas');cv.width=600;cv.height=450;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#ede8e0';ctx.fillRect(0,0,600,450);
  for(let i=0;i<3000;i++){ctx.fillStyle=`rgba(${140+Math.random()*30},${130+Math.random()*20},${110+Math.random()*20},${Math.random()*.05})`;ctx.fillRect(Math.random()*600,Math.random()*450,Math.random()*2.5,Math.random()*2.5);}
  ctx.strokeStyle='rgba(160,145,125,0.35)';ctx.lineWidth=1.5;ctx.setLineDash([10,8]);
  ctx.strokeRect(22,22,556,406);
  const c='#'+style.color.toString(16).padStart(6,'0');
  ctx.fillStyle=c+'40';ctx.beginPath();ctx.arc(300,200,65,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(80,65,48,0.42)';ctx.font='bold 68px Georgia,serif';ctx.textAlign='center';
  ctx.fillText(slotId.toString(),300,220);
  ctx.fillStyle='rgba(140,125,105,0.48)';ctx.font='italic 19px Georgia,serif';
  ctx.fillText('موقع رقم '+slotId,300,268);
  return cv;
}

// ── Main Component ──────────────────────────────────────────────
export default function Gallery() {
  const mountRef  = useRef(null);
  const stateRef  = useRef({yaw:0,pitch:0,keys:{},isLocked:false,joystick:{active:false,dx:0,dy:0},lookTouch:{active:false,id:null,lastX:0,lastY:0}});
  const [photos,setPhotos]         = useState([]);
  const [entered,setEntered]       = useState(false);
  const [photoInfo,setPhotoInfo]   = useState(null);
  const [locked,setLocked]         = useState(false);
  const [isMobile,setIsMobile]     = useState(false);
  const [loading,setLoading]       = useState(false);
  const [fullscreen,setFullscreen] = useState(null); // {url, title, sub}
  const jZoneRef=useRef(null), jKnobRef=useRef(null);

  useEffect(()=>{
    setIsMobile('ontouchstart' in window||navigator.maxTouchPoints>0);
    fetch('/api/photos').then(r=>r.json()).then(d=>setPhotos(Array.isArray(d)?d:[]));
  },[]);

  useEffect(()=>{
    if(!entered) return;
    setLoading(true);
    const s=stateRef.current;
    let THREE,renderer,scene,camera,animId;
    const hitGroups=[];

    const init=async()=>{
      THREE=await import('three');
      scene=new THREE.Scene();
      scene.background=new THREE.Color(0xccc5bc);
      scene.fog=new THREE.Fog(0xccc5bc,20,50);
      camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.05,80);
      camera.position.set(0,1.72,19);
      renderer=new THREE.WebGLRenderer({antialias:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      renderer.setSize(innerWidth,innerHeight);
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=0.88;
      mountRef.current?.appendChild(renderer.domElement);
      await buildRoom(THREE);
      await buildArtworks(THREE,hitGroups);
      setupControls(renderer);
      animate(THREE,hitGroups);
      setLoading(false);
    };

    const buildRoom=async(T)=>{
      const m=(c,r=.88,mt=0,map=null)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:mt,...(map?{map}:{})});
      const box=(w,h,d,mat,px,py,pz)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(px,py,pz);mesh.receiveShadow=mesh.castShadow=true;scene.add(mesh);return mesh;};

      const wallTex=new T.CanvasTexture(mkWallTex());wallTex.wrapS=wallTex.wrapT=T.RepeatWrapping;wallTex.repeat.set(4,2);
      const floorTex=new T.CanvasTexture(mkFloorTex());floorTex.wrapS=floorTex.wrapT=T.RepeatWrapping;floorTex.repeat.set(7,10);
      const ceilTex=new T.CanvasTexture(mkCeilTex());ceilTex.wrapS=ceilTex.wrapT=T.RepeatWrapping;ceilTex.repeat.set(4,6);
      const carpetTex=new T.CanvasTexture(mkCarpetTex());carpetTex.wrapS=carpetTex.wrapT=T.RepeatWrapping;carpetTex.repeat.set(1,3);

      const wallM =m(0xffffff,.92,0,wallTex);
      const floorM=m(0xffffff,.42,.1,floorTex);
      const ceilM =m(0xffffff,.97,0,ceilTex);
      const moldM =m(0xdad2c2,.58,.03);
      const baseM =m(0xcfc7b5,.65,.02);
      const darkWallM=m(0x1c1814,.95,0); // dark wainscoting below chair rail

      // ── MAIN HALL SHELL ──
      const MHW=28,MHL=20.5,MHH=6.5;
      box(MHW,.22,MHL,floorM, 0,-.11,-.75);    // floor
      box(MHW,.12,MHL,ceilM,  0,MHH,-.75);    // ceiling
      box(.25,MHH,MHL,wallM,-14,MHH/2,-.75);  // left
      box(.25,MHH,MHL,wallM, 14,MHH/2,-.75);  // right
      box(MHW,MHH,.25,wallM,  0,MHH/2,-13.88);// back (north)
      // south wall of main hall (two pieces with arch gap for corridor)
      box(10,MHH,.25,wallM,-9,MHH/2, 6.38);   // south-left
      box(10,MHH,.25,wallM, 9,MHH/2, 6.38);   // south-right
      // Inner dividers
      box(.22,MHH,11,wallM,-7,MHH/2,-7);
      box(.22,MHH,11,wallM, 7,MHH/2,-7);

      // ── CORRIDOR SHELL ──
      const CW=8,CL=15,CH=8.5;
      const CZ=12.5; // center z of corridor
      box(CW,.22,CL,floorM, 0,-.11,CZ);  // corridor floor
      box(CW,.12,CL,ceilM,  0,CH,CZ);    // corridor ceiling (HIGH)
      box(.25,CH,CL,wallM, -4,CH/2,CZ);  // corridor left wall
      box(.25,CH,CL,wallM,  4,CH/2,CZ);  // corridor right wall
      box(CW,CH,.25,wallM,  0,CH/2,20.5);// north (entrance) wall behind player

      // Archway from corridor to main hall
      // Pillars
      const pillarM=m(0xe8e0d4,.55,.04);
      box(1.2,MHH,1.2,pillarM,-5, MHH/2, 6);
      box(1.2,MHH,1.2,pillarM, 5, MHH/2, 6);
      // Arch lintel
      box(10.4,.8,1.2,pillarM, 0,MHH-.4, 6);
      // Cornice over arch
      box(10.4,.2,1.4,moldM, 0,MHH-.82, 6);

      // ── RED CARPET ──
      const carpetM=m(0xffffff,.85,0,carpetTex);
      box(4,.025,CL-1,carpetM,0,.01,CZ); // corridor carpet
      box(5,.025,6,carpetM,0,.01,3);     // main hall entrance carpet
      // Gold carpet border strips
      const goldM=m(0xc8a820,.4,.7);
      box(4.3,.025,.08,goldM,0,.005,CZ-CL/2+.5);
      box(4.3,.025,.08,goldM,0,.005,CZ+CL/2-.5);
      box(.08,.025,CL,goldM,-2.18,.005,CZ);
      box(.08,.025,CL,goldM, 2.18,.005,CZ);

      // ── BASEBOARD ──
      const doBase=(w,d,px,py,pz,ry=0)=>{
        const g=new T.Group();g.rotation.y=ry;g.position.set(px,py,pz);
        const panel=new T.Mesh(new T.BoxGeometry(w,.26,.09),baseM);panel.position.y=.13;g.add(panel);
        const cap=new T.Mesh(new T.BoxGeometry(w,.055,.1),moldM);cap.position.y=.275;g.add(cap);
        scene.add(g);
      };
      // Main hall bases
      doBase(MHL,.09,-14,.0,-.75,Math.PI/2);doBase(MHL,.09,14,.0,-.75,Math.PI/2);
      doBase(MHW,.09,0,.0,-13.88);doBase(10,.09,-9,.0,6.38);doBase(10,.09,9,.0,6.38);
      // Corridor bases
      doBase(CL,.09,-4,.0,CZ,Math.PI/2);doBase(CL,.09,4,.0,CZ,Math.PI/2);

      // ── CROWN MOLDING ──
      [MHH,CH].forEach((h,i)=>{
        const z=i===0?-.75:CZ;const w=i===0?MHW:CW;
        box(w,.18,.1,moldM,0,h-.09,z-(i===0?MHL/2:CL/2)+.12);
        box(w,.18,.1,moldM,0,h-.09,z+(i===0?MHL/2:CL/2)-.12);
      });

      // ── CHAIR RAIL ──
      const chairM=m(0xddd5c5,.52,.04);
      box(MHL,.055,.07,chairM,-14,1.12,-.75);box(MHL,.055,.07,chairM,14,1.12,-.75);
      box(MHW,.055,.07,chairM,0,1.12,-13.88);
      box(CL,.055,.07,chairM,-4,1.12,CZ);box(CL,.055,.07,chairM,4,1.12,CZ);

      // ── WAINSCOTING (dark lower wall panels) ──
      const wainM=m(0x2a2420,.88,0,wallTex);
      box(MHL,1.1,.22,wainM,-14,.55,-.75);box(MHL,1.1,.22,wainM,14,.55,-.75);
      box(MHW,1.1,.22,wainM,0,.55,-13.88);
      box(CL,1.1,.22,wainM,-4,.55,CZ);box(CL,1.1,.22,wainM,4,.55,CZ);

      // ── CEILING TRACK LIGHTS ──
      const trackM2=m(0x1a1a22,.1,.97);
      const coneM2 =m(0x0e0e16,.06,.98);
      const lensM2 =new T.MeshStandardMaterial({color:0xfff8e8,emissive:0xfff8e8,emissiveIntensity:2.2,roughness:0,metalness:0});

      const addTrackRow=(xs,zs,h)=>{
        xs.forEach(rx=>{
          const rail=new T.Mesh(new T.BoxGeometry(.042,.03,Math.abs(zs[1]-zs[0])+1),trackM2);
          rail.position.set(rx,h-.025,(zs[0]+zs[1])/2);scene.add(rail);
          zs.forEach(rz=>{
            const g=new T.Group();g.position.set(rx,h-.025,rz);
            const adapt=new T.Mesh(new T.BoxGeometry(.065,.048,.065),trackM2);adapt.position.y=-.024;g.add(adapt);
            const stem=new T.Mesh(new T.CylinderGeometry(.011,.011,.26,8),trackM2);stem.position.y=-.155;g.add(stem);
            const knuck=new T.Mesh(new T.SphereGeometry(.02,10,10),trackM2);knuck.position.y=-.288;g.add(knuck);
            const hous=new T.Mesh(new T.CylinderGeometry(.026,.09,.2,20,1,true),coneM2);hous.position.y=-.41;g.add(hous);
            const topC=new T.Mesh(new T.CircleGeometry(.026,20),coneM2);topC.rotation.x=Math.PI/2;topC.position.y=-.31;g.add(topC);
            const refM2=new T.MeshStandardMaterial({color:0x2a2a36,roughness:.04,metalness:.99});
            const ref2=new T.Mesh(new T.CylinderGeometry(.024,.086,.19,20,1,true),refM2);ref2.position.y=-.409;g.add(ref2);
            const lens=new T.Mesh(new T.CircleGeometry(.072,24),lensM2);lens.rotation.x=Math.PI/2;lens.position.y=-.515;g.add(lens);
            const lRing=new T.Mesh(new T.TorusGeometry(.076,.007,8,24),coneM2);lRing.rotation.x=Math.PI/2;lRing.position.y=-.515;g.add(lRing);
            scene.add(g);
            // NEUTRAL spotlight — no color cast
            const spot=new T.SpotLight(0xffffff,2.8,18,Math.PI/7,0.22,1.3);
            spot.position.set(rx,h-.53,rz);spot.target.position.set(rx,0,rz);
            spot.castShadow=true;spot.shadow.mapSize.set(512,512);spot.shadow.bias=-.002;
            scene.add(spot);scene.add(spot.target);
          });
        });
      };

      // Corridor lights (tall ceiling)
      addTrackRow([-1.5,1.5],[8,13,18],CH);
      // Main hall lights
      addTrackRow([-9,0,9],[-12,-7,-2,3],MHH);

      // Ambient + fill
      scene.add(new T.AmbientLight(0xffffff, 1.0)); // إضاءة عامة قوية للوضوح      scene.add(new T.HemisphereLight(0xfff5ee,0xd0c8bc,.38));

      // ── WELCOME PLAQUE ──
      const PW=6.5,PH=3.8;
      const plaqueGroup=new T.Group();
      plaqueGroup.position.set(0,3.2,7.5);
      plaqueGroup.rotation.y=0; // faces +Z (south) toward visitor

      // Frame for plaque
      const bw=.18,fd=.1;
      const pFMat=new T.MeshStandardMaterial({color:0xc8a820,roughness:.15,metalness:.85});
      const topB=new T.Mesh(new T.BoxGeometry(PW+bw*2,bw,fd),pFMat);topB.position.set(0,PH/2+bw/2,fd/2);plaqueGroup.add(topB);
      const botB=new T.Mesh(new T.BoxGeometry(PW+bw*2,bw,fd),pFMat);botB.position.set(0,-PH/2-bw/2,fd/2);plaqueGroup.add(botB);
      const lftB=new T.Mesh(new T.BoxGeometry(bw,PH,fd),pFMat);lftB.position.set(-PW/2-bw/2,0,fd/2);plaqueGroup.add(lftB);
      const rgtB=new T.Mesh(new T.BoxGeometry(bw,PH,fd),pFMat);rgtB.position.set(PW/2+bw/2,0,fd/2);plaqueGroup.add(rgtB);
      // Corner ornaments
      [[-1,1],[-1,-1],[1,-1],[1,1]].forEach(([sx,sy])=>{
        const orn=new T.Mesh(new T.BoxGeometry(bw*1.5,bw*1.5,fd*1.5),pFMat);
        orn.position.set(sx*(PW/2+bw/2),sy*(PH/2+bw/2),fd/2);plaqueGroup.add(orn);
      });

      // Plaque surface
      const pTex=new T.CanvasTexture(mkPlaqueCanvas(1024,640));
      const pMesh=new T.Mesh(new T.PlaneGeometry(PW,PH),new T.MeshStandardMaterial({map:pTex,roughness:.75,metalness:.05}));
      pMesh.position.z=fd+.01;plaqueGroup.add(pMesh);
      // Back panel
      const backP=new T.Mesh(new T.BoxGeometry(PW+bw*2+.04,PH+bw*2+.04,.04),new T.MeshStandardMaterial({color:0x0a0906,roughness:.9}));
      backP.position.z=-.01;plaqueGroup.add(backP);
      // Plaque accent light
      const pLight=new T.SpotLight(0xfff8d8,2.5,8,Math.PI/9,.25,1.8);
      pLight.position.set(0,PH/2+1,2);pLight.target.position.set(0,0,0);
      plaqueGroup.add(pLight);plaqueGroup.add(pLight.target);
      scene.add(plaqueGroup);

      // ── BENCHES ──
      const benchWTex=new T.CanvasTexture(mkWoodTex(FRAME_STYLES[1]));
      benchWTex.wrapS=benchWTex.wrapT=T.RepeatWrapping;benchWTex.repeat.set(3,1);
      const bSeatM=new T.MeshStandardMaterial({map:benchWTex,roughness:.58,metalness:.02});
      const bLegM=new T.MeshStandardMaterial({color:0x1a1a24,roughness:.12,metalness:.92});
      [[0,-5],[0,-11],[-10,-5],[10,-5],[0,2]].forEach(([bx,bz])=>{
        const g=new T.Group();g.position.set(bx,.0,bz);
        [-0.13,0,.13].forEach(oz=>{const p=new T.Mesh(new T.BoxGeometry(2,.06,.16),bSeatM);p.position.set(0,.465,oz);p.castShadow=p.receiveShadow=true;g.add(p);});
        [[-0.78],[.78]].forEach(([lx])=>{const leg=new T.Mesh(new T.BoxGeometry(.05,.46,.44),bLegM);leg.position.set(lx,.23,0);leg.castShadow=true;g.add(leg);});
        const str=new T.Mesh(new T.BoxGeometry(1.6,.03,.03),bLegM);str.position.y=.11;g.add(str);
        scene.add(g);
      });
    };

    // ── ARTWORKS ──
    const buildArtworks=async(T,hits)=>{
      const pm={};photos.forEach(p=>{pm[p.position_index]=p;});
      for(const slot of SLOTS) await buildSlot(T,slot,pm[slot.id],hits);
    };

    const buildSlot=(T,slot,ph,hits)=>new Promise(resolve=>{
      const group=new T.Group();
      group.position.set(...slot.pos);group.rotation.y=slot.rotY;
      const style=FRAME_STYLES[slot.id%FRAME_STYLES.length];

      const finalize=(fw,fh,tex,hasPhoto)=>{
        buildFrame(T,group,fw,fh,style);
      const img = new T.Mesh(new T.PlaneGeometry(fw,fh), new T.MeshBasicMaterial({map:tex, transparent:true}));
        img.position.z=.066;group.add(img);
        addPicLight(T,group,fw,fh,hasPhoto);
        addLabel(T,group,slot.id,fw,fh,hasPhoto);
        group.userData={title:ph?.title||'',sub:ph?.subtitle||'',hasPhoto,imageUrl:ph?.image_url||null};
        if(hasPhoto)hits.push(group);
        scene.add(group);resolve();
      };

      if(ph?.image_url){
        const img=new Image();img.crossOrigin='anonymous';
        img.onload=()=>{
          const asp=img.naturalWidth/img.naturalHeight;
          const mH=2.1,mW=3.0;
          const fw=asp>=1?Math.min(mW,asp*mH):mH*asp;
          const fh=asp>=1?fw/asp:mH;
          const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;
          cv.getContext('2d').drawImage(img,0,0);
          const t=new T.CanvasTexture(cv);
          finalize(fw,fh,t,true);
        };
        img.onerror=()=>finalize(2.0,1.5,new T.CanvasTexture(mkPlaceholder(slot.id,style)),false);
        img.src=ph.image_url;
      } else finalize(2.0,1.5,new T.CanvasTexture(mkPlaceholder(slot.id,style)),false);
    });

    const buildFrame=(T,group,fw,fh,style)=>{
      const woodTex=new T.CanvasTexture(mkWoodTex(style));
      const faceMat=new T.MeshStandardMaterial({map:woodTex,roughness:style.metal?.5:.52,metalness:style.metal?.65:.02,color:style.metal&&style.color===0xC8A820?0xffe060:style.metal?0xe8e8e8:0xffffff});
      const sideMat=new T.MeshStandardMaterial({color:style.dark,roughness:.68,metalness:style.metal?.5:.01});
      const mats=[sideMat,sideMat,sideMat,sideMat,faceMat,sideMat];

      const bw=.15,fd=.06;
      // 4 bars — top/bottom span full width including corners
      [{w:fw+bw*2,h:bw,d:fd,x:0,y:fh/2+bw/2},{w:fw+bw*2,h:bw,d:fd,x:0,y:-fh/2-bw/2},
       {w:bw,h:fh,d:fd,x:-fw/2-bw/2,y:0},{w:bw,h:fh,d:fd,x:fw/2+bw/2,y:0}]
      .forEach(b=>{
        const mesh=new T.Mesh(new T.BoxGeometry(b.w,b.h,b.d),mats);
        mesh.position.set(b.x,b.y,b.d/2);mesh.castShadow=true;group.add(mesh);
      });

      // Shadow gap (inner bevel)
      const gapM=new T.MeshStandardMaterial({color:0x060606,roughness:1});
      const gH=new T.Mesh(new T.BoxGeometry(fw+bw*2,.01,.02),gapM);gH.position.set(0,fh/2,.08);group.add(gH);
      const gH2=new T.Mesh(new T.BoxGeometry(fw+bw*2,.01,.02),gapM);gH2.position.set(0,-fh/2,.08);group.add(gH2);
      const gV=new T.Mesh(new T.BoxGeometry(.01,fh,.02),gapM);gV.position.set(-fw/2,0,.08);group.add(gV);
      const gV2=new T.Mesh(new T.BoxGeometry(.01,fh,.02),gapM);gV2.position.set(fw/2,0,.08);group.add(gV2);

      // White mat
      const matBW=.04;
      const matM=new T.MeshStandardMaterial({color:0xf4f0ea,roughness:.92});
      [{w:fw+matBW*2,h:matBW,x:0,y:fh/2+matBW/2},{w:fw+matBW*2,h:matBW,x:0,y:-fh/2-matBW/2},
       {w:matBW,h:fh,x:-fw/2-matBW/2,y:0},{w:matBW,h:fh,x:fw/2+matBW/2,y:0}]
      .forEach(b=>{const mesh=new T.Mesh(new T.BoxGeometry(b.w,b.h,.006),matM);mesh.position.set(b.x,b.y,.072);group.add(mesh);});

      // Back board
      const backM=new T.MeshStandardMaterial({color:0x100e0c,roughness:.9});
      const back=new T.Mesh(new T.BoxGeometry(fw+bw*2+.02,fh+bw*2+.02,.01),backM);back.position.z=-.003;group.add(back);
    };

    const addPicLight=(T,group,fw,fh,lit)=>{
      const brass=new T.MeshStandardMaterial({color:0xb89030,roughness:.12,metalness:.93});
      const dark2=new T.MeshStandardMaterial({color:0x080810,roughness:.06,metalness:.97});
      const glowM=new T.MeshStandardMaterial({color:0xfff8e0,emissive:0xfff8e0,emissiveIntensity:lit?2.0:.1,roughness:0,metalness:0});
      const g=new T.Group();g.position.set(0,fh/2+.2,.12);
      g.add(Object.assign(new T.Mesh(new T.BoxGeometry(fw*.44,.048,.036),brass),{}));
      const arm=new T.Mesh(new T.CylinderGeometry(.009,.009,.15,8),brass);arm.rotation.x=Math.PI/2;arm.position.z=.075;g.add(arm);
      const shade=new T.Mesh(new T.CylinderGeometry(.04,.072,fw*.38,18,1,true,0,Math.PI),dark2);shade.rotation.x=-Math.PI/2;shade.position.z=.15;g.add(shade);
      const sCap=new T.Mesh(new T.PlaneGeometry(fw*.38,.085),dark2);sCap.position.z=.15;g.add(sCap);
      const glow=new T.Mesh(new T.CylinderGeometry(.006,.006,fw*.34,8),glowM);glow.rotation.z=Math.PI/2;glow.position.set(0,.026,.15);g.add(glow);
      const ecapM=new T.MeshStandardMaterial({color:0x0a0a14,roughness:.3,metalness:.8});
      [-fw*.19,fw*.19].forEach(ex=>{const ec=new T.Mesh(new T.BoxGeometry(.004,.072,.072),ecapM);ec.position.set(ex,.02,.15);g.add(ec);});
      group.add(g);
      if(lit){
        // Neutral white spotlight — no color cast on photos
        const pl=new T.SpotLight(0xffffff,4.0,7,Math.PI/9,.2,1.8);
        pl.position.set(0,fh/2+.28,.32);pl.target.position.set(0,-fh*.26,.06);
        group.add(pl);group.add(pl.target);
      }
    };

    const addLabel=(T,group,slotId,fw,fh,hasPhoto)=>{
      const cv=document.createElement('canvas');cv.width=160;cv.height=54;
      const ctx2=cv.getContext('2d');
      ctx2.fillStyle=hasPhoto?'rgba(18,15,10,0.9)':'rgba(90,84,76,0.72)';
      ctx2.beginPath();ctx2.roundRect(0,0,160,54,27);ctx2.fill();
      const shine=ctx2.createLinearGradient(0,0,0,27);
      shine.addColorStop(0,'rgba(255,255,255,0.13)');shine.addColorStop(1,'rgba(255,255,255,0)');
      ctx2.fillStyle=shine;ctx2.beginPath();ctx2.roundRect(0,0,160,27,27);ctx2.fill();
      ctx2.fillStyle=hasPhoto?'#ffffff':'#c8c0b4';
      ctx2.font='bold 25px -apple-system,Segoe UI,sans-serif';ctx2.textAlign='center';
      ctx2.fillText('#'+slotId,80,36);
      const t=new T.CanvasTexture(cv);
      const sp=new T.Mesh(new T.PlaneGeometry(.5,.17),new T.MeshStandardMaterial({map:t,transparent:true,roughness:1,depthWrite:false}));
      sp.position.set(0,fh/2+.62,.08);group.add(sp);
    };

    const setupControls=(rdr)=>{
      document.addEventListener('keydown',e=>{s.keys[e.code]=true;});
      document.addEventListener('keyup',e=>{s.keys[e.code]=false;});
      if(!isMobile){
        rdr.domElement.addEventListener('click',()=>rdr.domElement.requestPointerLock());
        document.addEventListener('pointerlockchange',()=>{s.isLocked=document.pointerLockElement===rdr.domElement;setLocked(s.isLocked);});
        document.addEventListener('mousemove',e=>{if(!s.isLocked)return;s.yaw-=e.movementX*.0018;s.pitch-=e.movementY*.0018;s.pitch=Math.max(-1.1,Math.min(1.1,s.pitch));});
      } else {
        rdr.domElement.addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.clientX>innerWidth/2&&!s.lookTouch.active)s.lookTouch={active:true,id:t.identifier,lastX:t.clientX,lastY:t.clientY};},{passive:false});
        rdr.domElement.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===s.lookTouch.id){s.yaw-=(t.clientX-s.lookTouch.lastX)*.004;s.pitch-=(t.clientY-s.lookTouch.lastY)*.004;s.pitch=Math.max(-1.1,Math.min(1.1,s.pitch));s.lookTouch.lastX=t.clientX;s.lookTouch.lastY=t.clientY;}},{passive:false});
        rdr.domElement.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===s.lookTouch.id)s.lookTouch={active:false,id:null,lastX:0,lastY:0};});
      }
    };

    const animate=(T,hits)=>{
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
          camera.rotation.order='YXZ';camera.rotation.y=s.yaw;camera.rotation.x=s.pitch;
          rc.setFromCamera({x:0,y:0},camera);
          const hh=rc.intersectObjects(hits,true);
          if(hh.length&&hh[0].distance<6){
            let obj=hh[0].object;while(obj&&!obj.userData?.hasPhoto)obj=obj.parent;
            if(obj?.userData?.hasPhoto)setPhotoInfo({title:obj.userData.title,sub:obj.userData.sub,imageUrl:obj.userData.imageUrl});
            else setPhotoInfo(null);
          } else setPhotoInfo(null);
        }
        renderer.render(scene,camera);
      };loop();
    };

    window.addEventListener('resize',()=>{if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
    init();
    return()=>{cancelAnimationFrame(animId);document.exitPointerLock?.();renderer?.dispose();if(mountRef.current&&renderer?.domElement?.parentNode===mountRef.current)mountRef.current.removeChild(renderer.domElement);};
  },[entered,photos]);

  // Joystick
  const onJoyStart=useCallback(e=>{e.preventDefault();stateRef.current.joystick={active:true,dx:0,dy:0};if(jKnobRef.current)jKnobRef.current.style.transform='translate(-50%,-50%)';},[]);
  const onJoyMove=useCallback(e=>{e.preventDefault();const s=stateRef.current;if(!s.joystick.active)return;const t=e.changedTouches[0];const zone=jZoneRef.current?.getBoundingClientRect();if(!zone)return;const cx=zone.left+zone.width/2,cy=zone.top+zone.height/2;let dx=t.clientX-cx,dy=t.clientY-cy;const maxR=42,dist=Math.sqrt(dx*dx+dy*dy);if(dist>maxR){dx=dx/dist*maxR;dy=dy/dist*maxR;}s.joystick.dx=dx;s.joystick.dy=dy;if(jKnobRef.current)jKnobRef.current.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;},[]);
  const onJoyEnd=useCallback(e=>{e.preventDefault();stateRef.current.joystick={active:false,dx:0,dy:0};if(jKnobRef.current)jKnobRef.current.style.transform='translate(-50%,-50%)';},[]);
  useEffect(()=>{const z=jZoneRef.current;if(!z||!entered)return;z.addEventListener('touchstart',onJoyStart,{passive:false});z.addEventListener('touchmove',onJoyMove,{passive:false});z.addEventListener('touchend',onJoyEnd,{passive:false});return()=>{z.removeEventListener('touchstart',onJoyStart);z.removeEventListener('touchmove',onJoyMove);z.removeEventListener('touchend',onJoyEnd);};},[entered,onJoyStart,onJoyMove,onJoyEnd]);

  const F={'font-family':'Segoe UI,Tahoma,sans-serif'};

  return(
    <>
      <Head>
        <title>معرض الفوتوغرافيا — AnwarBMA</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
      </Head>
      <div ref={mountRef} style={{width:'100vw',height:'100dvh',touchAction:'none'}}/>

      {/* LOADING */}
      {entered&&loading&&(
        <div style={{position:'fixed',inset:0,zIndex:300,background:'#ccc4ba',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif'}}>
          <div style={{width:54,height:54,border:'2px solid #c8a820',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',marginBottom:22}}/>
          <p style={{color:'#6a6050',letterSpacing:'.2em',fontSize:'.82rem'}}>جاري تحميل المعرض...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ENTRY */}
      {!entered&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'linear-gradient(155deg,#f0ebe2 0%,#e6e0d5 55%,#ddd8cf 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',padding:20,overflowY:'auto'}}>
          {[[-180,-120,240],[160,140,195],[-100,180,162],[150,-200,172]].map(([x,y,sz],i)=>(
            <div key={i} style={{position:'absolute',left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,width:sz,height:sz,borderRadius:'50%',border:'1px solid rgba(160,138,100,.18)',transform:'translate(-50%,-50%)'}}/>
          ))}
          <div style={{position:'relative',textAlign:'center',maxWidth:460,width:'100%'}}>
            <div style={{width:52,height:52,margin:'0 auto 22px',border:'1.5px solid #a89070',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:26,height:26,background:'#8a7458'}}/>
            </div>
            <h1 style={{fontSize:'clamp(1.6rem,6vw,2.6rem)',fontWeight:400,letterSpacing:'.35em',color:'#1e1a12',marginBottom:4}}>GALLERY</h1>
            <div style={{width:50,height:1,background:'#a89070',margin:'10px auto'}}/>
            <p style={{color:'#7a6e5e',fontSize:'clamp(.75rem,2.4vw,.9rem)',letterSpacing:'.15em',marginBottom:5,...F}}>معرض الفوتوغرافيا الافتراضي</p>
            <p style={{color:'#b0a090',fontSize:'.75rem',marginBottom:6,...F}}>إخراج: أنور محمد — AnwarBMA</p>
            <p style={{color:'#b0a898',fontSize:'.72rem',marginBottom:34,...F}}>{photos.length} عمل فني · 23 موقع عرض</p>
            <button onClick={()=>setEntered(true)} style={{background:'#1e1a12',color:'#f4f0e8',border:'none',padding:'15px 52px',fontSize:'.88rem',letterSpacing:'.22em',cursor:'pointer',fontFamily:'inherit',transition:'all .3s',WebkitTapHighlightColor:'transparent'}}
              onMouseEnter={e=>{e.target.style.background='#8a7458';}}
              onMouseLeave={e=>{e.target.style.background='#1e1a12';}}>
              دخول المعرض
            </button>
            <div style={{marginTop:28,display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              {(isMobile?[['↕↔ يسار','تحرك'],['سحب يمين','انظر']]:[['W A S D','التحرك'],['ماوس','النظر'],['Shift','ركض']]).map(([k,l])=>(
                <div key={k} style={{textAlign:'center'}}>
                  <div style={{background:'rgba(255,250,242,.82)',border:'1px solid #d8d0c4',padding:'4px 11px',fontSize:'.72rem',color:'#2a2010',fontFamily:'monospace',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:'.64rem',color:'#a09080',...F}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:30,paddingTop:18,borderTop:'1px solid #d8d0c4'}}>
              <a href="/admin/login" style={{color:'#a09078',fontSize:'.73rem',letterSpacing:'.12em',textDecoration:'none',borderBottom:'1px solid #c0b8a8',paddingBottom:1,...F}}>⚙ لوحة الإدارة</a>
            </div>
          </div>
        </div>
      )}

      {/* CROSSHAIR */}
      {entered&&locked&&!isMobile&&(<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:20,height:20,pointerEvents:'none',zIndex:50}}><div style={{position:'absolute',width:1,height:20,background:'rgba(255,250,240,.5)',left:9.5,top:0}}/><div style={{position:'absolute',width:20,height:1,background:'rgba(255,250,240,.5)',left:0,top:9.5}}/><div style={{position:'absolute',width:4,height:4,borderRadius:'50%',background:'rgba(255,250,240,.65)',left:8,top:8}}/></div>)}
      {entered&&isMobile&&(<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:7,height:7,borderRadius:'50%',background:'rgba(255,250,240,.55)',pointerEvents:'none',zIndex:50}}/>)}

      {/* PHOTO INFO + click for fullscreen */}
      {entered&&photoInfo&&(
        <div style={{position:'fixed',bottom:isMobile?170:62,left:'50%',transform:'translateX(-50%)',zIndex:50,cursor:'pointer'}}
          onClick={()=>photoInfo.imageUrl&&setFullscreen(photoInfo)}>
          <div style={{background:'rgba(15,12,8,.84)',backdropFilter:'blur(10px)',border:'1px solid rgba(200,170,100,.18)',padding:'11px 26px',color:'#f4f0e8',textAlign:'center',fontFamily:'Georgia,serif'}}>
            <div style={{fontWeight:400,fontSize:'.95rem',marginBottom:3}}>{photoInfo.title}</div>
            <div style={{fontSize:'.7rem',color:'#c0b090',letterSpacing:'.14em',...F}}>{photoInfo.sub}</div>
            {photoInfo.imageUrl&&<div style={{fontSize:'.62rem',color:'#a89070',marginTop:4,...F}}>اضغط للعرض الكامل</div>}
          </div>
        </div>
      )}

      {/* FULLSCREEN PHOTO */}
      {fullscreen&&(
        <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,.95)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setFullscreen(null)}>
          <img src={fullscreen.imageUrl} alt={fullscreen.title} style={{maxWidth:'90vw',maxHeight:'80vh',objectFit:'contain',boxShadow:'0 0 60px rgba(0,0,0,.8)'}}/>
          <div style={{marginTop:18,textAlign:'center'}}>
            <div style={{color:'#f4f0e8',fontSize:'1.1rem',fontFamily:'Georgia,serif',marginBottom:4}}>{fullscreen.title}</div>
            <div style={{color:'#a09070',fontSize:'.78rem',...F,letterSpacing:'.12em'}}>{fullscreen.sub}</div>
          </div>
          <div style={{position:'absolute',top:20,right:24,color:'rgba(255,250,240,.4)',fontSize:'1.4rem',cursor:'pointer'}}>✕</div>
        </div>
      )}

      {/* HUD */}
      {entered&&!isMobile&&(<div style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',fontSize:'.66rem',color:'rgba(255,250,240,.28)',letterSpacing:'.16em',pointerEvents:'none',zIndex:50,...F}}>{locked?'ESC للتوقف · Shift للركض':'انقر على المشهد للتحكم'}</div>)}

      {/* TOP BUTTONS */}
      {entered&&(
        <div style={{position:'fixed',top:14,right:14,zIndex:50,display:'flex',gap:8}}>
          <a href="/admin/login" target="_blank" style={{background:'rgba(20,16,10,.75)',border:'1px solid rgba(200,170,100,.2)',color:'#d8cfc0',padding:isMobile?'9px 14px':'7px 14px',borderRadius:2,fontSize:'.7rem',letterSpacing:'.1em',textDecoration:'none',backdropFilter:'blur(6px)',...F,WebkitTapHighlightColor:'transparent'}}>⚙ إدارة</a>
          <button onClick={()=>{document.exitPointerLock?.();setEntered(false);setLocked(false);}} style={{background:'rgba(20,16,10,.75)',border:'1px solid rgba(200,170,100,.2)',color:'#d8cfc0',padding:isMobile?'9px 14px':'7px 14px',cursor:'pointer',fontSize:'.7rem',letterSpacing:'.1em',borderRadius:2,backdropFilter:'blur(6px)',...F,WebkitTapHighlightColor:'transparent'}}>← خروج</button>
        </div>
      )}

      {/* JOYSTICK */}
      {entered&&isMobile&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,height:155,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px 16px',pointerEvents:'none',background:'linear-gradient(to top,rgba(15,12,8,.38),transparent)'}}>
          <div style={{pointerEvents:'auto'}}>
            <div ref={jZoneRef} style={{width:115,height:115,borderRadius:'50%',background:'rgba(255,250,240,.1)',border:'1.5px solid rgba(255,250,240,.25)',backdropFilter:'blur(4px)',position:'relative',touchAction:'none',WebkitTapHighlightColor:'transparent'}}>
              <div style={{position:'absolute',width:1,height:'55%',background:'rgba(255,250,240,.15)',left:'50%',top:'22.5%'}}/><div style={{position:'absolute',height:1,width:'55%',background:'rgba(255,250,240,.15)',top:'50%',left:'22.5%'}}/>
              <div ref={jKnobRef} style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:46,height:46,borderRadius:'50%',background:'rgba(255,250,240,.62)',border:'1.5px solid rgba(200,168,100,.45)',boxShadow:'0 2px 14px rgba(0,0,0,.22)'}}/>
            </div>
            <div style={{textAlign:'center',marginTop:5,fontSize:'.58rem',color:'rgba(255,250,240,.32)',letterSpacing:'.1em',...F}}>تحرك</div>
          </div>
          <div style={{textAlign:'center',opacity:.32}}><div style={{fontSize:'1.3rem',marginBottom:4}}>👁</div><div style={{fontSize:'.58rem',color:'rgba(255,250,240,.5)',letterSpacing:'.1em',...F}}>اسحب للنظر</div></div>
        </div>
      )}
    </>
  );
}

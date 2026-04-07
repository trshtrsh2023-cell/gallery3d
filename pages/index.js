import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';

const SLOTS = [
  { id:0,  pos:[-10.85,2.5, -9.5], rotY:  Math.PI/2 },
  { id:1,  pos:[-10.85,2.5, -3.0], rotY:  Math.PI/2 },
  { id:2,  pos:[-10.85,2.5,  3.5], rotY:  Math.PI/2 },
  { id:3,  pos:[-10.85,2.5,  9.5], rotY:  Math.PI/2 },
  { id:4,  pos:[ 10.85,2.5, -9.5], rotY: -Math.PI/2 },
  { id:5,  pos:[ 10.85,2.5, -3.0], rotY: -Math.PI/2 },
  { id:6,  pos:[ 10.85,2.5,  3.5], rotY: -Math.PI/2 },
  { id:7,  pos:[ 10.85,2.5,  9.5], rotY: -Math.PI/2 },
  { id:8,  pos:[  -6.0,2.5,-16.85],rotY:  0 },
  { id:9,  pos:[   0.0,2.5,-16.85],rotY:  0 },
  { id:10, pos:[   6.0,2.5,-16.85],rotY:  0 },
  { id:11, pos:[ -5.35,2.5, -9.5], rotY:  Math.PI/2 },
  { id:12, pos:[ -5.35,2.5,  3.0], rotY:  Math.PI/2 },
  { id:13, pos:[  5.35,2.5, -9.5], rotY: -Math.PI/2 },
  { id:14, pos:[  5.35,2.5,  3.0], rotY: -Math.PI/2 },
];

// Realistic wood tones for frames
const FRAME_STYLES = [
  { color:0x8B6914, dark:0x5C4309, name:'walnut' },
  { color:0xC4934A, dark:0x8B6218, name:'oak' },
  { color:0x2C1810, dark:0x180C08, name:'ebony' },
  { color:0xA0522D, dark:0x6B3418, name:'mahogany' },
  { color:0xD4A853, dark:0x9B7A32, name:'maple' },
  { color:0x4A3728, dark:0x2C2018, name:'dark-walnut' },
  { color:0xC49A6C, dark:0x8B6A44, name:'light-oak' },
  { color:0x1C1C1C, dark:0x101010, name:'matte-black' },
  { color:0xD4AF37, dark:0x9B8020, name:'gold' },
  { color:0xC0C0C0, dark:0x888888, name:'silver' },
  { color:0x8B6914, dark:0x5C4309, name:'walnut' },
  { color:0xC4934A, dark:0x8B6218, name:'oak' },
  { color:0x2C1810, dark:0x180C08, name:'ebony' },
  { color:0xD4A853, dark:0x9B7A32, name:'maple' },
  { color:0xA0522D, dark:0x6B3418, name:'mahogany' },
];

// ── Procedural texture generators ──────────────────────────────
function makeWallTexture(w=512, h=512) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');

  // Base warm white
  ctx.fillStyle = '#e8e2da';
  ctx.fillRect(0, 0, w, h);

  // Subtle plaster noise — multiple passes
  for (let i = 0; i < 6000; i++) {
    const x = Math.random()*w, y = Math.random()*h;
    const r = Math.random()*2.5 + 0.3;
    const alpha = Math.random()*0.028 + 0.005;
    const light = Math.random() > 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle = light ? `rgba(255,252,248,${alpha})` : `rgba(160,148,132,${alpha})`;
    ctx.fill();
  }

  // Subtle horizontal brush strokes
  for (let i = 0; i < 80; i++) {
    const y = Math.random()*h;
    const alpha = Math.random()*0.012;
    ctx.fillStyle = `rgba(180,168,152,${alpha})`;
    ctx.fillRect(0, y, w, Math.random()*1.5 + 0.3);
  }

  // Vignette edges slightly darker
  const vig = ctx.createRadialGradient(w/2,h/2,h*0.2, w/2,h/2,h*0.85);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(40,30,20,0.06)');
  ctx.fillStyle = vig; ctx.fillRect(0,0,w,h);

  return cv;
}

function makeFloorTexture(w=1024, h=1024) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');

  // Base stone
  ctx.fillStyle = '#a89880';
  ctx.fillRect(0, 0, w, h);

  // Stone grain
  for (let i = 0; i < 8000; i++) {
    const x = Math.random()*w, y = Math.random()*h;
    const r = Math.random()*3 + 0.5;
    const alpha = Math.random()*0.04;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle = Math.random()>0.5 ? `rgba(200,185,160,${alpha})` : `rgba(80,65,50,${alpha})`;
    ctx.fill();
  }

  // Tile grid lines — large format stone tiles
  const tileW = w/4, tileH = h/4;
  ctx.strokeStyle = 'rgba(80,65,50,0.22)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= w; x += tileW) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y = 0; y <= h; y += tileH) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

  // Grout fill
  ctx.strokeStyle = 'rgba(90,75,58,0.15)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= w; x += tileW) { ctx.beginPath(); ctx.moveTo(x-1,0); ctx.lineTo(x-1,h); ctx.stroke(); }
  for (let y = 0; y <= h; y += tileH) { ctx.beginPath(); ctx.moveTo(0,y-1); ctx.lineTo(w,y-1); ctx.stroke(); }

  // Subtle sheen per tile
  for (let tx = 0; tx < 4; tx++) for (let ty = 0; ty < 4; ty++) {
    const x0=tx*tileW, y0=ty*tileH;
    const g = ctx.createLinearGradient(x0,y0,x0+tileW,y0+tileH);
    g.addColorStop(0,'rgba(255,248,240,0.06)');
    g.addColorStop(0.5,'rgba(255,248,240,0.02)');
    g.addColorStop(1,'rgba(80,60,40,0.04)');
    ctx.fillStyle=g; ctx.fillRect(x0+2,y0+2,tileW-4,tileH-4);
  }

  return cv;
}

function makeWoodFrameTexture(w=256, h=64, style) {
  const cv = document.createElement('canvas');
  cv.width=w; cv.height=h;
  const ctx = cv.getContext('2d');

  const c1 = '#'+style.color.toString(16).padStart(6,'0');
  const c2 = '#'+style.dark.toString(16).padStart(6,'0');

  if (style.name === 'gold' || style.name === 'silver') {
    // Metallic gradient
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, style.name==='gold' ? '#e8c84a':'#d8d8d8');
    g.addColorStop(0.3, c1);
    g.addColorStop(0.5, style.name==='gold' ? '#f8e070':'#f0f0f0');
    g.addColorStop(0.7, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    // Metallic sheen lines
    for(let i=0;i<20;i++){
      ctx.strokeStyle=`rgba(255,245,200,${Math.random()*0.15})`;
      ctx.lineWidth=Math.random()*1.5;
      ctx.beginPath();ctx.moveTo(Math.random()*w,0);ctx.lineTo(Math.random()*w,h);ctx.stroke();
    }
    return cv;
  }

  if (style.name === 'matte-black') {
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,0,w,h);
    for(let i=0;i<500;i++){
      ctx.fillStyle=`rgba(80,80,80,${Math.random()*0.04})`;
      ctx.fillRect(Math.random()*w,Math.random()*h,Math.random()*3,Math.random()*3);
    }
    return cv;
  }

  // Wood grain
  const baseG = ctx.createLinearGradient(0,0,0,h);
  baseG.addColorStop(0,c1); baseG.addColorStop(0.4,c2); baseG.addColorStop(0.7,c1); baseG.addColorStop(1,c2);
  ctx.fillStyle=baseG; ctx.fillRect(0,0,w,h);

  // Wood grain lines
  for (let i=0; i<60; i++){
    const y = Math.random()*h*2 - h*0.5;
    const amp = Math.random()*4+1;
    const freq = Math.random()*0.04+0.01;
    ctx.strokeStyle = Math.random()>0.5
      ? `rgba(255,220,160,${Math.random()*0.08+0.02})`
      : `rgba(40,20,5,${Math.random()*0.1+0.03})`;
    ctx.lineWidth = Math.random()*1.2+0.3;
    ctx.beginPath();
    for(let x=0;x<w;x+=2){
      const wy=y+Math.sin(x*freq)*amp+Math.sin(x*freq*2.3)*amp*0.4;
      x===0?ctx.moveTo(x,wy):ctx.lineTo(x,wy);
    }
    ctx.stroke();
  }

  // Edge highlight
  const hG=ctx.createLinearGradient(0,0,0,h);
  hG.addColorStop(0,'rgba(255,235,190,0.18)');
  hG.addColorStop(0.15,'rgba(255,235,190,0.06)');
  hG.addColorStop(1,'rgba(0,0,0,0.12)');
  ctx.fillStyle=hG; ctx.fillRect(0,0,w,h);

  return cv;
}

function makeCeilingTexture(w=512,h=512){
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#f5f2ee'; ctx.fillRect(0,0,w,h);
  for(let i=0;i<3000;i++){
    ctx.fillStyle=`rgba(${Math.random()>0.5?'220,215,208':'160,150,140'},${Math.random()*0.015})`;
    const r=Math.random()*2;
    ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,r,0,Math.PI*2);ctx.fill();
  }
  return cv;
}

// ── Main Component ──────────────────────────────────────────────
export default function Gallery() {
  const mountRef    = useRef(null);
  const stateRef    = useRef({
    yaw:0, pitch:0, keys:{}, isLocked:false,
    joystick:{ active:false, dx:0, dy:0 },
    lookTouch:{ active:false, id:null, lastX:0, lastY:0 },
  });

  const [photos,setPhotos]         = useState([]);
  const [entered,setEntered]       = useState(false);
  const [photoInfo,setPhotoInfo]   = useState(null);
  const [locked,setLocked]         = useState(false);
  const [isMobile,setIsMobile]     = useState(false);
  const [loading,setLoading]       = useState(false);

  const joystickZoneRef = useRef(null);
  const joystickKnobRef = useRef(null);

  useEffect(()=>{
    setIsMobile('ontouchstart' in window||navigator.maxTouchPoints>0);
    fetch('/api/photos').then(r=>r.json()).then(d=>setPhotos(Array.isArray(d)?d:[]));
  },[]);

  useEffect(()=>{
    if(!entered) return;
    setLoading(true);
    const s=stateRef.current;
    let THREE, renderer, scene, camera, animId;
    const hitMeshes=[];

    const init=async()=>{
      THREE=await import('three');

      // ── Scene ────────────────────────────────────────
      scene=new THREE.Scene();
      scene.background=new THREE.Color(0xd8d0c6);
      scene.fog=new THREE.Fog(0xd8d0c6, 18, 42);

      camera=new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.05, 60);
      camera.position.set(0,1.72,13);

      renderer=new THREE.WebGLRenderer({ antialias:true });
      renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      renderer.setSize(innerWidth,innerHeight);
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=0.95;
      renderer.outputColorSpace=THREE.SRGBColorSpace||'srgb';
      mountRef.current?.appendChild(renderer.domElement);

      await buildRoom(THREE);
      await buildArtworks(THREE, hitMeshes);
      setupControls(renderer);
      animate(THREE, hitMeshes);
      setLoading(false);
    };

    // ══════════════════════════════════════════════════
    //  ROOM — realistic textures
    // ══════════════════════════════════════════════════
    const buildRoom=async(T)=>{
      const RW=22, RL=34, RH=5.6;

      // Pre-generate textures
      const wallTex   = new T.CanvasTexture(makeWallTexture(512,512));
      wallTex.wrapS   = wallTex.wrapT = T.RepeatWrapping;
      wallTex.repeat.set(4,2);

      const floorTex  = new T.CanvasTexture(makeFloorTexture(1024,1024));
      floorTex.wrapS  = floorTex.wrapT = T.RepeatWrapping;
      floorTex.repeat.set(8,11);

      const ceilTex   = new T.CanvasTexture(makeCeilingTexture(512,512));
      ceilTex.wrapS   = ceilTex.wrapT = T.RepeatWrapping;
      ceilTex.repeat.set(5,8);

      // Materials
      const wallM  = new T.MeshStandardMaterial({ map:wallTex, roughness:0.92, metalness:0 });
      const floorM = new T.MeshStandardMaterial({ map:floorTex, roughness:0.45, metalness:0.08 });
      const ceilM  = new T.MeshStandardMaterial({ map:ceilTex, roughness:0.97, metalness:0 });
      const moldM  = new T.MeshStandardMaterial({ color:0xddd5c5, roughness:0.6, metalness:0.04 });
      const baseM  = new T.MeshStandardMaterial({ color:0xcfc7b7, roughness:0.65, metalness:0.02 });

      const box=(w,h,d,mat,px,py,pz,ry=0)=>{
        const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
        mesh.position.set(px,py,pz); mesh.rotation.y=ry;
        mesh.receiveShadow=mesh.castShadow=true;
        scene.add(mesh); return mesh;
      };

      // Shell
      box(RW, 0.28, RL, floorM, 0,-0.14,0);
      box(RW, 0.16, RL, ceilM,  0, RH,  0);
      box(0.28, RH, RL, wallM, -RW/2, RH/2, 0);
      box(0.28, RH, RL, wallM,  RW/2, RH/2, 0);
      box(RW, RH, 0.28, wallM,  0, RH/2,-RL/2);
      box(RW, RH, 0.28, wallM,  0, RH/2, RL/2);
      // Dividers
      box(0.22,RH,7, wallM,-5.5,RH/2,-7);
      box(0.22,RH,7, wallM, 5.5,RH/2,-7);
      box(0.22,RH,7, wallM,-5.5,RH/2, 6);
      box(0.22,RH,7, wallM, 5.5,RH/2, 6);

      // ── Baseboard (detailed profile) ────────────────
      const mkBase=(w,d,px,py,pz,ry=0)=>{
        // Main panel
        box(w, 0.28, d, baseM, px,0.14,pz,ry);
        // Cap rail
        box(w, 0.06, d+0.02, moldM, px,0.29,pz,ry);
        // Shoe
        box(w, 0.04, d+0.01, baseM, px,0.02,pz,ry);
      };
      mkBase(RW, 0.1, 0, 0, -RL/2+0.14);
      mkBase(RW, 0.1, 0, 0,  RL/2-0.14);
      mkBase(0.1, RL, -RW/2+0.14, 0, 0, Math.PI/2);
      mkBase(0.1, RL,  RW/2-0.14, 0, 0, Math.PI/2);

      // ── Crown molding ────────────────────────────────
      const mkCrown=(w,d,px,pz,ry=0)=>{
        box(w, 0.1, d, moldM, px,RH-0.05,pz,ry);
        box(w, 0.18, d+0.01, moldM, px,RH-0.16,pz,ry);
      };
      mkCrown(RW, 0.08, 0,-RL/2+0.14);
      mkCrown(RW, 0.08, 0, RL/2-0.14);
      mkCrown(0.08, RL,-RW/2+0.14,0, Math.PI/2);
      mkCrown(0.08, RL, RW/2-0.14,0, Math.PI/2);

      // ── Chair rail (dado rail) ───────────────────────
      const chairH=1.1;
      const cRailM=new T.MeshStandardMaterial({color:0xdad2c2,roughness:0.55,metalness:0.03});
      box(RW,0.055,0.07,cRailM, 0,chairH,-RL/2+0.14);
      box(RW,0.055,0.07,cRailM, 0,chairH, RL/2-0.14);
      box(0.07,0.055,RL,cRailM,-RW/2+0.14,chairH,0);
      box(0.07,0.055,RL,cRailM, RW/2-0.14,chairH,0);

      // ── Floor border inlay ───────────────────────────
      const inlayM=new T.MeshStandardMaterial({color:0x8a7660,roughness:0.4,metalness:0.1});
      box(RW-0.4,0.015,0.12,inlayM, 0,0.01,-RL/2+1);
      box(RW-0.4,0.015,0.12,inlayM, 0,0.01, RL/2-1);
      box(0.12,0.015,RL-2,inlayM,-RW/2+1,0.01,0);
      box(0.12,0.015,RL-2,inlayM, RW/2-1,0.01,0);

      // ── CEILING TRACK SYSTEM ─────────────────────────
      const trackM =new T.MeshStandardMaterial({color:0x1a1a22,roughness:0.12,metalness:0.96});
      const coneM  =new T.MeshStandardMaterial({color:0x0e0e16,roughness:0.08,metalness:0.98});
      const lensM  =new T.MeshStandardMaterial({color:0xfff8e0,emissive:0xfff8e0,emissiveIntensity:2.0,roughness:0,metalness:0,transparent:true,opacity:0.95});

      [-7,0,7].forEach(rx=>{
        // Rail
        const rail=new T.Mesh(new T.BoxGeometry(0.044,0.032,RL-1),trackM);
        rail.position.set(rx,RH-0.03,0); scene.add(rail);

        // Track end caps
        [-1,1].forEach(side=>{
          const cap=new T.Mesh(new T.BoxGeometry(0.06,0.04,0.06),trackM);
          cap.position.set(rx,RH-0.03,side*(RL/2-0.7)); scene.add(cap);
        });

        [-9.5,-3.5,3.5,9.5].forEach(rz=>{
          const g=new T.Group(); g.position.set(rx,RH-0.032,rz);

          // Adapter on rail
          const adapt=new T.Mesh(new T.BoxGeometry(0.07,0.05,0.07),trackM);
          adapt.position.y=-0.025; g.add(adapt);

          // Stem
          const stem=new T.Mesh(new T.CylinderGeometry(0.012,0.012,0.28,8),trackM);
          stem.position.y=-0.165; g.add(stem);

          // Knuckle joint
          const knuck=new T.Mesh(new T.SphereGeometry(0.022,10,10),trackM);
          knuck.position.y=-0.305; g.add(knuck);

          // Reflector housing — tapered cylinder
          const hous=new T.Mesh(new T.CylinderGeometry(0.028,0.095,0.22,20,1,true),coneM);
          hous.position.y=-0.435; g.add(hous);

          // Top cap
          const topCap=new T.Mesh(new T.CircleGeometry(0.028,20),coneM);
          topCap.rotation.x=Math.PI/2; topCap.position.y=-0.325; g.add(topCap);

          // Inner reflector (slightly lighter)
          const refM=new T.MeshStandardMaterial({color:0x303040,roughness:0.05,metalness:0.99});
          const ref=new T.Mesh(new T.CylinderGeometry(0.026,0.088,0.21,20,1,true),refM);
          ref.position.y=-0.434; g.add(ref);

          // Lens
          const lens=new T.Mesh(new T.CircleGeometry(0.075,24),lensM);
          lens.rotation.x=Math.PI/2; lens.position.y=-0.548; g.add(lens);

          // Outer lens ring
          const lRing=new T.Mesh(new T.TorusGeometry(0.08,0.008,8,24),coneM);
          lRing.rotation.x=Math.PI/2; lRing.position.y=-0.548; g.add(lRing);

          scene.add(g);

          // Spotlight
          const spot=new T.SpotLight(0xfff6e0,3.2,16,Math.PI/7.5,0.25,1.4);
          spot.position.set(rx,RH-0.56,rz);
          spot.target.position.set(rx,0,rz);
          spot.castShadow=true;
          spot.shadow.mapSize.set(512,512);
          spot.shadow.bias=-0.002;
          scene.add(spot); scene.add(spot.target);
        });
      });

      // ── LIGHTING ─────────────────────────────────────
      const ambient=new THREE.AmbientLight(0xfff8f0,0.55);
      scene.add(ambient);
      const hem=new THREE.HemisphereLight(0xfff5e8,0xc8bfb0,0.4);
      scene.add(hem);

      // Soft fill from entrance
      const fill=new THREE.PointLight(0xfff8f0,0.8,25,2);
      fill.position.set(0,3,13); scene.add(fill);

      // ── BENCHES (realistic wood+steel) ───────────────
      const benchWoodTex=new T.CanvasTexture(makeWoodFrameTexture(256,64,FRAME_STYLES[1]));
      benchWoodTex.wrapS=benchWoodTex.wrapT=T.RepeatWrapping;
      benchWoodTex.repeat.set(3,1);
      const benchSeatM=new T.MeshStandardMaterial({map:benchWoodTex,roughness:0.6,metalness:0.02});
      const benchLegM =new T.MeshStandardMaterial({color:0x1a1a24,roughness:0.15,metalness:0.9});
      const benchStrM =new T.MeshStandardMaterial({color:0x222230,roughness:0.12,metalness:0.95});

      [[0,0],[0,-12],[0,12],[-8,0],[8,0]].forEach(([bx,bz])=>{
        const g=new THREE.Group(); g.position.set(bx,0,bz);

        // Seat — three planks
        [0].forEach(()=>{
          [-0.14,0,0.14].forEach((oz,pi)=>{
            const plank=new T.Mesh(new T.BoxGeometry(1.92,0.055,0.15),benchSeatM);
            plank.position.set(0,0.465,oz); plank.castShadow=plank.receiveShadow=true;
            g.add(plank);
          });
        });

        // H-frame legs
        [[-0.78],[0.78]].forEach(([lx])=>{
          // Vertical uprights
          const upM=new T.Mesh(new T.BoxGeometry(0.04,0.48,0.46),benchLegM);
          upM.position.set(lx,0.24,0); upM.castShadow=true; g.add(upM);
          // Foot pads
          [-0.2,0.2].forEach(fz=>{
            const foot=new T.Mesh(new T.BoxGeometry(0.055,0.02,0.065),benchStrM);
            foot.position.set(lx,0.01,fz); g.add(foot);
          });
        });
        // Cross stretcher
        const str=new T.Mesh(new T.BoxGeometry(1.58,0.03,0.03),benchStrM);
        str.position.y=0.12; g.add(str);

        scene.add(g);
      });
    };

    // ══════════════════════════════════════════════════
    //  ARTWORKS — realistic wooden frames
    // ══════════════════════════════════════════════════
    const buildArtworks=async(T,hits)=>{
      const photoMap={};
      photos.forEach(p=>{ photoMap[p.position_index]=p; });
      for(const slot of SLOTS) await buildSlot(T, slot, photoMap[slot.id], hits);
    };

    const buildSlot=(T,slot,ph,hits)=>new Promise(resolve=>{
      const group=new T.Group();
      group.position.set(...slot.pos);
      group.rotation.y=slot.rotY;
      const style=FRAME_STYLES[slot.id%FRAME_STYLES.length];

      const finalize=(fw,fh,photoTex,hasPhoto)=>{
        buildRealisticFrame(T,group,fw,fh,style);
        addArtwork(T,group,fw,fh,photoTex);
        addRealisticPictureLight(T,group,fw,fh,hasPhoto,style);
        addSlotLabel(T,group,slot.id,fw,fh,hasPhoto);
        group.userData={title:ph?.title||'',sub:ph?.subtitle||'',hasPhoto};
        if(hasPhoto) hits.push(group);
        scene.add(group); resolve();
      };

      if(ph?.image_url){
        const img=new Image(); img.crossOrigin='anonymous';
        img.onload=()=>{
          const asp=img.naturalWidth/img.naturalHeight;
          const mH=1.9, mW=2.7;
          const fw=asp>=1?Math.min(mW,asp*mH):mH*asp;
          const fh=asp>=1?fw/asp:mH;
          const cv=document.createElement('canvas');
          cv.width=img.naturalWidth; cv.height=img.naturalHeight;
          cv.getContext('2d').drawImage(img,0,0);
          const tex=new T.CanvasTexture(cv);
          tex.colorSpace=T.SRGBColorSpace||'srgb';
          finalize(fw,fh,tex,true);
        };
        img.onerror=()=>finalize(1.8,1.35,makePlaceholderTex(T,slot.id,style),false);
        img.src=ph.image_url;
      } else {
        finalize(1.8,1.35,makePlaceholderTex(T,slot.id,style),false);
      }
    });

    // Build a realistic multi-piece wooden frame
    const buildRealisticFrame=(T,group,fw,fh,style)=>{
      const bw=0.12;  // border width of frame bar
      const fd=0.055; // frame depth (extrusion)
      const br=0.01;  // bevel rounding

      // Wood texture for frame face
      const woodTex=new T.CanvasTexture(makeWoodFrameTexture(256,64,style));
      const faceMat=new T.MeshStandardMaterial({
        map:woodTex, roughness:0.55, metalness:style.name==='gold'||style.name==='silver'?0.6:0.02,
        color:style.name==='gold'?0xffd060:style.name==='silver'?0xd8d8d8:0xffffff,
      });
      const sideMat=new T.MeshStandardMaterial({
        color:style.dark, roughness:0.65, metalness:style.name==='gold'||style.name==='silver'?0.5:0.01,
      });
      const mats=[sideMat,sideMat,sideMat,sideMat,faceMat,sideMat];

      // Build frame from 4 bars with mitered look
      const bars=[
        // top
        {w:fw+bw*2, h:bw, d:fd, x:0,       y: fh/2+bw/2, z:0},
        // bottom
        {w:fw+bw*2, h:bw, d:fd, x:0,       y:-fh/2-bw/2, z:0},
        // left
        {w:bw, h:fh,      d:fd, x:-fw/2-bw/2, y:0,        z:0},
        // right
        {w:bw, h:fh,      d:fd, x: fw/2+bw/2, y:0,        z:0},
      ];

      bars.forEach(b=>{
        const geo=new T.BoxGeometry(b.w,b.h,b.d);
        const mesh=new T.Mesh(geo,mats);
        mesh.position.set(b.x,b.y,b.z+fd/2);
        mesh.castShadow=true; mesh.receiveShadow=true;
        group.add(mesh);

        // Inner chamfer strip (shadow gap)
        const chamM=new T.MeshStandardMaterial({color:0x0a0a0a,roughness:1});
        if(b.h===bw){ // horizontal
          const cham=new T.Mesh(new T.BoxGeometry(b.w,0.012,0.02),chamM);
          cham.position.set(b.x, b.y+(b.y>0?-bw/2:bw/2), b.z+fd+0.001); group.add(cham);
        } else { // vertical
          const cham=new T.Mesh(new T.BoxGeometry(0.012,b.h,0.02),chamM);
          cham.position.set(b.x+(b.x<0?bw/2:-bw/2), b.y, b.z+fd+0.001); group.add(cham);
        }
      });

      // Back panel (thin board behind artwork)
      const backM=new T.MeshStandardMaterial({color:0x1a1408,roughness:0.85});
      const back=new T.Mesh(new T.BoxGeometry(fw+bw*2+0.01,fh+bw*2+0.01,0.01),backM);
      back.position.z=-0.002; group.add(back);

      // White mat (passepartout) - thin inset border
      const matW=0.045;
      const matPieces=[
        {w:fw+matW*2,h:matW,x:0,           y: fh/2+matW/2},
        {w:fw+matW*2,h:matW,x:0,           y:-fh/2-matW/2},
        {w:matW,h:fh,       x:-fw/2-matW/2,y:0},
        {w:matW,h:fh,       x: fw/2+matW/2,y:0},
      ];
      const matM=new T.MeshStandardMaterial({color:0xf5f2ee,roughness:0.9});
      matPieces.forEach(p=>{
        const mesh=new T.Mesh(new T.BoxGeometry(p.w,p.h,0.008),matM);
        mesh.position.set(p.x,p.y,fd+0.005); group.add(mesh);
      });
    };

    const addArtwork=(T,group,fw,fh,tex)=>{
      const imgMesh=new T.Mesh(
        new T.PlaneGeometry(fw,fh),
        new T.MeshStandardMaterial({map:tex,roughness:0.78,metalness:0})
      );
      imgMesh.position.z=0.06; group.add(imgMesh);
    };

    const addRealisticPictureLight=(T,group,fw,fh,lit,style)=>{
      const brass=new T.MeshStandardMaterial({color:0xb8982a,roughness:0.12,metalness:0.94});
      const dark =new T.MeshStandardMaterial({color:0x08080e,roughness:0.06,metalness:0.98});
      const glowM=new T.MeshStandardMaterial({color:0xfff9d0,emissive:0xfff9d0,emissiveIntensity:lit?2.2:0.15,roughness:0,metalness:0});
      const matteM=new T.MeshStandardMaterial({color:0x1a1a22,roughness:0.4,metalness:0.7});

      const g=new T.Group(); g.position.set(0,fh/2+0.195,0.11);

      // Wall bracket
      const brack=new T.Mesh(new T.BoxGeometry(fw*0.42,0.04,0.03),brass);
      g.add(brack);
      // Bracket screws (decorative)
      [-fw*0.16,fw*0.16].forEach(bx=>{
        const screw=new T.Mesh(new T.CylinderGeometry(0.008,0.008,0.01,8),brass);
        screw.rotation.x=Math.PI/2; screw.position.set(bx,0,0.02); g.add(screw);
      });

      // Arm pivots out
      const arm=new T.Mesh(new T.CylinderGeometry(0.009,0.009,0.14,8),brass);
      arm.rotation.x=Math.PI/2; arm.position.z=0.07; g.add(arm);

      // Pivot ball
      const ball=new T.Mesh(new T.SphereGeometry(0.016,10,10),brass);
      ball.position.z=0.14; g.add(ball);

      // Shade tube (half-cylinder) — open face downward toward painting
      const shadeLen=fw*0.40;
      const shade=new T.Mesh(
        new T.CylinderGeometry(0.042,0.072,shadeLen,20,1,true,0,Math.PI), dark);
      shade.rotation.set(-Math.PI/2,0,Math.PI/2); // open side down
      shade.position.z=0.155; g.add(shade);

      // Shade end caps
      [-shadeLen/2,shadeLen/2].forEach(ex=>{
        const ec=new T.Mesh(new T.SemiCircleGeometry?new T.CircleGeometry(0.042,12,0,Math.PI):
          new T.CircleGeometry(0.042,12),dark);
        // Use box as approximation
        const ecb=new T.Mesh(new T.BoxGeometry(0.042*2,0.001,0.042),dark);
        ecb.position.set(ex,0.042,0.155); g.add(ecb);
      });

      // Inner reflector
      const refl=new T.Mesh(
        new T.CylinderGeometry(0.038,0.068,shadeLen,20,1,true,0,Math.PI),
        new T.MeshStandardMaterial({color:0xd8d0b0,roughness:0.05,metalness:0.9}));
      refl.rotation.set(-Math.PI/2,0,Math.PI/2);
      refl.position.z=0.154; g.add(refl);

      // Glowing tube inside
      const glow=new T.Mesh(new T.CylinderGeometry(0.007,0.007,shadeLen*0.9,8),glowM);
      glow.rotation.set(0,0,Math.PI/2); glow.position.set(0,0.028,0.155); g.add(glow);

      group.add(g);

      if(lit){
        const pl=new T.SpotLight(0xfff5b8,5.5,6.5,Math.PI/8.5,0.22,2.0);
        pl.position.set(0,fh/2+0.3,0.3);
        pl.target.position.set(0,-fh*0.28,0.06);
        pl.castShadow=false;
        group.add(pl); group.add(pl.target);
      }
    };

    const makePlaceholderTex=(T,slotId,style)=>{
      const cv=document.createElement('canvas'); cv.width=600; cv.height=450;
      const ctx=cv.getContext('2d');
      // Subtle linen texture
      ctx.fillStyle='#f0ece4'; ctx.fillRect(0,0,600,450);
      for(let i=0;i<4000;i++){
        ctx.fillStyle=`rgba(${150+Math.random()*30},${140+Math.random()*20},${120+Math.random()*20},${Math.random()*0.06})`;
        ctx.fillRect(Math.random()*600,Math.random()*450,Math.random()*2,Math.random()*2);
      }
      // Dashed border
      ctx.strokeStyle='rgba(160,148,130,0.4)'; ctx.lineWidth=1.5; ctx.setLineDash([10,8]);
      ctx.strokeRect(22,22,556,406);
      // Slot number
      const c='#'+style.color.toString(16).padStart(6,'0');
      ctx.fillStyle=c+'55';
      ctx.beginPath(); ctx.arc(300,200,65,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(80,68,50,0.45)'; ctx.font='bold 70px Georgia,serif'; ctx.textAlign='center';
      ctx.fillText(slotId.toString(),300,218);
      ctx.fillStyle='rgba(140,128,110,0.5)'; ctx.font='italic 20px Georgia,serif';
      ctx.fillText('موقع رقم '+slotId,300,265);
      return new T.CanvasTexture(cv);
    };

    const addSlotLabel=(T,group,slotId,fw,fh,hasPhoto)=>{
      const cv=document.createElement('canvas'); cv.width=160; cv.height=56;
      const ctx=cv.getContext('2d');
      // Pill shape
      ctx.fillStyle=hasPhoto?'rgba(26,26,36,0.88)':'rgba(100,95,88,0.7)';
      ctx.beginPath(); ctx.roundRect(0,0,160,56,28); ctx.fill();
      // Shine
      const shine=ctx.createLinearGradient(0,0,0,28);
      shine.addColorStop(0,'rgba(255,255,255,0.12)'); shine.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=shine; ctx.beginPath(); ctx.roundRect(0,0,160,28,28); ctx.fill();
      // Text
      ctx.fillStyle=hasPhoto?'#ffffff':'#d8d0c4';
      ctx.font='bold 26px -apple-system,Segoe UI,sans-serif'; ctx.textAlign='center';
      ctx.fillText('#'+slotId,80,37);
      const tex=new T.CanvasTexture(cv);
      const sprite=new T.Mesh(new T.PlaneGeometry(0.5,0.175),
        new T.MeshStandardMaterial({map:tex,transparent:true,roughness:1,depthWrite:false}));
      sprite.position.set(0,fh/2+0.6,0.08); group.add(sprite);
    };

    // ══════════════════════════════════════════════════
    //  CONTROLS
    // ══════════════════════════════════════════════════
    const setupControls=(rdr)=>{
      document.addEventListener('keydown',e=>{s.keys[e.code]=true;});
      document.addEventListener('keyup',  e=>{s.keys[e.code]=false;});
      if(!isMobile){
        rdr.domElement.addEventListener('click',()=>rdr.domElement.requestPointerLock());
        document.addEventListener('pointerlockchange',()=>{
          s.isLocked=document.pointerLockElement===rdr.domElement; setLocked(s.isLocked);
        });
        document.addEventListener('mousemove',e=>{
          if(!s.isLocked) return;
          s.yaw  -=e.movementX*0.0018; s.pitch-=e.movementY*0.0018;
          s.pitch=Math.max(-1.1,Math.min(1.1,s.pitch));
        });
      } else {
        // Mobile look
        rdr.domElement.addEventListener('touchstart',e=>{
          e.preventDefault();
          for(const t of e.changedTouches){
            if(t.clientX>innerWidth/2&&!s.lookTouch.active)
              s.lookTouch={active:true,id:t.identifier,lastX:t.clientX,lastY:t.clientY};
          }
        },{passive:false});
        rdr.domElement.addEventListener('touchmove',e=>{
          e.preventDefault();
          for(const t of e.changedTouches){
            if(t.identifier===s.lookTouch.id){
              s.yaw  -=(t.clientX-s.lookTouch.lastX)*0.004;
              s.pitch-=(t.clientY-s.lookTouch.lastY)*0.004;
              s.pitch=Math.max(-1.1,Math.min(1.1,s.pitch));
              s.lookTouch.lastX=t.clientX; s.lookTouch.lastY=t.clientY;
            }
          }
        },{passive:false});
        rdr.domElement.addEventListener('touchend',e=>{
          for(const t of e.changedTouches)
            if(t.identifier===s.lookTouch.id)
              s.lookTouch={active:false,id:null,lastX:0,lastY:0};
        });
      }
    };

    // ══════════════════════════════════════════════════
    //  ANIMATION
    // ══════════════════════════════════════════════════
    const animate=(T,hits)=>{
      const rc=new T.Raycaster(); let last=performance.now();
      const loop=()=>{
        animId=requestAnimationFrame(loop);
        const now=performance.now(), dt=Math.min((now-last)/1000,0.05); last=now;
        const active=s.isLocked||isMobile;
        if(active){
          const spd=s.keys['ShiftLeft']?7:4;
          const fw3=new T.Vector3(-Math.sin(s.yaw),0,-Math.cos(s.yaw));
          const rt3=new T.Vector3( Math.cos(s.yaw),0,-Math.sin(s.yaw));
          const mv=new T.Vector3();
          if(s.keys['KeyW']||s.keys['ArrowUp'])    mv.addScaledVector(fw3, spd*dt);
          if(s.keys['KeyS']||s.keys['ArrowDown'])  mv.addScaledVector(fw3,-spd*dt);
          if(s.keys['KeyA']||s.keys['ArrowLeft'])  mv.addScaledVector(rt3,-spd*dt);
          if(s.keys['KeyD']||s.keys['ArrowRight']) mv.addScaledVector(rt3, spd*dt);
          if(s.joystick.active){
            mv.addScaledVector(fw3,-s.joystick.dy/40*3.5*dt);
            mv.addScaledVector(rt3, s.joystick.dx/40*3.5*dt);
          }
          camera.position.add(mv);
          camera.position.x=Math.max(-10.3,Math.min(10.3,camera.position.x));
          camera.position.z=Math.max(-16.3,Math.min(16.3,camera.position.z));
          camera.position.y=1.72;
          camera.rotation.order='YXZ';
          camera.rotation.y=s.yaw; camera.rotation.x=s.pitch;

          rc.setFromCamera({x:0,y:0},camera);
          const hh=rc.intersectObjects(hits,true);
          if(hh.length&&hh[0].distance<5.5){
            let obj=hh[0].object;
            while(obj&&!obj.userData?.hasPhoto) obj=obj.parent;
            if(obj?.userData?.hasPhoto) setPhotoInfo({title:obj.userData.title,sub:obj.userData.sub});
            else setPhotoInfo(null);
          } else setPhotoInfo(null);
        }
        renderer.render(scene,camera);
      };
      loop();
    };

    window.addEventListener('resize',()=>{
      if(!camera||!renderer) return;
      camera.aspect=innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth,innerHeight);
    });

    init();
    return()=>{
      cancelAnimationFrame(animId);
      document.exitPointerLock?.();
      renderer?.dispose();
      if(mountRef.current&&renderer?.domElement?.parentNode===mountRef.current)
        mountRef.current.removeChild(renderer.domElement);
    };
  },[entered,photos]);

  // Joystick handlers
  const onJoyStart=useCallback(e=>{
    e.preventDefault();
    stateRef.current.joystick={active:true,dx:0,dy:0};
    if(joystickKnobRef.current) joystickKnobRef.current.style.transform='translate(-50%,-50%)';
  },[]);
  const onJoyMove=useCallback(e=>{
    e.preventDefault();
    const s=stateRef.current; if(!s.joystick.active) return;
    const t=e.changedTouches[0];
    const zone=joystickZoneRef.current?.getBoundingClientRect(); if(!zone) return;
    const cx=zone.left+zone.width/2, cy=zone.top+zone.height/2;
    let dx=t.clientX-cx, dy=t.clientY-cy;
    const maxR=42, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>maxR){dx=dx/dist*maxR;dy=dy/dist*maxR;}
    s.joystick.dx=dx; s.joystick.dy=dy;
    if(joystickKnobRef.current)
      joystickKnobRef.current.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  },[]);
  const onJoyEnd=useCallback(e=>{
    e.preventDefault();
    stateRef.current.joystick={active:false,dx:0,dy:0};
    if(joystickKnobRef.current) joystickKnobRef.current.style.transform='translate(-50%,-50%)';
  },[]);

  useEffect(()=>{
    const zone=joystickZoneRef.current;
    if(!zone||!entered) return;
    zone.addEventListener('touchstart',onJoyStart,{passive:false});
    zone.addEventListener('touchmove', onJoyMove, {passive:false});
    zone.addEventListener('touchend',  onJoyEnd,  {passive:false});
    return()=>{
      zone.removeEventListener('touchstart',onJoyStart);
      zone.removeEventListener('touchmove', onJoyMove);
      zone.removeEventListener('touchend',  onJoyEnd);
    };
  },[entered,onJoyStart,onJoyMove,onJoyEnd]);

  // ── UI ────────────────────────────────────────────────────────
  return(
    <>
      <Head>
        <title>معرض الفوتوغرافيا الافتراضي</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
      </Head>
      <div ref={mountRef} style={{width:'100vw',height:'100dvh',touchAction:'none'}}/>

      {/* Loading */}
      {entered&&loading&&(
        <div style={{position:'fixed',inset:0,zIndex:300,background:'#e8e2da',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          fontFamily:'Georgia,serif'}}>
          <div style={{width:52,height:52,border:'2px solid #c8bfb0',borderTopColor:'#8a7a60',
            borderRadius:'50%',animation:'spin 1s linear infinite',marginBottom:20}}/>
          <p style={{color:'#6a6050',letterSpacing:'0.2em',fontSize:'0.85rem'}}>جاري تحميل المعرض...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Entry */}
      {!entered&&(
        <div style={{position:'fixed',inset:0,zIndex:200,
          background:'linear-gradient(160deg,#f2ede6 0%,#e8e2da 50%,#dfd8cf 100%)',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          fontFamily:'Georgia,serif',padding:20,overflowY:'auto'}}>

          {/* Decorative arcs */}
          {[[-180,-120,240],[ 160,140,190],[-100,180,160],[150,-200,170]].map(([x,y,s],i)=>(
            <div key={i} style={{position:'absolute',left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,
              width:s,height:s,borderRadius:'50%',border:'1px solid rgba(160,140,110,0.18)',
              transform:'translate(-50%,-50%)'}}/>
          ))}

          <div style={{position:'relative',textAlign:'center',maxWidth:440,width:'100%'}}>
            {/* Logo mark */}
            <div style={{width:48,height:48,margin:'0 auto 20px',
              border:'1.5px solid #a09078',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:24,height:24,background:'#8a7860'}}/>
            </div>

            <h1 style={{fontSize:'clamp(1.8rem,7vw,2.8rem)',fontWeight:400,letterSpacing:'0.35em',
              color:'#2a2218',marginBottom:4,fontFamily:'Georgia,serif'}}>
              GALLERY
            </h1>
            <div style={{width:48,height:1,background:'#a09078',margin:'10px auto 10px'}}/>
            <p style={{color:'#8a7a68',fontSize:'clamp(0.78rem,2.5vw,0.9rem)',letterSpacing:'0.18em',
              marginBottom:6,fontFamily:'Segoe UI,Tahoma,sans-serif'}}>
              معرض الفوتوغرافيا الافتراضي
            </p>
            <p style={{color:'#b0a090',fontSize:'0.78rem',marginBottom:36,
              fontFamily:'Segoe UI,Tahoma,sans-serif'}}>
              {photos.length} عمل فني · 15 موقع عرض
            </p>

            <button onClick={()=>setEntered(true)} style={{
              background:'#2a2218',color:'#f5f0e8',border:'none',
              padding:'15px 52px',fontSize:'0.88rem',letterSpacing:'0.22em',
              cursor:'pointer',fontFamily:'Segoe UI,Tahoma,sans-serif',
              transition:'all .3s',WebkitTapHighlightColor:'transparent',
            }}
              onMouseEnter={e=>{e.target.style.background='#8a7860';e.target.style.letterSpacing='0.28em';}}
              onMouseLeave={e=>{e.target.style.background='#2a2218';e.target.style.letterSpacing='0.22em';}}
            >دخول المعرض</button>

            <div style={{marginTop:30,display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              {(isMobile
                ?[['↕↔ يسار','تحرك'],['سحب يمين','انظر']]
                :[['W A S D','التحرك'],['ماوس','النظر'],['Shift','ركض'],['ESC','إيقاف']]
              ).map(([k,l])=>(
                <div key={k} style={{textAlign:'center'}}>
                  <div style={{background:'rgba(255,252,248,0.8)',border:'1px solid #d8d0c4',
                    padding:'5px 11px',fontSize:'0.73rem',color:'#3a3020',
                    fontFamily:'monospace',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:'0.65rem',color:'#a09080',fontFamily:'Segoe UI,Tahoma,sans-serif'}}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{marginTop:32,paddingTop:20,borderTop:'1px solid #d8d0c4'}}>
              <a href="/admin/login" style={{
                color:'#a09078',fontSize:'0.75rem',letterSpacing:'0.12em',
                textDecoration:'none',borderBottom:'1px solid #c8c0b0',paddingBottom:1,
                fontFamily:'Segoe UI,Tahoma,sans-serif',
              }}>⚙ لوحة الإدارة</a>
            </div>
          </div>
        </div>
      )}

      {/* Crosshair */}
      {entered&&locked&&!isMobile&&(
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          width:20,height:20,pointerEvents:'none',zIndex:50}}>
          <div style={{position:'absolute',width:1,height:20,background:'rgba(255,252,245,0.55)',left:9.5,top:0}}/>
          <div style={{position:'absolute',width:20,height:1,background:'rgba(255,252,245,0.55)',left:0,top:9.5}}/>
          <div style={{position:'absolute',width:4,height:4,borderRadius:'50%',
            background:'rgba(255,252,245,0.7)',left:8,top:8}}/>
        </div>
      )}
      {entered&&isMobile&&(
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          width:6,height:6,borderRadius:'50%',background:'rgba(255,252,245,0.6)',
          pointerEvents:'none',zIndex:50}}/>
      )}

      {/* Photo info */}
      {entered&&photoInfo&&(
        <div style={{position:'fixed',bottom:isMobile?165:60,left:'50%',transform:'translateX(-50%)',
          pointerEvents:'none',zIndex:50}}>
          <div style={{
            background:'rgba(18,15,10,0.78)',backdropFilter:'blur(10px)',
            border:'1px solid rgba(200,185,160,0.2)',
            padding:'12px 28px',color:'#f5f0e8',textAlign:'center',
            fontFamily:'Georgia,serif',
          }}>
            <div style={{fontWeight:400,fontSize:'1rem',marginBottom:4,letterSpacing:'0.05em'}}>
              {photoInfo.title}
            </div>
            <div style={{fontSize:'0.72rem',color:'#c0b090',letterSpacing:'0.18em',
              fontFamily:'Segoe UI,Tahoma,sans-serif'}}>{photoInfo.sub}</div>
          </div>
        </div>
      )}

      {/* HUD */}
      {entered&&!isMobile&&(
        <div style={{position:'fixed',bottom:16,left:'50%',transform:'translateX(-50%)',
          fontSize:'0.65rem',color:'rgba(255,250,240,0.3)',letterSpacing:'0.18em',
          pointerEvents:'none',zIndex:50,fontFamily:'Segoe UI,Tahoma,sans-serif'}}>
          {locked?'ESC للتوقف · Shift للركض':'انقر للتحكم بالكاميرا'}
        </div>
      )}

      {/* Top buttons */}
      {entered&&(
        <div style={{position:'fixed',top:14,right:14,zIndex:50,display:'flex',gap:8}}>
          <a href="/admin/login" target="_blank" style={{
            background:'rgba(30,25,18,0.72)',border:'1px solid rgba(200,185,155,0.2)',
            color:'#d8cfc0',padding:isMobile?'9px 14px':'7px 14px',borderRadius:2,
            fontSize:'0.72rem',letterSpacing:'0.1em',textDecoration:'none',
            backdropFilter:'blur(6px)',fontFamily:'Segoe UI,Tahoma,sans-serif',
            WebkitTapHighlightColor:'transparent',
          }}>⚙ إدارة</a>
          <button onClick={()=>{document.exitPointerLock?.();setEntered(false);setLocked(false);}} style={{
            background:'rgba(30,25,18,0.72)',border:'1px solid rgba(200,185,155,0.2)',
            color:'#d8cfc0',padding:isMobile?'9px 14px':'7px 14px',cursor:'pointer',
            fontSize:'0.72rem',letterSpacing:'0.1em',borderRadius:2,
            backdropFilter:'blur(6px)',fontFamily:'Segoe UI,Tahoma,sans-serif',
            WebkitTapHighlightColor:'transparent',
          }}>← خروج</button>
        </div>
      )}

      {/* Mobile Joystick */}
      {entered&&isMobile&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,height:155,zIndex:50,
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'0 28px 16px',pointerEvents:'none',
          background:'linear-gradient(to top,rgba(20,16,10,0.35),transparent)',
        }}>
          <div style={{pointerEvents:'auto'}}>
            <div ref={joystickZoneRef} style={{
              width:115,height:115,borderRadius:'50%',
              background:'rgba(255,250,240,0.12)',
              border:'1.5px solid rgba(255,250,240,0.28)',
              backdropFilter:'blur(4px)',position:'relative',
              touchAction:'none',WebkitTapHighlightColor:'transparent',
            }}>
              <div style={{position:'absolute',width:1,height:'55%',background:'rgba(255,250,240,0.18)',left:'50%',top:'22.5%'}}/>
              <div style={{position:'absolute',height:1,width:'55%',background:'rgba(255,250,240,0.18)',top:'50%',left:'22.5%'}}/>
              <div ref={joystickKnobRef} style={{
                position:'absolute',top:'50%',left:'50%',
                transform:'translate(-50%,-50%)',
                width:46,height:46,borderRadius:'50%',
                background:'rgba(255,252,245,0.65)',
                border:'1.5px solid rgba(200,185,155,0.5)',
                boxShadow:'0 2px 14px rgba(0,0,0,0.22)',
              }}/>
            </div>
            <div style={{textAlign:'center',marginTop:5,fontSize:'0.6rem',
              color:'rgba(255,250,240,0.35)',letterSpacing:'0.1em',fontFamily:'Segoe UI,Tahoma,sans-serif'}}>
              تحرك
            </div>
          </div>
          <div style={{textAlign:'center',opacity:0.35}}>
            <div style={{fontSize:'1.4rem',marginBottom:4}}>👁</div>
            <div style={{fontSize:'0.6rem',color:'rgba(255,250,240,0.5)',letterSpacing:'0.1em',
              fontFamily:'Segoe UI,Tahoma,sans-serif'}}>اسحب للنظر</div>
          </div>
        </div>
      )}
    </>
  );
}

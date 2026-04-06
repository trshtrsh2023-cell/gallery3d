import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';

const SLOTS = [
  { id:0,  pos:[-10.88,2.4, -9.5], rotY:  Math.PI/2 },
  { id:1,  pos:[-10.88,2.4, -3.5], rotY:  Math.PI/2 },
  { id:2,  pos:[-10.88,2.4,  3.5], rotY:  Math.PI/2 },
  { id:3,  pos:[-10.88,2.4,  9.5], rotY:  Math.PI/2 },
  { id:4,  pos:[ 10.88,2.4, -9.5], rotY: -Math.PI/2 },
  { id:5,  pos:[ 10.88,2.4, -3.5], rotY: -Math.PI/2 },
  { id:6,  pos:[ 10.88,2.4,  3.5], rotY: -Math.PI/2 },
  { id:7,  pos:[ 10.88,2.4,  9.5], rotY: -Math.PI/2 },
  { id:8,  pos:[  -6.5,2.4,-16.88],rotY:  0 },
  { id:9,  pos:[   0.0,2.4,-16.88],rotY:  0 },
  { id:10, pos:[   6.5,2.4,-16.88],rotY:  0 },
  { id:11, pos:[ -5.38,2.4, -9.5], rotY:  Math.PI/2 },
  { id:12, pos:[ -5.38,2.4,  2.5], rotY:  Math.PI/2 },
  { id:13, pos:[  5.38,2.4, -9.5], rotY: -Math.PI/2 },
  { id:14, pos:[  5.38,2.4,  2.5], rotY: -Math.PI/2 },
];

const FRAME_COLORS = [
  0x3b82f6,0xef4444,0x10b981,0xf59e0b,
  0x8b5cf6,0xec4899,0x06b6d4,0x84cc16,
  0xf97316,0x6366f1,0x14b8a6,0xe11d48,
  0x7c3aed,0x0284c7,0xd97706,
];

export default function Gallery() {
  const mountRef    = useRef(null);
  const stateRef    = useRef({ yaw:0, pitch:0, keys:{}, isLocked:false,
    joystick:{ active:false, startX:0, startY:0, dx:0, dy:0 },
    lookTouch:{ active:false, id:null, lastX:0, lastY:0 },
  });

  const [photos, setPhotos]       = useState([]);
  const [entered, setEntered]     = useState(false);
  const [photoInfo, setPhotoInfo] = useState(null);
  const [locked, setLocked]       = useState(false);
  const [isMobile, setIsMobile]   = useState(false);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    fetch('/api/photos').then(r=>r.json()).then(d=>setPhotos(Array.isArray(d)?d:[]));
  }, []);

  // ── JOYSTICK REFS (DOM) ──
  const joystickZoneRef  = useRef(null);
  const joystickKnobRef  = useRef(null);

  useEffect(() => {
    if (!entered) return;
    const s = stateRef.current;
    let THREE, renderer, scene, camera, animId;
    const hitMeshes = [];

    const init = async () => {
      THREE = await import('three');
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xefecea);
      scene.fog = new THREE.FogExp2(0xefecea, 0.017);

      camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 100);
      camera.position.set(0,1.7,13);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      mountRef.current?.appendChild(renderer.domElement);

      buildRoom(THREE);
      await buildArtworks(THREE, hitMeshes);
      setupControls(renderer);
      animate(THREE, camera, renderer, scene, hitMeshes);
    };

    // ══════════════════════════════════════════════════
    //  ROOM
    // ══════════════════════════════════════════════════
    const buildRoom = (T) => {
      const RW=22,RL=34,RH=5.5;
      const m=(c,r=0.88,mt=0)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:mt});
      const box=(w,h,d,mat,px,py,pz)=>{
        const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
        mesh.position.set(px,py,pz);
        mesh.receiveShadow=mesh.castShadow=true;
        scene.add(mesh); return mesh;
      };

      const wallM=m(0xc8c4bc);
      box(RW,0.22,RL,m(0xb0a89c,0.58,0.05),0,-0.11,0);
      box(RW,0.12,RL,m(0xf8f6f3,0.98),0,RH,0);
      box(0.25,RH,RL,wallM,-RW/2,RH/2,0);
      box(0.25,RH,RL,wallM, RW/2,RH/2,0);
      box(RW,RH,0.25,wallM,0,RH/2,-RL/2);
      box(RW,RH,0.25,wallM,0,RH/2, RL/2);
      box(0.25,RH,7,wallM,-5.5,RH/2,-7);
      box(0.25,RH,7,wallM, 5.5,RH/2,-7);
      box(0.25,RH,7,wallM,-5.5,RH/2, 6);
      box(0.25,RH,7,wallM, 5.5,RH/2, 6);

      const tA=m(0xc0b8ac,0.52,0.07), tB=m(0xb4aca0,0.55,0.06);
      for(let xi=-10;xi<=10;xi+=2) for(let zi=-16;zi<=16;zi+=2){
        const tile=new T.Mesh(new T.BoxGeometry(1.95,0.03,1.95),
          ((Math.floor(xi/2)+Math.floor(zi/2))%2===0)?tA:tB);
        tile.position.set(xi,0.006,zi); tile.receiveShadow=true; scene.add(tile);
      }

      const bM=m(0xd0c8bc,0.55);
      box(RW,0.22,0.1,bM,0,0.11,-RL/2+0.16); box(RW,0.22,0.1,bM,0,0.11,RL/2-0.16);
      box(0.1,0.22,RL,bM,-RW/2+0.14,0.11,0); box(0.1,0.22,RL,bM,RW/2-0.14,0.11,0);
      box(RW,0.16,0.1,m(0xd8d0c4,0.5),0,RH-0.08,-RL/2+0.14);
      box(RW,0.16,0.1,m(0xd8d0c4,0.5),0,RH-0.08, RL/2-0.14);

      const railM=m(0x181820,0.15,0.95), coneM=m(0x101018,0.1,0.97);
      const glowM=new T.MeshStandardMaterial({color:0xfffce8,emissive:0xfffce8,emissiveIntensity:1.6,roughness:0,metalness:0});

      [-7,0,7].forEach(rx=>{
        const rail=new T.Mesh(new T.BoxGeometry(0.046,0.036,RL-1),railM);
        rail.position.set(rx,RH-0.036,0); scene.add(rail);
        [-9.5,-3.5,3.5,9.5].forEach(rz=>{
          const g=new T.Group(); g.position.set(rx,RH-0.036,rz);
          const arm=new T.Mesh(new T.CylinderGeometry(0.011,0.011,0.22,8),railM);
          arm.position.y=-0.11; g.add(arm);
          const cone=new T.Mesh(new T.CylinderGeometry(0.032,0.088,0.2,16,1,true),coneM);
          cone.position.y=-0.33; g.add(cone);
          const cap=new T.Mesh(new T.CircleGeometry(0.032,16),coneM);
          cap.rotation.x=Math.PI/2; cap.position.y=-0.23; g.add(cap);
          const lens=new T.Mesh(new T.CircleGeometry(0.068,20),glowM);
          lens.rotation.x=Math.PI/2; lens.position.y=-0.432; g.add(lens);
          scene.add(g);
          const spot=new T.SpotLight(0xfff8e0,3,13,Math.PI/7,0.28,1.5);
          spot.position.set(rx,RH-0.44,rz);
          spot.target.position.set(rx,0,rz);
          spot.castShadow=true; spot.shadow.mapSize.set(256,256);
          scene.add(spot); scene.add(spot.target);
        });
      });

      scene.add(new T.AmbientLight(0xfff5e8,0.7));
      scene.add(new T.HemisphereLight(0xfff8f0,0xccc4b8,0.45));

      const seatM=m(0xb89658,0.62,0.05), legM=m(0x181828,0.2,0.88);
      [[0,0],[0,-12],[0,12],[-8,0],[8,0]].forEach(([bx,bz])=>{
        const g=new T.Group(); g.position.set(bx,0,bz);
        const seat=new T.Mesh(new T.BoxGeometry(1.9,0.09,0.55),seatM);
        seat.position.y=0.46; seat.castShadow=seat.receiveShadow=true; g.add(seat);
        [[-0.74,-0.21],[0.74,-0.21],[-0.74,0.21],[0.74,0.21]].forEach(([lx,lz])=>{
          const leg=new T.Mesh(new T.BoxGeometry(0.06,0.46,0.06),legM);
          leg.position.set(lx,0.23,lz); leg.castShadow=true; g.add(leg);
        });
        const str=new T.Mesh(new T.BoxGeometry(1.58,0.04,0.04),legM);
        str.position.y=0.09; g.add(str); scene.add(g);
      });
    };

    // ══════════════════════════════════════════════════
    //  ARTWORKS
    // ══════════════════════════════════════════════════
    const buildArtworks = async (T, hits) => {
      const photoMap={};
      photos.forEach(p=>{ photoMap[p.position_index]=p; });
      for(const slot of SLOTS) await buildSlot(T, slot, photoMap[slot.id], hits);
    };

    const makeFrameGeo=(T,fw,fh)=>{
      const bw=0.13;
      const shape=new T.Shape();
      shape.moveTo(-(fw/2+bw),-(fh/2+bw)); shape.lineTo((fw/2+bw),-(fh/2+bw));
      shape.lineTo((fw/2+bw),(fh/2+bw));   shape.lineTo(-(fw/2+bw),(fh/2+bw));
      shape.closePath();
      const hole=new T.Path();
      hole.moveTo(-fw/2,-fh/2); hole.lineTo(fw/2,-fh/2);
      hole.lineTo(fw/2,fh/2);   hole.lineTo(-fw/2,fh/2);
      hole.closePath(); shape.holes.push(hole);
      return new T.ExtrudeGeometry(shape,{depth:0.09,bevelEnabled:true,bevelSize:0.014,bevelThickness:0.014,bevelSegments:3});
    };

    const buildSlot=(T,slot,ph,hits)=>new Promise(resolve=>{
      const group=new T.Group();
      group.position.set(...slot.pos);
      group.rotation.y=slot.rotY;
      const fColor=FRAME_COLORS[slot.id%FRAME_COLORS.length];
      const fMat=new T.MeshStandardMaterial({color:fColor,roughness:0.18,metalness:0.7});

      const finalize=(fw,fh,tex,hasPhoto)=>{
        const frameGeo=makeFrameGeo(T,fw,fh);
        const frameMesh=new T.Mesh(frameGeo,fMat);
        frameMesh.position.z=-0.035; frameMesh.castShadow=true; group.add(frameMesh);
        const back=new T.Mesh(new T.BoxGeometry(fw,fh,0.015),
          new T.MeshStandardMaterial({color:0xfaf7f3,roughness:0.9}));
        back.position.z=0.02; group.add(back);
        const imgMesh=new T.Mesh(new T.PlaneGeometry(fw,fh),
          new T.MeshStandardMaterial({map:tex,roughness:0.82}));
        imgMesh.position.z=0.036; group.add(imgMesh);
        addPicLight(T,group,fw,fh,hasPhoto);
        addLabel(T,group,slot.id,fw,fh,hasPhoto);
        group.userData={title:ph?.title||'',sub:ph?.subtitle||'',hasPhoto};
        if(hasPhoto) hits.push(group);
        scene.add(group); resolve();
      };

      if(ph?.image_url){
        const img=new Image(); img.crossOrigin='anonymous';
        img.onload=()=>{
          const asp=img.naturalWidth/img.naturalHeight;
          const mH=1.9,mW=2.6;
          let fw,fh;
          if(asp>=1){fw=Math.min(mW,asp*mH);fh=fw/asp;}
          else{fh=mH;fw=fh*asp;}
          const cv=document.createElement('canvas');
          cv.width=img.naturalWidth; cv.height=img.naturalHeight;
          cv.getContext('2d').drawImage(img,0,0);
          finalize(fw,fh,new T.CanvasTexture(cv),true);
        };
        img.onerror=()=>finalize(1.8,1.35,makePlaceholder(T,slot.id),false);
        img.src=ph.image_url;
      } else finalize(1.8,1.35,makePlaceholder(T,slot.id),false);
    });

    const makePlaceholder=(T,slotId)=>{
      const cv=document.createElement('canvas'); cv.width=360; cv.height=270;
      const ctx=cv.getContext('2d');
      ctx.fillStyle='#f0ece6'; ctx.fillRect(0,0,360,270);
      ctx.strokeStyle='#d4cec6'; ctx.lineWidth=1.5; ctx.setLineDash([8,6]);
      ctx.strokeRect(16,16,328,238);
      ctx.fillStyle='#b8b0a8'; ctx.font='bold 54px sans-serif'; ctx.textAlign='center';
      ctx.fillText(slotId.toString(),180,155);
      ctx.fillStyle='#ccc4bc'; ctx.font='17px sans-serif';
      ctx.fillText('موقع رقم '+slotId,180,200);
      return new T.CanvasTexture(cv);
    };

    const addPicLight=(T,group,fw,fh,lit)=>{
      const brassM=new T.MeshStandardMaterial({color:0xc4a040,roughness:0.16,metalness:0.9});
      const shadeM=new T.MeshStandardMaterial({color:0x0e0e18,roughness:0.15,metalness:0.95});
      const glowM=new T.MeshStandardMaterial({color:0xfffbd0,emissive:0xfffbd0,emissiveIntensity:lit?1.8:0.2,roughness:0,metalness:0});
      const g=new T.Group(); g.position.set(0,fh/2+0.195,0.16);
      g.add(new T.Mesh(new T.BoxGeometry(fw*0.46,0.05,0.04),brassM));
      const arm=new T.Mesh(new T.CylinderGeometry(0.01,0.01,0.16,8),brassM);
      arm.rotation.x=Math.PI/2; arm.position.z=0.08; g.add(arm);
      const shade=new T.Mesh(new T.CylinderGeometry(0.045,0.076,fw*0.42,16,1,true,0,Math.PI),shadeM);
      shade.rotation.x=-Math.PI/2; shade.position.z=0.16; g.add(shade);
      const sCap=new T.Mesh(new T.PlaneGeometry(fw*0.42,0.09),shadeM);
      sCap.position.z=0.16; g.add(sCap);
      const glow=new T.Mesh(new T.PlaneGeometry(fw*0.36,0.05),glowM);
      glow.rotation.x=Math.PI/2; glow.position.set(0,-0.046,0.16); g.add(glow);
      group.add(g);
      if(lit){
        const pl=new T.SpotLight(0xfff8cc,4.5,5.5,Math.PI/8,0.25,2.2);
        pl.position.set(0,fh/2+0.28,0.32);
        pl.target.position.set(0,-fh*0.25,0.08);
        group.add(pl); group.add(pl.target);
      }
    };

    const addLabel=(T,group,slotId,fw,fh,hasPhoto)=>{
      const cv=document.createElement('canvas'); cv.width=140; cv.height=52;
      const ctx=cv.getContext('2d');
      ctx.fillStyle=hasPhoto?'#1a1a2e':'#888080';
      ctx.beginPath(); ctx.roundRect(0,0,140,52,9); ctx.fill();
      ctx.fillStyle=hasPhoto?'#ffffff':'#c8c0b8';
      ctx.font='bold 28px sans-serif'; ctx.textAlign='center';
      ctx.fillText('#'+slotId,70,36);
      const tex=new T.CanvasTexture(cv);
      const sprite=new T.Mesh(new T.PlaneGeometry(0.44,0.165),
        new T.MeshStandardMaterial({map:tex,transparent:true,roughness:1,depthWrite:false}));
      sprite.position.set(0,fh/2+0.55,0.08); group.add(sprite);
    };

    // ══════════════════════════════════════════════════
    //  CONTROLS — keyboard + pointer lock + touch
    // ══════════════════════════════════════════════════
    const setupControls = (rdr) => {
      // Keyboard
      document.addEventListener('keydown', e=>{ s.keys[e.code]=true; });
      document.addEventListener('keyup',   e=>{ s.keys[e.code]=false; });

      // Pointer lock (desktop)
      rdr.domElement.addEventListener('click', ()=>{ if(!isMobile) rdr.domElement.requestPointerLock(); });
      document.addEventListener('pointerlockchange',()=>{
        s.isLocked = document.pointerLockElement===rdr.domElement;
        setLocked(s.isLocked);
      });
      document.addEventListener('mousemove', e=>{
        if(!s.isLocked) return;
        s.yaw   -= e.movementX*0.0018;
        s.pitch -= e.movementY*0.0018;
        s.pitch  = Math.max(-1.1,Math.min(1.1,s.pitch));
      });

      // ── TOUCH: RIGHT side = look (pan camera) ──
      rdr.domElement.addEventListener('touchstart', e=>{
        e.preventDefault();
        for(const t of e.changedTouches){
          const isLeft = t.clientX < innerWidth/2;
          if(isLeft) continue; // joystick handles left
          if(!s.lookTouch.active){
            s.lookTouch={ active:true, id:t.identifier, lastX:t.clientX, lastY:t.clientY };
          }
        }
      },{passive:false});

      rdr.domElement.addEventListener('touchmove', e=>{
        e.preventDefault();
        for(const t of e.changedTouches){
          if(t.identifier===s.lookTouch.id){
            const dx=t.clientX-s.lookTouch.lastX;
            const dy=t.clientY-s.lookTouch.lastY;
            s.yaw   -= dx*0.004;
            s.pitch -= dy*0.004;
            s.pitch  = Math.max(-1.1,Math.min(1.1,s.pitch));
            s.lookTouch.lastX=t.clientX;
            s.lookTouch.lastY=t.clientY;
          }
        }
      },{passive:false});

      rdr.domElement.addEventListener('touchend', e=>{
        for(const t of e.changedTouches){
          if(t.identifier===s.lookTouch.id)
            s.lookTouch={ active:false, id:null, lastX:0, lastY:0 };
        }
      });

      // Joystick (DOM element events set separately via JSX refs)
    };

    // ══════════════════════════════════════════════════
    //  ANIMATION LOOP
    // ══════════════════════════════════════════════════
    const animate=(T,cam,rdr,sc,hits)=>{
      const raycaster=new T.Raycaster();
      let last=performance.now();
      const loop=()=>{
        animId=requestAnimationFrame(loop);
        const now=performance.now(), dt=Math.min((now-last)/1000,0.05); last=now;

        const moving = s.isLocked || isMobile;
        if(moving){
          const speed=(s.keys['ShiftLeft'])?7:4;
          const fw3=new T.Vector3(-Math.sin(s.yaw),0,-Math.cos(s.yaw));
          const rt3=new T.Vector3( Math.cos(s.yaw),0,-Math.sin(s.yaw));
          const move=new T.Vector3();

          // Keyboard
          if(s.keys['KeyW']||s.keys['ArrowUp'])    move.addScaledVector(fw3, speed*dt);
          if(s.keys['KeyS']||s.keys['ArrowDown'])  move.addScaledVector(fw3,-speed*dt);
          if(s.keys['KeyA']||s.keys['ArrowLeft'])  move.addScaledVector(rt3,-speed*dt);
          if(s.keys['KeyD']||s.keys['ArrowRight']) move.addScaledVector(rt3, speed*dt);

          // Joystick
          if(s.joystick.active){
            const jx=s.joystick.dx/40, jy=s.joystick.dy/40; // normalized -1..1
            const js=3.5;
            move.addScaledVector(fw3,-jy*js*dt);
            move.addScaledVector(rt3, jx*js*dt);
          }

          cam.position.add(move);
          cam.position.x=Math.max(-10.4,Math.min(10.4,cam.position.x));
          cam.position.z=Math.max(-16.4,Math.min(16.4,cam.position.z));
          cam.position.y=1.7;
          cam.rotation.order='YXZ';
          cam.rotation.y=s.yaw; cam.rotation.x=s.pitch;

          raycaster.setFromCamera({x:0,y:0},cam);
          const hitArr=raycaster.intersectObjects(hits,true);
          if(hitArr.length&&hitArr[0].distance<5.5){
            let obj=hitArr[0].object;
            while(obj&&!obj.userData?.hasPhoto) obj=obj.parent;
            if(obj?.userData?.hasPhoto) setPhotoInfo({title:obj.userData.title,sub:obj.userData.sub});
            else setPhotoInfo(null);
          } else setPhotoInfo(null);
        }
        rdr.render(sc,cam);
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
    return ()=>{
      cancelAnimationFrame(animId);
      document.exitPointerLock?.();
      renderer?.dispose();
      if(mountRef.current&&renderer?.domElement?.parentNode===mountRef.current)
        mountRef.current.removeChild(renderer.domElement);
    };
  },[entered,photos]);

  // ── JOYSTICK TOUCH HANDLERS ──
  const onJoyStart = useCallback(e=>{
    e.preventDefault();
    const t=e.changedTouches[0];
    const s=stateRef.current;
    const zone=joystickZoneRef.current?.getBoundingClientRect();
    if(!zone) return;
    const cx=zone.left+zone.width/2, cy=zone.top+zone.height/2;
    s.joystick={ active:true, startX:cx, startY:cy, dx:0, dy:0 };
    if(joystickKnobRef.current){
      joystickKnobRef.current.style.transform='translate(-50%,-50%)';
    }
  },[]);

  const onJoyMove = useCallback(e=>{
    e.preventDefault();
    const s=stateRef.current;
    if(!s.joystick.active) return;
    const t=e.changedTouches[0];
    const zone=joystickZoneRef.current?.getBoundingClientRect();
    if(!zone) return;
    const cx=zone.left+zone.width/2, cy=zone.top+zone.height/2;
    let dx=t.clientX-cx, dy=t.clientY-cy;
    const maxR=40, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>maxR){ dx=dx/dist*maxR; dy=dy/dist*maxR; }
    s.joystick.dx=dx; s.joystick.dy=dy;
    if(joystickKnobRef.current)
      joystickKnobRef.current.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  },[]);

  const onJoyEnd = useCallback(e=>{
    e.preventDefault();
    stateRef.current.joystick={ active:false, startX:0, startY:0, dx:0, dy:0 };
    if(joystickKnobRef.current)
      joystickKnobRef.current.style.transform='translate(-50%,-50%)';
  },[]);

  // attach joystick listeners after mount
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

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════
  return(
    <>
      <Head>
        <title>معرض الفوتوغرافيا الافتراضي</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
      </Head>
      <div ref={mountRef} style={{width:'100vw',height:'100dvh',touchAction:'none'}}/>

      {/* ── ENTRY SCREEN ── */}
      {!entered&&(
        <div style={{
          position:'fixed',inset:0,zIndex:200,
          background:'linear-gradient(155deg,#f4f1ec 0%,#ece8e2 55%,#e2ddd6 100%)',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          fontFamily:'Segoe UI,Tahoma,sans-serif',padding:'20px',
          overflowY:'auto',
        }}>
          {[['#3b82f6',-200,-140,220],['#ef4444',180,130,170],['#10b981',-120,180,150],
            ['#f59e0b',170,-180,150],['#8b5cf6',-10,-220,110]].map(([c,x,y,sz],i)=>(
            <div key={i} style={{
              position:'absolute',left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,
              width:sz,height:sz,borderRadius:'50%',background:c,
              opacity:0.1,transform:'translate(-50%,-50%)',filter:'blur(3px)',
            }}/>
          ))}
          <div style={{position:'relative',textAlign:'center',maxWidth:420,width:'100%'}}>
            <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:18}}>
              {['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6'].map(c=>(
                <div key={c} style={{width:9,height:9,borderRadius:'50%',background:c}}/>
              ))}
            </div>
            <h1 style={{fontSize:'clamp(2rem,8vw,3rem)',fontWeight:200,letterSpacing:'0.25em',color:'#1a1a2e',marginBottom:6}}>
              GALLERY
            </h1>
            <p style={{color:'#7a7068',fontSize:'clamp(0.75rem,3vw,0.92rem)',letterSpacing:'0.22em',marginBottom:6}}>
              معرض الفوتوغرافيا الافتراضي
            </p>
            <p style={{color:'#b0a898',fontSize:'0.78rem',marginBottom:32}}>
              {photos.length} صورة معروضة · 15 موقع
            </p>

            <button onClick={()=>setEntered(true)} style={{
              background:'#1a1a2e',color:'#faf8f5',border:'none',
              padding:'14px 48px',fontSize:'0.96rem',letterSpacing:'0.15em',
              cursor:'pointer',borderRadius:4,fontFamily:'inherit',
              WebkitTapHighlightColor:'transparent',
            }}>
              دخول المعرض →
            </button>

            {/* Controls hint — different for mobile/desktop */}
            {isMobile?(
              <div style={{marginTop:28,display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
                {[['↕↔ يسار','التحرك'],['سحب يمين','النظر']].map(([k,l])=>(
                  <div key={k} style={{textAlign:'center'}}>
                    <div style={{background:'#fff',border:'1px solid #dbd6ce',borderRadius:5,
                      padding:'5px 12px',fontSize:'0.76rem',color:'#1a1a2e',marginBottom:3,
                      boxShadow:'0 2px 5px rgba(0,0,0,0.07)'}}>{k}</div>
                    <div style={{fontSize:'0.68rem',color:'#a09888'}}>{l}</div>
                  </div>
                ))}
              </div>
            ):(
              <div style={{marginTop:28,display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
                {[['W A S D','التحرك'],['ماوس','النظر'],['Shift','ركض'],['ESC','إيقاف']].map(([k,l])=>(
                  <div key={k} style={{textAlign:'center'}}>
                    <div style={{background:'#fff',border:'1px solid #dbd6ce',borderRadius:5,
                      padding:'5px 12px',fontSize:'0.76rem',color:'#1a1a2e',fontFamily:'monospace',
                      marginBottom:3,boxShadow:'0 2px 5px rgba(0,0,0,0.07)'}}>{k}</div>
                    <div style={{fontSize:'0.68rem',color:'#a09888'}}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:36,borderTop:'1px solid #dbd6ce',paddingTop:18}}>
              <a href="/admin/login" style={{
                display:'inline-flex',alignItems:'center',gap:7,
                border:'1px solid #ccc6bc',color:'#7a7068',
                padding:'9px 22px',borderRadius:6,
                fontSize:'0.8rem',letterSpacing:'0.1em',textDecoration:'none',
              }}>⚙ لوحة الإدارة</a>
            </div>
          </div>
        </div>
      )}

      {/* ── CROSSHAIR (desktop only) ── */}
      {entered&&locked&&!isMobile&&(
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          width:18,height:18,pointerEvents:'none',zIndex:50}}>
          <div style={{position:'absolute',width:2,height:18,background:'rgba(25,25,45,0.4)',left:8,top:0}}/>
          <div style={{position:'absolute',width:18,height:2,background:'rgba(25,25,45,0.4)',left:0,top:8}}/>
        </div>
      )}

      {/* ── MOBILE CENTER DOT ── */}
      {entered&&isMobile&&(
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
          width:8,height:8,borderRadius:'50%',background:'rgba(25,25,45,0.35)',
          pointerEvents:'none',zIndex:50}}/>
      )}

      {/* ── PHOTO INFO ── */}
      {entered&&photoInfo&&(
        <div style={{position:'fixed',bottom:isMobile?'160px':'64px',left:'50%',
          transform:'translateX(-50%)',pointerEvents:'none',zIndex:50}}>
          <div style={{
            background:'rgba(22,22,40,0.82)',backdropFilter:'blur(8px)',
            borderRadius:8,padding:'10px 24px',color:'#faf8f5',
            fontFamily:'Segoe UI,Tahoma,sans-serif',textAlign:'center',
          }}>
            <div style={{fontWeight:500,fontSize:'0.9rem',marginBottom:3}}>{photoInfo.title}</div>
            <div style={{fontSize:'0.74rem',color:'#b8b0a8',letterSpacing:'0.1em'}}>{photoInfo.sub}</div>
          </div>
        </div>
      )}

      {/* ── HUD ── */}
      {entered&&!isMobile&&(
        <div style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',
          fontSize:'0.68rem',color:'rgba(25,25,45,0.3)',letterSpacing:'0.14em',
          pointerEvents:'none',zIndex:50,fontFamily:'Segoe UI,Tahoma,sans-serif'}}>
          {locked?'ESC للتوقف · Shift للركض':'انقر على المشهد للتحكم بالكاميرا'}
        </div>
      )}

      {/* ── TOP BUTTONS ── */}
      {entered&&(
        <div style={{position:'fixed',top:14,right:14,zIndex:50,display:'flex',gap:8}}>
          <a href="/admin/login" target="_blank" style={{
            background:'rgba(250,248,245,0.9)',border:'1px solid #dbd6ce',
            color:'#484038',padding:isMobile?'9px 14px':'7px 15px',borderRadius:5,
            fontSize:isMobile?'0.78rem':'0.73rem',letterSpacing:'0.08em',textDecoration:'none',
            backdropFilter:'blur(4px)',fontFamily:'Segoe UI,Tahoma,sans-serif',
            WebkitTapHighlightColor:'transparent',
          }}>⚙ إدارة</a>
          <button onClick={()=>{document.exitPointerLock?.();setEntered(false);setLocked(false);}} style={{
            background:'rgba(250,248,245,0.9)',border:'1px solid #dbd6ce',
            color:'#484038',padding:isMobile?'9px 14px':'7px 15px',cursor:'pointer',
            fontSize:isMobile?'0.78rem':'0.73rem',letterSpacing:'0.08em',borderRadius:5,
            backdropFilter:'blur(4px)',fontFamily:'Segoe UI,Tahoma,sans-serif',
            WebkitTapHighlightColor:'transparent',
          }}>← خروج</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MOBILE CONTROLS
      ══════════════════════════════════════════════ */}
      {entered&&isMobile&&(
        <div style={{
          position:'fixed',bottom:0,left:0,right:0,
          height:150,zIndex:50,
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'0 28px 20px',
          pointerEvents:'none',
        }}>
          {/* LEFT — Joystick */}
          <div style={{pointerEvents:'auto'}}>
            {/* Outer ring */}
            <div ref={joystickZoneRef} style={{
              width:110,height:110,borderRadius:'50%',
              background:'rgba(255,255,255,0.18)',
              border:'2px solid rgba(255,255,255,0.35)',
              backdropFilter:'blur(6px)',
              position:'relative',
              touchAction:'none',
              WebkitTapHighlightColor:'transparent',
            }}>
              {/* Crosshair lines inside zone */}
              <div style={{position:'absolute',width:1,height:'60%',background:'rgba(255,255,255,0.2)',left:'50%',top:'20%'}}/>
              <div style={{position:'absolute',height:1,width:'60%',background:'rgba(255,255,255,0.2)',top:'50%',left:'20%'}}/>
              {/* Knob */}
              <div ref={joystickKnobRef} style={{
                position:'absolute',top:'50%',left:'50%',
                transform:'translate(-50%,-50%)',
                width:44,height:44,borderRadius:'50%',
                background:'rgba(255,255,255,0.7)',
                border:'2px solid rgba(100,120,200,0.4)',
                boxShadow:'0 2px 12px rgba(0,0,0,0.18)',
                transition:'none',
              }}/>
            </div>
            <div style={{textAlign:'center',marginTop:6,fontSize:'0.62rem',color:'rgba(30,30,50,0.4)',letterSpacing:'0.1em'}}>
              تحرك
            </div>
          </div>

          {/* RIGHT — Look hint */}
          <div style={{textAlign:'center',opacity:0.4}}>
            <div style={{fontSize:'1.6rem',color:'rgba(30,30,50,0.5)',marginBottom:4}}>👁</div>
            <div style={{fontSize:'0.62rem',color:'rgba(30,30,50,0.4)',letterSpacing:'0.1em'}}>
              اسحب للنظر
            </div>
          </div>
        </div>
      )}
    </>
  );
}

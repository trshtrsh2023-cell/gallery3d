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
      // تعديل: خلفية فاتحة لضمان الرؤية الكاملة
      scene.background = new THREE.Color(0x222225); 
      scene.fog = new THREE.FogExp2(0x222225, 0.005);

      camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 100);
      camera.position.set(0,1.7,13);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
      mountRef.current?.appendChild(renderer.domElement);

      buildRoom(THREE);
      await buildArtworks(THREE, hitMeshes);
      setupControls(renderer);
      animate(THREE, camera, renderer, scene, hitMeshes);
    };

    const buildRoom = (T) => {
      const RW=22,RL=34,RH=5.5;
      const m=(c,r=0.88,mt=0)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:mt});
      const box=(w,h,d,mat,px,py,pz)=>{
        const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
        mesh.position.set(px,py,pz);
        mesh.receiveShadow=mesh.castShadow=true;
        scene.add(mesh); return mesh;
      };

      const wallM=m(0x444448); // جدران رمادية متوسطة لتفتيح المكان
      box(RW,0.22,RL,m(0x333336, 0.3, 0.2),0,-0.11,0); // أرضية رخامية فاتحة
      box(RW,0.12,RL,m(0x55555a,0.98),0,RH,0);
      
      box(0.25,RH,RL,wallM,-RW/2,RH/2,0);
      box(0.25,RH,RL,wallM, RW/2,RH/2,0);
      box(RW,RH,0.25,wallM,0,RH/2,-RL/2);
      box(RW,RH,0.25,wallM,0,RH/2, RL/2);
      box(0.25,RH,7,wallM,-5.5,RH/2,-7);
      box(0.25,RH,7,wallM, 5.5,RH/2,-7);
      box(0.25,RH,7,wallM,-5.5,RH/2, 6);
      box(0.25,RH,7,wallM, 5.5,RH/2, 6);

      // رفع الإضاءة العامة لإنقاذ الموقف
      scene.add(new T.AmbientLight(0xffffff, 0.85));
      scene.add(new T.HemisphereLight(0xffffff, 0x444444, 0.5));

      const railM=m(0x181820,0.15,0.95), coneM=m(0x101018,0.1,0.97);
      const glowM=new T.MeshStandardMaterial({color:0xfffce8,emissive:0xfffce8,emissiveIntensity:1.2,roughness:0,metalness:0});

      [-7,0,7].forEach(rx=>{
        const rail=new T.Mesh(new T.BoxGeometry(0.046,0.036,RL-1),railM);
        rail.position.set(rx,RH-0.036,0); scene.add(rail);
        [-9.5,-3.5,3.5,9.5].forEach(rz=>{
          const g=new T.Group(); g.position.set(rx,RH-0.036,rz);
          const arm=new T.Mesh(new T.CylinderGeometry(0.011,0.011,0.22,8),railM);
          arm.position.y=-0.11; g.add(arm);
          const cone=new T.Mesh(new T.CylinderGeometry(0.032,0.088,0.2,16,1,true),coneM);
          cone.position.y=-0.33; g.add(cone);
          const lens=new T.Mesh(new T.CircleGeometry(0.068,20),glowM);
          lens.rotation.x=Math.PI/2; lens.position.y=-0.432; g.add(lens);
          scene.add(g);
          const spot=new T.SpotLight(0xfff8e0, 3, 20, Math.PI/5, 0.3, 1);
          spot.position.set(rx,RH-0.44,rz);
          spot.target.position.set(rx,0,rz);
          spot.castShadow=true; scene.add(spot); scene.add(spot.target);
        });
      });

      const seatM=m(0x1a1a1a,0.62,0.05), legM=m(0x181828,0.2,0.88);
      [[0,0],[0,-12],[0,12],[-8,0],[8,0]].forEach(([bx,bz])=>{
        const g=new T.Group(); g.position.set(bx,0,bz);
        const seat=new T.Mesh(new T.BoxGeometry(1.9,0.09,0.55),seatM);
        seat.position.y=0.46; seat.castShadow=seat.receiveShadow=true; g.add(seat);
        [[-0.74,-0.21],[0.74,-0.21],[-0.74,0.21],[0.74,0.21]].forEach(([lx,lz])=>{
          const leg=new T.Mesh(new T.BoxGeometry(0.06,0.46,0.06),legM);
          leg.position.set(lx,0.23,lz); leg.castShadow=true; g.add(leg);
        });
        scene.add(g);
      });
    };

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
        const frameMesh=new T.Mesh(makeFrameGeo(T,fw,fh),fMat);
        frameMesh.position.z=-0.035; frameMesh.castShadow=true; group.add(frameMesh);
        const back=new T.Mesh(new T.BoxGeometry(fw,fh,0.015),
          new T.MeshStandardMaterial({color:0xfaf7f3,roughness:0.9}));
        back.position.z=0.02; group.add(back);
        const imgMesh=new T.Mesh(new T.PlaneGeometry(fw,fh),
          new T.MeshStandardMaterial({map:tex,roughness:0.82, emissive: 0xffffff, emissiveIntensity: 0.15}));
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
      return new T.CanvasTexture(cv);
    };

    const addPicLight=(T,group,fw,fh,lit)=>{
      if(!lit) return;
      const brassM=new T.MeshStandardMaterial({color:0xc4a040,roughness:0.16,metalness:0.9});
      const shadeM=new T.MeshStandardMaterial({color:0x0e0e18,roughness:0.15,metalness:0.95});
      const g=new T.Group(); g.position.set(0,fh/2+0.195,0.16);
      g.add(new T.Mesh(new T.BoxGeometry(fw*0.46,0.05,0.04),brassM));
      const arm=new T.Mesh(new T.CylinderGeometry(0.01,0.01,0.16,8),brassM);
      arm.rotation.x=Math.PI/2; arm.position.z=0.08; g.add(arm);
      const shade=new T.Mesh(new T.CylinderGeometry(0.045,0.076,fw*0.42,16,1,true,0,Math.PI),shadeM);
      shade.rotation.x=-Math.PI/2; shade.position.z=0.16; g.add(shade);
      group.add(g);
      
      const pl=new T.SpotLight(0xfff8cc, 6, 8, Math.PI/7, 0.4, 2);
      pl.position.set(0,fh/2+1, 1.5);
      pl.target.position.set(0, 0, 0);
      group.add(pl); group.add(pl.target);
    };

    const addLabel=(T,group,slotId,fw,fh,hasPhoto)=>{
      if(!hasPhoto) return;
      const cv=document.createElement('canvas'); cv.width=140; cv.height=52;
      const ctx=cv.getContext('2d');
      ctx.fillStyle='rgba(26,26,46,0.8)'; ctx.beginPath(); ctx.roundRect(0,0,140,52,9); ctx.fill();
      ctx.fillStyle='#ffffff'; ctx.font='bold 28px sans-serif'; ctx.textAlign='center';
      ctx.fillText('#'+slotId,70,36);
      const sprite=new T.Mesh(new T.PlaneGeometry(0.44,0.165),
        new T.MeshStandardMaterial({map:new T.CanvasTexture(cv),transparent:true,depthWrite:false}));
      sprite.position.set(0,fh/2+0.55,0.08); group.add(sprite);
    };

    const setupControls = (rdr) => {
      document.addEventListener('keydown', e=>{ s.keys[e.code]=true; });
      document.addEventListener('keyup',   e=>{ s.keys[e.code]=false; });
      rdr.domElement.addEventListener('click', ()=>{ if(!isMobile) rdr.domElement.requestPointerLock(); });
      document.addEventListener('pointerlockchange',()=>{
        s.isLocked = document.pointerLockElement===rdr.domElement; setLocked(s.isLocked);
      });
      document.addEventListener('mousemove', e=>{
        if(!s.isLocked) return;
        s.yaw   -= e.movementX*0.0018; s.pitch -= e.movementY*0.0018;
        s.pitch  = Math.max(-1.1,Math.min(1.1,s.pitch));
      });

      rdr.domElement.addEventListener('touchstart', e=>{
        e.preventDefault();
        for(const t of e.changedTouches){
          if(t.clientX > innerWidth/2 && !s.lookTouch.active)
            s.lookTouch={ active:true, id:t.identifier, lastX:t.clientX, lastY:t.clientY };
        }
      },{passive:false});

      rdr.domElement.addEventListener('touchmove', e=>{
        e.preventDefault();
        for(const t of e.changedTouches){
          if(t.identifier===s.lookTouch.id){
            const dx=t.clientX-s.lookTouch.lastX; const dy=t.clientY-s.lastY;
            s.yaw -= dx*0.004; s.pitch -= dy*0.004; s.pitch = Math.max(-1.1,Math.min(1.1,s.pitch));
            s.lookTouch.lastX=t.clientX; s.lookTouch.lastY=t.clientY;
          }
        }
      },{passive:false});

      rdr.domElement.addEventListener('touchend', e=>{
        for(const t of e.changedTouches) if(t.identifier===s.lookTouch.id) s.lookTouch.active=false;
      });
    };

    const animate=(T,cam,rdr,sc,hits)=>{
      const raycaster=new T.Raycaster();
      let last=performance.now();
      const loop=()=>{
        animId=requestAnimationFrame(loop);
        const now=performance.now(), dt=Math.min((now-last)/1000,0.05); last=now;

        if(s.isLocked || isMobile){
          const speed=(s.keys['ShiftLeft'])?8:4.5;
          const fw3=new T.Vector3(-Math.sin(s.yaw),0,-Math.cos(s.yaw));
          const rt3=new T.Vector3( Math.cos(s.yaw),0,-Math.sin(s.yaw));
          const move=new T.Vector3();

          if(s.keys['KeyW']) move.addScaledVector(fw3, speed*dt);
          if(s.keys['KeyS']) move.addScaledVector(fw3,-speed*dt);
          if(s.keys['KeyA']) move.addScaledVector(rt3,-speed*dt);
          if(s.keys['KeyD']) move.addScaledVector(rt3, speed*dt);

          if(s.joystick.active){
            move.addScaledVector(fw3, -s.joystick.dy/40*4*dt);
            move.addScaledVector(rt3,  s.joystick.dx/40*4*dt);
          }

          cam.position.add(move);
          cam.position.x=Math.max(-10.4,Math.min(10.4,cam.position.x));
          cam.position.z=Math.max(-16.4,Math.min(16.4,cam.position.z));
          cam.position.y=1.7;
          cam.rotation.order='YXZ'; cam.rotation.y=s.yaw; cam.rotation.x=s.pitch;

          raycaster.setFromCamera({x:0,y:0},cam);
          const hitArr=raycaster.intersectObjects(hits,true);
          if(hitArr.length&&hitArr[0].distance<5.5){
            let obj=hitArr[0].object; while(obj&&!obj.userData?.hasPhoto) obj=obj.parent;
            if(obj?.userData?.hasPhoto) setPhotoInfo(obj.userData); else setPhotoInfo(null);
          } else setPhotoInfo(null);
        }
        rdr.render(sc,cam);
      };
      loop();
    };

    init();
    return ()=>{ cancelAnimationFrame(animId); renderer?.dispose(); };
  },[entered,photos]);

  const onJoyStart = useCallback(e=>{
    e.preventDefault(); const t=e.changedTouches[0];
    const zone=joystickZoneRef.current?.getBoundingClientRect();
    stateRef.current.joystick={ active:true, startX:zone.left+zone.width/2, startY:zone.top+zone.height/2, dx:0, dy:0 };
  },[]);

  const onJoyMove = useCallback(e=>{
    e.preventDefault(); const s=stateRef.current; if(!s.joystick.active) return;
    const t=e.changedTouches[0]; const zone=joystickZoneRef.current?.getBoundingClientRect();
    let dx=t.clientX-(zone.left+zone.width/2), dy=t.clientY-(zone.top+zone.height/2);
    const dist=Math.sqrt(dx*dx+dy*dy); if(dist>40){ dx=dx/dist*40; dy=dy/dist*40; }
    s.joystick.dx=dx; s.joystick.dy=dy;
    if(joystickKnobRef.current) joystickKnobRef.current.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  },[]);

  const onJoyEnd = useCallback(e=>{
    stateRef.current.joystick.active=false;
    if(joystickKnobRef.current) joystickKnobRef.current.style.transform='translate(-50%,-50%)';
  },[]);

  useEffect(()=>{
    const zone=joystickZoneRef.current; if(!zone||!entered) return;
    zone.addEventListener('touchstart',onJoyStart,{passive:false});
    zone.addEventListener('touchmove', onJoyMove, {passive:false});
    zone.addEventListener('touchend',  onJoyEnd,  {passive:false});
    return()=>{ zone.removeEventListener('touchstart',onJoyStart); zone.removeEventListener('touchmove',onJoyMove); zone.removeEventListener('touchend',onJoyEnd); };
  },[entered,onJoyStart,onJoyMove,onJoyEnd]);

  return(
    <>
      <Head>
        <title>معرض الفوتوغرافيا الافتراضي</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
      </Head>
      <div ref={mountRef} style={{width:'100vw',height:'100dvh',background:'#000'}}/>

      {!entered&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'#111',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
          <h1 style={{color:'#fff',letterSpacing:'0.4em',fontWeight:100,fontSize:'3rem'}}>GALLERY</h1>
          <button onClick={()=>setEntered(true)} style={{background:'none',border:'1px solid #666',color:'#eee',padding:'12px 40px',cursor:'pointer',marginTop:'30px',borderRadius:'4px'}}>دخول المعرض →</button>
        </div>
      )}

      {entered&&photoInfo&&(
        <div style={{position:'fixed',bottom:'15%',left:'50%',transform:'translateX(-50%)',zIndex:100}}>
          <div style={{background:'rgba(0,0,0,0.85)',padding:'15px 30px',borderRadius:'8px',color:'#fff',textAlign:'center',backdropFilter:'blur(10px)',border:'1px solid #222'}}>
            <div style={{fontSize:'1.1rem',fontWeight:600}}>{photoInfo.title}</div>
            <div style={{fontSize:'0.8rem',color:'#888'}}>{photoInfo.sub}</div>
          </div>
        </div>
      )}

      {entered&&isMobile&&(
        <div style={{position:'fixed',bottom:30,left:30,width:110,height:110,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',zIndex:100,pointerEvents:'auto'}} ref={joystickZoneRef}>
          <div ref={joystickKnobRef} style={{position:'absolute',top:'50%',left:'50%',width:40,height:40,borderRadius:'50%',background:'#fff',transform:'translate(-50%,-50%)'}}/>
        </div>
      )}

      {entered&&(
        <div style={{position:'fixed',top:20,right:20,zIndex:100}}>
          <button onClick={()=>setEntered(false)} style={{background:'rgba(0,0,0,0.5)',color:'#fff',border:'1px solid #333',padding:'8px 20px',borderRadius:5,cursor:'pointer'}}>خروج</button>
        </div>
      )}
    </>
  );
}
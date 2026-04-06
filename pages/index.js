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
      // تصميم سينمائي: خلفية سوداء مخملية + ضباب كثيف
      scene.background = new THREE.Color(0x050510);
      scene.fog = new THREE.FogExp2(0x050510, 0.012);

      camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 100);
      camera.position.set(0,1.7,13);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2; // أغمق قليلاً للجو السينمائي
      mountRef.current?.appendChild(renderer.domElement);

      buildRoom(THREE);
      await buildArtworks(THREE, hitMeshes);
      setupControls(renderer);
      animate(THREE, camera, renderer, scene, hitMeshes);
    };

    const buildRoom = (T) => {
      const RW=22, RL=34, RH=5.5;
      // مواد سينمائية: ألوان غامقة، مخملية، انعكاس متوسط
      const m=(c,r=0.45,mt=0.4)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:mt});
      
      // أرضية خشبية داكنة
      const floorMat = m(0x1e1a17, 0.55, 0.25);
      const wallMat = m(0x14121a, 0.35, 0.15); // جدران رمادية غامقة مخملية
      
      const box=(w,h,d,mat,px,py,pz)=>{
        const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
        mesh.position.set(px,py,pz);
        mesh.receiveShadow=mesh.castShadow=true;
        scene.add(mesh); return mesh;
      };

      box(RW,0.22,RL,floorMat,0,-0.11,0); // أرضية
      box(RW,0.12,RL,m(0x0a0a14,0.98),0,RH,0); // سقف
      
      box(0.25,RH,RL,wallMat,-RW/2,RH/2,0);
      box(0.25,RH,RL,wallMat, RW/2,RH/2,0);
      box(RW,RH,0.25,wallMat,0,RH/2,-RL/2);
      box(RW,RH,0.25,wallMat,0,RH/2, RL/2);
      box(0.25,RH,7,wallMat,-5.5,RH/2,-7);
      box(0.25,RH,7,wallMat, 5.5,RH/2,-7);
      box(0.25,RH,7,wallMat,-5.5,RH/2, 6);
      box(0.25,RH,7,wallMat, 5.5,RH/2, 6);

      // إضاءة سينمائية محيطة
      scene.add(new T.AmbientLight(0x221c1a, 0.45)); // دافئة خافتة
      scene.add(new T.HemisphereLight(0x2a2522, 0x0a0808, 0.6));
      
      // أضواء اتجاهية سينمائية
      const keyLight = new T.DirectionalLight(0xffdd99, 1.2);
      keyLight.position.set(5, 8, 7);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      scene.add(keyLight);
      
      const fillLight = new T.DirectionalLight(0x88aaff, 0.5);
      fillLight.position.set(-4, 3, -5);
      scene.add(fillLight);
      
      const backLight = new T.PointLight(0xffaa66, 0.6);
      backLight.position.set(0, 3, -12);
      scene.add(backLight);

      // إضاءة رفوف (سينمائية)
      const railM=m(0x2a2622,0.15,0.85), coneM=m(0x181414,0.1,0.9);
      const glowM=new T.MeshStandardMaterial({color:0xffcc88,emissive:0xcc8844,emissiveIntensity:0.7,roughness:0.2,metalness:0.1});

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
          // ضوء بقعة دافئ
          const spot=new T.SpotLight(0xffcc99, 2.5, 18, Math.PI/6, 0.4, 1.2);
          spot.position.set(rx,RH-0.44,rz);
          spot.target.position.set(rx,0.8,rz);
          spot.castShadow=true;
          scene.add(spot); scene.add(spot.target);
        });
      });

      // مقاعد سينمائية (جلد داكن)
      const seatM=m(0x1a1410,0.55,0.08), legM=m(0x12100e,0.3,0.7);
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
      const fMat=new T.MeshStandardMaterial({color:fColor,roughness:0.2,metalness:0.75});

      const finalize=(fw,fh,tex,hasPhoto)=>{
        const frameMesh=new T.Mesh(makeFrameGeo(T,fw,fh),fMat);
        frameMesh.position.z=-0.035; frameMesh.castShadow=true; group.add(frameMesh);
        const back=new T.Mesh(new T.BoxGeometry(fw,fh,0.015),
          new T.MeshStandardMaterial({color:0x1e1a1a,roughness:0.7}));
        back.position.z=0.02; group.add(back);
        const imgMesh=new T.Mesh(new T.PlaneGeometry(fw,fh),
          new T.MeshStandardMaterial({map:tex,roughness:0.7, emissive: 0xccaa88, emissiveIntensity: 0.12}));
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
      ctx.fillStyle='#1e1916'; ctx.fillRect(0,0,360,270);
      ctx.strokeStyle='#aa8866'; ctx.lineWidth=2; ctx.setLineDash([8,6]);
      ctx.strokeRect(16,16,328,238);
      ctx.fillStyle='#ccaa88'; ctx.font='bold 54px sans-serif'; ctx.textAlign='center';
      ctx.fillText(slotId.toString(),180,155);
      return new T.CanvasTexture(cv);
    };

    const addPicLight=(T,group,fw,fh,lit)=>{
      if(!lit) return;
      const brassM=new T.MeshStandardMaterial({color:0xccaa77,roughness:0.2,metalness:0.85});
      const shadeM=new T.MeshStandardMaterial({color:0x0e0c0c,roughness:0.15,metalness:0.9});
      const g=new T.Group(); g.position.set(0,fh/2+0.195,0.16);
      g.add(new T.Mesh(new T.BoxGeometry(fw*0.46,0.05,0.04),brassM));
      const arm=new T.Mesh(new T.CylinderGeometry(0.01,0.01,0.16,8),brassM);
      arm.rotation.x=Math.PI/2; arm.position.z=0.08; g.add(arm);
      const shade=new T.Mesh(new T.CylinderGeometry(0.045,0.076,fw*0.42,16,1,true,0,Math.PI),shadeM);
      shade.rotation.x=-Math.PI/2; shade.position.z=0.16; g.add(shade);
      group.add(g);
      
      // إضاءة الصورة سينمائية دافئة
      const pl=new T.SpotLight(0xffcc88, 5.5, 7, Math.PI/5, 0.5, 1.5);
      pl.position.set(0,fh/2+1, 1.5);
      pl.target.position.set(0, 0.2, 0);
      pl.castShadow = true;
      group.add(pl); group.add(pl.target);
    };

    const addLabel=(T,group,slotId,fw,fh,hasPhoto)=>{
      if(!hasPhoto) return;
      const cv=document.createElement('canvas'); cv.width=140; cv.height=52;
      const ctx=cv.getContext('2d');
      ctx.fillStyle='rgba(10,8,12,0.85)'; ctx.beginPath(); ctx.roundRect(0,0,140,52,9); ctx.fill();
      ctx.fillStyle='#e6d5c3'; ctx.font='bold 28px sans-serif'; ctx.textAlign='center';
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
            const dx=t.clientX-s.lookTouch.lastX; const dy=t.clientY-s.lookTouch.lastY;
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
        <title>معرض سينمائي - فوتوغرافيا</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
      </Head>
      <div ref={mountRef} style={{width:'100vw',height:'100dvh',background:'#000'}}/>

      {!entered&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'#0a0808',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
          <h1 style={{color:'#e6d5c3',letterSpacing:'0.3em',fontWeight:300,fontSize:'3rem',borderBottom:'1px solid #aa8866',paddingBottom:20}}>CINEMA GALLERY</h1>
          <button onClick={()=>setEntered(true)} style={{background:'none',border:'1px solid #aa8866',color:'#e6d5c3',padding:'12px 40px',cursor:'pointer',marginTop:'30px',borderRadius:'4px',transition:'0.2s'}} onMouseEnter={e=>{e.target.style.background='#aa8866';e.target.style.color='#0a0808'}} onMouseLeave={e=>{e.target.style.background='none';e.target.style.color='#e6d5c3'}}>دخول المعرض →</button>
        </div>
      )}

      {entered&&photoInfo&&(
        <div style={{position:'fixed',bottom:'15%',left:'50%',transform:'translateX(-50%)',zIndex:100,fontFamily:'sans-serif'}}>
          <div style={{background:'rgba(10,8,12,0.9)',padding:'15px 30px',borderRadius:'8px',color:'#e6d5c3',textAlign:'center',backdropFilter:'blur(12px)',border:'1px solid #aa8866',boxShadow:'0 0 15px rgba(170,136,102,0.3)'}}>
            <div style={{fontSize:'1.2rem',fontWeight:500,letterSpacing:'0.05em'}}>{photoInfo.title}</div>
            <div style={{fontSize:'0.8rem',color:'#aa8866'}}>{photoInfo.sub}</div>
          </div>
        </div>
      )}

      {entered&&isMobile&&(
        <div style={{position:'fixed',bottom:30,left:30,width:110,height:110,borderRadius:'50%',background:'rgba(30,25,22,0.4)',border:'1px solid rgba(170,136,102,0.5)',zIndex:100,pointerEvents:'auto',backdropFilter:'blur(5px)'}} ref={joystickZoneRef}>
          <div ref={joystickKnobRef} style={{position:'absolute',top:'50%',left:'50%',width:40,height:40,borderRadius:'50%',background:'#aa8866',boxShadow:'0 0 10px rgba(170,136,102,0.8)',transform:'translate(-50%,-50%)'}}/>
        </div>
      )}

      {entered&&(
        <div style={{position:'fixed',top:20,right:20,zIndex:100}}>
          <button onClick={()=>setEntered(false)} style={{background:'rgba(10,8,12,0.7)',color:'#e6d5c3',border:'1px solid #aa8866',padding:'8px 20px',borderRadius:5,cursor:'pointer',backdropFilter:'blur(5px)'}}>خروج</button>
        </div>
      )}
    </>
  );
}
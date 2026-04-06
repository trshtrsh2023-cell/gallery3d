import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

// 15 artwork slots — rotY makes the frame face AWAY from its wall toward the viewer
// Left wall  (x=-11): face +X → rotY = +PI/2
// Right wall (x=+11): face -X → rotY = -PI/2
// Back wall  (z=-17): face +Z → rotY = 0
const SLOTS = [
  { id:0,  pos:[-10.88, 2.4,  -9.5], rotY:  Math.PI/2 },
  { id:1,  pos:[-10.88, 2.4,  -3.5], rotY:  Math.PI/2 },
  { id:2,  pos:[-10.88, 2.4,   3.5], rotY:  Math.PI/2 },
  { id:3,  pos:[-10.88, 2.4,   9.5], rotY:  Math.PI/2 },
  { id:4,  pos:[ 10.88, 2.4,  -9.5], rotY: -Math.PI/2 },
  { id:5,  pos:[ 10.88, 2.4,  -3.5], rotY: -Math.PI/2 },
  { id:6,  pos:[ 10.88, 2.4,   3.5], rotY: -Math.PI/2 },
  { id:7,  pos:[ 10.88, 2.4,   9.5], rotY: -Math.PI/2 },
  { id:8,  pos:[  -6.5, 2.4, -16.88], rotY: 0 },
  { id:9,  pos:[   0.0, 2.4, -16.88], rotY: 0 },
  { id:10, pos:[   6.5, 2.4, -16.88], rotY: 0 },
  { id:11, pos:[ -5.38, 2.4,  -9.5], rotY:  Math.PI/2 },
  { id:12, pos:[ -5.38, 2.4,   2.5], rotY:  Math.PI/2 },
  { id:13, pos:[  5.38, 2.4,  -9.5], rotY: -Math.PI/2 },
  { id:14, pos:[  5.38, 2.4,   2.5], rotY: -Math.PI/2 },
];

const FRAME_COLORS = [
  0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b,
  0x8b5cf6, 0xec4899, 0x06b6d4, 0x84cc16,
  0xf97316, 0x6366f1, 0x14b8a6, 0xe11d48,
  0x7c3aed, 0x0284c7, 0xd97706,
];

export default function Gallery() {
  const mountRef   = useRef(null);
  const [photos, setPhotos]     = useState([]);
  const [entered, setEntered]   = useState(false);
  const [photoInfo, setPhotoInfo] = useState(null);
  const [locked, setLocked]     = useState(false);

  useEffect(() => {
    fetch('/api/photos').then(r => r.json()).then(d => setPhotos(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!entered) return;
    let THREE, renderer, scene, camera, animId;
    let yaw = 0, pitch = 0, keys = {}, isLocked = false;
    const hitMeshes = [];

    const init = async () => {
      THREE = await import('three');
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xefecea);
      scene.fog = new THREE.FogExp2(0xefecea, 0.017);

      camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 100);
      camera.position.set(0, 1.7, 13);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      mountRef.current?.appendChild(renderer.domElement);

      buildRoom(THREE);
      await buildArtworks(THREE);
      setupControls();
      animate(THREE);
    };

    // ══════════════════════════════════════════════════════════
    //  ROOM
    // ══════════════════════════════════════════════════════════
    const buildRoom = (T) => {
      const RW=22, RL=34, RH=5.5;
      const m = (c,r=0.88,mt=0) => new T.MeshStandardMaterial({color:c,roughness:r,metalness:mt});

      const box = (w,h,d,mat,px,py,pz) => {
        const mesh = new T.Mesh(new T.BoxGeometry(w,h,d), mat);
        mesh.position.set(px,py,pz);
        mesh.receiveShadow = mesh.castShadow = true;
        scene.add(mesh); return mesh;
      };

      // WALLS — warm medium gray
      const wallM = m(0xc8c4bc);
      box(RW,0.22,RL, m(0xb0a89c,0.58,0.05), 0,-0.11,0); // floor
      box(RW,0.12,RL, m(0xf8f6f3,0.98),      0, RH, 0);  // ceiling
      box(0.25,RH,RL, wallM, -RW/2, RH/2, 0);
      box(0.25,RH,RL, wallM,  RW/2, RH/2, 0);
      box(RW,RH,0.25, wallM,  0, RH/2,-RL/2);
      box(RW,RH,0.25, wallM,  0, RH/2, RL/2);
      // dividers
      box(0.25,RH,7, wallM, -5.5,RH/2,-7);
      box(0.25,RH,7, wallM,  5.5,RH/2,-7);
      box(0.25,RH,7, wallM, -5.5,RH/2, 6);
      box(0.25,RH,7, wallM,  5.5,RH/2, 6);

      // FLOOR TILES — two warm stone tones
      const tA = m(0xc0b8ac,0.52,0.07);
      const tB = m(0xb4aca0,0.55,0.06);
      for (let xi=-10;xi<=10;xi+=2) for (let zi=-16;zi<=16;zi+=2) {
        const tile = new T.Mesh(new T.BoxGeometry(1.95,0.03,1.95),
          ((Math.floor(xi/2)+Math.floor(zi/2))%2===0)?tA:tB);
        tile.position.set(xi,0.006,zi);
        tile.receiveShadow=true; scene.add(tile);
      }

      // BASEBOARD
      const bM = m(0xd0c8bc,0.55);
      [[-RL/2+0.16,RW,0],[RL/2-0.16,RW,0]].forEach(([z,w])=>box(w,0.22,0.1,bM,0,0.11,z));
      box(0.1,0.22,RL, bM,-RW/2+0.14,0.11,0);
      box(0.1,0.22,RL, bM, RW/2-0.14,0.11,0);

      // CROWN MOLDING
      const cM = m(0xd8d0c4,0.5);
      [[-RL/2+0.14],[RL/2-0.14]].forEach(([z])=>box(RW,0.16,0.1,cM,0,RH-0.08,z));

      // CEILING RAIL + SPOTLIGHTS
      const railM = m(0x181820,0.15,0.95);
      const coneM = m(0x101018,0.1, 0.97);
      const glowM = new T.MeshStandardMaterial({
        color:0xfffce8, emissive:0xfffce8, emissiveIntensity:1.6,
        roughness:0, metalness:0,
      });

      [-7,0,7].forEach(rx => {
        // Rail bar
        const rail = new T.Mesh(new T.BoxGeometry(0.046,0.036,RL-1), railM);
        rail.position.set(rx, RH-0.036, 0); scene.add(rail);

        [-9.5,-3.5,3.5,9.5].forEach(rz => {
          const g = new T.Group();
          g.position.set(rx, RH-0.036, rz);

          // Arm down from rail
          const arm = new T.Mesh(new T.CylinderGeometry(0.011,0.011,0.22,8), railM);
          arm.position.y = -0.11; g.add(arm);
          // Housing cone
          const cone = new T.Mesh(
            new T.CylinderGeometry(0.032,0.088,0.2,16,1,true), coneM);
          cone.position.y = -0.33; g.add(cone);
          // Top cap of cone
          const cap = new T.Mesh(new T.CircleGeometry(0.032,16), coneM);
          cap.rotation.x = Math.PI/2; cap.position.y = -0.23; g.add(cap);
          // Glowing lens
          const lens = new T.Mesh(new T.CircleGeometry(0.068,20), glowM);
          lens.rotation.x = Math.PI/2; lens.position.y = -0.432; g.add(lens);
          scene.add(g);

          // Actual spot
          const spot = new T.SpotLight(0xfff8e0,3,13,Math.PI/7,0.28,1.5);
          spot.position.set(rx, RH-0.44, rz);
          spot.target.position.set(rx,0,rz);
          spot.castShadow=true; spot.shadow.mapSize.set(256,256);
          scene.add(spot); scene.add(spot.target);
        });
      });

      // AMBIENT + HEMI
      scene.add(new T.AmbientLight(0xfff5e8,0.7));
      scene.add(new T.HemisphereLight(0xfff8f0,0xccc4b8,0.45));

      // BENCHES
      const seatM = m(0xb89658,0.62,0.05);
      const legM  = m(0x181828,0.2, 0.88);
      [[0,0],[0,-12],[0,12],[-8,0],[8,0]].forEach(([bx,bz])=>{
        const g = new T.Group();
        g.position.set(bx,0,bz);
        const seat = new T.Mesh(new T.BoxGeometry(1.9,0.09,0.55),seatM);
        seat.position.y=0.46; seat.castShadow=seat.receiveShadow=true; g.add(seat);
        [[-0.74,-0.21],[0.74,-0.21],[-0.74,0.21],[0.74,0.21]].forEach(([lx,lz])=>{
          const leg=new T.Mesh(new T.BoxGeometry(0.06,0.46,0.06),legM);
          leg.position.set(lx,0.23,lz); leg.castShadow=true; g.add(leg);
        });
        const str=new T.Mesh(new T.BoxGeometry(1.58,0.04,0.04),legM);
        str.position.y=0.09; g.add(str);
        scene.add(g);
      });
    };

    // ══════════════════════════════════════════════════════════
    //  ARTWORKS
    // ══════════════════════════════════════════════════════════
    const buildArtworks = async (T) => {
      const photoMap = {};
      photos.forEach(p => { photoMap[p.position_index] = p; });
      for (const slot of SLOTS) {
        await buildSlot(T, slot, photoMap[slot.id]);
      }
    };

    const makeFrameGeo = (T, fw, fh) => {
      const bw = 0.13;
      const shape = new T.Shape();
      shape.moveTo(-(fw/2+bw), -(fh/2+bw));
      shape.lineTo( (fw/2+bw), -(fh/2+bw));
      shape.lineTo( (fw/2+bw),  (fh/2+bw));
      shape.lineTo(-(fw/2+bw),  (fh/2+bw));
      shape.closePath();
      const hole = new T.Path();
      hole.moveTo(-fw/2,-fh/2); hole.lineTo(fw/2,-fh/2);
      hole.lineTo(fw/2, fh/2); hole.lineTo(-fw/2, fh/2);
      hole.closePath();
      shape.holes.push(hole);
      return new T.ExtrudeGeometry(shape, {
        depth:0.09, bevelEnabled:true,
        bevelSize:0.014, bevelThickness:0.014, bevelSegments:3,
      });
    };

    const buildSlot = (T, slot, ph) => new Promise(resolve => {
      const group = new T.Group();
      group.position.set(...slot.pos);
      group.rotation.y = slot.rotY;

      const fColor = FRAME_COLORS[slot.id % FRAME_COLORS.length];
      const fMat = new T.MeshStandardMaterial({ color:fColor, roughness:0.18, metalness:0.7 });

      const finalize = (fw, fh, tex, hasPhoto) => {
        // Frame mesh
        const frameGeo = makeFrameGeo(T, fw, fh);
        const frameMesh = new T.Mesh(frameGeo, fMat);
        frameMesh.position.z = -0.035;
        frameMesh.castShadow = true;
        group.add(frameMesh);

        // Backing board (white)
        const backM = new T.MeshStandardMaterial({ color:0xfaf7f3, roughness:0.9 });
        const back = new T.Mesh(new T.BoxGeometry(fw,fh,0.015), backM);
        back.position.z = 0.02; group.add(back);

        // Photo / placeholder plane
        const imgMat = new T.MeshStandardMaterial({ map:tex, roughness:0.82 });
        const imgMesh = new T.Mesh(new T.PlaneGeometry(fw,fh), imgMat);
        imgMesh.position.z = 0.036; group.add(imgMesh);

        // Picture light (brass wall lamp)
        addPictureLight(T, group, fw, fh, hasPhoto);

        // Slot number label
        addLabel(T, group, slot.id, fw, fh, hasPhoto);

        group.userData = { title:ph?.title||'', sub:ph?.subtitle||'', hasPhoto };
        if (hasPhoto) hitMeshes.push(group);
        scene.add(group);
        resolve();
      };

      if (ph?.image_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const aspect = img.naturalWidth / img.naturalHeight;
          const maxH=1.9, maxW=2.6;
          let fw, fh;
          if (aspect >= 1) { fw=Math.min(maxW,aspect*maxH); fh=fw/aspect; }
          else             { fh=maxH; fw=fh*aspect; }

          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img,0,0);
          const tex = new T.CanvasTexture(canvas);
          finalize(fw, fh, tex, true);
        };
        img.onerror = () => finalize(1.8, 1.35, makePlaceholderTex(T, slot.id), false);
        img.src = ph.image_url;
      } else {
        finalize(1.8, 1.35, makePlaceholderTex(T, slot.id), false);
      }
    });

    const makePlaceholderTex = (T, slotId) => {
      const canvas = document.createElement('canvas');
      canvas.width=360; canvas.height=270;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle='#f0ece6'; ctx.fillRect(0,0,360,270);
      ctx.strokeStyle='#d4cec6'; ctx.lineWidth=1.5; ctx.setLineDash([8,6]);
      ctx.strokeRect(16,16,328,238);
      ctx.fillStyle='#b8b0a8'; ctx.font='bold 54px sans-serif'; ctx.textAlign='center';
      ctx.fillText(slotId.toString(), 180,155);
      ctx.fillStyle='#ccc4bc'; ctx.font='17px sans-serif';
      ctx.fillText('موقع رقم '+slotId, 180,200);
      return new T.CanvasTexture(canvas);
    };

    const addPictureLight = (T, group, fw, fh, lit) => {
      const brassMat = new T.MeshStandardMaterial({ color:0xc4a040, roughness:0.16, metalness:0.9 });
      const shadeM   = new T.MeshStandardMaterial({ color:0x0e0e18, roughness:0.15, metalness:0.95 });
      const glowM    = new T.MeshStandardMaterial({
        color:0xfffbd0, emissive:0xfffbd0, emissiveIntensity: lit?1.8:0.25,
        roughness:0, metalness:0,
      });

      const g = new T.Group();
      g.position.set(0, fh/2+0.195, 0.16);

      // Backplate
      g.add(Object.assign(
        new T.Mesh(new T.BoxGeometry(fw*0.46,0.05,0.04), brassMat), {}));
      // Arm
      const arm = new T.Mesh(new T.CylinderGeometry(0.01,0.01,0.16,8), brassMat);
      arm.rotation.x=Math.PI/2; arm.position.z=0.08; g.add(arm);
      // Shade
      const shade = new T.Mesh(
        new T.CylinderGeometry(0.045,0.076, fw*0.42, 16,1,true, 0,Math.PI), shadeM);
      shade.rotation.x=-Math.PI/2; shade.position.z=0.16; g.add(shade);
      // Top cap
      const sCap = new T.Mesh(new T.PlaneGeometry(fw*0.42,0.09), shadeM);
      sCap.position.z=0.16; g.add(sCap);
      // Glow strip
      const glow = new T.Mesh(new T.PlaneGeometry(fw*0.36,0.05), glowM);
      glow.rotation.x=Math.PI/2; glow.position.set(0,-0.046,0.16); g.add(glow);
      group.add(g);

      if (lit) {
        const pl = new T.SpotLight(0xfff8cc, 4.5, 5.5, Math.PI/8, 0.25, 2.2);
        pl.position.set(0, fh/2+0.28, 0.32);
        pl.target.position.set(0,-fh*0.25,0.08);
        group.add(pl); group.add(pl.target);
      }
    };

    const addLabel = (T, group, slotId, fw, fh, hasPhoto) => {
      const canvas = document.createElement('canvas');
      canvas.width=140; canvas.height=52;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = hasPhoto ? '#1a1a2e' : '#888080';
      ctx.beginPath(); ctx.roundRect(0,0,140,52,9); ctx.fill();
      ctx.fillStyle = hasPhoto ? '#ffffff' : '#c8c0b8';
      ctx.font='bold 28px sans-serif'; ctx.textAlign='center';
      ctx.fillText('#'+slotId, 70, 36);
      const tex = new T.CanvasTexture(canvas);
      const sprite = new T.Mesh(
        new T.PlaneGeometry(0.44,0.165),
        new T.MeshStandardMaterial({ map:tex, transparent:true, roughness:1, depthWrite:false })
      );
      sprite.position.set(0, fh/2+0.55, 0.08);
      group.add(sprite);
    };

    // ══════════════════════════════════════════════════════════
    //  CONTROLS
    // ══════════════════════════════════════════════════════════
    const setupControls = () => {
      document.addEventListener('keydown', e => { keys[e.code]=true; });
      document.addEventListener('keyup',   e => { keys[e.code]=false; });
      renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock());
      document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === renderer.domElement;
        setLocked(isLocked);
      });
      document.addEventListener('mousemove', e => {
        if (!isLocked) return;
        yaw   -= e.movementX * 0.0018;
        pitch -= e.movementY * 0.0018;
        pitch  = Math.max(-1.1, Math.min(1.1, pitch));
      });
    };

    // ══════════════════════════════════════════════════════════
    //  LOOP
    // ══════════════════════════════════════════════════════════
    const animate = (T) => {
      const raycaster = new T.Raycaster();
      let last = performance.now();
      const loop = () => {
        animId = requestAnimationFrame(loop);
        const now = performance.now();
        const dt  = Math.min((now-last)/1000, 0.05); last=now;

        if (isLocked) {
          const speed = keys['ShiftLeft']?7:4;
          const fw3 = new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
          const rt3 = new T.Vector3( Math.cos(yaw),0,-Math.sin(yaw));
          const move = new T.Vector3();
          if (keys['KeyW']||keys['ArrowUp'])    move.addScaledVector(fw3, speed*dt);
          if (keys['KeyS']||keys['ArrowDown'])  move.addScaledVector(fw3,-speed*dt);
          if (keys['KeyA']||keys['ArrowLeft'])  move.addScaledVector(rt3,-speed*dt);
          if (keys['KeyD']||keys['ArrowRight']) move.addScaledVector(rt3, speed*dt);
          camera.position.add(move);
          camera.position.x = Math.max(-10.4, Math.min(10.4, camera.position.x));
          camera.position.z = Math.max(-16.4, Math.min(16.4, camera.position.z));
          camera.position.y = 1.7;
          camera.rotation.order='YXZ';
          camera.rotation.y=yaw; camera.rotation.x=pitch;

          raycaster.setFromCamera({x:0,y:0}, camera);
          const hits = raycaster.intersectObjects(hitMeshes, true);
          if (hits.length && hits[0].distance < 5.5) {
            // Walk up parent chain to find group with userData
            let obj = hits[0].object;
            while (obj && !obj.userData?.hasPhoto) obj = obj.parent;
            if (obj?.userData?.hasPhoto) setPhotoInfo({ title:obj.userData.title, sub:obj.userData.sub });
            else setPhotoInfo(null);
          } else setPhotoInfo(null);
        }
        renderer.render(scene, camera);
      };
      loop();
    };

    window.addEventListener('resize', () => {
      if (!camera||!renderer) return;
      camera.aspect = innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    init();
    return () => {
      cancelAnimationFrame(animId);
      document.exitPointerLock?.();
      renderer?.dispose();
      if (mountRef.current && renderer?.domElement?.parentNode===mountRef.current)
        mountRef.current.removeChild(renderer.domElement);
    };
  }, [entered, photos]);

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <>
      <Head><title>معرض الفوتوغرافيا الافتراضي</title></Head>
      <div ref={mountRef} style={{ width:'100vw', height:'100vh' }} />

      {/* ENTRY */}
      {!entered && (
        <div style={{
          position:'fixed', inset:0, zIndex:200,
          background:'linear-gradient(155deg,#f4f1ec 0%,#ece8e2 55%,#e2ddd6 100%)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          fontFamily:'Segoe UI,Tahoma,sans-serif',
        }}>
          {[['#3b82f6',-260,-175,290],['#ef4444',235,160,215],['#10b981',-150,220,175],
            ['#f59e0b',215,-240,185],['#8b5cf6',-15,-275,135]].map(([c,x,y,s],i)=>(
            <div key={i} style={{
              position:'absolute', left:`calc(50% + ${x}px)`, top:`calc(50% + ${y}px)`,
              width:s, height:s, borderRadius:'50%', background:c,
              opacity:0.1, transform:'translate(-50%,-50%)', filter:'blur(3px)',
            }}/>
          ))}
          <div style={{ position:'relative', textAlign:'center' }}>
            <div style={{ display:'flex', gap:9, justifyContent:'center', marginBottom:20 }}>
              {['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6'].map(c=>(
                <div key={c} style={{ width:9, height:9, borderRadius:'50%', background:c }}/>
              ))}
            </div>
            <h1 style={{ fontSize:'3rem', fontWeight:200, letterSpacing:'0.28em', color:'#1a1a2e', marginBottom:5 }}>
              GALLERY
            </h1>
            <p style={{ color:'#7a7068', fontSize:'0.92rem', letterSpacing:'0.28em', marginBottom:7 }}>
              معرض الفوتوغرافيا الافتراضي
            </p>
            <p style={{ color:'#b0a898', fontSize:'0.8rem', marginBottom:38 }}>
              {photos.length} صورة معروضة · 15 موقع
            </p>
            <button onClick={()=>setEntered(true)} style={{
              background:'#1a1a2e', color:'#faf8f5', border:'none',
              padding:'14px 54px', fontSize:'0.98rem', letterSpacing:'0.18em',
              cursor:'pointer', borderRadius:4, fontFamily:'inherit', transition:'background .25s',
            }}
              onMouseEnter={e=>e.target.style.background='#3b82f6'}
              onMouseLeave={e=>e.target.style.background='#1a1a2e'}
            >دخول المعرض →</button>

            <div style={{ marginTop:34, display:'flex', gap:18, justifyContent:'center', flexWrap:'wrap' }}>
              {[['W A S D','التحرك'],['ماوس','النظر'],['Shift','ركض'],['ESC','إيقاف']].map(([k,l])=>(
                <div key={k} style={{ textAlign:'center' }}>
                  <div style={{
                    background:'#fff', border:'1px solid #dbd6ce', borderRadius:5,
                    padding:'5px 12px', fontSize:'0.76rem', color:'#1a1a2e',
                    fontFamily:'monospace', marginBottom:3,
                    boxShadow:'0 2px 5px rgba(0,0,0,0.07)',
                  }}>{k}</div>
                  <div style={{ fontSize:'0.68rem', color:'#a09888' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Admin link */}
            <div style={{ marginTop:40, borderTop:'1px solid #dbd6ce', paddingTop:20 }}>
              <a href="/admin/login" style={{
                display:'inline-flex', alignItems:'center', gap:7,
                border:'1px solid #ccc6bc', color:'#7a7068',
                padding:'9px 22px', borderRadius:6,
                fontSize:'0.8rem', letterSpacing:'0.1em', textDecoration:'none',
                transition:'all .2s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#3b82f6';e.currentTarget.style.color='#3b82f6';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#ccc6bc';e.currentTarget.style.color='#7a7068';}}
              >⚙ لوحة الإدارة</a>
            </div>
          </div>
        </div>
      )}

      {/* CROSSHAIR */}
      {entered && locked && (
        <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:18, height:18, pointerEvents:'none', zIndex:50 }}>
          <div style={{ position:'absolute', width:2, height:18, background:'rgba(25,25,45,0.4)', left:8, top:0 }}/>
          <div style={{ position:'absolute', width:18, height:2, background:'rgba(25,25,45,0.4)', left:0, top:8 }}/>
        </div>
      )}

      {/* PHOTO INFO */}
      {entered && photoInfo && (
        <div style={{ position:'fixed', bottom:62, left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:50 }}>
          <div style={{
            background:'rgba(22,22,40,0.82)', backdropFilter:'blur(8px)',
            borderRadius:8, padding:'10px 26px', color:'#faf8f5',
            fontFamily:'Segoe UI,Tahoma,sans-serif', textAlign:'center',
          }}>
            <div style={{ fontWeight:500, fontSize:'0.92rem', marginBottom:3 }}>{photoInfo.title}</div>
            <div style={{ fontSize:'0.74rem', color:'#b8b0a8', letterSpacing:'0.12em' }}>{photoInfo.sub}</div>
          </div>
        </div>
      )}

      {/* HUD */}
      {entered && (
        <div style={{ position:'fixed', bottom:18, left:'50%', transform:'translateX(-50%)', fontSize:'0.68rem', color:'rgba(25,25,45,0.3)', letterSpacing:'0.14em', pointerEvents:'none', zIndex:50, fontFamily:'Segoe UI,Tahoma,sans-serif' }}>
          {locked ? 'ESC للتوقف · Shift للركض' : 'انقر على المشهد للتحكم بالكاميرا'}
        </div>
      )}

      {/* TOP BUTTONS */}
      {entered && (
        <div style={{ position:'fixed', top:16, right:16, zIndex:50, display:'flex', gap:8 }}>
          <a href="/admin/login" target="_blank" style={{
            background:'rgba(250,248,245,0.88)', border:'1px solid #dbd6ce',
            color:'#484038', padding:'7px 15px', borderRadius:5,
            fontSize:'0.73rem', letterSpacing:'0.1em', textDecoration:'none',
            backdropFilter:'blur(4px)', fontFamily:'Segoe UI,Tahoma,sans-serif',
          }}>⚙ إدارة</a>
          <button onClick={()=>{document.exitPointerLock?.();setEntered(false);setLocked(false);}} style={{
            background:'rgba(250,248,245,0.88)', border:'1px solid #dbd6ce',
            color:'#484038', padding:'7px 15px', cursor:'pointer',
            fontSize:'0.73rem', letterSpacing:'0.1em', borderRadius:5,
            backdropFilter:'blur(4px)', fontFamily:'Segoe UI,Tahoma,sans-serif',
          }}>← خروج</button>
        </div>
      )}
    </>
  );
}

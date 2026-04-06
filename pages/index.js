import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

export default function Gallery() {
  const mountRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [entered, setEntered] = useState(false);
  const [photoInfo, setPhotoInfo] = useState(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    fetch('/api/photos').then(r => r.json()).then(d => setPhotos(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!entered) return;

    let THREE, renderer, scene, camera, animId;
    let yaw = 0, pitch = 0, keys = {}, isLocked = false;
    const photoMeshes = [];

    const init = async () => {
      THREE = (await import('three')).default || await import('three');

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xfaf8f4);
      scene.fog = new THREE.FogExp2(0xfaf8f4, 0.022);

      // Camera
      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 1.7, 11);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
      mountRef.current?.appendChild(renderer.domElement);

      buildScene(THREE);
      buildPhotos(THREE);
      setupControls(THREE);
      animate(THREE);
    };

    const buildScene = (T) => {
      const RW = 22, RL = 34, RH = 5.5;

      // ── MATERIALS ──────────────────────────────────────────────
      // Walls: warm off-white with subtle color panels
      const wallBase  = new T.MeshStandardMaterial({ color: 0xf2ede4, roughness: 0.92 });
      const wallAccL  = new T.MeshStandardMaterial({ color: 0xe8ddd0, roughness: 0.9 }); // left wing - warm sand
      const wallAccR  = new T.MeshStandardMaterial({ color: 0xdde8e0, roughness: 0.9 }); // right wing - soft sage
      const wallBack  = new T.MeshStandardMaterial({ color: 0xe0e4ec, roughness: 0.9 }); // back wall - cool mist
      const floorMat  = new T.MeshStandardMaterial({ color: 0xd6cfc4, roughness: 0.55, metalness: 0.05 });
      const floorDark = new T.MeshStandardMaterial({ color: 0xc8c0b4, roughness: 0.6 });
      const ceilMat   = new T.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.98 });
      const moldMat   = new T.MeshStandardMaterial({ color: 0xcfc5b5, roughness: 0.55, metalness: 0.1 });

      const box = (w, h, d, mat, px, py, pz, ry = 0) => {
        const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
        m.position.set(px, py, pz);
        m.rotation.y = ry;
        m.receiveShadow = true;
        m.castShadow = true;
        scene.add(m);
        return m;
      };

      // ── ROOM SHELL ──────────────────────────────────────────────
      box(RW, 0.3, RL, floorMat, 0, -0.15, 0);
      box(RW, 0.2, RL, ceilMat,  0, RH, 0);

      // Walls with individual color tints
      box(0.25, RH, RL, wallAccL, -RW / 2, RH / 2, 0);   // left - warm sand
      box(0.25, RH, RL, wallAccR,  RW / 2, RH / 2, 0);   // right - sage
      box(RW, RH, 0.25, wallBack,  0, RH / 2, -RL / 2);  // far back - cool mist
      box(RW, RH, 0.25, wallBase,  0, RH / 2,  RL / 2);  // entrance

      // Colored wall panels behind artwork zones (makes artwork pop!)
      const panelColors = [
        new T.MeshStandardMaterial({ color: 0xfff0e8, roughness: 0.92 }), // peach
        new T.MeshStandardMaterial({ color: 0xe8f0ff, roughness: 0.92 }), // sky blue
        new T.MeshStandardMaterial({ color: 0xf0ffe8, roughness: 0.92 }), // mint
        new T.MeshStandardMaterial({ color: 0xfff8e8, roughness: 0.92 }), // cream
      ];
      // Left wall panels
      [-10, -4, 4, 10].forEach((pz, i) => {
        box(0.04, 3.5, 3.2, panelColors[i % 4], -RW / 2 + 0.16, 2.3, pz);
      });
      // Right wall panels
      [-10, -4, 4, 10].forEach((pz, i) => {
        box(0.04, 3.5, 3.2, panelColors[(i+2) % 4], RW / 2 - 0.16, 2.3, pz);
      });

      // Dividers
      box(0.25, RH, 7, wallBase, -5.5, RH / 2, -6);
      box(0.25, RH, 7, wallBase,  5.5, RH / 2, -6);
      box(0.25, RH, 7, wallBase, -5.5, RH / 2,  6);
      box(0.25, RH, 7, wallBase,  5.5, RH / 2,  6);

      // ── FLOOR TILES ─────────────────────────────────────────────
      // Herringbone-style grid pattern
      for (let xi = -10; xi <= 10; xi += 2) {
        for (let zi = -16; zi <= 16; zi += 2) {
          const tMat = ((Math.floor(xi/2) + Math.floor(zi/2)) % 2 === 0) ? floorMat : floorDark;
          const tile = new T.Mesh(new T.BoxGeometry(1.94, 0.04, 1.94), tMat);
          tile.position.set(xi, -0.01, zi);
          tile.receiveShadow = true;
          scene.add(tile);
        }
      }
      // Narrow grout lines handled by gap between tiles

      // ── BASEBOARDS & CROWN MOLDING ──────────────────────────────
      const bMat = new T.MeshStandardMaterial({ color: 0xddd5c8, roughness: 0.55 });
      box(RW, 0.22, 0.14, bMat, 0, 0.11, -RL/2+0.18);
      box(RW, 0.22, 0.14, bMat, 0, 0.11,  RL/2-0.18);
      box(RL, 0.22, 0.14, bMat, -RW/2+0.18, 0.11, 0, Math.PI/2);
      box(RL, 0.22, 0.14, bMat,  RW/2-0.18, 0.11, 0, Math.PI/2);

      box(RW, 0.2, 0.14, moldMat, 0, RH-0.1, -RL/2+0.18);
      box(RW, 0.2, 0.14, moldMat, 0, RH-0.1,  RL/2-0.18);
      box(RL, 0.2, 0.14, moldMat, -RW/2+0.18, RH-0.1, 0, Math.PI/2);
      box(RL, 0.2, 0.14, moldMat,  RW/2-0.18, RH-0.1, 0, Math.PI/2);

      // ── BENCHES ─────────────────────────────────────────────────
      const seatMat = new T.MeshStandardMaterial({ color: 0xc8aa6e, roughness: 0.65, metalness: 0.05 });
      const legMat  = new T.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.3, metalness: 0.8 });
      [[0,0],[0,-12],[0,12],[-8,0],[8,0]].forEach(([bx,bz]) => {
        const g = new T.Group();
        g.position.set(bx, 0, bz);
        // Seat
        const seat = new T.Mesh(new T.BoxGeometry(1.9, 0.1, 0.58), seatMat);
        seat.position.y = 0.46; seat.castShadow=true; seat.receiveShadow=true;
        g.add(seat);
        // Legs — flat rectangular steel
        [[-0.75,-0.22],[0.75,-0.22],[-0.75,0.22],[0.75,0.22]].forEach(([lx,lz]) => {
          const leg = new T.Mesh(new T.BoxGeometry(0.07, 0.46, 0.07), legMat);
          leg.position.set(lx, 0.23, lz);
          leg.castShadow=true;
          g.add(leg);
        });
        // Stretcher bar
        const str = new T.Mesh(new T.BoxGeometry(1.6, 0.04, 0.04), legMat);
        str.position.set(0, 0.1, 0);
        g.add(str);
        scene.add(g);
      });

      // ── LIGHTING ────────────────────────────────────────────────
      // Soft ambient + hemisphere (no pure white — warm gallery)
      const ambient = new T.AmbientLight(0xfff5e8, 0.9);
      scene.add(ambient);
      const hem = new T.HemisphereLight(0xfff8f0, 0xd8d0c4, 0.6);
      scene.add(hem);

      // ── TRACK RAIL + SPOTLIGHTS ──────────────────────────────────
      const railMat = new T.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.2, metalness: 0.9 });
      const coneMat = new T.MeshStandardMaterial({ color: 0x1a1a25, roughness: 0.15, metalness: 0.95 });
      const glassMat= new T.MeshStandardMaterial({ color: 0xfffde0, roughness: 0, metalness: 0, emissive: 0xfffde0, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });

      // Three rails along the ceiling
      [-7, 0, 7].forEach(rx => {
        // Rail bar
        const rail = new T.Mesh(new T.BoxGeometry(0.06, 0.05, RL - 1), railMat);
        rail.position.set(rx, RH - 0.06, 0);
        scene.add(rail);

        // Spotlights along each rail
        [-10, -4, 4, 10].forEach(rz => {
          const spotGroup = new T.Group();
          spotGroup.position.set(rx, RH - 0.06, rz);

          // Arm (drops from rail)
          const arm = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.22, 8), railMat);
          arm.position.y = -0.11;
          spotGroup.add(arm);

          // Housing cone
          const housing = new T.Mesh(new T.CylinderGeometry(0.04, 0.1, 0.22, 16, 1, true), coneMat);
          housing.position.y = -0.32;
          housing.rotation.x = 0;
          spotGroup.add(housing);

          // Top cap
          const cap = new T.Mesh(new T.CircleGeometry(0.04, 16), coneMat);
          cap.position.y = -0.21;
          cap.rotation.x = Math.PI / 2;
          spotGroup.add(cap);

          // Glowing lens at bottom
          const lens = new T.Mesh(new T.CircleGeometry(0.072, 20), glassMat);
          lens.position.y = -0.435;
          lens.rotation.x = Math.PI / 2;
          spotGroup.add(lens);

          // Knuckle/joint ball
          const knuckle = new T.Mesh(new T.SphereGeometry(0.025, 12, 12), railMat);
          knuckle.position.y = -0.22;
          spotGroup.add(knuckle);

          scene.add(spotGroup);

          // Actual light
          const spot = new T.SpotLight(0xfff8e8, 2.2, 11, Math.PI / 7, 0.35, 1.8);
          spot.position.set(rx, RH - 0.44, rz);
          spot.target.position.set(rx, 0, rz);
          spot.castShadow = true;
          spot.shadow.mapSize.set(256, 256);
          scene.add(spot); scene.add(spot.target);
        });
      });
    };

    const FRAME_COLORS = [
      0xff6b6b, 0x4ecdc4, 0xa78bfa, 0xfbbf24,
      0x60a5fa, 0x34d399, 0xf97316, 0xe879f9,
      0x2dd4bf, 0xfb7185, 0x818cf8, 0xa3e635,
      0xf59e0b, 0x38bdf8, 0xc084fc,
    ];

    const WALL_POSITIONS = [
      [-11, 0, -10, 0], [-11, 0, -4, 0], [-11, 0, 4, 0], [-11, 0, 10, 0],
      [11, 0, -10, Math.PI], [11, 0, -4, Math.PI], [11, 0, 4, Math.PI], [11, 0, 10, Math.PI],
      [0, 0, -17, Math.PI / 2], [-4, 0, -17, Math.PI / 2], [4, 0, -17, Math.PI / 2],
      [-8, 0, 0, Math.PI / 2], [8, 0, 0, -Math.PI / 2],
      [-4, 0, -9.5, Math.PI / 2], [4, 0, -9.5, -Math.PI / 2],
    ];

    const buildPhotos = (T) => {
      const allPhotos = photos.length > 0 ? photos : [];

      WALL_POSITIONS.forEach(([wx, , wz, ry], i) => {
        const ph = allPhotos[i];
        const group = new T.Group();

        const offX = Math.abs(ry) < 0.1 ? (wx < 0 ? 0.15 : -0.15) : 0;
        const offZ = Math.abs(ry) > 0.1 ? (wz < 0 ? 0.15 : -0.15) : 0;
        group.position.set(wx + offX, 2.3, wz + offZ);
        group.rotation.y = ry;

        const pw = 2.0, pHeight = 1.5;
        const frameColor = FRAME_COLORS[i % FRAME_COLORS.length];

        // Frame — 4 separate bars for depth & realism
        const frameMat = new T.MeshStandardMaterial({
          color: frameColor, roughness: 0.22, metalness: 0.6
        });
        const barW = 0.18, fD = 0.13;
        const bTop = new T.Mesh(new T.BoxGeometry(pw + barW*2, barW, fD), frameMat);
        bTop.position.set(0,  pHeight/2 + barW/2, 0); group.add(bTop);
        const bBot = new T.Mesh(new T.BoxGeometry(pw + barW*2, barW, fD), frameMat);
        bBot.position.set(0, -pHeight/2 - barW/2, 0); group.add(bBot);
        const bLft = new T.Mesh(new T.BoxGeometry(barW, pHeight, fD), frameMat);
        bLft.position.set(-pw/2 - barW/2, 0, 0); group.add(bLft);
        const bRgt = new T.Mesh(new T.BoxGeometry(barW, pHeight, fD), frameMat);
        bRgt.position.set( pw/2 + barW/2, 0, 0); group.add(bRgt);

        // Inner white mat (passepartout)
        const matMat = new T.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.95 });
        const matMesh = new T.Mesh(new T.PlaneGeometry(pw + 0.1, pHeight + 0.1), matMat);
        matMesh.position.z = 0.068;
        group.add(matMesh);

        // Photo canvas or placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 384;
        const ctx = canvas.getContext('2d');

        if (ph?.image_url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 512, 384);
            tex.needsUpdate = true;
          };
          img.src = ph.image_url;
          ctx.fillStyle = '#f0ebe0';
          ctx.fillRect(0, 0, 512, 384);
        } else {
          // Placeholder — colorful abstract
          const c = '#' + frameColor.toString(16).padStart(6, '0');
          const g1 = ctx.createLinearGradient(0, 0, 512, 384);
          g1.addColorStop(0, c + '55');
          g1.addColorStop(1, c + 'aa');
          ctx.fillStyle = '#faf8f4'; ctx.fillRect(0, 0, 512, 384);
          ctx.fillStyle = g1; ctx.fillRect(0, 0, 512, 384);

          ctx.strokeStyle = c;
          ctx.lineWidth = 1;
          for (let j = 0; j < 8; j++) {
            ctx.beginPath();
            ctx.arc(
              Math.random() * 512, Math.random() * 384,
              30 + Math.random() * 80, 0, Math.PI * 2
            );
            ctx.globalAlpha = 0.2 + Math.random() * 0.3;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#00000022';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+ أضف صورة', 256, 200);
        }

        const tex = new T.CanvasTexture(canvas);
        const photoMesh = new T.Mesh(
          new T.PlaneGeometry(pw, pHeight),
          new T.MeshStandardMaterial({ map: tex, roughness: 0.85 })
        );
        photoMesh.position.z = 0.045;
        group.add(photoMesh);

        // ── PICTURE LIGHT (brass gallery lamp) ──
        const brassMat = new T.MeshStandardMaterial({ color: 0xc8a84a, roughness: 0.2, metalness: 0.85 });
        const shadeM   = new T.MeshStandardMaterial({ color: 0x1a1820, roughness: 0.3, metalness: 0.7 });
        const glowM    = new T.MeshStandardMaterial({ color: 0xfffacc, roughness: 0, metalness: 0, emissive: 0xfffacc, emissiveIntensity: 1.2 });

        const lampG = new T.Group();
        lampG.position.set(0, pHeight/2 + 0.22, 0.14);

        // Mounting backplate
        const backplate = new T.Mesh(new T.BoxGeometry(pw*0.55, 0.06, 0.05), brassMat);
        lampG.add(backplate);

        // Arm extending out
        const arm = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.18, 8), brassMat);
        arm.rotation.x = Math.PI/2;
        arm.position.z = 0.09;
        lampG.add(arm);

        // Shade (half-cylinder) — opens downward
        const shadeGeo = new T.CylinderGeometry(0.055, 0.085, pw*0.48, 16, 1, true, 0, Math.PI);
        const shade = new T.Mesh(shadeGeo, shadeM);
        shade.rotation.x = -Math.PI/2;  // open side faces down
        shade.position.z = 0.18;
        lampG.add(shade);

        // Shade top cap
        const shadeCap = new T.Mesh(new T.PlaneGeometry(pw*0.48, 0.11), shadeM);
        shadeCap.position.z = 0.18;
        lampG.add(shadeCap);

        // Inner glow strip (visible from below)
        const glow = new T.Mesh(new T.PlaneGeometry(pw*0.42, 0.065), glowM);
        glow.rotation.x = Math.PI/2;
        glow.position.y = -0.055;
        glow.position.z = 0.18;
        lampG.add(glow);

        group.add(lampG);

        // Actual SpotLight from lamp
        const picLight = new T.SpotLight(
          ph ? 0xfff8d8 : 0xf5f0e0,
          ph ? 2.8 : 1.0,
          6, Math.PI / 8, 0.3, 2
        );
        picLight.position.set(0, pHeight/2 + 0.3, 0.3);
        picLight.target.position.set(0, -0.5, 0);
        group.add(picLight); group.add(picLight.target);

        group.userData = {
          title: ph?.title || '',
          sub: ph?.subtitle || '',
          hasPhoto: !!ph
        };

        scene.add(group);
        if (ph) photoMeshes.push(group);
      });
    };

    const setupControls = (T) => {
      document.addEventListener('keydown', e => { keys[e.code] = true; });
      document.addEventListener('keyup', e => { keys[e.code] = false; });

      renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
      });

      document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === renderer.domElement;
        setLocked(isLocked);
      });

      document.addEventListener('mousemove', e => {
        if (!isLocked) return;
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-1.1, Math.min(1.1, pitch));
      });
    };

    const raycaster_obj = { setFromCamera: null };

    const animate = (T) => {
      const raycaster = new T.Raycaster();
      const clock = new T.Clock();

      const loop = () => {
        animId = requestAnimationFrame(loop);
        const dt = Math.min(clock.getDelta(), 0.05);

        if (isLocked) {
          const speed = keys['ShiftLeft'] ? 7 : 4;
          const fw = new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
          const rt = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
          const move = new T.Vector3();
          if (keys['KeyW'] || keys['ArrowUp'])    move.addScaledVector(fw, speed * dt);
          if (keys['KeyS'] || keys['ArrowDown'])  move.addScaledVector(fw, -speed * dt);
          if (keys['KeyA'] || keys['ArrowLeft'])  move.addScaledVector(rt, -speed * dt);
          if (keys['KeyD'] || keys['ArrowRight']) move.addScaledVector(rt, speed * dt);

          camera.position.add(move);
          camera.position.x = Math.max(-10.5, Math.min(10.5, camera.position.x));
          camera.position.z = Math.max(-16.5, Math.min(16.5, camera.position.z));
          camera.position.y = 1.7;

          camera.rotation.order = 'YXZ';
          camera.rotation.y = yaw;
          camera.rotation.x = pitch;

          // Raycast photo info
          raycaster.setFromCamera({ x: 0, y: 0 }, camera);
          const hits = raycaster.intersectObjects(photoMeshes, true);
          if (hits.length && hits[0].distance < 5) {
            const p = hits[0].object.parent;
            if (p?.userData?.hasPhoto) {
              setPhotoInfo({ title: p.userData.title, sub: p.userData.sub });
            } else {
              setPhotoInfo(null);
            }
          } else {
            setPhotoInfo(null);
          }
        }

        renderer.render(scene, camera);
      };
      loop();
    };

    init();

    const onResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      document.exitPointerLock?.();
      renderer?.dispose();
      mountRef.current?.removeChild?.(renderer?.domElement);
    };
  }, [entered, photos]);

  return (
    <>
      <Head>
        <title>معرض الفن الافتراضي</title>
        <meta name="description" content="تجول في معرض الصور ثلاثي الأبعاد" />
      </Head>

      <div ref={mountRef} style={{ width: '100vw', height: '100vh', background: '#faf8f4' }} />

      {/* ENTRY OVERLAY */}
      {!entered && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'linear-gradient(135deg, #faf8f4 0%, #f0ebe0 50%, #e8e0d4 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, fontFamily: 'Segoe UI, Tahoma, sans-serif',
        }}>
          {/* Decorative circles */}
          {[['#ff6b6b', -320, -200, 380], ['#4ecdc4', 300, 180, 280], ['#a78bfa', -200, 250, 200],
            ['#fbbf24', 280, -280, 220], ['#60a5fa', 0, -300, 150]].map(([c, x, y, s], i) => (
            <div key={i} style={{
              position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`,
              width: s, height: s, borderRadius: '50%',
              background: c, opacity: 0.12, transform: 'translate(-50%,-50%)',
              filter: 'blur(2px)',
            }} />
          ))}

          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{
              display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20,
            }}>
              {['#ff6b6b', '#fbbf24', '#4ecdc4', '#a78bfa', '#60a5fa'].map((c, i) => (
                <div key={i} style={{
                  width: 12, height: 12, borderRadius: '50%', background: c,
                }} />
              ))}
            </div>

            <h1 style={{
              fontSize: '3.5rem', fontWeight: 200, letterSpacing: '0.25em',
              color: '#1a1a2e', marginBottom: 8, lineHeight: 1,
            }}>
              GALLERY
            </h1>
            <p style={{
              fontSize: '1rem', color: '#6b7280', letterSpacing: '0.3em',
              marginBottom: 12, fontWeight: 300,
            }}>
              معرض الفوتوغرافيا الافتراضي
            </p>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: 40 }}>
              {photos.length} صورة معروضة
            </p>

            <button
              onClick={() => setEntered(true)}
              style={{
                background: '#1a1a2e', color: '#faf8f4',
                border: 'none', padding: '16px 56px',
                fontSize: '1rem', letterSpacing: '0.2em',
                cursor: 'pointer', borderRadius: 4,
                transition: 'all 0.3s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.target.style.background = '#ff6b6b'}
              onMouseLeave={e => e.target.style.background = '#1a1a2e'}
            >
              دخول المعرض →
            </button>

            <div style={{
              marginTop: 36, display: 'flex', gap: 20, justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {[['W A S D', 'التحرك'], ['ماوس', 'النظر'], ['Shift', 'جري'], ['ESC', 'إيقاف']].map(([k, l]) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{
                    background: '#fff', border: '1px solid #e0d8d0',
                    borderRadius: 6, padding: '6px 14px',
                    fontSize: '0.8rem', color: '#1a1a2e',
                    fontFamily: 'monospace', marginBottom: 4,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  }}>{k}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <a href="/admin/login" style={{
            position: 'absolute', bottom: 28, right: 28,
            fontSize: '0.75rem', color: '#d1cbc2', letterSpacing: '0.1em',
            borderBottom: '1px solid #d1cbc2', paddingBottom: 2,
          }}>
            لوحة الإدارة
          </a>
        </div>
      )}

      {/* CROSSHAIR */}
      {entered && locked && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 20, height: 20, pointerEvents: 'none', zIndex: 50,
        }}>
          <div style={{ position: 'absolute', width: 2, height: 20, background: 'rgba(26,26,46,0.5)', left: 9, top: 0 }} />
          <div style={{ position: 'absolute', width: 20, height: 2, background: 'rgba(26,26,46,0.5)', left: 0, top: 9 }} />
        </div>
      )}

      {/* PHOTO INFO */}
      {entered && photoInfo && (
        <div style={{
          position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center', pointerEvents: 'none', zIndex: 50,
          animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ fontSize: '1.1rem', color: '#1a1a2e', fontWeight: 500, marginBottom: 4 }}>
            {photoInfo.title}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', letterSpacing: '0.15em' }}>
            {photoInfo.sub}
          </div>
        </div>
      )}

      {/* HUD */}
      {entered && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          fontSize: '0.72rem', color: 'rgba(26,26,46,0.35)', letterSpacing: '0.15em',
          pointerEvents: 'none', zIndex: 50,
        }}>
          {locked ? 'اضغط ESC للتوقف · انقر للتحكم' : 'انقر على المشهد للتحكم بالكاميرا'}
        </div>
      )}

      {/* EXIT BUTTON */}
      {entered && (
        <button
          onClick={() => { document.exitPointerLock?.(); setEntered(false); setLocked(false); }}
          style={{
            position: 'fixed', top: 20, right: 20, zIndex: 50,
            background: 'rgba(255,255,255,0.9)', border: '1px solid #e0d8d0',
            color: '#1a1a2e', padding: '8px 20px', cursor: 'pointer',
            fontSize: '0.78rem', letterSpacing: '0.1em', borderRadius: 4,
            backdropFilter: 'blur(4px)',
          }}
        >
          ← خروج
        </button>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform: translateX(-50%) translateY(8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>
    </>
  );
}

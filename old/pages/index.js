import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    fetch('/api/photos')
      .then((res) => {
        if (!res.ok) throw new Error('فشل جلب الصور من الخادم');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formattedPhotos = data.map((p) => ({
            title: p.title || 'لوحة فنية',
            url: p.image_url || p.url,
            ph: p.photographer || 'مصور المعرض',
            cam: p.camera || 'Canon EOS R5',
            yr: p.year || '2025',
            loc: p.location || 'الطائف'
          }));
          setPhotos(formattedPhotos);
        } else {
          useDefaultPhotos();
        }
      })
      .catch((err) => {
        console.log('استخدام الصور الافتراضية لخطأ في الـ API:', err);
        useDefaultPhotos();
      });

    function useDefaultPhotos() {
      setPhotos([
        { title: 'غروب الطائف', url: 'https://picsum.photos/seed/taif1/900/600', ph: 'أنور محمد', cam: 'Canon EOS R5', yr: '2025', loc: 'الشفا' },
        { title: 'شفا الطائف', url: 'https://picsum.photos/seed/taif2/900/600', ph: 'عدنان الخمري', cam: 'Sony A7IV', yr: '2025', loc: 'الطائف' },
        { title: 'ورود الطائف', url: 'https://picsum.photos/seed/taif3/900/600', ph: 'أنور محمد', cam: 'Canon EOS R5', yr: '2024', loc: 'الهدا' },
        { title: 'التراث القديم', url: 'https://picsum.photos/seed/taif4/900/600', ph: 'فيصل الخديدي', cam: 'Nikon Z8', yr: '2025', loc: 'البلد' },
        { title: 'جبال الهدا', url: 'https://picsum.photos/seed/taif5/900/600', ph: 'أنور محمد', cam: 'Canon EOS R5', yr: '2024', loc: 'الهدا' },
        { title: 'ليالي الطائف', url: 'https://picsum.photos/seed/taif6/900/600', ph: 'عدنان الخمري', cam: 'Sony A7IV', yr: '2025', loc: 'الطائف' }
      ]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || photos.length === 0) return;

    let disposed = false;
    let cleanupFn = null;

    if (!window.THREE) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = () => { if (!disposed) cleanupFn = initGallery(photos); };
      document.body.appendChild(script);
    } else {
      cleanupFn = initGallery(photos);
    }

    return () => {
      disposed = true;
      if (cleanupFn) cleanupFn();
    };

    function initGallery(activePhotos) {
      'use strict';
      const EYE_HEIGHT = 1.6;
      const SHOW_DIST = 3.5;

      const SLOTS = [
        { pos: [-4.6, EYE_HEIGHT, -10], rotY: Math.PI / 2 },
        { pos: [-4.6, EYE_HEIGHT, -5], rotY: Math.PI / 2 },
        { pos: [-4.6, EYE_HEIGHT, 0], rotY: Math.PI / 2 },
        { pos: [-4.6, EYE_HEIGHT, 5], rotY: Math.PI / 2 },
        { pos: [4.6, EYE_HEIGHT, -10], rotY: -Math.PI / 2 },
        { pos: [4.6, EYE_HEIGHT, -5], rotY: -Math.PI / 2 },
        { pos: [4.6, EYE_HEIGHT, 0], rotY: -Math.PI / 2 },
        { pos: [4.6, EYE_HEIGHT, 5], rotY: -Math.PI / 2 },
        { pos: [-6, EYE_HEIGHT, -14.4], rotY: 0 },
        { pos: [0, EYE_HEIGHT, -14.4], rotY: 0 },
        { pos: [6, EYE_HEIGHT, -14.4], rotY: 0 }
      ];

      function createWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#3a2517';
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 512; i += 32) {
          ctx.fillStyle = (i % 64 === 0) ? '#2d1c11' : '#452d1d';
          ctx.fillRect(0, i, 512, 30);
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(0, i + 30, 512, 2);
        }
        return new window.THREE.CanvasTexture(canvas);
      }

      function createWallTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#e8e3dc';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 500; i++) {
          ctx.fillStyle = 'rgba(0,0,0,0.015)';
          ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        return new window.THREE.CanvasTexture(canvas);
      }

      const state = {
        yaw: 0, pitch: 0,
        keys: { w: false, s: false, a: false, d: false },
        joy: { a: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 },
        look: { a: false, id: null, lx: 0, ly: 0 },
        mouseLook: false,
        lastMouseX: 0,
        lastMouseY: 0,
        mouse: { downX: 0, downY: 0, moved: false, downTime: 0 },
        tap: {}
      };

      let scene, camera, renderer, hitGroups = [], fullscreenOpen = false, panelTarget = null, rafId = null;

      const host = document.getElementById('canvasHost');
      if (!host) return () => {};
      host.innerHTML = '';

      scene = new window.THREE.Scene();
      scene.background = new window.THREE.Color(0x141210);
      camera = new window.THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, EYE_HEIGHT, 14);
      camera.rotation.order = 'YXZ';

      renderer = new window.THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = window.THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      scene.add(new window.THREE.AmbientLight(0xfff5ea, 0.7));

      const woodTex = createWoodTexture();
      woodTex.wrapS = woodTex.wrapT = window.THREE.RepeatWrapping;
      woodTex.repeat.set(8, 8);
      const floorMat = new window.THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.3, metalness: 0.1 });
      const floor = new window.THREE.Mesh(new window.THREE.PlaneGeometry(50, 50), floorMat);
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      const wallTex = createWallTexture();
      wallTex.wrapS = wallTex.wrapT = window.THREE.RepeatWrapping;
      wallTex.repeat.set(4, 2);
      const wallMat = new window.THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8 });

      function addWall(w, h, d, x, y, z) {
        const m = new window.THREE.Mesh(new window.THREE.BoxGeometry(w, h, d), wallMat);
        m.position.set(x, y, z);
        scene.add(m);
      }

      addWall(30, 6, 0.6, 0, 3, -15);
      addWall(0.6, 6, 30, -10, 3, 0);
      addWall(0.6, 6, 30, 10, 3, 0);
      addWall(0.5, 6, 20, -5, 3, 0);
      addWall(0.5, 6, 20, 5, 3, 0);

      const loader = new window.THREE.TextureLoader();

      activePhotos.forEach((ph, i) => {
        const slot = SLOTS[i];
        if (!slot) return;
        const g = new window.THREE.Group();
        g.position.set(slot.pos[0], EYE_HEIGHT, slot.pos[2]);
        g.rotation.y = slot.rotY;
        g.userData = ph;

        const imgMesh = new window.THREE.Mesh(
          new window.THREE.PlaneGeometry(2.4, 1.6),
          new window.THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        imgMesh.position.z = 0.15;
        g.add(imgMesh);

        const frame = new window.THREE.Mesh(
          new window.THREE.BoxGeometry(2.55, 1.75, 0.08),
          new window.THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })
        );
        frame.position.z = 0.1;
        g.add(frame);

        const spot = new window.THREE.SpotLight(0xffeedd, 1.4, 6, Math.PI / 6, 0.5);
        spot.position.set(slot.pos[0], EYE_HEIGHT + 1.5, slot.pos[2] + (slot.rotY === 0 ? 1 : -1));
        spot.target = g;
        scene.add(spot);

        scene.add(g);
        hitGroups.push(g);

        loader.load(ph.url, (t) => {
          t.colorSpace = window.THREE.SRGBColorSpace;
          imgMesh.material = new window.THREE.MeshBasicMaterial({ map: t });
        });
      });

      // --- لوحة المفاتيح ---
      function onKeyDown(e) {
        if (fullscreenOpen) return;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') state.keys.w = true;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') state.keys.s = true;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') state.keys.a = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') state.keys.d = true;
      }
      function onKeyUp(e) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') state.keys.w = false;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') state.keys.s = false;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') state.keys.a = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') state.keys.d = false;
      }
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // --- تحكم الماوس: سحب للنظر، ونقرة حقيقية (بدون سحب) لفتح الصورة ---
      // الإصلاح الأساسي: كان حدث "click" العام يطلق عند كل تحرير زر الماوس
      // حتى لو كانت حركة سحب للنظر حول الغرفة، فكان يفتح الصورة بشكل غير
      // مقصود كل مرة يقترب فيها الزائر من لوحة وينظر حولها، فيتجمّد التحكم.
      function onMouseDown(e) {
        if (fullscreenOpen) return;
        state.mouseLook = true;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
        state.mouse.downX = e.clientX;
        state.mouse.downY = e.clientY;
        state.mouse.moved = false;
        state.mouse.downTime = Date.now();
      }
      function onMouseMove(e) {
        if (!state.mouseLook || fullscreenOpen) return;
        const dx = e.clientX - state.lastMouseX;
        const dy = e.clientY - state.lastMouseY;
        if (Math.hypot(e.clientX - state.mouse.downX, e.clientY - state.mouse.downY) > 6) {
          state.mouse.moved = true;
        }
        state.yaw -= dx * 0.003;
        state.pitch -= dy * 0.003;
        state.pitch = Math.max(-1, Math.min(1, state.pitch));
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
      }
      function onMouseUp(e) {
        const wasLooking = state.mouseLook;
        state.mouseLook = false;
        if (wasLooking && !fullscreenOpen && !state.mouse.moved && (Date.now() - state.mouse.downTime) < 500) {
          triggerRaycast(e.clientX, e.clientY);
        }
      }
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      // --- تحكم اللمس (الجوالات) ---
      const joyZone = document.getElementById('joyZone');
      const joyKnob = document.getElementById('joyKnob');

      function onTouchStart(e) {
        for (const t of e.changedTouches) {
          if (t.clientX < window.innerWidth * 0.45 && !state.joy.a) {
            state.joy.a = true;
            state.joy.id = t.identifier;
            if (joyZone) {
              const r = joyZone.getBoundingClientRect();
              state.joy.cx = r.left + r.width / 2;
              state.joy.cy = r.top + r.height / 2;
            }
          } else if (!state.look.a) {
            state.look.a = true;
            state.look.id = t.identifier;
            state.look.lx = t.clientX;
            state.look.ly = t.clientY;
          }
          state.tap[t.identifier] = { x: t.clientX, y: t.clientY, moved: false };
        }
      }
      function onTouchMove(e) {
        for (const t of e.changedTouches) {
          const tp = state.tap[t.identifier];
          if (tp && Math.hypot(t.clientX - tp.x, t.clientY - tp.y) > 8) tp.moved = true;
          if (state.joy.a && t.identifier === state.joy.id) {
            let dx = t.clientX - state.joy.cx, dy = t.clientY - state.joy.cy;
            const max = 40, len = Math.hypot(dx, dy);
            if (len > max) { dx = dx / len * max; dy = dy / len * max; }
            state.joy.dx = dx / max;
            state.joy.dy = dy / max;
            if (joyKnob) {
              joyKnob.style.left = (31 + dx) + 'px';
              joyKnob.style.top = (31 + dy) + 'px';
            }
          }
          if (state.look.a && t.identifier === state.look.id) {
            state.yaw -= (t.clientX - state.look.lx) * 0.0035;
            state.pitch -= (t.clientY - state.look.ly) * 0.0035;
            state.pitch = Math.max(-1, Math.min(1, state.pitch));
            state.look.lx = t.clientX;
            state.look.ly = t.clientY;
          }
        }
      }
      function onTouchEnd(e) {
        for (const t of e.changedTouches) {
          const tp = state.tap[t.identifier];
          if (tp && !tp.moved && !fullscreenOpen) {
            triggerRaycast(t.clientX, t.clientY);
          }
          delete state.tap[t.identifier];
          if (state.joy.a && t.identifier === state.joy.id) {
            state.joy.a = false;
            state.joy.dx = 0; state.joy.dy = 0;
            if (joyKnob) {
              joyKnob.style.left = '31px';
              joyKnob.style.top = '31px';
            }
          }
          if (state.look.a && t.identifier === state.look.id) state.look.a = false;
        }
      }
      renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
      renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
      renderer.domElement.addEventListener('touchend', onTouchEnd);

      function triggerRaycast(clientX, clientY) {
        const ray = new window.THREE.Raycaster();
        const ndc = new window.THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(hitGroups, true);
        if (hits.length) {
          let o = hits[0].object;
          while (o && !o.userData.title) o = o.parent;
          if (o && o.userData.title) openFS(o.userData);
        }
      }

      function openFS(d) {
        fullscreenOpen = true;
        const fsOverlay = document.getElementById('fsOverlay');
        const fsImg = document.getElementById('fsImg');
        const fsTitle = document.getElementById('fsTitle');
        const fsMeta = document.getElementById('fsMeta');
        if (fsOverlay && fsImg) {
          fsImg.src = d.url;
          fsTitle.textContent = d.title;
          fsMeta.textContent = `${d.ph} • ${d.cam} • ${d.yr}`;
          fsOverlay.classList.add('open');
        }
      }

      // الإصلاح الثاني: دالة الإغلاق يجب أن تعيش هنا داخل نفس النطاق
      // (closure) الذي يملك متغير fullscreenOpen، لأن زر "رجوع" في React
      // كان يغيّر فقط شكل العنصر (class) دون الوصول لهذا المتغير، فيبقى
      // fullscreenOpen = true للأبد وتتعطل الحركة ولوحة المعلومات نهائياً.
      function closeFS() {
        fullscreenOpen = false;
        const fsOverlay = document.getElementById('fsOverlay');
        if (fsOverlay) fsOverlay.classList.remove('open');
      }

      const fsBackBtn = document.getElementById('fsBackBtn');
      const fsOverlayEl = document.getElementById('fsOverlay');
      function onFsBackClick(e) { e.stopPropagation(); closeFS(); }
      function onFsOverlayClick(e) { if (e.target === fsOverlayEl) closeFS(); }
      function onKeyDownEsc(e) { if (e.key === 'Escape' && fullscreenOpen) closeFS(); }
      if (fsBackBtn) fsBackBtn.addEventListener('click', onFsBackClick);
      if (fsOverlayEl) fsOverlayEl.addEventListener('click', onFsOverlayClick);
      window.addEventListener('keydown', onKeyDownEsc);

      function onResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
      window.addEventListener('resize', onResize);

      function animate() {
        rafId = requestAnimationFrame(animate);
        if (!camera) return;
        camera.rotation.y = state.yaw;
        camera.rotation.x = state.pitch;

        if (!fullscreenOpen) {
          // سرعة حركة بطيئة وواقعية
          const speed = 0.04;

          const camDir = new window.THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
          const sideDir = new window.THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));

          let displacement = new window.THREE.Vector3(0, 0, 0);
          let hasKeyMove = false;
          if (state.keys.w) { displacement.addScaledVector(camDir, speed); hasKeyMove = true; }
          if (state.keys.s) { displacement.addScaledVector(camDir, -speed); hasKeyMove = true; }
          if (state.keys.a) { displacement.addScaledVector(sideDir, speed); hasKeyMove = true; }
          if (state.keys.d) { displacement.addScaledVector(sideDir, -speed); hasKeyMove = true; }
          if (hasKeyMove) camera.position.add(displacement);

          // حركة الجوستستيك للجوال
          if (state.joy.a) {
            const joyDir = new window.THREE.Vector3(state.joy.dx, 0, state.joy.dy).applyQuaternion(camera.quaternion);
            joyDir.y = 0;
            if (joyDir.lengthSq() > 0) joyDir.normalize();
            camera.position.addScaledVector(joyDir, 0.05);
          }

          // حدود الغرفة لمنع الخروج عن الجدران
          camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
          camera.position.z = Math.max(-14, Math.min(14, camera.position.z));

          let near = null, minDist = Infinity;
          for (const g of hitGroups) {
            const d = camera.position.distanceTo(g.position);
            if (d < minDist) { minDist = d; near = g; }
          }

          const infoGlass = document.getElementById('infoGlass');
          const infoTitle = document.getElementById('infoTitle');
          const infoPhotographer = document.getElementById('infoPhotographer');
          const infoCamera = document.getElementById('infoCamera');
          const infoYear = document.getElementById('infoYear');
          const infoLocation = document.getElementById('infoLocation');

          if (near && minDist <= SHOW_DIST) {
            if (panelTarget !== near.userData) {
              panelTarget = near.userData;
              if (infoTitle) infoTitle.textContent = near.userData.title;
              if (infoPhotographer) infoPhotographer.textContent = near.userData.ph;
              if (infoCamera) infoCamera.textContent = near.userData.cam;
              if (infoYear) infoYear.textContent = near.userData.yr;
              if (infoLocation) infoLocation.textContent = near.userData.loc;
            }
            if (infoGlass) infoGlass.classList.add('visible');
          } else {
            if (infoGlass) infoGlass.classList.remove('visible', 'expanded');
            panelTarget = null;
          }
        }
        renderer.render(scene, camera);
      }
      animate();

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('keydown', onKeyDownEsc);
        if (renderer) {
          renderer.domElement.removeEventListener('mousedown', onMouseDown);
          renderer.domElement.removeEventListener('touchstart', onTouchStart);
          renderer.domElement.removeEventListener('touchmove', onTouchMove);
          renderer.domElement.removeEventListener('touchend', onTouchEnd);
          renderer.dispose();
        }
        if (fsBackBtn) fsBackBtn.removeEventListener('click', onFsBackClick);
        if (fsOverlayEl) fsOverlayEl.removeEventListener('click', onFsOverlayClick);
        if (host) host.innerHTML = '';
      };
    }
  }, [photos]);

  const handleEnter = () => {
    const entry = document.getElementById('entryOverlay');
    const joyWrap = document.getElementById('joyWrap');
    const lookHint = document.getElementById('lookHintMobile');
    if (entry) entry.style.display = 'none';
    if (joyWrap) joyWrap.style.display = 'block';
    if (lookHint) lookHint.style.display = 'block';
  };

  const handleToggleGlass = (e) => {
    e.stopPropagation();
    const infoGlass = document.getElementById('infoGlass');
    if (infoGlass) infoGlass.classList.toggle('expanded');
  };

  return (
    <>
      <Head>
        <title>معرض الفوتوغرافيا الافتراضي — Modern Hall</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </Head>

      {/*
        الإصلاح الجوهري: هذا الـ <style> كان مفقوداً بالكامل من نسخة
        Next.js، لذلك كانت فئات visible / expanded / open لا تُحدث أي
        تغيير مرئي مهما بدّلها الكود — فلا تظهر لوحة المعلومات الزجاجية،
        ولا يظهر زر الرجوع من وضع ملء الشاشة (فيبقى المستخدم عالقاً).
      */}
      <style>{`
        html, body { user-select: none; -webkit-user-select: none; }
        #infoGlass.visible { opacity: 0.85 !important; pointer-events: auto !important; }
        #infoGlass.expanded { opacity: 1 !important; background: rgba(15,12,10,0.95) !important; border: 1px solid rgba(201,163,91,.5); }
        #infoGlass.expanded .info-hint { display: none !important; }
        #infoGlass:not(.expanded) .info-body { display: none !important; }
        #infoGlass.expanded .info-body { display: block !important; }
        #infoGlass .info-dot { animation: pulseDot 1.8s infinite; }
        @keyframes pulseDot {
          0% { box-shadow: 0 0 0 0 rgba(201,163,91,.6); }
          70% { box-shadow: 0 0 0 8px rgba(201,163,91,0); }
          100% { box-shadow: 0 0 0 0 rgba(201,163,91,0); }
        }
        #fsOverlay.open { display: flex !important; }
        #fsBackBtn:active { filter: brightness(1.15); }
      `}</style>

      <div id="canvasHost" style={{ position: 'fixed', inset: 0, touchAction: 'none' }}></div>

      {/* واجهة الدخول */}
      <div id="entryOverlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'radial-gradient(circle at 50% 30%, #201b17 0%, #080706 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eee' }}>
        <div style={{ textAlign: 'center', padding: '40px 36px', width: 'min(90vw, 420px)' }}>
          <div style={{ fontSize: '42px', color: '#c9a35b', marginBottom: '6px' }}>✦</div>
          <h1 style={{ fontSize: '22px', letterSpacing: '.25em', fontWeight: 300, color: '#f3efe8', marginBottom: '10px' }}>MODERN GALLERY</h1>
          <p style={{ color: '#9a9388', fontSize: '14px', lineHeight: 1.8, marginBottom: '28px' }}>
            معرض الفوتوغرافيا الافتراضي الحديث <br />جمعية الثقافة والفنون بالطائف
          </p>
          <button onClick={handleEnter} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #c9a35b, #9c7a3c)', color: '#1a1408', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
            دخول المعرض ←
          </button>
        </div>
      </div>

      {/* لوحة معلومات الصورة على اليمين */}
      <div className="info-glass" id="infoGlass" onClick={handleToggleGlass} style={{ position: 'fixed', top: '50%', right: '20px', transform: 'translateY(-50%)', width: '270px', maxWidth: '65vw', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '16px', zIndex: 250, color: '#f3efe8', opacity: 0, pointerEvents: 'none', transition: 'opacity .4s ease, background .3s ease' }}>
        <div className="info-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
          <span className="info-dot" style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#c9a35b', flexShrink: 0 }}></span>
          <span>اضغط لتفاصيل الصورة</span>
        </div>
        <div className="info-body" style={{ display: 'none', cursor: 'pointer' }}>
          <h3 id="infoTitle" style={{ fontSize: '16px', color: '#c9a35b', marginBottom: '10px', borderBottom: '1px solid rgba(201, 163, 91, .2)', paddingBottom: '5px' }}>—</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0' }}><span style={{ color: '#8f887c' }}>المصور:</span><span id="infoPhotographer">—</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0' }}><span style={{ color: '#8f887c' }}>الكاميرا:</span><span id="infoCamera">—</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0' }}><span style={{ color: '#8f887c' }}>السنة:</span><span id="infoYear">—</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0' }}><span style={{ color: '#8f887c' }}>الموقع:</span><span id="infoLocation">—</span></div>
        </div>
      </div>

      {/* شاشة العرض الكامل للصورة */}
      <div className="fs-overlay" id="fsOverlay" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0, 0, 0, .94)', display: 'none', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px' }}>
        <button id="fsBackBtn" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2100, background: 'rgba(201, 163, 91, .25)', color: '#f3efe8', border: '1px solid rgba(201, 163, 91, .5)', padding: '10px 20px', borderRadius: '30px', cursor: 'pointer' }}>
          ↩ رجوع للمعرض
        </button>
        <img id="fsImg" src="" alt="" style={{ maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px' }} />
        <div style={{ textAlign: 'center', marginTop: '16px', color: '#f3efe8' }}>
          <h2 id="fsTitle" style={{ fontSize: '19px', color: '#c9a35b', marginBottom: '4px' }}></h2>
          <p id="fsMeta" style={{ fontSize: '13px', color: '#a79f8f' }}></p>
        </div>
      </div>

      {/* أداة التحكم بالجوال (Joystick) */}
      <div id="joyWrap" style={{ position: 'fixed', left: '22px', bottom: '26px', zIndex: 300, display: 'none' }}>
        <div id="joyZone" style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255, 255, 255, .08)', border: '1px solid rgba(255, 255, 255, .18)', position: 'relative', touchAction: 'none' }}>
          <div id="joyKnob" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(201, 163, 91, .8)', position: 'absolute', top: '31px', left: '31px', pointerEvents: 'none' }}></div>
        </div>
      </div>

      <div id="lookHintMobile" style={{ position: 'fixed', right: '20px', bottom: '26px', zIndex: 300, display: 'none', color: 'rgba(255, 255, 255, .7)', fontSize: '12px', background: 'rgba(0, 0, 0, .5)', padding: '8px 12px', borderRadius: '8px', pointerEvents: 'none' }}>
        استخدم WASD أو الأسهم للتجول • اسحب بالماوس للنظر • انقر اللوحة للتكبير
      </div>
    </>
  );
}

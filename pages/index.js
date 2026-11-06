import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { DEFAULT_FRAMES, FRAME_STYLE, ROOM_WALLS, normalizeFrames, normalizeWalls, assignPhotosToFrames, prepareDisplayTexture, fitImage, makeEmptyFrameTexture } from '../lib/galleryLayout';

const PRESENCE_HEARTBEAT_MS = 20000;

export default function Home() {
  const [photos, setPhotos] = useState(null);   
  const [layout, setLayout] = useState(null);   
  const [visitorName, setVisitorName] = useState('');
  const [entering, setEntering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [presenceOpen, setPresenceOpen] = useState(false);
  const [presence, setPresence] = useState({ count: 0, names: [] });
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const presenceTimerRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    fetch('/api/photos')
      .then((res) => {
        if (!res.ok) throw new Error('فشل جلب الصور من الخادم');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const formattedPhotos = data.map((p) => ({
            title: p.title || 'لوحة فنية',
            url: p.image_url || p.url,
            ph: p.photographer || 'مصور المعرض',
            cam: p.camera || 'Canon EOS R5',
            yr: p.year || '2025',
            loc: p.location || 'الطائف',
            slot: p.slot_index || null
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

    fetch('/api/layout')
      .then((r) => r.json())
      .then((d) => {
        const frames = normalizeFrames(d && d.frames);
        const walls = normalizeWalls(d && d.walls);
        setLayout({
          frames: frames.length ? frames : DEFAULT_FRAMES,
          walls: walls && walls.length ? walls : null
        });
      })
      .catch(() => setLayout({ frames: DEFAULT_FRAMES, walls: null }));

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
    if (typeof window === 'undefined') return;
    setIsMobile(('ontouchstart' in window) || navigator.maxTouchPoints > 0);
    try {
      let sid = sessionStorage.getItem('gallery_session_id');
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('gallery_session_id', sid);
      }
      sessionIdRef.current = sid;
    } catch (e) {
      sessionIdRef.current = Math.random().toString(36).slice(2);
    }
    return () => { if (presenceTimerRef.current) clearInterval(presenceTimerRef.current); };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || photos === null || layout === null) return;

    let disposed = false;
    let cleanupFn = null;

    if (!window.THREE) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = () => { if (!disposed) cleanupFn = initGallery(photos, layout); };
      document.body.appendChild(script);
    } else {
      cleanupFn = initGallery(photos, layout);
    }

    return () => {
      disposed = true;
      if (cleanupFn) cleanupFn();
    };

    function initGallery(activePhotos, layoutData) {
      'use strict';
      const EYE_HEIGHT = 1.6;
      const SHOW_DIST = 3.5;   
      const OPEN_DIST = 2.0;   

      const frames = layoutData.frames || DEFAULT_FRAMES;
      const customWalls = layoutData.walls;

      const MAT_PADDING = FRAME_STYLE.PAD;       
      const FRAME_DEPTH = FRAME_STYLE.DEPTH;     
      const IMAGE_OFFSET = FRAME_STYLE.IMAGE_OFFSET; 

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

      let scene, camera, renderer, hitGroups = [], fullscreenOpen = false, panelTarget = null, rafId = null, paused = false;

      const host = document.getElementById('canvasHost');
      if (!host) return () => {};
      host.innerHTML = '';

      scene = new window.THREE.Scene();
      scene.background = new window.THREE.Color(0x141210);
      camera = new window.THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.05, 400);
      camera.position.set(0, EYE_HEIGHT, 14);
      camera.rotation.order = 'YXZ';

      renderer = new window.THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = window.THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      scene.add(new window.THREE.AmbientLight(0xfff5ea, 0.6));
      scene.add(new window.THREE.HemisphereLight(0xfff1de, 0x3a2a1c, 0.3));
      const sun = new window.THREE.DirectionalLight(0xfff0dd, 0.25);
      sun.position.set(6, 12, 8);
      scene.add(sun);

      const woodTex = createWoodTexture();
      woodTex.wrapS = woodTex.wrapT = window.THREE.RepeatWrapping;
      woodTex.repeat.set(8, 8);
      const floorMat = new window.THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
      const floor = new window.THREE.Mesh(new window.THREE.PlaneGeometry(90, 90), floorMat);
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      // مطابقة تامة لهيكلية الخامات والجدران في محرر الإدارة (editor.js)
      const wallMat = new window.THREE.MeshStandardMaterial({ color: 0xe3ddd3, roughness: 0.85 });

      const activeWalls = (customWalls && customWalls.length > 0)
        ? customWalls
        : ROOM_WALLS.map((w, i) => ({
            uid: 'w' + (i + 1),
            width: w[0],
            height: w[1],
            depth: w[2],
            x: w[3],
            y: w[4],
            z: w[5],
            r: w[6] || 0
          }));

      activeWalls.forEach((w) => {
        const group = new window.THREE.Group();
        group.position.set(
          w.x !== undefined ? w.x : 0,
          w.y !== undefined ? w.y : 1.75,
          w.z !== undefined ? w.z : 0
        );
        group.rotation.y = w.r !== undefined ? w.r : 0;

        const mesh = new window.THREE.Mesh(new window.THREE.BoxGeometry(1, 1, 1), wallMat);
        mesh.scale.set(
          w.width !== undefined ? w.width : 6,
          w.height !== undefined ? w.height : 3.5,
          w.depth !== undefined ? w.depth : 0.3
        );
        group.add(mesh);
        scene.add(group);
      });

      const loader = new window.THREE.TextureLoader();
      const { byFrame } = assignPhotosToFrames(activePhotos, frames);

      frames.forEach((fr) => {
        const ph = byFrame.get(fr.n) || null;
        const sc = fr.s || 1;
        const g = new window.THREE.Group();
        g.position.set(fr.x, fr.y, fr.z);
        g.rotation.y = fr.r;
        if (ph) g.userData = ph;

        const w = FRAME_STYLE.EMPTY_W * sc, h = FRAME_STYLE.EMPTY_H * sc;

        const imgMesh = new window.THREE.Mesh(
          new window.THREE.PlaneGeometry(w, h),
          ph
            ? new window.THREE.MeshBasicMaterial({ color: 0x222222 })
            : new window.THREE.MeshBasicMaterial({ map: makeEmptyFrameTexture(window.THREE, fr.n) })
        );
        imgMesh.position.z = IMAGE_OFFSET;
        g.add(imgMesh);

        const frame = new window.THREE.Mesh(
          new window.THREE.BoxGeometry(w + MAT_PADDING * sc, h + MAT_PADDING * sc, FRAME_DEPTH),
          new window.THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45 })
        );
        g.add(frame);
        scene.add(g);

        if (!ph) return; 
        hitGroups.push(g);

        loader.load(ph.url, (t) => {
          const { map, aspect } = prepareDisplayTexture(window.THREE, t, 768);
          const fit = fitImage(aspect, sc);

          imgMesh.geometry.dispose();
          imgMesh.geometry = new window.THREE.PlaneGeometry(fit.w, fit.h);
          imgMesh.material = new window.THREE.MeshBasicMaterial({ map });

          frame.geometry.dispose();
          frame.geometry = new window.THREE.BoxGeometry(fit.w + MAT_PADDING * sc, fit.h + MAT_PADDING * sc, FRAME_DEPTH);
        });
      });

      function onKeyDown(e) {
        if (fullscreenOpen || paused) return;
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

      function onMouseDown(e) {
        if (fullscreenOpen || paused) return;
        state.mouseLook = true;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
        state.mouse.downX = e.clientX;
        state.mouse.downY = e.clientY;
        state.mouse.moved = false;
        state.mouse.downTime = Date.now();
      }
      function onMouseMove(e) {
        if (!state.mouseLook || fullscreenOpen || paused) return;
        const dx = e.clientX - state.lastMouseX;
        const dy = e.clientY - state.lastMouseY;
        if (Math.hypot(e.clientX - state.mouse.downX, e.clientY - state.mouse.downY) > 6) {
          state.mouse.moved = true;
        }
        state.yaw -= dx * 0.003;
        state.pitch -= dy * 0.003;
        state.pitch = Math.max(-1.5, Math.min(1.5, state.pitch));
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
      }
      function onMouseUp(e) {
        const wasLooking = state.mouseLook;
        state.mouseLook = false;
        if (wasLooking && !fullscreenOpen && !paused && !state.mouse.moved && (Date.now() - state.mouse.downTime) < 500) {
          triggerRaycast(e.clientX, e.clientY);
        }
      }
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      const joyZone = document.getElementById('joyZone');
      const joyKnob = document.getElementById('joyKnob');

      function onTouchStart(e) {
        if (fullscreenOpen || paused) return;
        for (const t of e.changedTouches) {
          let isNearJoystick = false;
          let r = null;
          if (joyZone) {
            r = joyZone.getBoundingClientRect();
            const pad = 34;
            isNearJoystick = t.clientX >= r.left - pad && t.clientX <= r.right + pad &&
              t.clientY >= r.top - pad && t.clientY <= r.bottom + pad;
          }
          if (isNearJoystick && !state.joy.a) {
            state.joy.a = true;
            state.joy.id = t.identifier;
            if (r) {
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
            state.pitch = Math.max(-1.5, Math.min(1.5, state.pitch));
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

      function showTooFarHint() {
        const el = document.getElementById('tooFarToast');
        if (!el) return;
        el.classList.add('show');
        clearTimeout(showTooFarHint._t);
        showTooFarHint._t = setTimeout(() => el.classList.remove('show'), 1400);
      }

      function triggerRaycast(clientX, clientY) {
        const ray = new window.THREE.Raycaster();
        const ndc = new window.THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(hitGroups, true);
        if (hits.length) {
          const hit = hits[0];
          let o = hit.object;
          while (o && !o.userData.title) o = o.parent;
          if (o && o.userData.title) {
            if (hit.distance > OPEN_DIST) {
              showTooFarHint();
              return;
            }
            openFS(o.userData);
          }
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

      function onGalleryPause() {
        paused = true;
        state.keys.w = state.keys.s = state.keys.a = state.keys.d = false;
        state.joy.a = false; state.joy.dx = 0; state.joy.dy = 0;
        state.mouseLook = false;
      }
      function onGalleryResume() { paused = false; }
      window.addEventListener('gallery:pause', onGalleryPause);
      window.addEventListener('gallery:resume', onGalleryResume);

      function animate() {
        rafId = requestAnimationFrame(animate);
        if (!camera) return;
        camera.rotation.y = state.yaw;
        camera.rotation.x = state.pitch;

        if (!fullscreenOpen && !paused) {
          const speed = 0.12;
          const forward = new window.THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
          const right = new window.THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));

          let displacement = new window.THREE.Vector3(0, 0, 0);
          let hasKeyMove = false;
          if (state.keys.w) { displacement.addScaledVector(forward, speed); hasKeyMove = true; }
          if (state.keys.s) { displacement.addScaledVector(forward, -speed); hasKeyMove = true; }
          if (state.keys.a) { displacement.addScaledVector(right, -speed); hasKeyMove = true; }
          if (state.keys.d) { displacement.addScaledVector(right, speed); hasKeyMove = true; }
          if (hasKeyMove) camera.position.add(displacement);

          if (state.joy.a) {
            const joyDir = new window.THREE.Vector3(state.joy.dx, 0, state.joy.dy).applyQuaternion(camera.quaternion);
            joyDir.y = 0;
            if (joyDir.lengthSq() > 0) joyDir.normalize();
            camera.position.addScaledVector(joyDir, 0.05);
          }

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
        window.removeEventListener('gallery:pause', onGalleryPause);
        window.removeEventListener('gallery:resume', onGalleryResume);
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
  }, [photos, layout]);

  function startPresenceHeartbeat(name) {
    if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
    const sendBeat = () => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current, visitor_name: name })
      }).catch(() => {});
    };
    sendBeat();
    presenceTimerRef.current = setInterval(sendBeat, PRESENCE_HEARTBEAT_MS);
  }

  function stopPresenceHeartbeat() {
    if (presenceTimerRef.current) {
      clearInterval(presenceTimerRef.current);
      presenceTimerRef.current = null;
    }
  }

  async function handleEnter() {
    const name = visitorName.trim();
    if (name.length < 2) {
      alert('الرجاء كتابة اسمك أولاً');
      return;
    }
    setEntering(true);
    try {
      let model = null;
      try {
        if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
          const hv = await navigator.userAgentData.getHighEntropyValues(['model']);
          model = hv && hv.model ? hv.model : null;
        }
      } catch (e2) {}
      await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_name: name,
          screen: `${window.screen.width}x${window.screen.height}`,
          touch: navigator.maxTouchPoints || 0,
          lang: navigator.language || '',
          model
        })
      });
    } catch (e) {}
    const entry = document.getElementById('entryOverlay');
    const joyWrap = document.getElementById('joyWrap');
    const lookHint = document.getElementById('lookHintMobile');
    if (entry) entry.style.display = 'none';
    if (isMobile) {
      if (joyWrap) joyWrap.style.display = 'block';
      if (lookHint) lookHint.style.display = 'block';
    }
    window.dispatchEvent(new Event('gallery:resume'));
    startPresenceHeartbeat(name);
    setEntering(false);
  }

  function handleExitToHome() {
    setMenuOpen(false);
    const entry = document.getElementById('entryOverlay');
    const joyWrap = document.getElementById('joyWrap');
    const lookHint = document.getElementById('lookHintMobile');
    if (entry) entry.style.display = 'flex';
    if (joyWrap) joyWrap.style.display = 'none';
    if (lookHint) lookHint.style.display = 'none';
    window.dispatchEvent(new Event('gallery:pause'));
    stopPresenceHeartbeat();
  }

  function handleOpenPresence() {
    setPresenceOpen((v) => !v);
    setMenuOpen(false);
    fetch('/api/presence')
      .then((r) => r.json())
      .then((d) => setPresence({ count: d.count || 0, names: Array.isArray(d.names) ? d.names : [] }))
      .catch(() => setPresence({ count: 0, names: [] }));
  }

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
        #fsOverlay {
          opacity: 0; visibility: hidden; pointer-events: none;
          transition: opacity 1.1s ease, visibility 1.1s, -webkit-backdrop-filter 1.1s ease, backdrop-filter 1.1s ease;
        }
        #fsOverlay.open { opacity: 1; visibility: visible; pointer-events: auto; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
        #fsImg { transform: scale(.8); filter: blur(22px); transition: transform 1.3s cubic-bezier(.19,1,.22,1), filter 1.3s ease; }
        #fsOverlay.open #fsImg { transform: scale(1); filter: blur(0); }
        #fsCaption { opacity: 0; transform: translateY(10px); transition: opacity 1.1s ease .25s, transform 1.1s ease .25s; }
        #fsOverlay.open #fsCaption { opacity: 1; transform: translateY(0); }
        #fsBackBtn:active { filter: brightness(1.15); }

        #tooFarToast {
          position: fixed; top: 46%; left: 50%; transform: translate(-50%, -50%) scale(.92);
          background: rgba(15,12,10,.92); border: 1px solid rgba(201,163,91,.4); color: #f3efe8;
          padding: 10px 22px; border-radius: 30px; font-size: 13px; z-index: 900;
          opacity: 0; pointer-events: none; transition: opacity .25s ease, transform .25s ease;
        }
        #tooFarToast.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }

        #entryNameInput { width: 100%; padding: 13px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid rgba(201,163,91,.22); background: rgba(0,0,0,.32); color: #f3efe8; font-size: 14px; outline: none; text-align: center; font-family: inherit; transition: border-color .2s ease; }
        #entryNameInput:focus { border-color: rgba(201,163,91,.65); }
        #entryNameInput::placeholder { color: #776f62; }

        #menuToggleBtn {
          position: fixed; top: 16px; right: 16px; z-index: 1100; width: 38px; height: 38px; border-radius: 50%;
          background: rgba(20,17,13,.5); border: 1px solid rgba(255,255,255,.12); color: rgba(243,239,232,.8);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: background .2s ease, border-color .2s ease;
        }
        #menuToggleBtn:hover { background: rgba(255,255,255,.08); border-color: rgba(201,163,91,.35); }

        #menuDropdown {
          position: fixed; top: 60px; right: 16px; z-index: 1100; width: 236px;
          background: rgba(15,12,10,.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 6px; color: #f3efe8;
          opacity: 0; transform: translateY(-8px) scale(.97); pointer-events: none;
          transition: opacity .2s ease, transform .2s ease;
        }
        #menuDropdown.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .menu-item {
          display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border-radius: 8px;
          background: none; border: none; color: #e9e3d8; font-size: 13px; text-align: right; text-decoration: none;
          cursor: pointer; transition: background .15s ease;
        }
        .menu-item:hover { background: rgba(255,255,255,.06); }
        .menu-item svg { flex-shrink: 0; color: #c9a35b; }
        .menu-sep { height: 1px; background: rgba(255,255,255,.08); margin: 5px 4px; }
        .menu-static { padding: 8px 12px; font-size: 11px; color: #7d7568; line-height: 1.7; }

        #presencePanel, #creditsPanel {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(.95); z-index: 1300;
          width: min(88vw, 320px); background: rgba(15,12,10,.96); backdrop-filter: blur(16px);
          border: 1px solid rgba(201,163,91,.3); border-radius: 14px; padding: 22px; color: #f3efe8;
          opacity: 0; pointer-events: none; transition: opacity .25s ease, transform .25s ease; text-align: center;
        }
        #presencePanel.open, #creditsPanel.open { opacity: 1; transform: translate(-50%, -50%) scale(1); pointer-events: auto; }
        .panel-close {
          margin-top: 16px; padding: 9px 20px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15);
          color: #f3efe8; border-radius: 20px; cursor: pointer; font-size: 12.5px;
        }

        .entry-aperture { animation: aperture-spin 26s linear infinite; }
        @keyframes aperture-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <button id="menuToggleBtn" onClick={() => setMenuOpen((v) => !v)} aria-label="القائمة">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div id="menuDropdown" className={menuOpen ? 'open' : ''}>
        <button className="menu-item" onClick={handleOpenPresence}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          الزوار المتواجدون حالياً
        </button>
        <button className="menu-item" onClick={handleExitToHome}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          العودة للصفحة الرئيسية
        </button>
        <button className="menu-item" onClick={() => { setCreditsOpen(true); setMenuOpen(false); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          صُنع بواسطة
        </button>
        <div className="menu-sep"></div>
        <a className="menu-item" href="/admin/login">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          دخول الأدارة للمعرض
        </a>
      </div>

      <div id="presencePanel" className={presenceOpen ? 'open' : ''}>
        <h3 style={{ color: '#c9a35b', fontSize: '16px', marginBottom: '10px' }}>الزوار المتواجدون الآن</h3>
        <div style={{ fontSize: '34px', fontWeight: 700, color: '#f3efe8', marginBottom: '8px' }}>{presence.count}</div>
        <div style={{ fontSize: '12px', color: '#9a9388', maxHeight: '140px', overflowY: 'auto', lineHeight: 2 }}>
          {presence.names.length > 0 ? presence.names.join('، ') : 'لا يوجد زوار آخرون الآن'}
        </div>
        <button className="panel-close" onClick={() => setPresenceOpen(false)}>إغلاق</button>
      </div>

      <div id="creditsPanel" className={creditsOpen ? 'open' : ''}>
        <h3 style={{ color: '#c9a35b', fontSize: '16px', marginBottom: '12px' }}>صُنع بواسطة</h3>
        <div style={{ fontSize: '13px', color: '#e9e3d8', lineHeight: 2.1 }}>
          إعداد وإخراج: <b>أنور محمد</b><br />
          إشراف قسم التصوير الضوئي: <b>عدنان الخمري</b><br />
          إدارة جمعية الثقافة والفنون بالطائف: <b>فيصل الخديدي</b>
        </div>
        <button className="panel-close" onClick={() => setCreditsOpen(false)}>إغلاق</button>
      </div>

      <div id="canvasHost" style={{ position: 'fixed', inset: 0, touchAction: 'none' }}></div>

      <div id="entryOverlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, overflow: 'hidden', background: 'radial-gradient(circle at 50% 28%, #211c17 0%, #0a0806 72%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eee' }}>

        <svg viewBox="0 0 1200 220" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '22vh', opacity: 0.4, pointerEvents: 'none' }}>
          <path d="M0,220 L0,150 L110,95 L200,140 L320,55 L430,125 L560,30 L680,115 L790,65 L900,135 L1030,60 L1140,120 L1200,80 L1200,220 Z" fill="none" stroke="#c9a35b" strokeWidth="1.1" />
          <path d="M0,220 L0,180 L150,140 L280,175 L420,120 L570,170 L720,110 L860,165 L1000,115 L1200,160 L1200,220 Z" fill="none" stroke="#8a6e3f" strokeWidth="0.8" opacity="0.6" />
        </svg>

        <div style={{ position: 'relative', textAlign: 'center', padding: '40px 36px', width: 'min(90vw, 440px)' }}>
          <svg className="entry-aperture" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#c9a35b" strokeWidth="1.2" style={{ margin: '0 auto 14px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
            <line x1="9.69" y1="8" x2="21.17" y2="8" />
            <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
            <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
            <line x1="14.31" y1="16" x2="2.83" y2="16" />
            <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
          </svg>

          <h1 style={{ fontSize: '28px', letterSpacing: '.04em', fontWeight: 500, color: '#f3efe8', marginBottom: '4px', fontFamily: "'Georgia', 'Times New Roman', serif" }}>المعرض الفوتوغرافي الإفتراضي</h1>
          <div style={{ fontSize: '11px', letterSpacing: '.38em', color: '#8a7a56', marginBottom: '16px', fontFamily: "Georgia, serif" }}>TAIF&nbsp;PHOTOGRAPHY&nbsp;GALLERY</div>

          <p style={{ color: '#9a9388', fontSize: '13.5px', lineHeight: 1.9, marginBottom: '6px' }}>
            معرض الفوتوغرافيا الافتراضي — جمعية الثقافة والفنون بالطائف
          </p>
          <div style={{ color: '#5f5848', fontSize: '10.5px', letterSpacing: '.12em', marginBottom: '26px', fontFamily: 'monospace' }}>
            الموقع تحت الصيانه و الإنشاء حالياً تطوير : انور محمد بإشراف: عدنان الخمري — جمعية الثقافة والفنون بالطائف
          </div>

          <input
            id="entryNameInput"
            placeholder="اكتب اسمك هنا..."
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
          />
          <button onClick={handleEnter} disabled={entering} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #c9a35b, #9c7a3c)', color: '#1a1408', border: 'none', borderRadius: '9px', fontSize: '15.5px', fontWeight: 600, cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1408" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {entering ? '...جاري الدخول' : 'دخول المعرض'}
          </button>
        </div>
      </div>

      <div id="tooFarToast">اقترب أكثر من اللوحة لعرضها (مترين تقريباً)</div>

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

      <div className="fs-overlay" id="fsOverlay" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0, 0, 0, .94)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px' }}>
        <button id="fsBackBtn" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2100, background: 'rgba(201, 163, 91, .25)', color: '#f3efe8', border: '1px solid rgba(201, 163, 91, .5)', padding: '10px 20px', borderRadius: '30px', cursor: 'pointer' }}>
          ↩ رجوع للمعرض
        </button>
        <img id="fsImg" src="" alt="" style={{ maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px' }} />
        <div id="fsCaption" style={{ textAlign: 'center', marginTop: '16px', color: '#f3efe8' }}>
          <h2 id="fsTitle" style={{ fontSize: '19px', color: '#c9a35b', marginBottom: '4px' }}></h2>
          <p id="fsMeta" style={{ fontSize: '13px', color: '#a79f8f' }}></p>
        </div>
      </div>

      <div id="joyWrap" style={{ position: 'fixed', left: '22px', bottom: '26px', zIndex: 300, display: 'none', opacity: 0.3 }}>
        <div id="joyZone" style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(30, 25, 20, .42)', border: '1px solid rgba(255, 255, 255, .32)', position: 'relative', touchAction: 'none' }}>
          <div id="joyKnob" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(201, 163, 91, .95)', position: 'absolute', top: '31px', left: '31px', pointerEvents: 'none' }}></div>
        </div>
      </div>

      <div id="lookHintMobile" style={{ position: 'fixed', right: '20px', bottom: '26px', zIndex: 300, display: 'none', color: 'rgba(255, 255, 255, .7)', fontSize: '12px', background: 'rgba(0, 0, 0, .5)', padding: '8px 12px', borderRadius: '8px', pointerEvents: 'none' }}>
        عصا التحكم يسار الشاشة للحركة • اسحب الشاشة للنظر • انقر اللوحة للتكبير
      </div>
    </>
  );
}
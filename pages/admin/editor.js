import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  DEFAULT_FRAMES, FRAME_STYLE, FRAME_LIMITS, ROOM_WALLS,
  normalizeFrames, assignPhotosToFrames, prepareDisplayTexture, fitImage, makeEmptyFrameTexture
} from '../../lib/galleryLayout';

let uidCounter = 1;
const newUid = (prefix = 'f') => prefix + (uidCounter++);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r3 = (v) => Math.round(v * 1000) / 1000;
const RAD2DEG = 180 / Math.PI;

function createEngine(THREE, host, cb) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14110e);
  const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 400);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 2.4, 13.5);
  let yaw = 0;
  let pitch = -0.12;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);
  const dom = renderer.domElement;
  dom.style.display = 'block';
  dom.tabIndex = 0;
  dom.style.outline = 'none';

  scene.add(new THREE.AmbientLight(0xfff5ea, 0.6));
  scene.add(new THREE.HemisphereLight(0xfff1de, 0x3a2a1c, 0.3));
  const sun = new THREE.DirectionalLight(0xfff0dd, 0.25);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.75 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(90, 90, 0x8a7448, 0x3a3025);
  grid.position.y = 0.012;
  scene.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe3ddd3, roughness: 0.85 });
  const wallNodes = new Map();

  function createWallMesh(uid) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wallMat.clone());
    mesh.userData.wallUid = uid;
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: 0xffc94d })
    );
    group.add(mesh, outline);
    outline.visible = false;
    return { uid, group, mesh, outline };
  }

  function syncWalls(list, selectedWallUid) {
    const alive = new Set();
    list.forEach((w) => {
      alive.add(w.uid);
      let nd = wallNodes.get(w.uid);
      if (!nd) { nd = createWallMesh(w.uid); wallNodes.set(w.uid, nd); scene.add(nd.group); }
      nd.group.position.set(w.x, w.y, w.z);
      nd.group.rotation.y = w.r || 0;
      nd.mesh.scale.set(w.width, w.height, w.depth);
      nd.outline.scale.set(w.width, w.height, w.depth);
      nd.outline.visible = (w.uid === selectedWallUid);
    });
    wallNodes.forEach((nd, uid) => {
      if (alive.has(uid)) return;
      scene.remove(nd.group);
      wallNodes.delete(uid);
    });
  }

  const loader = new THREE.TextureLoader();
  const texCache = new Map();
  function loadPhoto(url, done) {
    let e = texCache.get(url);
    if (e) { if (e.map) done(e); else if (!e.failed) e.waiters.push(done); return; }
    e = { map: null, aspect: 1.5, waiters: [done], failed: false };
    texCache.set(url, e);
    loader.load(url, (t) => {
      const r = prepareDisplayTexture(THREE, t, 512);
      e.map = r.map; e.aspect = r.aspect;
      e.waiters.splice(0).forEach((fn) => fn(e));
    }, undefined, () => { e.failed = true; e.waiters.length = 0; });
  }

  const nodes = new Map();
  const D = FRAME_STYLE;

  function makeLabelTexture(n) {
    const c = document.createElement('canvas');
    c.width = 160; c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(15,12,9,.88)';
    const rr = 18;
    ctx.beginPath();
    ctx.moveTo(rr, 4); ctx.lineTo(160 - rr, 4); ctx.quadraticCurveTo(156, 4, 156, rr);
    ctx.lineTo(156, 80 - rr); ctx.quadraticCurveTo(156, 76, 160 - rr, 76);
    ctx.lineTo(rr, 76); ctx.quadraticCurveTo(4, 76, 4, 80 - rr);
    ctx.lineTo(4, rr); ctx.quadraticCurveTo(4, 4, rr, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,163,91,.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f5d98c';
    ctx.font = '700 44px Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 80, 42);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function createNode(uid) {
    const group = new THREE.Group();
    const img = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    img.position.z = D.IMAGE_OFFSET;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, D.DEPTH), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45 }));
    img.userData.uid = uid;
    frame.userData.uid = uid;
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 0.14)),
      new THREE.LineBasicMaterial({ color: 0xffc94d })
    );
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0.08), 0.9, 0xffc94d, 0.26, 0.16);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture(0), depthTest: true }));
    label.scale.set(0.5, 0.25, 1);
    group.add(frame, img, outline, arrow, label);
    outline.visible = false;
    arrow.visible = false;
    return { uid, group, img, frame, outline, arrow, label, mode: null, photoUrl: null, emptyN: null, emptyTex: null, labelN: null, aspect: 1.5, s: 1 };
  }

  function layoutNode(nd) {
    let w, h;
    if (nd.photoUrl) {
      const f = fitImage(nd.aspect, nd.s);
      w = f.w; h = f.h;
    } else {
      w = D.EMPTY_W * nd.s; h = D.EMPTY_H * nd.s;
    }
    nd.img.scale.set(w, h, 1);
    nd.frame.scale.set(w + D.PAD * nd.s, h + D.PAD * nd.s, 1);
    nd.outline.scale.set(w + D.PAD * nd.s + 0.1, h + D.PAD * nd.s + 0.1, 1);
    nd.label.position.set(0, (h + D.PAD * nd.s) / 2 + 0.22, 0.12);
  }

  function sync(list, selectedUid) {
    const alive = new Set();
    list.forEach((f) => {
      alive.add(f.uid);
      let nd = nodes.get(f.uid);
      if (!nd) { nd = createNode(f.uid); nodes.set(f.uid, nd); scene.add(nd.group); }
      nd.group.position.set(f.x, f.y, f.z);
      nd.group.rotation.y = f.r;
      nd.s = f.s;

      if (f.photoUrl) {
        if (nd.mode !== 'photo' || nd.photoUrl !== f.photoUrl) {
          nd.mode = 'photo';
          nd.photoUrl = f.photoUrl;
          nd.aspect = 1.5;
          nd.img.material = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
          const url = f.photoUrl;
          loadPhoto(url, (e) => {
            if (nd.photoUrl !== url || !e.map) return;
            nd.img.material = new THREE.MeshBasicMaterial({ map: e.map });
            nd.aspect = e.aspect;
            layoutNode(nd);
          });
        }
      } else if (nd.mode !== 'empty' || nd.emptyN !== f.n) {
        nd.mode = 'empty';
        nd.photoUrl = null;
        if (nd.emptyTex) nd.emptyTex.dispose();
        nd.emptyTex = makeEmptyFrameTexture(THREE, f.n);
        nd.emptyN = f.n;
        nd.img.material = new THREE.MeshBasicMaterial({ map: nd.emptyTex });
      }

      if (nd.labelN !== f.n) {
        if (nd.label.material.map) nd.label.material.map.dispose();
        nd.label.material.map = makeLabelTexture(f.n);
        nd.label.material.needsUpdate = true;
        nd.labelN = f.n;
      }
      layoutNode(nd);
      const on = f.uid === selectedUid;
      nd.outline.visible = on;
      nd.arrow.visible = on;
    });
    nodes.forEach((nd, uid) => {
      if (alive.has(uid)) return;
      scene.remove(nd.group);
      if (nd.emptyTex) nd.emptyTex.dispose();
      if (nd.label.material.map) nd.label.material.map.dispose();
      nodes.delete(uid);
    });
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function castFromEvent(ev) {
    const rect = dom.getBoundingClientRect();
    ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray;
  }
  function framePickables() {
    const out = [];
    nodes.forEach((nd) => out.push(nd.frame, nd.img));
    return out;
  }
  function wallMeshList() {
    const out = [];
    wallNodes.forEach((nd) => out.push(nd.mesh));
    return out;
  }

  function placementFromHit(h) {
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (Math.abs(n.y) > 0.5) return null;
    const axis = Math.abs(n.x) > Math.abs(n.z) ? 'x' : 'z';
    return { x: h.point.x, y: h.point.y, z: h.point.z, r: Math.atan2(n.x, n.z), axis };
  }
  function wallPlacement(rayObj) {
    const meshes = wallMeshList();
    if (!meshes.length) return null;
    const hits = rayObj.intersectObjects(meshes, false);
    for (const h of hits) {
      const p = placementFromHit(h);
      if (p) return p;
    }
    return null;
  }

  let looking = false;
  let dragging = null;
  let lastX = 0;
  let lastY = 0;
  const keys = new Set();
  let speed = 5;

  function onContext(e) { e.preventDefault(); }
  function onDown(e) {
    dom.focus();
    if (e.button === 2 || e.button === 1) {
      looking = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault();
      return;
    }
    if (e.button === 0) {
      const fMeshes = framePickables();
      const wMeshes = wallMeshList();
      const hits = castFromEvent(e).intersectObjects([...fMeshes, ...wMeshes], false);
      const h = hits[0];
      if (h && h.object.userData.uid) {
        cb.selectFrame(h.object.userData.uid);
        dragging = { type: 'frame', uid: h.object.userData.uid, started: false, sx: e.clientX, sy: e.clientY };
      } else if (h && h.object.userData.wallUid) {
        cb.selectWall(h.object.userData.wallUid);
        dragging = { type: 'wall', uid: h.object.userData.wallUid, started: false, sx: e.clientX, sy: e.clientY };
      } else {
        cb.selectFrame(null);
        cb.selectWall(null);
      }
    }
  }
  function onMove(e) {
    if (looking) {
      yaw -= (e.clientX - lastX) * 0.0035;
      pitch -= (e.clientY - lastY) * 0.0035;
      pitch = clamp(pitch, -1.5, 1.5);
      lastX = e.clientX; lastY = e.clientY;
      return;
    }
    if (dragging) {
      if (!dragging.started) {
        if (Math.hypot(e.clientX - dragging.sx, e.clientY - dragging.sy) < 5) return;
        dragging.started = true;
        cb.beginGesture();
      }
      if (dragging.type === 'frame') {
        const p = wallPlacement(castFromEvent(e));
        if (!p) return;
        const step = cb.snapStep();
        let { x, y, z } = p;
        if (step) {
          y = Math.round(y / step) * step;
          if (p.axis === 'x') z = Math.round(z / step) * step; else x = Math.round(x / step) * step;
        }
        cb.moveFrame(dragging.uid, { x: r3(x), y: r3(clamp(y, FRAME_LIMITS.Y_MIN, FRAME_LIMITS.Y_MAX)), z: r3(z), r: r3(p.r) });
      } else if (dragging.type === 'wall') {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const targetPos = new THREE.Vector3();
        castFromEvent(e).ray.intersectPlane(plane, targetPos);
        if (targetPos) {
          const step = cb.snapStep();
          let nx = targetPos.x;
          let nz = targetPos.z;
          if (step) {
            nx = Math.round(nx / step) * step;
            nz = Math.round(nz / step) * step;
          }
          cb.moveWall(dragging.uid, { x: r3(nx), z: r3(nz) });
        }
      }
    }
  }
  function onUp(e) {
    if (e.button === 0) dragging = null;
    if (e.button === 2 || e.button === 1) looking = false;
  }
  function onWheel(e) {
    e.preventDefault();
    speed = clamp(speed * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.5, 40);
    cb.speed(speed);
  }
  function isTyping(e) {
    const t = e.target;
    return t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName);
  }
  function onKeyDown(e) {
    if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    keys.add(e.code);
  }
  function onKeyUp(e) { keys.delete(e.code); }
  function onBlur() { keys.clear(); looking = false; dragging = null; }


  // ====================== التحكم باللمس (الهواتف والأجهزة اللوحية) ======================
  // عصا تحكم يسار الشاشة للحركة، سحب بإصبع على المشهد للنظر، لمسة لتحديد إطار/جدار،
  // وسحب الإطار/الجدار المحدد لنقله. أزرار ▲▼ للارتفاع و ⚡ لضبط السرعة.
  const isTouchDevice = (typeof window !== 'undefined') && (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0);
  const joy = { on: false, x: 0, y: 0, id: null };
  let vUp = false;
  let vDown = false;
  let tl = null; // اللمسة الحالية على المشهد
  const touchEls = [];
  dom.style.touchAction = 'none';

  function mk(tag, css, txt) {
    const el = document.createElement(tag);
    el.style.cssText = css;
    if (txt) el.textContent = txt;
    host.appendChild(el);
    touchEls.push(el);
    return el;
  }

  function hitAt(cx, cy) {
    const hits = castFromEvent({ clientX: cx, clientY: cy }).intersectObjects([...framePickables(), ...wallMeshList()], false);
    const h = hits[0];
    if (!h) return null;
    if (h.object.userData.uid) return { type: 'frame', uid: h.object.userData.uid };
    if (h.object.userData.wallUid) return { type: 'wall', uid: h.object.userData.wallUid };
    return null;
  }

  function onTouchStartScene(e) {
    if (tl) return;
    const t = e.changedTouches[0];
    e.preventDefault();
    const hit = hitAt(t.clientX, t.clientY);
    const sel = cb.getSelected ? cb.getSelected() : null;
    const alreadySelected = !!(hit && sel && sel.type === hit.type && sel.uid === hit.uid);
    tl = { id: t.identifier, sx: t.clientX, sy: t.clientY, lx: t.clientX, ly: t.clientY, moved: false, hit, mode: alreadySelected ? 'drag' : 'look' };
    if (hit && !alreadySelected) {
      if (hit.type === 'frame') cb.selectFrame(hit.uid); else cb.selectWall(hit.uid);
    }
    if (tl.mode === 'drag') dragging = { type: hit.type, uid: hit.uid, started: false, sx: t.clientX, sy: t.clientY };
  }
  function onTouchMoveScene(e) {
    if (!tl) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== tl.id) continue;
      e.preventDefault();
      if (!tl.moved && Math.hypot(t.clientX - tl.sx, t.clientY - tl.sy) > 8) tl.moved = true;
      if (!tl.moved) return;
      if (tl.mode === 'drag') {
        onMove({ clientX: t.clientX, clientY: t.clientY });
      } else {
        yaw -= (t.clientX - tl.lx) * 0.005;
        pitch -= (t.clientY - tl.ly) * 0.005;
        pitch = clamp(pitch, -1.5, 1.5);
      }
      tl.lx = t.clientX; tl.ly = t.clientY;
    }
  }
  function onTouchEndScene(e) {
    if (!tl) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== tl.id) continue;
      // لمسة قصيرة على فراغ = إلغاء التحديد
      if (!tl.moved && !tl.hit) { cb.selectFrame(null); cb.selectWall(null); }
      dragging = null;
      tl = null;
    }
  }

  if (isTouchDevice) {
    dom.addEventListener('touchstart', onTouchStartScene, { passive: false });
    dom.addEventListener('touchmove', onTouchMoveScene, { passive: false });
    dom.addEventListener('touchend', onTouchEndScene, { passive: false });
    dom.addEventListener('touchcancel', onTouchEndScene, { passive: false });

    // عصا الحركة (يسار الشاشة)
    const base = mk('div', 'position:absolute;left:18px;bottom:18px;width:116px;height:116px;border-radius:50%;background:rgba(15,23,42,.55);border:1.5px solid rgba(255,255,255,.35);touch-action:none;z-index:30;');
    const knob = mk('div', 'position:absolute;left:34px;top:34px;width:48px;height:48px;border-radius:50%;background:rgba(56,189,248,.9);pointer-events:none;');
    host.removeChild(knob); touchEls.splice(touchEls.indexOf(knob), 1); base.appendChild(knob);
    const setJoy = (cx, cy, r) => {
      const dx = cx - r.left - r.width / 2;
      const dy = cy - r.top - r.height / 2;
      const max = r.width / 2 - 10;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / max);
      joy.x = (dx / d) * k;
      joy.y = (dy / d) * k;
      knob.style.transform = 'translate(' + (joy.x * max) + 'px,' + (joy.y * max) + 'px)';
    };
    const joyEnd = () => { joy.on = false; joy.x = 0; joy.y = 0; joy.id = null; knob.style.transform = 'translate(0,0)'; };
    base.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); const t = e.changedTouches[0]; joy.on = true; joy.id = t.identifier; setJoy(t.clientX, t.clientY, base.getBoundingClientRect()); }, { passive: false });
    base.addEventListener('touchmove', (e) => { e.preventDefault(); e.stopPropagation(); for (const t of e.changedTouches) if (t.identifier === joy.id) setJoy(t.clientX, t.clientY, base.getBoundingClientRect()); }, { passive: false });
    base.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); joyEnd(); }, { passive: false });
    base.addEventListener('touchcancel', joyEnd, { passive: false });

    // أزرار الارتفاع والسرعة (يمين الشاشة)
    const btnCss = 'position:absolute;right:16px;width:52px;height:52px;border-radius:14px;background:rgba(15,23,42,.6);border:1.5px solid rgba(255,255,255,.35);color:#e2e8f0;font-size:20px;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none;z-index:30;';
    const hold = (el, on, off) => {
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); on(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); off(); }, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
    };
    const up = mk('div', btnCss + 'bottom:150px;', '▲');
    const down = mk('div', btnCss + 'bottom:88px;', '▼');
    hold(up, () => { vUp = true; }, () => { vUp = false; });
    hold(down, () => { vDown = true; }, () => { vDown = false; });
    const fast = mk('div', btnCss + 'bottom:26px;right:16px;width:52px;font-size:13px;', 'سرعة');
    fast.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      speed = speed >= 12 ? 3 : speed * 2;
      cb.speed(speed);
    }, { passive: false });
  }
  // ====================================================================================

  dom.addEventListener('contextmenu', onContext);
  dom.addEventListener('mousedown', onDown);
  dom.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  function resize() {
    const w = host.clientWidth || 800;
    const h = host.clientHeight || 600;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host);

  const clock = new THREE.Clock();
  let raf = 0;
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const mv = new THREE.Vector3();
  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    camera.rotation.set(pitch, yaw, 0);
    fwd.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    mv.set(0, 0, 0);
    if (keys.has('KeyW')) mv.add(fwd);
    if (keys.has('KeyS')) mv.sub(fwd);
    if (keys.has('KeyD')) mv.add(right);
    if (keys.has('KeyA')) mv.sub(right);
    if (keys.has('KeyE') || keys.has('Space')) mv.y += 1;
    if (keys.has('KeyQ') || keys.has('KeyC')) mv.y -= 1;
    if (joy.on) { mv.addScaledVector(fwd, -joy.y); mv.addScaledVector(right, joy.x); }
    if (vUp) mv.y += 1;
    if (vDown) mv.y -= 1;
    if (mv.lengthSq() > 0) {
      const mag = Math.min(1, mv.length());
      mv.normalize().multiplyScalar(mag * speed * dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3 : 1));
      camera.position.add(mv);
      camera.position.y = Math.max(0.2, camera.position.y);
    }
    renderer.render(scene, camera);
  }
  animate();

  return {
    sync,
    syncWalls,
    setSpeed(v) { speed = v; },
    focusFrame(f) {
      const d = 3.4 * Math.max(1, f.s);
      camera.position.set(f.x + Math.sin(f.r) * d, Math.max(0.6, f.y + 0.15), f.z + Math.cos(f.r) * d);
      yaw = f.r;
      pitch = 0;
    },
    focusWall(w) {
      const d = 5.0;
      const nx = Math.sin(w.r || 0);
      const nz = Math.cos(w.r || 0);
      camera.position.set(w.x + nx * d, w.y + 0.5, w.z + nz * d);
      yaw = (w.r || 0) + Math.PI;
      pitch = 0;
    },
    frontPlacement() {
      const meshes = wallMeshList();
      if (meshes.length > 0) {
        ray.set(camera.position.clone(), fwd.clone().normalize());
        const hits = ray.intersectObjects(meshes, false);
        for (const h of hits) {
          const p = placementFromHit(h);
          if (p) return { x: r3(p.x), y: r3(clamp(p.y, FRAME_LIMITS.Y_MIN, FRAME_LIMITS.Y_MAX)), z: r3(p.z), r: r3(p.r) };
        }
      }
      const hx = -Math.sin(yaw);
      const hz = -Math.cos(yaw);
      return { x: r3(camera.position.x + hx * 4), y: 1.6, z: r3(camera.position.z + hz * 4), r: r3(yaw) };
    },
    snapToWall(f) {
      const nx = Math.sin(f.r);
      const nz = Math.cos(f.r);
      const origin = new THREE.Vector3(f.x + nx * 0.3, f.y, f.z + nz * 0.3);
      let best = null;
      const meshes = wallMeshList();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
        ray.set(origin, new THREE.Vector3(dx, 0, dz));
        const hits = ray.intersectObjects(meshes, false);
        for (const h of hits) {
          const p = placementFromHit(h);
          if (p) { if (!best || h.distance < best.d) best = { d: h.distance, p }; break; }
        }
      });
      if (!best) return null;
      return { x: r3(best.p.x), y: f.y, z: r3(best.p.z), r: r3(best.p.r) };
    },
    dispose() {
      cancelAnimationFrame(raf);
      dom.removeEventListener('contextmenu', onContext);
      dom.removeEventListener('mousedown', onDown);
      dom.removeEventListener('touchstart', onTouchStartScene);
      dom.removeEventListener('touchmove', onTouchMoveScene);
      dom.removeEventListener('touchend', onTouchEndScene);
      dom.removeEventListener('touchcancel', onTouchEndScene);
      touchEls.forEach((el) => { if (el.parentNode) el.parentNode.removeChild(el); });
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      if (ro) ro.disconnect();
      renderer.dispose();
      if (dom.parentNode) dom.parentNode.removeChild(dom);
    }
  };
}

function NumField({ label, value, onChange, step = 0.05, digits = 2, suffix }) {
  const fmt = (v) => String(Math.round(v * 10 ** digits) / 10 ** digits);
  const [txt, setTxt] = useState(fmt(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setTxt(fmt(value)); }, [value, focus]);
  return (
    <label className="nf">
      <span>{label}</span>
      <div className="nfbox">
        <input
          dir="ltr"
          inputMode="decimal"
          value={txt}
          onFocus={() => setFocus(true)}
          onBlur={() => { setFocus(false); setTxt(fmt(value)); }}
          onChange={(e) => {
            setTxt(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); onChange(value + step); }
            if (e.key === 'ArrowDown') { e.preventDefault(); onChange(value - step); }
          }}
        />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}


// اللوحات المرتبطة بجدار: القريبة من وجهَيه (ضمن حدوده). عند نقل/تدوير الجدار تُنقل وتُدار معه.
function carryFramesWithWall(frames, oldW, newW) {
  const dr = (newW.r || 0) - (oldW.r || 0);
  if (!dr && newW.x === oldW.x && newW.y === oldW.y && newW.z === oldW.z) return frames;
  const co = Math.cos(oldW.r || 0), so = Math.sin(oldW.r || 0);
  const cn = Math.cos(newW.r || 0), sn = Math.sin(newW.r || 0);
  return frames.map((f) => {
    const px = f.x - oldW.x, pz = f.z - oldW.z;
    // إحداثيات محلية بالنسبة للجدار القديم (عكس الدوران)
    const lx = px * co - pz * so;
    const lz = px * so + pz * co;
    const near = Math.abs(lx) <= oldW.width / 2 + 0.5 && Math.abs(lz) <= oldW.depth / 2 + 0.5 && Math.abs(f.y - oldW.y) <= oldW.height / 2 + 0.5;
    if (!near) return f;
    return {
      ...f,
      x: r3(newW.x + lx * cn + lz * sn),
      z: r3(newW.z - lx * sn + lz * cn),
      y: r3(f.y + (newW.y - oldW.y)),
      r: r3((f.r || 0) + dr)
    };
  });
}

export default function GalleryEditor() {
  const router = useRouter();
  const hostRef = useRef(null);
  const engineRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [threeReady, setThreeReady] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [frames, setFrames] = useState([]);
  const [walls, setWalls] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoOf, setPhotoOf] = useState({});
  const [sel, setSel] = useState(null);
  const [selWall, setSelWall] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [snap, setSnap] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [help, setHelp] = useState(true);
  const [nDraft, setNDraft] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const lastUndo = useRef({ key: null, t: 0 });
  const live = useRef({});
  live.current = { frames, walls, photoOf, sel, selWall, snap, photos };
  const cbRef = useRef({});

  const selFrame = frames.find((f) => f.uid === sel) || null;
  const selWallObj = walls.find((w) => w.uid === selWall) || null;
  const photoById = {};
  photos.forEach((p) => { photoById[String(p.id)] = p; });
  const placedIds = new Set(Object.values(photoOf));
  const unplaced = photos.filter((p) => !placedIds.has(String(p.id)));
  const filled = frames.filter((f) => photoOf[f.uid]).length;

  const showToast = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetch('/api/admin/me').catch(() => null);
      if (!me || !me.ok) { router.replace('/admin/login'); return; }
      const [lay, ph] = await Promise.all([
        fetch('/api/layout').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/photos').then((r) => (r.ok ? r.json() : [])).catch(() => [])
      ]);
      if (cancelled) return;
      
      const baseFrames = normalizeFrames(lay && lay.frames);
      const listFrames = (baseFrames.length ? baseFrames : DEFAULT_FRAMES).map((f) => ({ ...f, uid: newUid('f'), origN: f.n }));
      
      const baseWalls = (lay && lay.walls) ? lay.walls : ROOM_WALLS.map((w, i) => ({
        uid: 'w' + (i + 1),
        width: w[0], height: w[1], depth: w[2],
        x: w[3], y: w[4], z: w[5],
        r: w[6] || 0
      }));
      const listWalls = baseWalls.map((w) => ({ ...w, uid: w.uid || newUid('w') }));

      const phArr = Array.isArray(ph) ? ph : [];
      const { byFrame } = assignPhotosToFrames(phArr, listFrames, (p) => p.slot_index);
      const po = {};
      listFrames.forEach((f) => { const p = byFrame.get(f.n); if (p) po[f.uid] = String(p.id); });

      setFrames(listFrames);
      setWalls(listWalls);
      setPhotos(phArr);
      setPhotoOf(po);
      setIsDefault(!!(lay && lay.isDefault));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (window.THREE) { setThreeReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.async = true;
    s.onload = () => setThreeReady(true);
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!threeReady || loading || !hostRef.current) return undefined;
    const eng = createEngine(window.THREE, hostRef.current, {
      selectFrame: (uid) => { setSel(uid); if (uid) setSelWall(null); },
      selectWall: (uid) => { setSelWall(uid); if (uid) setSel(null); },
      beginGesture: () => cbRef.current.beginGesture(),
      moveFrame: (uid, p) => cbRef.current.moveFrame(uid, p),
      moveWall: (uid, p) => cbRef.current.moveWall(uid, p),
      speed: (v) => setSpeed(Math.round(v * 10) / 10),
      snapStep: () => (live.current.snap ? 0.25 : 0),
      getSelected: () => (live.current.sel ? { type: 'frame', uid: live.current.sel } : live.current.selWall ? { type: 'wall', uid: live.current.selWall } : null)
    });
    engineRef.current = eng;
    setEngineReady(true);
    return () => { eng.dispose(); engineRef.current = null; setEngineReady(false); };
  }, [threeReady, loading]);

  useEffect(() => {
    if (!engineReady || !engineRef.current) return;
    engineRef.current.sync(
      frames.map((f) => ({ ...f, photoUrl: photoOf[f.uid] && photoById[photoOf[f.uid]] ? photoById[photoOf[f.uid]].image_url : null })),
      sel
    );
    engineRef.current.syncWalls(walls, selWall);
  }, [engineReady, frames, walls, photoOf, photos, sel, selWall]);

  useEffect(() => { setNDraft(selFrame ? String(selFrame.n) : ''); }, [sel, selFrame]);

  useEffect(() => {
    const h = (e) => { if (live.current.dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);
  live.current.dirty = dirty;

  const snapshot = () => JSON.stringify({ frames: live.current.frames, walls: live.current.walls, photoOf: live.current.photoOf });
  const pushUndo = useCallback((key) => {
    const now = Date.now();
    if (key && lastUndo.current.key === key && now - lastUndo.current.t < 900) { lastUndo.current.t = now; return; }
    lastUndo.current = { key: key || null, t: now };
    undoRef.current.push(snapshot());
    if (undoRef.current.length > 60) undoRef.current.shift();
    redoRef.current = [];
  }, []);
  const applySnapshot = (str) => {
    const o = JSON.parse(str);
    setFrames(o.frames);
    setWalls(o.walls || []);
    setPhotoOf(o.photoOf);
    setDirty(true);
    if (live.current.sel && !o.frames.some((f) => f.uid === live.current.sel)) setSel(null);
    if (live.current.selWall && !(o.walls || []).some((w) => w.uid === live.current.selWall)) setSelWall(null);
  };
  const undo = () => {
    const s = undoRef.current.pop();
    if (!s) { showToast('لا يوجد ما يُتراجع عنه', 'warn'); return; }
    redoRef.current.push(snapshot());
    lastUndo.current = { key: null, t: 0 };
    applySnapshot(s);
  };
  const redo = () => {
    const s = redoRef.current.pop();
    if (!s) return;
    undoRef.current.push(snapshot());
    applySnapshot(s);
  };

  const updateFrame = (uid, patch, key) => {
    pushUndo(key || ('u:' + uid + ':' + Object.keys(patch).join(',')));
    setFrames((fs) => fs.map((f) => (f.uid === uid ? { ...f, ...patch } : f)));
    setDirty(true);
  };

  const applyWallPatch = (uid, patch) => {
    const oldW = live.current.walls.find((w) => w.uid === uid);
    if (!oldW) return;
    const newW = { ...oldW, ...patch };
    const nf = carryFramesWithWall(live.current.frames, oldW, newW);
    if (nf !== live.current.frames) { live.current.frames = nf; setFrames(nf); }
    live.current.walls = live.current.walls.map((w) => (w.uid === uid ? newW : w));
    setWalls((ws) => ws.map((w) => (w.uid === uid ? newW : w)));
    setDirty(true);
  };

  const updateWall = (uid, patch, key) => {
    pushUndo(key || ('w:' + uid + ':' + Object.keys(patch).join(',')));
    applyWallPatch(uid, patch);
  };

  const addWall = () => {
    if (walls.length >= 20) { showToast('وصلت للحد الأقصى من الجدران', 'warn'); return; }
    pushUndo();
    const newW = { uid: newUid('w'), width: 6, height: 3.5, depth: 0.3, x: 0, y: 1.75, z: 0, r: 0 };
    setWalls((ws) => [...ws, newW]);
    setSelWall(newW.uid);
    setSel(null);
    setDirty(true);
    showToast('تمت إضافة جدار جديد');
  };

  const deleteSelWall = () => {
    if (!selWallObj) return;
    if (!window.confirm('حذف هذا الجدار نهائياً؟')) return;
    pushUndo();
    setWalls((ws) => ws.filter((w) => w.uid !== selWallObj.uid));
    setSelWall(null);
    setDirty(true);
    showToast('تم حذف الجدار');
  };

  const nextFreeN = () => {
    const used = new Set(live.current.frames.map((f) => f.n));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  };
  
  const addFrame = (place, extra) => {
    if (live.current.frames.length >= FRAME_LIMITS.MAX_FRAMES) { showToast('وصلت للحد الأقصى من الإطارات (' + FRAME_LIMITS.MAX_FRAMES + ')', 'warn'); return; }
    pushUndo();
    const f = { uid: newUid('f'), n: nextFreeN(), x: 0, y: 1.6, z: 0, r: 0, s: 1, ...place, ...(extra || {}) };
    setFrames((fs) => [...fs, f].sort((a, b) => a.n - b.n));
    setSel(f.uid);
    setSelWall(null);
    setDirty(true);
    showToast('أُضيف الإطار رقم ' + f.n);
  };
  const addAtCamera = () => {
    if (!engineRef.current) return;
    addFrame(engineRef.current.frontPlacement());
  };
  const duplicateSel = () => {
    if (!selFrame) return;
    const tx = Math.cos(selFrame.r);
    const tz = -Math.sin(selFrame.r);
    const off = FRAME_STYLE.MAX_W * selFrame.s + 0.4;
    addFrame({ x: r3(selFrame.x + tx * off), y: selFrame.y, z: r3(selFrame.z + tz * off), r: selFrame.r, s: selFrame.s });
  };
  const deleteSel = () => {
    if (!selFrame) return;
    const hadPhoto = photoOf[selFrame.uid];
    if (!window.confirm('حذف الإطار رقم ' + selFrame.n + '؟' + (hadPhoto ? '\nالصورة التي فيه ستبقى محفوظة لكنها ستنتقل تلقائياً لأول إطار شاغر.' : ''))) return;
    pushUndo();
    setFrames((fs) => fs.filter((f) => f.uid !== selFrame.uid));
    setPhotoOf((m) => { const c = { ...m }; delete c[selFrame.uid]; return c; });
    setSel(null);
    setDirty(true);
  };
  const assignPhoto = (uid, pid) => {
    pushUndo();
    setPhotoOf((m) => {
      const c = { ...m };
      if (pid) Object.keys(c).forEach((k) => { if (c[k] === pid) delete c[k]; });
      if (pid) c[uid] = pid; else delete c[uid];
      return c;
    });
    setDirty(true);
  };
  const snapSelToWall = () => {
    if (!selFrame || !engineRef.current) return;
    const p = engineRef.current.snapToWall(selFrame);
    if (!p) { showToast('لم أجد جداراً قريباً', 'warn'); return; }
    updateFrame(selFrame.uid, p);
    showToast('أُلصق الإطار بأقرب جدار');
  };
  const focusFrame = (f) => {
    setSel(f.uid);
    setSelWall(null);
    if (engineRef.current) engineRef.current.focusFrame(f);
  };
  const focusWall = (w) => {
    setSelWall(w.uid);
    setSel(null);
    if (engineRef.current) engineRef.current.focusWall(w);
  };
  const applyN = (txt) => {
    setNDraft(txt);
    if (!selFrame) return;
    const n = Math.round(Number(txt));
    if (!txt || !Number.isInteger(n) || n < 1 || n > 999) return;
    if (frames.some((f) => f.uid !== selFrame.uid && f.n === n)) return;
    if (n === selFrame.n) return;
    updateFrame(selFrame.uid, { n }, 'n:' + selFrame.uid);
    setFrames((fs) => [...fs].sort((a, b) => a.n - b.n));
  };
  const nError = selFrame && nDraft !== '' && (() => {
    const n = Math.round(Number(nDraft));
    if (!Number.isInteger(n) || n < 1 || n > 999) return 'رقم من 1 إلى 999';
    if (frames.some((f) => f.uid !== selFrame.uid && f.n === n)) return 'هذا الرقم مستخدم لإطار آخر';
    return null;
  })();

  const save = async () => {
    if (saving) return;
    if (!frames.length) { showToast('لا يمكن حفظ تخطيط بلا إطارات', 'err'); return; }
    setSaving(true);
    try {
      const payloadFrames = frames.map((f) => ({ o: f.origN ?? null, n: f.n, x: r3(f.x), y: r3(f.y), z: r3(f.z), r: r3(f.r), s: r3(f.s) }));
      const payloadWalls = walls.map((w) => ({ uid: w.uid, width: r3(w.width), height: r3(w.height), depth: r3(w.depth), x: r3(w.x), y: r3(w.y), z: r3(w.z), r: r3(w.r || 0) }));
      
      const uidByPhoto = {};
      Object.keys(photoOf).forEach((uid) => { uidByPhoto[photoOf[uid]] = uid; });
      const photoSlots = {};
      photos.forEach((p) => {
        const uid = uidByPhoto[String(p.id)];
        const fr = uid ? frames.find((f) => f.uid === uid) : null;
        photoSlots[p.id] = fr ? fr.n : null;
      });
      const res = await fetch('/api/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames: payloadFrames, walls: payloadWalls, photoSlots })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.error || 'فشل الحفظ', 'err'); setSaving(false); return; }
      setDirty(false);
      setIsDefault(false);
      setFrames((fs) => fs.map((f) => ({ ...f, origN: f.n })));
      showToast('تم حفظ التخطيط والجدران بنجاح');
    } catch (e) {
      showToast('تعذّر الاتصال بالخادم', 'err');
    }
    setSaving(false);
  };

  const resetDefault = () => {
    if (!window.confirm('استعادة التخطيط الافتراضي؟ لن يُحفظ إلا بعد ضغط "حفظ".')) return;
    pushUndo();
    const listFrames = DEFAULT_FRAMES.map((f) => ({ ...f, uid: newUid('f'), origN: f.n }));
    const listWalls = ROOM_WALLS.map((w, i) => ({
      uid: 'w' + (i + 1), width: w[0], height: w[1], depth: w[2], x: w[3], y: w[4], z: w[5], r: w[6] || 0
    }));
    const { byFrame } = assignPhotosToFrames(photos, listFrames, (p) => p.slot_index);
    const po = {};
    listFrames.forEach((f) => { const p = byFrame.get(f.n); if (p) po[f.uid] = String(p.id); });
    setFrames(listFrames);
    setWalls(listWalls);
    setPhotoOf(po);
    setSel(null);
    setSelWall(null);
    setDirty(true);
  };

  cbRef.current = {
    beginGesture: () => pushUndo(),
    moveFrame: (uid, p) => { setFrames((fs) => fs.map((f) => (f.uid === uid ? { ...f, ...p } : f))); setDirty(true); },
    moveWall: (uid, p) => applyWallPatch(uid, p)
  };

  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); save(); return; }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); redo(); return; }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      
      if (selFrame) {
        const stepMove = e.shiftKey ? 0.25 : 0.05;
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          e.preventDefault();
          const d = (e.code === 'ArrowRight' ? 1 : -1) * stepMove;
          updateFrame(selFrame.uid, { x: r3(selFrame.x + Math.cos(selFrame.r) * d), z: r3(selFrame.z - Math.sin(selFrame.r) * d) }, 'nudge');
        } else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
          e.preventDefault();
          const d = (e.code === 'ArrowUp' ? 1 : -1) * stepMove;
          updateFrame(selFrame.uid, { y: r3(clamp(selFrame.y + d, FRAME_LIMITS.Y_MIN, FRAME_LIMITS.Y_MAX)) }, 'nudge');
        } else if (e.code === 'Delete') {
          deleteSel();
        } else if (e.code === 'Escape') {
          setSel(null);
        }
      } else if (selWallObj) {
        if (e.code === 'Delete') {
          deleteSelWall();
        } else if (e.code === 'Escape') {
          setSelWall(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/');
  }

  const deg = selFrame ? ((selFrame.r * RAD2DEG) % 360 + 360) % 360 : 0;
  const wallDeg = selWallObj ? (((selWallObj.r || 0) * RAD2DEG) % 360 + 360) % 360 : 0;

  if (loading) {
    return <div className="ed-loading" dir="rtl"><style dangerouslySetInnerHTML={{ __html: CSS }} />جاري تحميل المحرر…</div>;
  }

  return (
    <div className="ed" dir="rtl">
      <Head>
        <title>محرر الصالة والجدران — لوحة الإدارة</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <aside className="panel">
        <div className="brand">
          <div className="logo">▣</div>
          <div>
            <h1>محرر الصالة</h1>
            <p>الإطارات والجدران ثلاثية الأبعاد</p>
          </div>
        </div>

        <div className="stats">
          <div><b>{walls.length}</b><span>جدران</span></div>
          <div><b>{frames.length}</b><span>إطار</span></div>
          <div><b>{filled}</b><span>ممتلئ</span></div>
        </div>
        {unplaced.length > 0 && (
          <div className="note warn">{unplaced.length} صورة بلا إطار — أضف إطارات أو بدّل صوراً.</div>
        )}
        {isDefault && <div className="note">التخطيط الحالي افتراضي ولم يُحفظ بعد في قاعدة البيانات.</div>}

        <section>
          <h3>الجدران <small>(اضغط لتعديل الجدار)</small></h3>
          <div className="chips">
            {walls.map((w, idx) => (
              <button key={w.uid} className={'chip' + (w.uid === selWall ? ' on' : '')} onClick={() => focusWall(w)} title={`جدار ${idx + 1}`}>
                ج{idx + 1}
              </button>
            ))}
          </div>
          <button className="btn wide" style={{ marginTop: '10px' }} onClick={addWall}>+ إضافة جدار جديد</button>
        </section>

        <section>
          <h3>الإطارات <small>(اضغط للانتقال)</small></h3>
          <div className="chips">
            {frames.map((f) => (
              <button key={f.uid} className={'chip' + (f.uid === sel ? ' on' : '') + (photoOf[f.uid] ? ' full' : '')} onClick={() => focusFrame(f)} title={photoOf[f.uid] ? 'ممتلئ' : 'فارغ'}>
                {f.n}
              </button>
            ))}
          </div>
          <div className="legend"><i className="dot full" /> ممتلئ <i className="dot" /> فارغ</div>
        </section>

        <section>
          <h3>إضافة إطار</h3>
          <button className="btn wide" onClick={addAtCamera}>+ إطار جديد حيث أنظر</button>
        </section>

        {selWallObj ? (
          <section className="sel">
            <h3>الجدار المحدد <span className="selnum">جدار</span></h3>

            <div className="grid3">
              <NumField label="موقع X" value={selWallObj.x} onChange={(v) => updateWall(selWallObj.uid, { x: r3(v) })} />
              <NumField label="الارتفاع Y" value={selWallObj.y} onChange={(v) => updateWall(selWallObj.uid, { y: r3(v) })} />
              <NumField label="موقع Z" value={selWallObj.z} onChange={(v) => updateWall(selWallObj.uid, { z: r3(v) })} />
            </div>

            <div className="grid3">
              <NumField label="العرض" value={selWallObj.width} step={0.2} onChange={(v) => updateWall(selWallObj.uid, { width: r3(Math.max(0.5, v)) })} />
              <NumField label="الارتفاع" value={selWallObj.height} step={0.2} onChange={(v) => updateWall(selWallObj.uid, { height: r3(Math.max(0.5, v)) })} />
              <NumField label="السمك" value={selWallObj.depth} step={0.05} onChange={(v) => updateWall(selWallObj.uid, { depth: r3(Math.max(0.1, v)) })} />
            </div>

            <div className="grid2">
              <NumField label="الدوران" suffix="°" digits={1} step={5} value={wallDeg} onChange={(v) => updateWall(selWallObj.uid, { r: r3((v * Math.PI) / 180) })} />
            </div>

            <div className="row">
              <button className="btn" onClick={() => updateWall(selWallObj.uid, { r: r3((selWallObj.r || 0) - Math.PI / 2) })}>↺ 90°</button>
              <button className="btn" onClick={() => updateWall(selWallObj.uid, { r: r3((selWallObj.r || 0) + Math.PI / 2) })}>↻ 90°</button>
              <button className="btn danger" onClick={deleteSelWall}>حذف الجدار</button>
            </div>
          </section>
        ) : null}

        {selFrame ? (
          <section className="sel">
            <h3>الإطار المحدد <span className="selnum">{selFrame.n}</span></h3>

            <label className="nf">
              <span>رقم الإطار</span>
              <div className="nfbox">
                <input dir="ltr" inputMode="numeric" value={nDraft} onChange={(e) => applyN(e.target.value)} onBlur={() => setNDraft(String(selFrame.n))} />
              </div>
              {nError && <small className="err">{nError}</small>}
            </label>

            <label className="nf">
              <span>الصورة داخل الإطار</span>
              <select value={photoOf[selFrame.uid] || ''} onChange={(e) => assignPhoto(selFrame.uid, e.target.value || null)}>
                <option value="">— فارغ —</option>
                {photos.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.title || 'بدون عنوان'}{placedIds.has(String(p.id)) && photoOf[selFrame.uid] !== String(p.id) ? ' (في إطار آخر)' : ''}</option>
                ))}
              </select>
            </label>

            <div className="grid3">
              <NumField label="X" value={selFrame.x} onChange={(v) => updateFrame(selFrame.uid, { x: r3(clamp(v, -FRAME_LIMITS.POS, FRAME_LIMITS.POS)) }, 'x')} />
              <NumField label="الارتفاع Y" value={selFrame.y} onChange={(v) => updateFrame(selFrame.uid, { y: r3(clamp(v, FRAME_LIMITS.Y_MIN, FRAME_LIMITS.Y_MAX)) }, 'y')} />
              <NumField label="Z" value={selFrame.z} onChange={(v) => updateFrame(selFrame.uid, { z: r3(clamp(v, -FRAME_LIMITS.POS, FRAME_LIMITS.POS)) }, 'z')} />
            </div>

            <div className="grid2">
              <NumField label="الدوران" suffix="°" digits={1} step={5} value={deg} onChange={(v) => updateFrame(selFrame.uid, { r: r3((v * Math.PI) / 180) }, 'rot')} />
              <NumField label="الحجم ×" digits={2} step={0.05} value={selFrame.s} onChange={(v) => updateFrame(selFrame.uid, { s: r3(clamp(v, FRAME_LIMITS.S_MIN, FRAME_LIMITS.S_MAX)) }, 'scale')} />
            </div>
            <input
              className="range"
              type="range"
              min={FRAME_LIMITS.S_MIN}
              max={2.5}
              step="0.05"
              value={selFrame.s}
              onChange={(e) => updateFrame(selFrame.uid, { s: r3(parseFloat(e.target.value)) }, 'scale')}
            />

            <div className="row">
              <button className="btn" onClick={() => updateFrame(selFrame.uid, { r: r3(selFrame.r - Math.PI / 2) })}>↺ 90°</button>
              <button className="btn" onClick={() => updateFrame(selFrame.uid, { r: r3(selFrame.r + Math.PI / 2) })}>↻ 90°</button>
              <button className="btn" onClick={snapSelToWall}>إلصاق بالجدار</button>
            </div>
            <div className="row">
              <button className="btn" onClick={duplicateSel}>نسخ</button>
              <button className="btn danger" onClick={deleteSel}>حذف الإطار</button>
            </div>
          </section>
        ) : !selWallObj ? (
          <section>
            <p className="hint">اضغط على أي جدار أو إطار في الصالة لتحديده وتعديله أو سحبه مباشرة بالماوس.</p>
          </section>
        ) : null}

        <section>
          <label className="check"><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> محاذاة للشبكة عند السحب (٢٥ سم)</label>
          <button className="btn wide ghost" onClick={resetDefault}>استعادة التخطيط الافتراضي</button>
        </section>
      </aside>

      <main className="stage">
        <div ref={hostRef} className="canvasHost" />

        <div className="topbar">
          <button className={'btn save' + (dirty ? ' pulse' : '')} onClick={save} disabled={saving}>
            {saving ? 'جاري الحفظ…' : dirty ? 'حفظ التخطيط ●' : 'حفظ التخطيط'}
          </button>
          <button className="btn" onClick={undo} title="Ctrl+Z">↶ تراجع</button>
          <button className="btn" onClick={redo} title="Ctrl+Shift+Z">↷ إعادة</button>
          <span className="spacer" />
          <a className="btn ghost" href="/" target="_blank" rel="noreferrer">عرض المعرض ↗</a>
          <a className="btn ghost" href="/admin/dashboard">← لوحة الإدارة</a>
          <button className="btn ghost" onClick={handleLogout}>خروج</button>
        </div>

        <div className="hud">سرعة الطيران: <b>{speed}</b> م/ث <span className="hudDesk">· عجلة الماوس لتغييرها</span><span className="hudTouch"> · عصا اليسار: حركة · اسحب: نظر · المس ثم اسحب المحدد لنقله</span></div>

        {help ? (
          <div className="help">
            <button className="x" onClick={() => setHelp(false)} aria-label="إغلاق">×</button>
            <h4>محرر الصالة والجدران</h4>
            <ul>
              <li><kbd>W A S D</kbd> تحرّك · <kbd>E</kbd>/<kbd>Space</kbd> أعلى · <kbd>Q</kbd>/<kbd>C</kbd> أسفل</li>
              <li>انقر بالزر الأيسر على أي **جدار** أو **إطار** لتحديده وتحريكه أو تعديل أبعاده من القائمة الجانبية.</li>
              <li><kbd>Ctrl+S</kbd> للحفظ · <kbd>Ctrl+Z</kbd> للتراجع.</li>
            </ul>
          </div>
        ) : (
          <button className="helpBtn" onClick={() => setHelp(true)}>؟ المساعدة</button>
        )}

        {toast && <div className={'toast ' + toast.kind}>{toast.msg}</div>}
      </main>
    </div>
  );
}

const CSS = `
  .ed, .ed-loading { --gold:#c9a35b; --gold2:#f0cf8a; --bg:#0e0c0a; --panel:#15120f; --line:rgba(255,255,255,.09); --txt:#f3efe8; --mut:#9a9388; }
  html, body { margin:0; background:#0e0c0a; }
  .ed-loading { min-height:100vh; display:flex; align-items:center; justify-content:center; color:#c9a35b; background:#0e0c0a; font-family:'Segoe UI',Tahoma,Arial,sans-serif; }
  .ed { display:flex; height:100vh; background:var(--bg); color:var(--txt); font-family:'Segoe UI',Tahoma,Arial,sans-serif; overflow:hidden; }
  .panel { width:350px; flex-shrink:0; background:var(--panel); border-left:1px solid var(--line); overflow-y:auto; padding:18px 16px 28px; box-sizing:border-box; }
  .brand { display:flex; gap:12px; align-items:center; margin-bottom:16px; }
  .logo { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#c9a35b,#8f6d2f); color:#1a1408; display:flex; align-items:center; justify-content:center; font-size:20px; }
  .brand h1 { margin:0; font-size:17px; font-weight:600; }
  .brand p { margin:2px 0 0; font-size:11.5px; color:var(--mut); }
  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
  .stats div { background:rgba(255,255,255,.04); border:1px solid var(--line); border-radius:10px; padding:9px 6px; text-align:center; }
  .stats b { display:block; font-size:19px; color:var(--gold2); }
  .stats span { font-size:11px; color:var(--mut); }
  .note { font-size:12px; color:var(--mut); background:rgba(255,255,255,.04); border:1px solid var(--line); border-radius:8px; padding:8px 10px; margin-bottom:10px; line-height:1.6; }
  .note.warn { color:#f0c987; border-color:rgba(240,201,135,.3); background:rgba(240,201,135,.07); }
  section { border-top:1px solid var(--line); padding:14px 0 4px; margin-top:6px; }
  h3 { margin:0 0 10px; font-size:13.5px; font-weight:600; color:#e4d9c3; display:flex; align-items:center; gap:8px; }
  h3 small { color:var(--mut); font-weight:400; font-size:11px; }
  .selnum { background:var(--gold); color:#1a1408; border-radius:20px; padding:1px 10px; font-size:13px; }
  .chips { display:grid; grid-template-columns:repeat(auto-fill,minmax(38px,1fr)); gap:6px; }
  .chip { height:34px; border-radius:8px; border:1px dashed rgba(255,255,255,.22); background:transparent; color:var(--mut); cursor:pointer; font-size:12.5px; font-weight:600; }
  .chip.full { border-style:solid; border-color:rgba(201,163,91,.55); color:var(--gold2); background:rgba(201,163,91,.1); }
  .chip.on { background:var(--gold); color:#1a1408; border-color:var(--gold); }
  .chip:hover { filter:brightness(1.25); }
  .legend { margin-top:9px; font-size:11px; color:var(--mut); display:flex; align-items:center; gap:6px; }
  .dot { display:inline-block; width:10px; height:10px; border-radius:3px; border:1px dashed rgba(255,255,255,.35); margin-inline-start:8px; }
  .dot.full { border:1px solid rgba(201,163,91,.7); background:rgba(201,163,91,.25); margin-inline-start:0; }
  .hint { font-size:12px; color:var(--mut); line-height:1.7; margin:8px 0 0; }
  .btn { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); color:var(--txt); padding:8px 13px; border-radius:8px; cursor:pointer; font-size:12.5px; text-decoration:none; font-family:inherit; white-space:nowrap; }
  .btn:hover { background:rgba(255,255,255,.13); }
  .btn.wide { width:100%; box-sizing:border-box; }
  .btn.ghost { background:rgba(0,0,0,.35); }
  .btn.danger { color:#f0a0a0; border-color:rgba(224,100,100,.45); background:rgba(224,100,100,.12); }
  .btn.save { background:linear-gradient(135deg,#c9a35b,#9c7a3c); color:#1a1408; border:none; font-weight:700; }
  .btn.pulse { box-shadow:0 0 0 0 rgba(201,163,91,.7); animation:pulse 1.8s infinite; }
  @keyframes pulse { 70% { box-shadow:0 0 0 10px rgba(201,163,91,0); } 100% { box-shadow:0 0 0 0 rgba(201,163,91,0); } }
  .row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
  .row .btn { flex:1; text-align:center; }
  .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:10px; }
  .grid2 { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-top:10px; }
  .nf { display:block; margin-top:10px; }
  .nf > span { display:block; font-size:11.5px; color:var(--mut); margin-bottom:5px; }
  .nfbox { position:relative; }
  .nfbox em { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--mut); font-style:normal; font-size:12px; }
  .nf input, .nf select { width:100%; box-sizing:border-box; padding:8px 10px; background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.15); color:var(--txt); border-radius:8px; font-size:13px; outline:none; font-family:inherit; }
  .nf input:focus, .nf select:focus { border-color:var(--gold); }
  .err { color:#f0a0a0; font-size:11.5px; display:block; margin-top:4px; }
  .range { width:100%; margin-top:10px; accent-color:var(--gold); }
  .check { display:flex; gap:8px; align-items:center; font-size:12.5px; color:#d8cdb8; margin-bottom:10px; cursor:pointer; }
  .stage { position:relative; flex:1; min-width:0; }
  .canvasHost { position:absolute; inset:0; }
  .topbar { position:absolute; top:12px; left:12px; right:12px; display:flex; gap:8px; align-items:center; pointer-events:none; flex-wrap:wrap; }
  .topbar > * { pointer-events:auto; }
  .topbar .spacer { flex:1; }
  .hud { position:absolute; bottom:12px; right:12px; background:rgba(0,0,0,.55); border:1px solid var(--line); border-radius:8px; padding:6px 12px; font-size:12px; color:#d8cdb8; pointer-events:none; }
  .help { position:absolute; bottom:12px; left:12px; width:360px; max-width:calc(100% - 24px); background:rgba(14,12,10,.88); border:1px solid var(--line); border-radius:12px; padding:12px 16px 12px; backdrop-filter:blur(6px); }
  .help h4 { margin:0 0 8px; font-size:13px; color:var(--gold2); }
  .help ul { margin:0; padding:0 16px 0 0; font-size:12px; line-height:1.95; color:#d8cdb8; }
  .help .x { position:absolute; top:6px; left:10px; background:none; border:none; color:var(--mut); font-size:20px; cursor:pointer; }
  .helpBtn { position:absolute; bottom:12px; left:12px; background:rgba(0,0,0,.55); border:1px solid var(--line); color:#d8cdb8; border-radius:8px; padding:7px 12px; font-size:12px; cursor:pointer; }
  kbd { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); border-radius:4px; padding:0 6px; font-family:inherit; font-size:11px; }
  .toast { position:absolute; top:64px; left:50%; transform:translateX(-50%); background:#1f3d27; border:1px solid #3d7a4d; color:#d6f2dc; padding:10px 18px; border-radius:10px; font-size:13px; box-shadow:0 8px 24px rgba(0,0,0,.4); }
  .toast.err { background:#451f1f; border-color:#8a3d3d; color:#f6d6d6; }
  .toast.warn { background:#453a1f; border-color:#8a7a3d; color:#f6ecd6; }
  .hudTouch { display:none; }
  @media (pointer: coarse) { .hudDesk { display:none; } .hudTouch { display:inline; } }
  @media (max-width: 860px) {
    .ed { flex-direction:column-reverse; height:100dvh; }
    .panel { width:100%; height:42vh; border-left:none; border-top:1px solid var(--line); -webkit-overflow-scrolling:touch; }
    .help { display:none; }
    .hud { top:56px; bottom:auto; right:8px; left:8px; font-size:11px; text-align:center; }
    .hudDesk { display:none; } .hudTouch { display:inline; }
    .topbar { gap:5px; left:8px; right:8px; top:8px; }
    .topbar .btn { padding:6px 9px; font-size:11.5px; }
    .toast { top:96px; }
  }
`;
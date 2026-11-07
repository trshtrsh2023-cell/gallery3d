// كائنات المعرض القابلة للتحريك: مزهريات ونباتات ونصوص عربية ثلاثية الأبعاد.
// تُستخدم في المعرض العام وفي محرر الصالة بنفس الشكل تماماً.

export const OBJECT_KINDS = {
  vase: 'مزهرية مع ورود',
  vase2: 'مزهرية',
  plant: 'نبتة وأعشاب',
  text: 'نص عربي ثلاثي الأبعاد'
};
export const MAX_OBJECTS = 60;

// خطوط عربية رائجة (Google Fonts) للنص ثلاثي الأبعاد
export const TEXT_FONTS = {
  system: { label: 'افتراضي (Tahoma)', family: 'Tahoma', weight: 700 },
  cairo: { label: 'القاهرة — Cairo', family: 'Cairo', weight: 800 },
  tajawal: { label: 'تجوّل — Tajawal', family: 'Tajawal', weight: 800 },
  almarai: { label: 'المراعي — Almarai', family: 'Almarai', weight: 800 },
  amiri: { label: 'الأميري — Amiri (نسخ)', family: 'Amiri', weight: 700 },
  reemkufi: { label: 'ريم كوفي — Reem Kufi', family: 'Reem Kufi', weight: 700 },
  kufi: { label: 'نوتو كوفي — Noto Kufi', family: 'Noto Kufi Arabic', weight: 800 },
  naskh: { label: 'نوتو نسخ — Noto Naskh', family: 'Noto Naskh Arabic', weight: 700 },
  aref: { label: 'عارف رقعة — Aref Ruqaa (رقعة)', family: 'Aref Ruqaa', weight: 700 },
  lalezar: { label: 'لاليزار — Lalezar (عريض)', family: 'Lalezar', weight: 400 },
  changa: { label: 'تشانغا — Changa', family: 'Changa', weight: 800 },
  elmessiri: { label: 'المسيري — El Messiri', family: 'El Messiri', weight: 700 },
  lateef: { label: 'لطيف — Lateef (نستعليق)', family: 'Lateef', weight: 700 },
  scheherazade: { label: 'شهرزاد — Scheherazade', family: 'Scheherazade New', weight: 700 },
  markazi: { label: 'مركزي — Markazi', family: 'Markazi Text', weight: 700 },
  rakkas: { label: 'رقّاص — Rakkas (زخرفي)', family: 'Rakkas', weight: 400 },
  mada: { label: 'مدى — Mada', family: 'Mada', weight: 800 },
  harmattan: { label: 'هرمتان — Harmattan', family: 'Harmattan', weight: 700 }
};
export const FONTS_CSS_HREF = 'https://fonts.googleapis.com/css2?family=Cairo:wght@800&family=Tajawal:wght@800&family=Almarai:wght@800&family=Amiri:wght@700&family=Reem+Kufi:wght@700&family=Noto+Kufi+Arabic:wght@800&family=Noto+Naskh+Arabic:wght@700&family=Aref+Ruqaa:wght@700&family=Lalezar&family=Changa:wght@800&family=El+Messiri:wght@700&family=Lateef:wght@700&family=Scheherazade+New:wght@700&family=Markazi+Text:wght@700&family=Rakkas&family=Mada:wght@800&family=Harmattan:wght@700&display=swap';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r3 = (v) => Math.round(v * 1000) / 1000;

export function normalizeObjects(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const o of raw) {
    if (!o || typeof o !== 'object') continue;
    const kind = OBJECT_KINDS[o.kind] ? o.kind : 'vase';
    const item = {
      uid: String(o.uid || ('o' + (out.length + 1))).slice(0, 24),
      kind,
      x: r3(clamp(num(o.x, 0), -60, 60)),
      y: r3(clamp(num(o.y, kind === 'text' ? 2.4 : 0), 0, 30)),
      z: r3(clamp(num(o.z, 0), -60, 60)),
      r: r3(num(o.r, 0)),
      s: r3(clamp(num(o.s, 1), 0.2, 8))
    };
    if (kind === 'text') {
      item.text = String(o.text || 'مرحباً').replace(/[\u0000-\u001f]/g, ' ').slice(0, 80);
      item.color = /^#[0-9a-fA-F]{6}$/.test(String(o.color || '')) ? String(o.color) : '#c9a35b';
      item.font = TEXT_FONTS[o.font] ? o.font : 'system';
      item.stroke = r3(clamp(num(o.stroke, 0), 0, 8));                 // سمك الإطار/الحد (0 = بلا)
      item.strokeColor = /^#[0-9a-fA-F]{6}$/.test(String(o.strokeColor || '')) ? String(o.strokeColor) : '#1d1a14';
      item.shadow = !!o.shadow;                                         // ظل ناعم خلف النص
    }
    out.push(item);
    if (out.length >= MAX_OBJECTS) break;
  }
  return out;
}

// الكائنات الافتراضية (تُولَّد من الجدران عند عدم وجود حفظ سابق)
export function buildDefaultObjects(walls) {
  const insideAny = (px, pz, margin, self) => walls.some((w) => {
    if (w === self) return false;
    const c = Math.cos(w.r || 0), sn = Math.sin(w.r || 0);
    const dx = px - (w.x || 0), dz = pz - (w.z || 0);
    const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
    return Math.abs(lx) <= (w.width || 0) / 2 + margin && Math.abs(lz) <= (w.depth || 0) / 2 + margin;
  });
  const kinds = ['plant', 'vase', 'vase2'];
  const out = [];
  let kind = 0;
  walls.forEach((w) => {
    if (out.length >= 18) return;
    const wr = w.r || 0, c = Math.cos(wr), sn = Math.sin(wr);
    const alongX = (w.width || 0) >= (w.depth || 0);
    const L = alongX ? w.width : w.depth;
    const T = alongX ? w.depth : w.width;
    if (L < 2.5) return;
    const offs = L > 14 ? [-L / 2 + 1.0, 0, L / 2 - 1.0] : L > 6 ? [-L / 2 + 1.0, L / 2 - 1.0] : [0];
    offs.forEach((o) => {
      if (out.length >= 18) return;
      for (const side of [1, -1]) {
        const lx = alongX ? o : side * (T / 2 + 0.55);
        const lz = alongX ? side * (T / 2 + 0.55) : o;
        const px = (w.x || 0) + lx * c + lz * sn;
        const pz = (w.z || 0) - lx * sn + lz * c;
        if (insideAny(px, pz, 0.6, w)) continue;
        out.push({ uid: 'o' + (out.length + 1), kind: kinds[kind % 3], x: r3(px), y: 0, z: r3(pz), r: r3((out.length * 1.7) % 6.28), s: 1 });
        kind++;
        break;
      }
    });
  });
  return out;
}

// أبعاد الاصطدام التقريبية (عرض × ارتفاع × عمق) قبل الدوران
export function objectBox(o) {
  const s = o.s || 1;
  if (o.kind === 'text') {
    const len = Math.max(1, (o.text || '').length);
    return { w: Math.min(12.8, 0.3 * len + 0.2) * s, h: 0.8 * s, d: 0.3 * s };
  }
  const rad = (o.kind === 'plant' ? 0.4 : 0.32) * s;
  return { w: rad * 2, h: (o.kind === 'plant' ? 1.4 : 1.6) * s, d: rad * 2 };
}

// ---------- بناء المجسمات (THREE) ----------
const cache = new WeakMap();
function shared(THREE) {
  let c = cache.get(THREE);
  if (c) return c;
  c = {
    vaseMat: new THREE.MeshStandardMaterial({ color: 0x2f5d62, roughness: 0.35, metalness: 0.15 }),
    vase2Mat: new THREE.MeshStandardMaterial({ color: 0xc8b79a, roughness: 0.5 }),
    potMat: new THREE.MeshStandardMaterial({ color: 0x3b2f27, roughness: 0.8 }),
    soilMat: new THREE.MeshStandardMaterial({ color: 0x1d1612 }),
    leafMats: [0x3f7d3a, 0x57963f, 0x2f6a35].map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })),
    bloomMats: [0xd94f6a, 0xf0b13c, 0xf4efe6].map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })),
    vaseGeo: new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.24, 0.12], [0.27, 0.32], [0.2, 0.55], [0.11, 0.72], [0.13, 0.82], [0.17, 0.88]].map((q) => new THREE.Vector2(q[0], q[1])), 18),
    potGeo: new THREE.CylinderGeometry(0.3, 0.22, 0.45, 16),
    soilGeo: new THREE.CylinderGeometry(0.28, 0.28, 0.02, 14),
    bladeGeo: new THREE.ConeGeometry(0.045, 0.9, 4),
    fernGeo: new THREE.ConeGeometry(0.1, 0.7, 5),
    stemGeo: new THREE.CylinderGeometry(0.012, 0.012, 0.7, 5),
    bloomGeo: new THREE.SphereGeometry(0.06, 8, 6)
  };
  cache.set(THREE, c);
  return c;
}

function buildVase(THREE, mat, flowers) {
  const k = shared(THREE);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(k.vaseGeo, mat));
  if (flowers) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const stem = new THREE.Mesh(k.stemGeo, k.leafMats[2]);
      stem.position.set(Math.cos(a) * 0.07, 1.15, Math.sin(a) * 0.07);
      stem.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      g.add(stem);
      const bloom = new THREE.Mesh(k.bloomGeo, k.bloomMats[i % 3]);
      bloom.position.set(Math.cos(a) * 0.22, 1.47, Math.sin(a) * 0.22);
      g.add(bloom);
    }
  }
  return g;
}

function buildPlant(THREE) {
  const k = shared(THREE);
  const g = new THREE.Group();
  const pot = new THREE.Mesh(k.potGeo, k.potMat); pot.position.y = 0.225; g.add(pot);
  const soil = new THREE.Mesh(k.soilGeo, k.soilMat); soil.position.y = 0.45; g.add(soil);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.2;
    const rad = 0.04 + (i % 4) * 0.045;
    const fern = i % 3 === 0;
    const blade = new THREE.Mesh(fern ? k.fernGeo : k.bladeGeo, k.leafMats[i % 3]);
    const hh = (fern ? 0.7 : 0.9) * (0.8 + (i % 5) * 0.12);
    blade.scale.y = hh / (fern ? 0.7 : 0.9);
    blade.position.set(Math.cos(a) * rad, 0.45 + hh / 2, Math.sin(a) * rad);
    blade.rotation.set(Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32);
    g.add(blade);
  }
  return g;
}

// نص عربي بسُمك: يُرسم النص على Canvas (لتشكيل الحروف العربية صحيحاً) ثم تُكدَّس طبقات منه بعمق
// متدرّج لتعطي مظهر الحروف المجسّمة. يدعم خطوطاً مختلفة، وإطاراً/حدّاً ملوّناً، وظلاً ناعماً.
function buildText(THREE, o) {
  const text = o.text || 'مرحباً';
  const fd = TEXT_FONTS[o.font] || TEXT_FONTS.system;
  const fontSpec = (px) => `${fd.weight} ${px}px "${fd.family}", Tahoma, "Segoe UI", "Noto Naskh Arabic", Arial, sans-serif`;
  const strokePx = Math.round((o.stroke || 0) * 4);
  const shadowOn = !!o.shadow;
  const pad = 26 + strokePx + (shadowOn ? 26 : 0);
  const BASE_H = 150;
  const H = BASE_H + pad * 2;
  const base = new THREE.Color(o.color || '#c9a35b');
  const edge = new THREE.Color(o.strokeColor || '#1d1a14');
  const g = new THREE.Group();
  const depth = 0.14;
  const meshes = [];          // { mesh, kind }
  const cvFill = document.createElement('canvas');
  const cvEdge = document.createElement('canvas');
  const cvShadow = document.createElement('canvas');
  const texFill = new THREE.CanvasTexture(cvFill);
  const texEdge = new THREE.CanvasTexture(cvEdge);
  const texShadow = new THREE.CanvasTexture(cvShadow);
  [texFill, texEdge, texShadow].forEach((t) => { t.anisotropy = 4; });

  function setupCanvas(cv, W) {
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, W, H);
    c.font = fontSpec(120);
    c.direction = 'rtl';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    return c;
  }
  function render() {
    const m0 = document.createElement('canvas').getContext('2d');
    m0.font = fontSpec(120);
    const tw = Math.ceil(m0.measureText(text).width) + pad * 2 + 20;
    const W = Math.min(2048, Math.max(80, tw));
    const shrink = tw > 2048 ? 2048 / tw : 1;
    const px = Math.floor(120 * shrink);
    const cy = H / 2 + 6;
    let c = setupCanvas(cvFill, W);
    c.font = fontSpec(px); c.fillStyle = '#fff'; c.fillText(text, W / 2, cy);
    if (strokePx > 0) {
      c = setupCanvas(cvEdge, W);
      c.font = fontSpec(px); c.fillStyle = '#fff'; c.strokeStyle = '#fff';
      c.lineJoin = 'round'; c.lineWidth = strokePx * 2;
      c.strokeText(text, W / 2, cy); c.fillText(text, W / 2, cy);
    }
    if (shadowOn) {
      c = setupCanvas(cvShadow, W);
      c.font = fontSpec(px);
      c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 16; c.shadowOffsetX = 9; c.shadowOffsetY = 12;
      c.fillStyle = 'rgba(0,0,0,0.9)';
      if (strokePx > 0) { c.lineJoin = 'round'; c.lineWidth = strokePx * 2; c.strokeStyle = 'rgba(0,0,0,0.9)'; c.strokeText(text, W / 2, cy); }
      c.fillText(text, W / 2, cy);
    }
    [texFill, texEdge, texShadow].forEach((t) => { t.needsUpdate = true; });
    const hWorld = 0.8 * H / BASE_H;
    const wWorld = hWorld * W / H;
    const geo = new THREE.PlaneGeometry(wWorld, hWorld);
    meshes.forEach((e) => { if (e.mesh.geometry) e.mesh.geometry.dispose(); e.mesh.geometry = geo; });
    g.userData.textSize = { w: wWorld, h: hWorld };
  }

  // بناء الطبقات
  const addLayer = (tex, color, z, emissiveK, opts) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, map: tex, alphaTest: 0.45, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide, emissive: color.clone().multiplyScalar(emissiveK) }, opts || {}));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.position.z = z;
    g.add(mesh);
    meshes.push({ mesh });
  };
  if (shadowOn) {
    const sm = new THREE.MeshBasicMaterial({ map: texShadow, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sm);
    sh.position.z = -depth / 2 - 0.035;
    g.add(sh); meshes.push({ mesh: sh });
  }
  if (strokePx > 0) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      addLayer(texEdge, edge.clone().multiplyScalar(0.55 + 0.45 * t), -depth / 2 + depth * t, t === 1 ? 0.12 : 0.02);
    }
    addLayer(texFill, base.clone(), depth / 2 + 0.006, 0.2);
    addLayer(texFill, base.clone().multiplyScalar(1.05), depth / 2 + 0.012, 0.22);
  } else {
    const layers = 9;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      addLayer(texFill, base.clone().multiplyScalar(0.5 + 0.5 * t), -depth / 2 + depth * t, t === 1 ? 0.18 : 0.03);
    }
  }
  render();
  // الخطوط الخارجية تُحمَّل بعد قليل: نعيد الرسم عند جاهزيتها
  try {
    if (typeof document !== 'undefined' && document.fonts && fd.family !== 'Tahoma') {
      document.fonts.load(fontSpec(120), text).then(() => render()).catch(() => {});
    }
  } catch (e) {}
  return g;
}

// يُرجع Group جاهزاً (الموضع/الدوران/الحجم مضبوطة). userData.objUid للتحديد في المحرر.
export function createObjectMesh(THREE, o) {
  const k = shared(THREE);
  let inner;
  if (o.kind === 'text') inner = buildText(THREE, o);
  else if (o.kind === 'plant') inner = buildPlant(THREE);
  else inner = buildVase(THREE, o.kind === 'vase2' ? k.vase2Mat : k.vaseMat, o.kind !== 'vase2');
  const g = new THREE.Group();
  g.add(inner);
  applyObjectTransform(g, o);
  g.userData.objUid = o.uid;
  g.traverse((m) => { if (m.isMesh) m.userData.objUid = o.uid; });
  return g;
}

export function applyObjectTransform(g, o) {
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.r || 0;
  const s = o.s || 1;
  g.scale.set(s, s, s);
}


// ---------- إعدادات الإضاءة (تُحفظ مع التخطيط) ----------
// ambient: الإضاءة العامة، lamps: لمبات السقف، led: توهّج LED حول الإطارات — مضاعِفات حول القيمة 1
export const DEFAULT_LIGHTING = { ambient: 1, lamps: 1, led: 1 };
export function normalizeLighting(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    ambient: r3(clamp(num(raw.ambient, 1), 0.2, 2)),
    lamps: r3(clamp(num(raw.lamps, 1), 0, 2)),
    led: r3(clamp(num(raw.led, 1), 0, 2))
  };
}

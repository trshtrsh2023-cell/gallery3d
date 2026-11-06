// مصدر واحد مشترك لتخطيط صالة المعرض — يستخدمه المعرض العام (pages/index.js)
// ومحرر الإداريين ثلاثي الأبعاد (pages/admin/editor.js) وواجهة الحفظ (pages/api/layout.js)
// حتى لا يختلف ما يراه الإداري في المحرر عمّا يراه الزائر.

export const EYE_HEIGHT = 1.6;

// حدود آمنة لقيم الإطارات (تُطبَّق على الخادم والمحرر)
export const FRAME_LIMITS = {
  MAX_FRAMES: 80,
  POS: 40,        // أقصى |x| أو |z|
  Y_MIN: 0.4,
  Y_MAX: 5.6,
  S_MIN: 0.3,
  S_MAX: 3
};

// مقاسات الإطار الأساسية (عند مقياس 1). المقياس s يضرب هذه القيم.
export const FRAME_STYLE = {
  MAX_W: 2.6,        // أقصى عرض للصورة داخل الإطار
  MAX_H: 1.9,        // أقصى ارتفاع للصورة داخل الإطار
  EMPTY_W: 2.2,      // عرض الإطار الفارغ
  EMPTY_H: 1.47,     // ارتفاع الإطار الفارغ (نسبة 3:2)
  PAD: 0.14,         // هامش الإطار حول الصورة
  DEPTH: 0.07,       // سُمك الإطار (نصفه داخل الجدار)
  IMAGE_OFFSET: 0.045
};

// جدران الصالة: [عرض, ارتفاع, عمق, x, y, z]
export const ROOM_WALLS = [
  [30, 6, 0.6, 0, 3, -15],
  [0.6, 6, 30, -10, 3, 0],
  [0.6, 6, 30, 10, 3, 0],
  [0.5, 6, 20, -5, 3, 0],
  [0.5, 6, 20, 5, 3, 0]
];

// التخطيط الافتراضي: ٢٥ إطاراً مرقّمة ١..٢٥ (نفس مواقع النسخة السابقة)
// الإحداثيات هي سطح الجدار نفسه، و r هو دوران الإطار حول المحور الرأسي (راديان)
function buildDefaultFrames() {
  const H = Math.PI / 2;
  const zs = [-10, -5, 0, 5, 10];
  const walls = [
    { x: -4.75, r: H },   // الجدار الداخلي الأيسر
    { x: 4.75, r: -H },   // الجدار الداخلي الأيمن
    { x: -9.7, r: H },    // الجدار الخارجي الأيسر
    { x: 9.7, r: -H }     // الجدار الخارجي الأيمن
  ];
  const out = [];
  let n = 1;
  walls.forEach((w) => zs.forEach((z) => out.push({ n: n++, x: w.x, y: EYE_HEIGHT, z, r: w.r, s: 1 })));
  [-8, -4, 0, 4, 8].forEach((x) => out.push({ n: n++, x, y: EYE_HEIGHT, z: -14.7, r: 0, s: 1 }));
  return out;
}
export const DEFAULT_FRAMES = buildDefaultFrames();

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round3 = (v) => Math.round(v * 1000) / 1000;

// تنظيف وتحقق من مصفوفة الإطارات القادمة من أي مصدر (قاعدة البيانات/المحرر).
// يُسقط المدخلات غير الصالحة والأرقام المكررة (يبقى أول ظهور).
export function normalizeFrames(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const f of raw) {
    if (!f || typeof f !== 'object') continue;
    const n = Math.round(num(f.n, NaN));
    if (!Number.isInteger(n) || n < 1 || n > 999 || seen.has(n)) continue;
    seen.add(n);
    out.push({
      n,
      x: round3(clamp(num(f.x, 0), -FRAME_LIMITS.POS, FRAME_LIMITS.POS)),
      y: round3(clamp(num(f.y, EYE_HEIGHT), FRAME_LIMITS.Y_MIN, FRAME_LIMITS.Y_MAX)),
      z: round3(clamp(num(f.z, 0), -FRAME_LIMITS.POS, FRAME_LIMITS.POS)),
      r: round3(num(f.r, 0)),
      s: round3(clamp(num(f.s, 1), FRAME_LIMITS.S_MIN, FRAME_LIMITS.S_MAX))
    });
    if (out.length >= FRAME_LIMITS.MAX_FRAMES) break;
  }
  return out.sort((a, b) => a.n - b.n);
}

// يوزّع الصور على الإطارات: من حدّد لها الأدمن رقم إطار تذهب إليه، والباقي
// تُملأ به الإطارات الشاغرة بالترتيب. الإطارات التي لا تجد صورة تبقى فارغة.
export function assignPhotosToFrames(photos, frames, slotOf = (p) => p.slot ?? p.slot_index) {
  const byFrame = new Map(); // رقم الإطار -> الصورة
  const nums = new Set(frames.map((f) => f.n));
  const pending = [];
  (photos || []).forEach((p) => {
    const s = Number(slotOf(p));
    if (s && nums.has(s) && !byFrame.has(s)) byFrame.set(s, p);
    else pending.push(p);
  });
  const free = frames.map((f) => f.n).sort((a, b) => a - b).filter((n) => !byFrame.has(n));
  const leftover = [];
  pending.forEach((p) => {
    const n = free.shift();
    if (n === undefined) leftover.push(p);
    else byFrame.set(n, p);
  });
  return { byFrame, leftover };
}

// ينشئ نسخة مصغّرة من الصورة المحمّلة لعرضها على الإطار (توفير لموارد الجهاز)
// ويُرجع الخامة + نسبة أبعاد الصورة الأصلية. الصورة الأصلية لا تُمس.
export function prepareDisplayTexture(THREE, t, maxDim = 768) {
  const img = t.image;
  const w = (img && (img.naturalWidth || img.width)) || 3;
  const h = (img && (img.naturalHeight || img.height)) || 2;
  const aspect = w / h;
  let map = t;
  if (img && (w > maxDim || h > maxDim)) {
    const k = maxDim / Math.max(w, h);
    const cw = Math.max(1, Math.round(w * k));
    const ch = Math.max(1, Math.round(h * k));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
    map = new THREE.CanvasTexture(canvas);
    map.needsUpdate = true;
    t.dispose();
  }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, aspect };
}

// يحسب مقاس الصورة داخل الإطار مع الحفاظ على نسبتها الأصلية
export function fitImage(aspect, scale = 1) {
  const maxW = FRAME_STYLE.MAX_W * scale;
  const maxH = FRAME_STYLE.MAX_H * scale;
  let w = maxW;
  let h = maxW / aspect;
  if (h > maxH) { h = maxH; w = maxH * aspect; }
  return { w, h };
}

// خامة الإطار الفارغ: رقم الإطار + عبارة "لوحة شاغرة"
export function makeEmptyFrameTexture(THREE, n) {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1d1a16';
  ctx.fillRect(0, 0, 384, 256);
  ctx.strokeStyle = 'rgba(201,163,91,.38)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(18, 18, 348, 220);
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(201,163,91,.9)';
  ctx.font = '700 92px Georgia, serif';
  ctx.fillText(String(n), 192, 108);
  ctx.fillStyle = 'rgba(243,239,232,.5)';
  ctx.font = '24px Tahoma, Arial, sans-serif';
  ctx.fillText('لوحة شاغرة', 192, 196);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// مقارنة تفصيلية بين التخطيط المحفوظ سابقاً والتخطيط الجديد، لتسجيل "ماذا تغيّر بالضبط"
// في سجل نشاط الإداريين عند كل حفظ لتعديل المعرض.

const f2 = (v) => (Math.round(Number(v) * 100) / 100).toString();
const deg = (r) => Math.round((((Number(r) * 180) / Math.PI) % 360 + 360) % 360);
const same = (a, b, eps = 0.01) => Math.abs(Number(a || 0) - Number(b || 0)) <= eps;

const WALL_FIELDS = [
  ['width', 'الطول'],
  ['height', 'الارتفاع'],
  ['depth', 'السُمك']
];

// prevFrames/newFrames: [{n,x,y,z,r,s}] — newFrames قد تحوي o (الرقم السابق للإطار قبل التعديل) 
// prevWalls/newWalls: [{uid,width,height,depth,x,y,z,r}]
// prevSlots: Map(photoId -> slot) ، newSlots: {photoId: slot|null} ، photoTitles: Map(photoId -> title)
export function diffLayout({ prevFrames, newFrames, prevWalls, newWalls, prevSlots, newSlots, photoTitles }) {
  const lines = [];
  const counts = { framesAdded: 0, framesRemoved: 0, framesMoved: 0, framesRenumbered: 0, framesResized: 0, wallsAdded: 0, wallsRemoved: 0, wallsChanged: 0, photosMoved: 0 };

  // ---- الإطارات ----
  const prevByN = new Map((prevFrames || []).map((f) => [f.n, f]));
  const matched = new Set();
  (newFrames || []).forEach((nf) => {
    const o = nf.o === undefined || nf.o === null ? null : Number(nf.o);
    const pf = o !== null && prevByN.has(o) ? prevByN.get(o) : null;
    if (!pf) {
      counts.framesAdded++;
      lines.push(`➕ إضافة الإطار رقم ${nf.n} عند (${f2(nf.x)}, ${f2(nf.y)}, ${f2(nf.z)})`);
      return;
    }
    matched.add(pf.n);
    const parts = [];
    if (pf.n !== nf.n) { counts.framesRenumbered++; parts.push(`تغيير الرقم من ${pf.n} إلى ${nf.n}`); }
    if (!same(pf.x, nf.x) || !same(pf.y, nf.y) || !same(pf.z, nf.z)) {
      counts.framesMoved++;
      parts.push(`نقل من (${f2(pf.x)}, ${f2(pf.y)}, ${f2(pf.z)}) إلى (${f2(nf.x)}, ${f2(nf.y)}, ${f2(nf.z)})`);
    }
    if (deg(pf.r) !== deg(nf.r)) parts.push(`تدوير من ${deg(pf.r)}° إلى ${deg(nf.r)}°`);
    if (!same(pf.s, nf.s)) { counts.framesResized++; parts.push(`تغيير الحجم من ×${f2(pf.s)} إلى ×${f2(nf.s)}`); }
    if (parts.length) lines.push(`✏️ الإطار ${nf.n}: ${parts.join('، ')}`);
  });
  (prevFrames || []).forEach((pf) => {
    if (!matched.has(pf.n)) { counts.framesRemoved++; lines.push(`🗑️ حذف الإطار رقم ${pf.n}`); }
  });

  // ---- الجدران ----
  const prevW = new Map((prevWalls || []).map((w) => [w.uid, w]));
  const newW = new Map((newWalls || []).map((w) => [w.uid, w]));
  const wname = (w, i) => `الجدار ${w.uid}`;
  (newWalls || []).forEach((nw) => {
    const pw = prevW.get(nw.uid);
    if (!pw) {
      counts.wallsAdded++;
      lines.push(`➕ إضافة جدار جديد (${wname(nw)}) طوله ${f2(nw.width)}م وارتفاعه ${f2(nw.height)}م عند (${f2(nw.x)}, ${f2(nw.z)})`);
      return;
    }
    const parts = [];
    if (!same(pw.x, nw.x) || !same(pw.z, nw.z) || !same(pw.y, nw.y)) parts.push(`نقل من (${f2(pw.x)}, ${f2(pw.z)}) إلى (${f2(nw.x)}, ${f2(nw.z)})`);
    if (deg(pw.r) !== deg(nw.r)) parts.push(`تدوير من ${deg(pw.r)}° إلى ${deg(nw.r)}°`);
    WALL_FIELDS.forEach(([k, label]) => { if (!same(pw[k], nw[k])) parts.push(`${label} من ${f2(pw[k])} إلى ${f2(nw[k])}`); });
    if (parts.length) { counts.wallsChanged++; lines.push(`🧱 ${wname(nw)}: ${parts.join('، ')}`); }
  });
  (prevWalls || []).forEach((pw) => {
    if (!newW.has(pw.uid)) { counts.wallsRemoved++; lines.push(`🗑️ حذف ${wname(pw)}`); }
  });

  // ---- ربط الصور بالإطارات ----
  if (newSlots && prevSlots) {
    Object.keys(newSlots).forEach((id) => {
      if (!prevSlots.has(String(id))) return;
      const a = prevSlots.get(String(id)) ?? null;
      const b = newSlots[id] === '' || newSlots[id] === undefined ? null : newSlots[id];
      if (a === b) return;
      counts.photosMoved++;
      const t = (photoTitles && photoTitles.get(String(id))) || `#${id}`;
      lines.push(`🖼️ اللوحة «${t}»: ${a ? 'من الإطار ' + a : 'بلا إطار'} ← ${b ? 'إلى الإطار ' + b : 'بلا إطار'}`);
    });
  }

  const bits = [];
  if (counts.framesAdded) bits.push(`${counts.framesAdded} إطار مضاف`);
  if (counts.framesRemoved) bits.push(`${counts.framesRemoved} إطار محذوف`);
  if (counts.framesMoved) bits.push(`${counts.framesMoved} إطار منقول`);
  if (counts.framesRenumbered) bits.push(`${counts.framesRenumbered} إعادة ترقيم`);
  if (counts.framesResized) bits.push(`${counts.framesResized} تغيير حجم`);
  if (counts.wallsAdded) bits.push(`${counts.wallsAdded} جدار مضاف`);
  if (counts.wallsRemoved) bits.push(`${counts.wallsRemoved} جدار محذوف`);
  if (counts.wallsChanged) bits.push(`${counts.wallsChanged} جدار معدّل`);
  if (counts.photosMoved) bits.push(`${counts.photosMoved} لوحة أُعيد توزيعها`);
  return { lines, counts, summary: bits.length ? 'حفظ تعديل المعرض: ' + bits.join('، ') : 'حفظ تعديل المعرض (بدون تغييرات فعلية)' };
}

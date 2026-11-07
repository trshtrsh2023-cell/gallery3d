import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../lib/auth';
import { DEFAULT_FRAMES, ROOM_WALLS, normalizeFrames } from '../../lib/galleryLayout';
import { normalizeObjects, normalizeLighting } from '../../lib/galleryObjects';
import { logAdmin } from '../../lib/adminLog';
import { diffLayout } from '../../lib/layoutDiff';

const KIND_AR = { vase: 'مزهرية', vase2: 'مزهرية', plant: 'نبتة', text: 'نص' };
function diffObjects(prev, next) {
  const lines = [];
  const pm = new Map(prev.map((o) => [o.uid, o]));
  const nm = new Map(next.map((o) => [o.uid, o]));
  next.forEach((o) => {
    const p = pm.get(o.uid);
    const label = `${KIND_AR[o.kind] || o.kind}${o.kind === 'text' ? ' «' + o.text + '»' : ''}`;
    if (!p) { lines.push(`➕ إضافة ${label} عند (${o.x}, ${o.z})`); return; }
    const ch = [];
    if (p.x !== o.x || p.z !== o.z || p.y !== o.y) ch.push(`نقل من (${p.x}, ${p.y}, ${p.z}) إلى (${o.x}, ${o.y}, ${o.z})`);
    if (p.s !== o.s) ch.push(`الحجم ${p.s} ← ${o.s}`);
    if (p.r !== o.r) ch.push('تغيير الدوران');
    if (o.kind === 'text' && p.text !== o.text) ch.push(`النص «${p.text}» ← «${o.text}»`);
    if (o.kind === 'text' && p.color !== o.color) ch.push(`اللون ${p.color} ← ${o.color}`);
    if (ch.length) lines.push(`✏️ ${label}: ${ch.join('، ')}`);
  });
  prev.forEach((p) => { if (!nm.has(p.uid)) lines.push(`🗑️ حذف ${KIND_AR[p.kind] || p.kind}${p.kind === 'text' ? ' «' + p.text + '»' : ''}`); });
  return lines;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const supabase = getSupabaseAdmin();

  const defaultWalls = ROOM_WALLS.map((w, i) => ({
    uid: 'w' + (i + 1),
    width: w[0],
    height: w[1],
    depth: w[2],
    x: w[3],
    y: w[4],
    z: w[5],
    r: w[6] || 0
  }));

  if (req.method === 'GET') {
    const fallback = { frames: DEFAULT_FRAMES, walls: defaultWalls, isDefault: true, updated_at: null };
    if (!supabase) return res.status(200).json(fallback);
    try {
      let { data, error } = await supabase.from('gallery_layout').select('frames, walls, objects, lighting, updated_at').eq('id', 1).maybeSingle();
      if (error) ({ data, error } = await supabase.from('gallery_layout').select('frames, walls, objects, updated_at').eq('id', 1).maybeSingle());
      if (error) {
        // عمود objects غير موجود بعد (لم يُنفَّذ ملف الـ SQL المحدّث) — نقرأ بدونه
        ({ data, error } = await supabase.from('gallery_layout').select('frames, walls, updated_at').eq('id', 1).maybeSingle());
      }
      if (error || !data) return res.status(200).json(fallback);
      
      const frames = normalizeFrames(data.frames);
      const walls = Array.isArray(data.walls) && data.walls.length > 0 ? data.walls : defaultWalls;
      
      if (!frames.length) return res.status(200).json(fallback);
      return res.status(200).json({ frames, walls, objects: normalizeObjects(data.objects), lighting: normalizeLighting(data.lighting), isDefault: false, updated_at: data.updated_at });
    } catch (e) {
      console.error('layout GET crashed:', e);
      return res.status(200).json(fallback);
    }
  }

  if (req.method === 'PUT') {
    const admin = getAdminFromReq(req);
    if (!admin) return res.status(401).json({ error: 'غير مصرح — سجّل الدخول أولاً' });
    if (!supabase) return res.status(500).json({ error: 'الخادم غير مهيأ — تحقق من متغيرات بيئة Supabase' });

    try {
      const { frames: rawFrames, walls: rawWalls, photoSlots, objects: rawObjects, lighting: rawLighting } = req.body || {};
      const lighting = normalizeLighting(rawLighting);
      const objects = Array.isArray(rawObjects) ? normalizeObjects(rawObjects) : null;
      if (!Array.isArray(rawFrames) || rawFrames.length === 0) {
        return res.status(400).json({ error: 'لا يمكن حفظ تخطيط بلا إطارات' });
      }
      const frames = normalizeFrames(rawFrames);
      if (frames.length !== rawFrames.length) {
        return res.status(400).json({ error: 'يوجد إطار برقم مكرر أو بيانات غير صالحة — راجع أرقام الإطارات' });
      }

      const walls = Array.isArray(rawWalls) ? rawWalls : defaultWalls;

      // الرقم السابق لكل إطار (o) لتسجيل إعادة الترقيم بدقة — يُقرأ من الطلب الخام
      const oByN = new Map(rawFrames.map((f) => [Math.round(Number(f.n)), f.o]));
      const framesForDiff = frames.map((f) => ({ ...f, o: oByN.get(f.n) }));

      // الحالة السابقة (قبل الحفظ) لحساب الفروقات
      let prevFrames = DEFAULT_FRAMES;
      let prevWalls = defaultWalls;
      try {
        const { data: prev } = await supabase.from('gallery_layout').select('frames, walls').eq('id', 1).maybeSingle();
        if (prev) {
          const pf = normalizeFrames(prev.frames);
          if (pf.length) prevFrames = pf;
          if (Array.isArray(prev.walls) && prev.walls.length) prevWalls = prev.walls;
        }
      } catch (e) { /* نستخدم الافتراضي */ }
      const { data: prevPhotos } = await supabase.from('photos').select('id, title, slot_index');
      const prevSlots = new Map((prevPhotos || []).map((p) => [String(p.id), p.slot_index ?? null]));
      const photoTitles = new Map((prevPhotos || []).map((p) => [String(p.id), p.title || 'بدون عنوان']));

      let prevObjsBefore = [];
      try { const { data: po0 } = await supabase.from('gallery_layout').select('objects').eq('id', 1).maybeSingle(); prevObjsBefore = normalizeObjects(po0 && po0.objects) || []; } catch (e) {}
 const baseRow = { id: 1, frames, walls, updated_at: new Date().toISOString(), updated_by: admin.username || null };
      let objectsSaved = true;
      let { error } = await supabase.from('gallery_layout').upsert([{ ...baseRow, ...(objects ? { objects } : {}), ...(lighting ? { lighting } : {}) }], { onConflict: 'id' });
      if (error && lighting && /lighting/.test(error.message)) {
        ({ error } = await supabase.from('gallery_layout').upsert([{ ...baseRow, ...(objects ? { objects } : {}) }], { onConflict: 'id' }));
      }
      if (error && objects && /objects/.test(error.message)) {
        // عمود objects غير موجود — نحفظ الباقي ونُنبّه
        objectsSaved = false;
        ({ error } = await supabase.from('gallery_layout').upsert([baseRow], { onConflict: 'id' }));
      }

      if (error) {
        const missing = /gallery_layout/.test(error.message) && /(does not exist|schema cache|relation)/i.test(error.message);
        return res.status(500).json({
          error: missing ? 'جدول gallery_layout غير موجود — نفّذ ملف الـ SQL المحدث في Supabase أولاً' : error.message
        });
      }

      let photosUpdated = 0;
      if (photoSlots && typeof photoSlots === 'object') {
        const valid = new Set(frames.map((f) => f.n));
        const { data: current } = await supabase.from('photos').select('id, slot_index');
        const curMap = new Map((current || []).map((p) => [String(p.id), p.slot_index ?? null]));
        for (const [id, slotRaw] of Object.entries(photoSlots)) {
          if (!curMap.has(String(id))) continue;
          const slot = slotRaw === null || slotRaw === '' || slotRaw === undefined ? null : Number(slotRaw);
          if (slot !== null && !valid.has(slot)) continue;
          if (curMap.get(String(id)) === slot) continue;
          const { error: upErr } = await supabase.from('photos').update({ slot_index: slot }).eq('id', id);
          if (!upErr) photosUpdated++;
        }
      }

      let objLines = [];
      if (objects) {
        objLines = diffObjects(prevObjsBefore, objects);
      }
      const d = diffLayout({ prevFrames, newFrames: framesForDiff, prevWalls, newWalls: walls, prevSlots, newSlots: photoSlots, photoTitles });
      const summary = objLines.length ? (d.lines.length ? d.summary + '، ' : 'حفظ المعرض: ') + objLines.length + ' تغيير في المجسمات' : d.summary;
      await logAdmin(supabase, req, admin, 'layout', 'layout.save', summary, { lines: [...d.lines, ...objLines], counts: d.counts, frames: frames.length, walls: walls.length, objects: objects ? objects.length : null });

      return res.status(200).json({ ok: true, frames: frames.length, walls: walls.length, photosUpdated, objectsSaved });
    } catch (e) {
      console.error('layout PUT crashed:', e);
      return res.status(500).json({ error: 'تعذّر حفظ التخطيط والجدران' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
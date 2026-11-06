import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../lib/auth';
import { DEFAULT_FRAMES, normalizeFrames } from '../../lib/galleryLayout';

// GET عام: تخطيط إطارات الصالة (يستخدمه المعرض والمحرر). عند غياب الجدول أو
// الصف يُرجع التخطيط الافتراضي (٢٥ إطاراً) فلا ينكسر المعرض أبداً.
// PUT للأدمن فقط: يحفظ التخطيط + ربط الصور بالإطارات (photoSlots).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const fallback = { frames: DEFAULT_FRAMES, isDefault: true, updated_at: null };
    if (!supabase) return res.status(200).json(fallback);
    try {
      const { data, error } = await supabase.from('gallery_layout').select('frames, updated_at').eq('id', 1).maybeSingle();
      if (error || !data) return res.status(200).json(fallback);
      const frames = normalizeFrames(data.frames);
      if (!frames.length) return res.status(200).json(fallback);
      return res.status(200).json({ frames, isDefault: false, updated_at: data.updated_at });
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
      const { frames: rawFrames, photoSlots } = req.body || {};
      if (!Array.isArray(rawFrames) || rawFrames.length === 0) {
        return res.status(400).json({ error: 'لا يمكن حفظ تخطيط بلا إطارات' });
      }
      const frames = normalizeFrames(rawFrames);
      if (frames.length !== rawFrames.length) {
        return res.status(400).json({ error: 'يوجد إطار برقم مكرر أو بيانات غير صالحة — راجع أرقام الإطارات' });
      }

      const { error } = await supabase
        .from('gallery_layout')
        .upsert([{ id: 1, frames, updated_at: new Date().toISOString(), updated_by: admin.username || null }], { onConflict: 'id' });
      if (error) {
        const missing = /gallery_layout/.test(error.message) && /(does not exist|schema cache|relation)/i.test(error.message);
        return res.status(500).json({
          error: missing ? 'جدول gallery_layout غير موجود — نفّذ supabase_update_v10.3.sql في Supabase أولاً' : error.message
        });
      }

      // ربط الصور بالإطارات: { "<photo_id>": رقم_الإطار | null }
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

      return res.status(200).json({ ok: true, frames: frames.length, photosUpdated });
    } catch (e) {
      console.error('layout PUT crashed:', e);
      return res.status(500).json({ error: 'تعذّر حفظ التخطيط' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

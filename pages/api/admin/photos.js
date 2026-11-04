import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../../lib/auth';

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } }
};

const BUCKET = 'gallery-photos';

export default async function handler(req, res) {
  const admin = getAdminFromReq(req);
  if (!admin) return res.status(401).json({ error: 'غير مصرح — سجّل الدخول أولاً' });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'الخادم غير مهيأ — تحقق من متغيرات بيئة Supabase' });

  // ---- GET: قائمة الصور لعرضها في لوحة التحكم ----
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // ---- POST: رفع صورة جديدة ----
  // body: { fileBase64: "data:image/jpeg;base64,....", fileName, title, photographer, camera, year, location }
  if (req.method === 'POST') {
    try {
      const { fileBase64, fileName, title, photographer, camera, year, location } = req.body || {};
      if (!fileBase64 || !fileName) return res.status(400).json({ error: 'الملف مفقود' });

      const match = fileBase64.match(/^data:(.+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: 'صيغة الملف غير صحيحة' });
      const mime = match[1];
      const buffer = Buffer.from(match[2], 'base64');

      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: mime, upsert: false });
      if (uploadErr) return res.status(500).json({ error: 'فشل رفع الملف: ' + uploadErr.message });

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      const image_url = pub?.publicUrl;

      const { data: countData } = await supabase.from('photos').select('id', { count: 'exact', head: true });
      const nextOrder = (countData?.length || 0) + 1;

      const { data, error } = await supabase
        .from('photos')
        .insert([{
          title: title || 'لوحة فنية',
          photographer: photographer || null,
          camera: camera || null,
          year: year || null,
          location: location || null,
          image_url,
          storage_path: storagePath,
          sort_order: nextOrder
        }])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    } catch (e) {
      console.error('photo upload crashed:', e);
      return res.status(500).json({ error: 'خطأ غير متوقع أثناء الرفع' });
    }
  }

  // ---- PUT: إعادة ترتيب الصور ----
  // body: { order: [{ id, sort_order }, ...] }
  if (req.method === 'PUT') {
    try {
      const { order } = req.body || {};
      if (!Array.isArray(order)) return res.status(400).json({ error: 'بيانات الترتيب غير صحيحة' });
      for (const item of order) {
        await supabase.from('photos').update({ sort_order: item.sort_order }).eq('id', item.id);
      }
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('reorder crashed:', e);
      return res.status(500).json({ error: 'تعذّر حفظ الترتيب' });
    }
  }

  // ---- DELETE: حذف صورة ----
  // body: { id }
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'المعرّف مفقود' });

      const { data: row } = await supabase.from('photos').select('storage_path').eq('id', id).single();
      if (row?.storage_path) {
        await supabase.storage.from(BUCKET).remove([row.storage_path]);
      }
      const { error } = await supabase.from('photos').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('delete crashed:', e);
      return res.status(500).json({ error: 'تعذّر حذف الصورة' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

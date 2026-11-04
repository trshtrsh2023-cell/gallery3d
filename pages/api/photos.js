import { getSupabasePublic } from '../../lib/supabaseAdmin';

// عام: يُستخدم من صفحة المعرض لجلب قائمة اللوحات. لا يتطلب تسجيل دخول،
// ويُرجع مصفوفة فارغة بدلاً من خطأ 500 إذا لم تُضبط متغيرات البيئة بعد
// (الواجهة الأمامية لديها صور افتراضية احتياطية في هذه الحالة).
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabasePublic();
    if (!supabase) return res.status(200).json([]);

    const { data, error } = await supabase
      .from('photos')
      .select('id, title, photographer, camera, year, location, image_url')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('photos fetch error:', error.message);
      return res.status(200).json([]);
    }

    return res.status(200).json(data || []);
  } catch (e) {
    console.error('photos handler crashed:', e);
    return res.status(200).json([]);
  }
}

import crypto from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../lib/auth';

// POST عام: يسجّل دخول زائر جديد (اسمه فقط، بدون تسجيل دخول) — يُستدعى
// من صفحة المعرض الرئيسية عند الضغط على "دخول المعرض".
// GET محمي للأدمن فقط: يُرجع سجل آخر الزيارات لعرضه في لوحة التحكم.
export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(200).json(req.method === 'GET' ? [] : { ok: false });

  if (req.method === 'POST') {
    try {
      const { visitor_name } = req.body || {};
      const name = (visitor_name || '').toString().trim().slice(0, 80) || 'زائر بدون اسم';
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
      const ip_hash = ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24) : null;
      const user_agent = (req.headers['user-agent'] || '').slice(0, 300);

      const { error } = await supabase.from('visits').insert([{ visitor_name: name, ip_hash, user_agent }]);
      if (error) console.error('visit insert error:', error.message);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('visits POST crashed:', e);
      return res.status(200).json({ ok: false });
    }
  }

  if (req.method === 'GET') {
    const admin = getAdminFromReq(req);
    if (!admin) return res.status(401).json({ error: 'غير مصرح' });
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visitor_name, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) {
        console.error('visits GET error:', error.message);
        return res.status(200).json([]);
      }
      return res.status(200).json(data || []);
    } catch (e) {
      console.error('visits GET crashed:', e);
      return res.status(200).json([]);
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

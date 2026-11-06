import crypto from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../lib/auth';
import { parseUserAgent, geoFromHeaders } from '../../lib/device';

// POST عام: يسجّل دخول زائر جديد (اسمه + معلومات جهازه) — يُستدعى
// من صفحة المعرض الرئيسية عند الضغط على "دخول المعرض".
// GET محمي للأدمن فقط: يُرجع سجل آخر الزيارات لعرضه في لوحة التحكم.
export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(200).json(req.method === 'GET' ? [] : { ok: false });

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const name = (body.visitor_name || '').toString().trim().slice(0, 80) || 'زائر بدون اسم';
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
      const ip_hash = ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24) : null;
      const user_agent = (req.headers['user-agent'] || '').slice(0, 300);

      const dev = parseUserAgent(user_agent, { touch: body.touch, model: body.model });
      const geo = geoFromHeaders(req.headers);
      const screenStr = /^\d{2,5}x\d{2,5}$/.test(String(body.screen || '')) ? String(body.screen) : null;

      const basic = { visitor_name: name, ip_hash, user_agent };
      const full = {
        ...basic,
        ...dev,
        screen: screenStr,
        language: body.lang ? String(body.lang).slice(0, 16) : null,
        country: geo.country,
        city: geo.city
      };

      let { error } = await supabase.from('visits').insert([full]);
      if (error) {
        // الأعمدة الجديدة غير موجودة بعد (لم يُنفَّذ supabase_update_v10.3.sql):
        // نسجّل الزيارة بالحقول الأساسية حتى لا نفقد أي زيارة
        console.error('visit insert (full) error:', error.message);
        ({ error } = await supabase.from('visits').insert([basic]));
        if (error) console.error('visit insert (basic) error:', error.message);
      }
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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) {
        console.error('visits GET error:', error.message);
        return res.status(200).json([]);
      }
      // لا نُرجع ip_hash ولا user_agent الخام للواجهة (غير لازمين للعرض)
      const rows = (data || []).map((v) => {
        // الزيارات القديمة (قبل إضافة أعمدة الجهاز) نستخرج جهازها من user_agent المحفوظ
        const d = v.device_type ? v : { ...v, ...parseUserAgent(v.user_agent || '') };
        return {
        id: v.id,
        visitor_name: v.visitor_name,
        created_at: v.created_at,
        device_type: d.device_type || null,
        os: d.os || null,
        browser: d.browser || null,
        device_model: d.device_model || null,
        screen: v.screen || null,
        language: v.language || null,
        country: v.country || null,
        city: v.city || null,
        visitor_key: v.ip_hash || null
        };
      });
      return res.status(200).json(rows);
    } catch (e) {
      console.error('visits GET crashed:', e);
      return res.status(200).json([]);
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

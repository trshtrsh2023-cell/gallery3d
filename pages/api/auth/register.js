import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { signMemberToken, setMemberCookie } from '../../../lib/auth';
import { validateRegistration } from '../../../lib/memberRules';
import { limited } from '../../../lib/rateLimit';

// تسجيل عضو جديد: اسم مستخدم + بريد + كلمة مرور + الاسم الثلاثي الحقيقي
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (limited(req, 'register', 6, 60 * 60 * 1000)) return res.status(429).json({ error: 'محاولات تسجيل كثيرة، حاول لاحقاً' });
  try {
    const v = validateRegistration(req.body || {});
    if (!v.ok) return res.status(400).json({ error: v.error });
    const { username, email, password, fullName } = v.value;
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: 'الخادم غير مهيأ' });

    const { data: dupU } = await supabase.from('members').select('id').eq('username', username).maybeSingle();
    if (dupU) return res.status(409).json({ error: 'اسم المستخدم مستخدم، اختر اسماً آخر' });
    const { data: dupE } = await supabase.from('members').select('id').eq('email', email).maybeSingle();
    if (dupE) return res.status(409).json({ error: 'هذا البريد مسجّل مسبقاً — جرّب تسجيل الدخول' });
    const { data: admE } = await supabase.from('admins').select('id').eq('username', username).maybeSingle();
    if (admE) return res.status(409).json({ error: 'اسم المستخدم مستخدم، اختر اسماً آخر' });

    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('members')
      .insert([{ username, email, full_name: fullName, password_hash, role: 'member', last_login: new Date().toISOString() }])
      .select('id, username, full_name, role')
      .single();
    if (error) {
      const missing = /members/.test(error.message) && /(does not exist|schema cache|relation)/i.test(error.message);
      return res.status(500).json({ error: missing ? 'جدول الأعضاء غير موجود — نفّذ ملف supabase_update_v11.sql' : 'تعذّر إنشاء الحساب' });
    }
    setMemberCookie(res, signMemberToken({ id: data.id, username: data.username, name: data.full_name, role: 'member' }));
    return res.status(200).json({ ok: true, user: { username: data.username, name: data.full_name, role: 'member' } });
  } catch (e) {
    console.error('register crashed:', e);
    return res.status(500).json({ error: 'خطأ غير متوقع' });
  }
}

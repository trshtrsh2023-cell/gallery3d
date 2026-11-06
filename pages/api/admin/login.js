import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { signAdminToken, setAdminCookie } from '../../../lib/auth';
import { logAdmin } from '../../../lib/adminLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(500).json({ error: 'الخادم غير مهيأ — تحقق من متغيرات بيئة Supabase' });
    }

    const { data, error } = await supabase
      .from('admins')
      .select('id, username, password_hash')
      .eq('username', username.trim())
      .single();

    if (error || !data) {
      await logAdmin(supabase, req, String(username).trim().slice(0, 60), 'auth', 'auth.login_failed', 'محاولة دخول فاشلة (اسم مستخدم غير موجود)', null);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const ok = await bcrypt.compare(password, data.password_hash);
    if (!ok) {
      await logAdmin(supabase, req, data.username, 'auth', 'auth.login_failed', 'محاولة دخول فاشلة (كلمة مرور خاطئة)', null);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const token = signAdminToken({ id: data.id, username: data.username });
    setAdminCookie(res, token);
    await logAdmin(supabase, req, data.username, 'auth', 'auth.login', 'تسجيل دخول إلى لوحة الإدارة', null);
    return res.status(200).json({ ok: true, username: data.username });
  } catch (e) {
    console.error('admin login crashed:', e);
    return res.status(500).json({ error: 'خطأ غير متوقع في الخادم' });
  }
}

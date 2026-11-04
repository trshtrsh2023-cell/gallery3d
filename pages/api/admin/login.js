import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { signAdminToken, setAdminCookie } from '../../../lib/auth';

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
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const ok = await bcrypt.compare(password, data.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const token = signAdminToken({ id: data.id, username: data.username });
    setAdminCookie(res, token);
    return res.status(200).json({ ok: true, username: data.username });
  } catch (e) {
    console.error('admin login crashed:', e);
    return res.status(500).json({ error: 'خطأ غير متوقع في الخادم' });
  }
}

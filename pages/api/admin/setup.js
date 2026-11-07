import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { logAdmin } from '../../../lib/adminLog';

// نقطة إنشاء أول حساب أدمن دون الحاجة لتشغيل bcrypt يدوياً محلياً.
// محمية بـ ADMIN_SETUP_SECRET (متغيّر بيئة تضعه أنت) — إن لم يتطابق تُرفض.
// بعد وجود حساب أدمن واحد على الأقل، تبقى هذه النقطة تعمل فقط لمن يملك
// السر، حتى تتمكن من إضافة حساب احتياطي إن فقدت كلمة المرور.
export default async function handler(req, res) {
  // GET: هل يلزم الإعداد الأول؟ (لا يوجد أي حساب أدمن بعد) — يُستخدم لإظهار رابط الإعداد فقط عند الحاجة
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(200).json({ needed: false });
      const { count, error } = await sb.from('admins').select('id', { count: 'exact', head: true });
      return res.status(200).json({ needed: !error && count === 0 });
    } catch (e) { return res.status(200).json({ needed: false }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { secret, username, password } = req.body || {};
    const expected = process.env.ADMIN_SETUP_SECRET;

    if (!expected) {
      return res.status(500).json({ error: 'لم يتم ضبط ADMIN_SETUP_SECRET في متغيرات البيئة — أضفه أولاً ثم أعد المحاولة' });
    }
    if (!secret || secret !== expected) {
      return res.status(401).json({ error: 'سر الإعداد غير صحيح' });
    }
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب، وكلمة المرور يجب ألا تقل عن 6 أحرف' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(500).json({ error: 'تعذّر الاتصال بقاعدة البيانات — تحقق من NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('admins')
      .upsert([{ username: username.trim(), password_hash }], { onConflict: 'username' })
      .select('id, username')
      .single();

    if (error) {
      return res.status(500).json({ error: 'فشل إنشاء الحساب في Supabase: ' + error.message });
    }

    await logAdmin(supabase, req, data.username, 'admin', 'admin.setup', `إنشاء/تحديث الحساب «${data.username}» عبر صفحة الإعداد (بسر الإعداد)`, null);
    return res.status(200).json({ ok: true, username: data.username });
  } catch (e) {
    console.error('admin setup crashed:', e);
    return res.status(500).json({ error: 'خطأ غير متوقع في الخادم' });
  }
}

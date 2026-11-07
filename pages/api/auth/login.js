import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { signMemberToken, setMemberCookie, signAdminToken, setAdminCookie } from '../../../lib/auth';
import { limited } from '../../../lib/rateLimit';
import { logAdmin } from '../../../lib/adminLog';

// دخول موحّد من واجهة المعرض: اسم مستخدم أو بريد + كلمة مرور — للأعضاء وللإداريين.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (limited(req, 'login', 10, 10 * 60 * 1000)) return res.status(429).json({ error: 'محاولات كثيرة، حاول بعد عدة دقائق' });
  try {
    const identifier = String((req.body && req.body.identifier) || '').trim().toLowerCase().slice(0, 120);
    const password = String((req.body && req.body.password) || '');
    if (!identifier || !password) return res.status(400).json({ error: 'أدخل اسم المستخدم أو البريد وكلمة المرور' });
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: 'الخادم غير مهيأ' });

    const find = async (table, cols) => {
      let { data } = await supabase.from(table).select(cols).eq('username', identifier).maybeSingle();
      if (!data) ({ data } = await supabase.from(table).select(cols).eq('email', identifier).maybeSingle());
      return data;
    };

    // 1) الأعضاء
    const m = await find('members', 'id, username, full_name, role, password_hash');
    if (m && m.password_hash && (await bcrypt.compare(password, m.password_hash))) {
      await supabase.from('members').update({ last_login: new Date().toISOString() }).eq('id', m.id);
      setMemberCookie(res, signMemberToken({ id: m.id, username: m.username, name: m.full_name, role: 'member' }));
      return res.status(200).json({ ok: true, user: { username: m.username, name: m.full_name, role: 'member' } });
    }

    // 2) الإداريون (حساب أدمن: اسم المستخدم أو البريد إن وُجد)
    let a = null;
    try { a = await find('admins', 'id, username, password_hash'); } catch (e) {}
    if (!a) {
      const { data: a2 } = await supabase.from('admins').select('id, username, password_hash').eq('username', String((req.body && req.body.identifier) || '').trim()).maybeSingle();
      a = a2 || null;
    }
    if (a && (await bcrypt.compare(password, a.password_hash))) {
      setAdminCookie(res, signAdminToken({ id: a.id, username: a.username }));
      setMemberCookie(res, signMemberToken({ id: 'a' + a.id, username: a.username, name: a.username, role: 'admin' }));
      await logAdmin(supabase, req, a.username, 'auth', 'auth.login', 'تسجيل دخول إداري من واجهة المعرض', null);
      return res.status(200).json({ ok: true, user: { username: a.username, name: a.username, role: 'admin' } });
    }
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  } catch (e) {
    console.error('auth login crashed:', e);
    return res.status(500).json({ error: 'خطأ غير متوقع' });
  }
}

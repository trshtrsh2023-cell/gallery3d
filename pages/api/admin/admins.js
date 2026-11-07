import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../../lib/auth';
import { logAdmin } from '../../../lib/adminLog';

// إدارة حسابات الإداريين — محمية بالكامل، يجب أن تكون مسجّل دخول كأدمن
export default async function handler(req, res) {
  const me = getAdminFromReq(req);
  if (!me) return res.status(401).json({ error: 'غير مصرح' });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'الخادم غير مهيأ' });

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('admins').select('id, username, created_at').order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    try {
      const { username, password } = req.body || {};
      const email = String((req.body && req.body.email) || '').trim().toLowerCase().slice(0, 120);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'البريد الإلكتروني غير صالح' });
      if (!username || !password || password.length < 6) {
        return res.status(400).json({ error: 'اسم المستخدم مطلوب وكلمة المرور ٦ أحرف على الأقل' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      let { data, error } = await supabase
        .from('admins')
        .insert([{ username: username.trim(), password_hash, ...(email ? { email } : {}) }])
        .select('id, username, created_at')
        .single();
      if (error && email && /email/.test(error.message)) {
        ({ data, error } = await supabase.from('admins').insert([{ username: username.trim(), password_hash }]).select('id, username, created_at').single());
      }
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'اسم المستخدم موجود مسبقاً' });
        return res.status(500).json({ error: error.message });
      }
      await logAdmin(supabase, req, me, 'admin', 'admin.create', `إضافة إداري جديد «${data.username}»`, { username: data.username });
      return res.status(200).json(data);
    } catch (e) {
      console.error('admin create crashed:', e);
      return res.status(500).json({ error: 'خطأ غير متوقع' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'المعرّف مفقود' });
      if (String(id) === String(me.id)) {
        return res.status(400).json({ error: 'لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول به' });
      }
      const { count } = await supabase.from('admins').select('id', { count: 'exact', head: true });
      if ((count || 0) <= 1) {
        return res.status(400).json({ error: 'لا يمكن حذف آخر حساب أدمن متبقٍ' });
      }
      const { data: target } = await supabase.from('admins').select('username').eq('id', id).maybeSingle();
      const { error } = await supabase.from('admins').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      await logAdmin(supabase, req, me, 'admin', 'admin.delete', `حذف حساب الإداري «${(target && target.username) || id}»`, { username: target && target.username });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('admin delete crashed:', e);
      return res.status(500).json({ error: 'خطأ غير متوقع' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

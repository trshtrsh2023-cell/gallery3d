import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../../lib/auth';
import { logAdmin } from '../../../lib/adminLog';

// إدارة الأعضاء (للإداريين فقط): عرض + حذف
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const admin = getAdminFromReq(req);
  if (!admin) return res.status(401).json({ error: 'غير مصرّح' });
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(200).json({ rows: [] });

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('members').select('id, created_at, username, email, full_name, role, last_login, google_sub').order('id', { ascending: false }).limit(1000);
    if (error) return res.status(200).json({ rows: [], missing: /does not exist|relation|schema cache/i.test(error.message) });
    return res.status(200).json({ rows: (data || []).map((m) => ({ ...m, google: !!m.google_sub, google_sub: undefined })) });
  }
  if (req.method === 'DELETE') {
    const id = parseInt((req.body && req.body.id) || 0, 10);
    if (!id) return res.status(400).json({ error: 'معرّف مفقود' });
    const { data: row } = await supabase.from('members').select('username, email').eq('id', id).maybeSingle();
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'تعذّر الحذف' });
    await logAdmin(supabase, req, admin, 'admin', 'member.delete', `حذف العضو «${row ? row.username : '؟'}»`, null);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

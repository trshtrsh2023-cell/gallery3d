import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../../lib/auth';
import { logAdmin } from '../../../lib/adminLog';
import { checkMessage } from '../../../lib/chatFilter';

// إدارة الدردشة (للإداريين): عرض الرسائل الحالية (آخر ١٥ ساعة)، تعديل رسالة، حذف رسالة، مسح الكل.
const TTL_MS = 15 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const admin = getAdminFromReq(req);
  if (!admin) return res.status(401).json({ error: 'غير مصرّح' });
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(200).json({ rows: [], missing: false });
  const cutoff = new Date(Date.now() - TTL_MS).toISOString();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, created_at, name, message')
      .gt('created_at', cutoff)
      .order('id', { ascending: false })
      .limit(500);
    if (error) return res.status(200).json({ rows: [], missing: /does not exist|relation|schema cache/i.test(error.message) });
    return res.status(200).json({ rows: data || [] });
  }

  const body = req.body || {};

  if (req.method === 'PUT') {
    const id = parseInt(body.id, 10);
    const message = String(body.message || '').replace(/\s+/g, ' ').trim().slice(0, 280);
    if (!id || !message) return res.status(400).json({ error: 'بيانات ناقصة' });
    const cm = checkMessage(message);
    if (!cm.ok) return res.status(400).json({ error: cm.reason });
    const { data: before } = await supabase.from('chat_messages').select('name, message').eq('id', id).maybeSingle();
    if (!before) return res.status(404).json({ error: 'الرسالة غير موجودة' });
    const { error } = await supabase.from('chat_messages').update({ message }).eq('id', id);
    if (error) return res.status(500).json({ error: 'تعذّر التعديل' });
    await logAdmin(supabase, req, admin, 'chat', 'chat.edit', `تعديل رسالة دردشة من «${before.name}»`, { lines: [`قبل: «${before.message}»`, `بعد: «${message}»`] });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (body.all) {
      const { error } = await supabase.from('chat_messages').delete().gt('id', 0);
      if (error) return res.status(500).json({ error: 'تعذّر المسح' });
      await logAdmin(supabase, req, admin, 'chat', 'chat.clear', 'مسح كل رسائل الدردشة', null);
      return res.status(200).json({ ok: true });
    }
    const id = parseInt(body.id, 10);
    if (!id) return res.status(400).json({ error: 'معرّف مفقود' });
    const { data: row } = await supabase.from('chat_messages').select('name, message').eq('id', id).maybeSingle();
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'تعذّر الحذف' });
    await logAdmin(supabase, req, admin, 'chat', 'chat.delete', `حذف رسالة دردشة من «${row ? row.name : '؟'}»`, { lines: row ? [`«${row.message}»`] : [] });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

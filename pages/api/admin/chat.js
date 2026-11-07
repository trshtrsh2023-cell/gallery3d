import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../../lib/auth';
import { logAdmin } from '../../../lib/adminLog';
import { checkMessage } from '../../../lib/chatFilter';

// إدارة الدردشة (للإداريين): السجل دائم — لا يُحذف شيء فعلياً.
// GET: كل الرسائل (المعتمدة، بانتظار الموافقة، المرفوضة، المحذوفة)
// PUT: تعديل نص رسالة (يُحفظ النص الأصلي)
// PATCH: { id, action: approve | reject | restore }
// DELETE: حذف ناعم (تبقى وتظهر «محذوفة» بالأحمر)
const COLS = 'id, created_at, name, message, role, status, deleted, deleted_at, deleted_by, original_message, edited_at';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const admin = getAdminFromReq(req);
  if (!admin) return res.status(401).json({ error: 'غير مصرّح' });
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(200).json({ rows: [], missing: false });

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('chat_messages').select(COLS).order('id', { ascending: false }).limit(1500);
    if (error) return res.status(200).json({ rows: [], missing: /does not exist|relation|schema cache|column/i.test(error.message) });
    return res.status(200).json({ rows: data || [] });
  }

  const body = req.body || {};
  const id = parseInt(body.id, 10);
  if (!id) return res.status(400).json({ error: 'معرّف مفقود' });
  const { data: before } = await supabase.from('chat_messages').select('name, message, original_message').eq('id', id).maybeSingle();
  if (!before) return res.status(404).json({ error: 'الرسالة غير موجودة' });

  if (req.method === 'PUT') {
    const message = String(body.message || '').replace(/\s+/g, ' ').trim().slice(0, 280);
    if (!message) return res.status(400).json({ error: 'الرسالة فارغة' });
    const cm = checkMessage(message);
    if (!cm.ok) return res.status(400).json({ error: cm.reason });
    const { error } = await supabase.from('chat_messages').update({ message, original_message: before.original_message || before.message, edited_at: new Date().toISOString() }).eq('id', id);
    if (error) return res.status(500).json({ error: 'تعذّر التعديل' });
    await logAdmin(supabase, req, admin, 'chat', 'chat.edit', `تعديل رسالة دردشة من «${before.name}»`, { lines: [`قبل: «${before.message}»`, `بعد: «${message}»`] });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    const action = body.action;
    let patch = null, label = '';
    if (action === 'approve') { patch = { status: 'approved' }; label = 'الموافقة على'; }
    else if (action === 'reject') { patch = { status: 'rejected' }; label = 'رفض'; }
    else if (action === 'restore') { patch = { deleted: false, deleted_at: null, deleted_by: null }; label = 'استعادة'; }
    if (!patch) return res.status(400).json({ error: 'إجراء غير معروف' });
    const { error } = await supabase.from('chat_messages').update(patch).eq('id', id);
    if (error) return res.status(500).json({ error: 'تعذّر التنفيذ' });
    await logAdmin(supabase, req, admin, 'chat', 'chat.' + action, `${label} رسالة دردشة من «${before.name}»`, { lines: [`«${before.message}»`] });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('chat_messages').update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: admin.username || null }).eq('id', id);
    if (error) return res.status(500).json({ error: 'تعذّر الحذف' });
    await logAdmin(supabase, req, admin, 'chat', 'chat.delete', `حذف رسالة دردشة من «${before.name}» (تبقى في السجل)`, { lines: [`«${before.message}»`] });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

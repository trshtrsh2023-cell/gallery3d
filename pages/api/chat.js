import crypto from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { getAdminFromReq, getMemberFromReq } from '../../lib/auth';
import { logAdmin } from '../../lib/adminLog';
import { checkMessage, checkName } from '../../lib/chatFilter';

// دردشة عامة دائمة: لا تُحذف الرسائل فعلياً. رسائل الزوار تحتاج موافقة الإدارة، ورسائل الأعضاء والإداريين تظهر مباشرة.
const MAX_MSG = 280;

const ipHash = (req) => {
  const ip = ((req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '').toString().split(',')[0].trim();
  return ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24) : null;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(200).json(req.method === 'GET' ? { messages: [] } : { ok: false, error: 'الخدمة غير مهيأة' });


  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, created_at, name, message, role')
        .eq('status', 'approved')
        .eq('deleted', false)
        .order('id', { ascending: false })
        .limit(150);
      if (error) {
        console.error('chat GET error:', error.message);
        return res.status(200).json({ messages: [], missing: /does not exist|relation|schema cache|column/i.test(error.message) });
      }
      return res.status(200).json({ messages: (data || []).reverse() });
    } catch (e) {
      return res.status(200).json({ messages: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const member = getMemberFromReq(req);
      const name = member ? String(member.username).slice(0, 30) : String((req.body && req.body.name) || '').replace(/\s+/g, ' ').trim().slice(0, 30);
      const message = String((req.body && req.body.message) || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
      if (name.length < 2) return res.status(400).json({ error: 'الاسم قصير' });
      if (!message) return res.status(400).json({ error: 'اكتب رسالة أولاً' });
      if (message.length > MAX_MSG) return res.status(400).json({ error: `الحد الأقصى ${MAX_MSG} حرفاً` });

      const cn = checkName(name);
      if (!cn.ok) return res.status(400).json({ error: cn.reason });
      const cm = checkMessage(message);
      if (!cm.ok) return res.status(400).json({ error: cm.reason });

      const h = ipHash(req);
      // منع الإغراق: ٥ رسائل/دقيقة، وعدم تكرار نفس النص
      if (h) {
        const since = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recent } = await supabase
          .from('chat_messages')
          .select('message, created_at')
          .eq('ip_hash', h)
          .gt('created_at', since)
          .order('created_at', { ascending: false })
          .limit(6);
        if (recent && recent.length >= 5) return res.status(429).json({ error: 'أرسلت رسائل كثيرة، انتظر قليلاً' });
        if (recent && recent.some((r) => r.message === message)) return res.status(429).json({ error: 'لا تكرر نفس الرسالة' });
        if (recent && recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 2000) return res.status(429).json({ error: 'تمهّل قليلاً بين الرسائل' });
      }

      const role = member ? (member.role === 'admin' ? 'admin' : 'member') : 'visitor';
      const status = member ? 'approved' : 'pending';
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ name, message, ip_hash: h, role, status, member_ref: member ? String(member.id) : null }])
        .select('id, created_at, name, message, role, status')
        .single();
      if (error) {
        console.error('chat POST error:', error.message);
        return res.status(500).json({ error: 'تعذّر الإرسال' });
      }
      return res.status(200).json({ ok: true, message: data });
    } catch (e) {
      console.error('chat POST crashed:', e);
      return res.status(500).json({ error: 'تعذّر الإرسال' });
    }
  }

  // حذف رسالة (للإداريين فقط) — حذف ناعم: تبقى في السجل وتظهر «محذوفة» بالأحمر
  if (req.method === 'DELETE') {
    const admin = getAdminFromReq(req);
    if (!admin) return res.status(401).json({ error: 'غير مصرّح' });
    const id = parseInt((req.body && req.body.id) || req.query.id, 10);
    if (!id) return res.status(400).json({ error: 'معرّف مفقود' });
    const { data: row } = await supabase.from('chat_messages').select('name, message').eq('id', id).maybeSingle();
    const { error } = await supabase.from('chat_messages').update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: admin.username || null }).eq('id', id);
    if (error) return res.status(500).json({ error: 'تعذّر الحذف' });
    await logAdmin(supabase, req, admin, 'chat', 'chat.delete', `حذف رسالة دردشة من «${row ? row.name : '؟'}» (تبقى في السجل)`, { lines: row ? [`«${row.message}»`] : [] });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

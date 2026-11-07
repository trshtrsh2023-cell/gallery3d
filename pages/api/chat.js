import crypto from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../lib/auth';
import { logAdmin } from '../../lib/adminLog';
import { checkMessage, checkName } from '../../lib/chatFilter';

// دردشة عامة مؤقتة: الرسالة يراها كل المتواجدين وتختفي بعد 15 ساعة.
const TTL_MS = 15 * 60 * 60 * 1000;
const MAX_MSG = 280;

const ipHash = (req) => {
  const ip = ((req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '').toString().split(',')[0].trim();
  return ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24) : null;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(200).json(req.method === 'GET' ? { messages: [] } : { ok: false, error: 'الخدمة غير مهيأة' });

  const cutoff = new Date(Date.now() - TTL_MS).toISOString();

  if (req.method === 'GET') {
    try {
      const after = parseInt(req.query.after, 10) || 0;
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, created_at, name, message')
        .gt('created_at', cutoff)
        .gt('id', after)
        .order('id', { ascending: true })
        .limit(150);
      if (error) {
        console.error('chat GET error:', error.message);
        return res.status(200).json({ messages: [], missing: /does not exist|relation|schema cache/i.test(error.message) });
      }
      return res.status(200).json({ messages: data || [] });
    } catch (e) {
      return res.status(200).json({ messages: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const name = String((req.body && req.body.name) || '').replace(/\s+/g, ' ').trim().slice(0, 30);
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

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ name, message, ip_hash: h }])
        .select('id, created_at, name, message')
        .single();
      if (error) {
        console.error('chat POST error:', error.message);
        return res.status(500).json({ error: 'تعذّر الإرسال' });
      }
      // تنظيف الرسائل المنتهية (أكثر من ١٥ ساعة)
      supabase.from('chat_messages').delete().lt('created_at', cutoff).then(() => {}, () => {});
      return res.status(200).json({ ok: true, message: data });
    } catch (e) {
      console.error('chat POST crashed:', e);
      return res.status(500).json({ error: 'تعذّر الإرسال' });
    }
  }

  // حذف رسالة (للإداريين فقط)
  if (req.method === 'DELETE') {
    const admin = getAdminFromReq(req);
    if (!admin) return res.status(401).json({ error: 'غير مصرّح' });
    const id = parseInt((req.body && req.body.id) || req.query.id, 10);
    if (!id) return res.status(400).json({ error: 'معرّف مفقود' });
    const { data: row } = await supabase.from('chat_messages').select('name, message').eq('id', id).maybeSingle();
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'تعذّر الحذف' });
    await logAdmin(supabase, req, admin, 'chat', 'chat.delete', `حذف رسالة دردشة من «${row ? row.name : '؟'}»`, { lines: row ? [`«${row.message}»`] : [] });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

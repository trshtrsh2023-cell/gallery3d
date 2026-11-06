import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

// "الزوار المتواجدون حالياً" — تواجد حي بسيط عبر نبضات (heartbeat) من
// المتصفح كل ٢٠ ثانية، بدل Supabase Realtime (أثبتت عدم الاستقرار سابقاً
// في هذا المشروع). أي جلسة لم تُرسل نبضة خلال آخر ٤٥ ثانية تُعتبر غائبة.
const ACTIVE_WINDOW_MS = 45000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(200).json(req.method === 'GET' ? { count: 0, names: [] } : { ok: false });
  }

  if (req.method === 'POST') {
    try {
      const { session_id, visitor_name, action } = req.body || {};
      if (!session_id) return res.status(400).json({ error: 'session_id مفقود' });
      if (action === 'leave') {
        await supabase.from('presence').delete().eq('session_id', String(session_id).slice(0, 64));
        return res.status(200).json({ ok: true });
      }
      const name = (visitor_name || 'زائر').toString().trim().slice(0, 80) || 'زائر';

      const { error } = await supabase
        .from('presence')
        .upsert([{ session_id: String(session_id).slice(0, 64), visitor_name: name, last_seen: new Date().toISOString() }], { onConflict: 'session_id' });

      if (error) console.error('presence upsert error:', error.message);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('presence POST crashed:', e);
      return res.status(200).json({ ok: false });
    }
  }

  if (req.method === 'GET') {
    try {
      const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
      const { data, error } = await supabase
        .from('presence')
        .select('visitor_name, last_seen')
        .gte('last_seen', cutoff)
        .order('last_seen', { ascending: false })
        .limit(200);

      if (error) {
        console.error('presence GET error:', error.message);
        return res.status(200).json({ count: 0, names: [] });
      }
      const names = (data || []).map((r) => r.visitor_name).filter(Boolean);
      return res.status(200).json({ count: names.length, names });
    } catch (e) {
      console.error('presence GET crashed:', e);
      return res.status(200).json({ count: 0, names: [] });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

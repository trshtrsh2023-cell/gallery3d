import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const sb = supabaseAdmin();

  if (req.method === 'POST') {
    // Upsert visitor position
    const { visitor_id, name, x, z, yaw } = req.body;
    if (!visitor_id || !name) return res.status(400).json({ error: 'Missing fields' });
    const { error } = await sb.from('visitors').upsert({
      visitor_id, name,
      x: parseFloat(x) || 0,
      z: parseFloat(z) || 0,
      yaw: parseFloat(yaw) || 0,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'visitor_id' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    // Get active visitors (seen in last 10 seconds)
    const since = new Date(Date.now() - 10000).toISOString();
    const { data, error } = await sb.from('visitors')
      .select('visitor_id,name,x,z,yaw')
      .gte('last_seen', since);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === 'DELETE') {
    const { visitor_id } = req.body;
    if (!visitor_id) return res.status(400).json({ error: 'Missing visitor_id' });
    await sb.from('visitors').delete().eq('visitor_id', visitor_id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

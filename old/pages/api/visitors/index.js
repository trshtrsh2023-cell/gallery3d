import { createClient } from '@supabase/supabase-js';

function getSB() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables'
    );
  }
  return createClient(url, key);
}

export default async function handler(req, res) {
  // Allow visitors API to fail gracefully — gallery still works without it
  try {
    const sb = getSB();

    if (req.method === 'POST') {
      const { visitor_id, name, x, z, yaw } = req.body || {};
      if (!visitor_id || !name) return res.status(400).json({ error: 'Missing fields' });
      const { error } = await sb.from('visitors').upsert(
        { visitor_id, name, x: +x||0, z: +z||0, yaw: +yaw||0, last_seen: new Date().toISOString() },
        { onConflict: 'visitor_id' }
      );
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const since = new Date(Date.now() - 12000).toISOString();
      const { data, error } = await sb.from('visitors')
        .select('visitor_id,name,x,z,yaw')
        .gte('last_seen', since);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    }

    if (req.method === 'DELETE') {
      const { visitor_id } = req.body || {};
      if (!visitor_id) return res.status(400).json({ error: 'Missing visitor_id' });
      await sb.from('visitors').delete().eq('visitor_id', visitor_id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    console.error('[visitors API]', e.message);
    // Return empty array for GET so gallery loads without crashing
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(500).json({ error: e.message });
  }
}

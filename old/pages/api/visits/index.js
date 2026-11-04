import { createClient } from '@supabase/supabase-js';

function getSB() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing env vars');
  return createClient(url, key);
}

function hashIP(ip) {
  let h = 5381;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) + h) ^ ip.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export default async function handler(req, res) {
  try {
    const sb = getSB();

    if (req.method === 'POST') {
      const rawIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const ip_hash = hashIP(rawIp);
      const { visitor_name = '' } = req.body || {};

      // Only count once per hour per IP
      const since = new Date(Date.now() - 3600000).toISOString();
      const { data: ex } = await sb.from('gallery_visits').select('id').eq('ip_hash', ip_hash).gte('visited_at', since).limit(1);
      if (!ex?.length) {
        await sb.from('gallery_visits').insert({
          ip_hash, visitor_name: visitor_name.slice(0, 50),
          user_agent: (req.headers['user-agent'] || '').slice(0, 200),
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const { count } = await sb.from('gallery_visits').select('*', { count: 'exact', head: true });
      const { data: recent } = await sb.from('gallery_visits')
        .select('visitor_name,visited_at,ip_hash')
        .order('visited_at', { ascending: false })
        .limit(200);
      return res.status(200).json({ count: count || 0, recent: recent || [] });
    }

    return res.status(405).end();
  } catch (e) {
    console.error('[visits]', e.message);
    if (req.method === 'GET') return res.status(200).json({ count: 0, recent: [] });
    return res.status(200).json({ ok: true });
  }
}

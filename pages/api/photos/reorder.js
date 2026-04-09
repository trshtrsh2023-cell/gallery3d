import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).end();
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Invalid' });
    for (const { id, position_index } of updates) {
      await sb.from('photos').update({ position_index }).eq('id', id);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

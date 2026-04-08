import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).end();
  const { updates } = req.body; // [{id, position_index}]
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'Invalid' });
  const sb = supabaseAdmin();
  for (const { id, position_index } of updates) {
    await sb.from('photos').update({ position_index }).eq('id', id);
  }
  return res.status(200).json({ ok: true });
}

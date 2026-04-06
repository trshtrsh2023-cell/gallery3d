import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('position_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
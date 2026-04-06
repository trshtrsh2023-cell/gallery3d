import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // تأكد أن الاسم هنا 'photos' وليس 'gallery-images'
  const { data, error } = await supabase
    .from('photos') 
    .select('*')
    .order('position_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
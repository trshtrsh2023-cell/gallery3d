import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const { id } = req.query;
  const sb = supabaseAdmin();

  const { data: photo } = await sb.from('photos').select('image_url').eq('id', id).single();

  if (photo?.image_url) {
    const fileName = photo.image_url.split('/').pop();
    await sb.storage.from('gallery-images').remove([fileName]);
  }

  const { error } = await sb.from('photos').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}

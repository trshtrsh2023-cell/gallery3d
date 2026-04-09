import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { id } = req.query;
    const { data: photo } = await sb.from('photos').select('image_url').eq('id', id).single();
    if (photo?.image_url) {
      const fileName = photo.image_url.split('/').pop();
      await sb.storage.from('gallery-images').remove([fileName]);
    }
    const { error } = await sb.from('photos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

import { supabaseAdmin } from '../../../lib/supabase';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // تعطيل المعالج التلقائي للسماح برفع الصور
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'خطأ في رفع الملف' });

    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    const title    = Array.isArray(fields.title)    ? fields.title[0]    : fields.title    || '';
    const subtitle = Array.isArray(fields.subtitle) ? fields.subtitle[0] : fields.subtitle || '';
    const posIdx   = parseInt(Array.isArray(fields.position_index) ? fields.position_index[0] : fields.position_index || '0');

    if (!file) return res.status(400).json({ error: 'لم يتم اختيار صورة' });

    const sb = supabaseAdmin();
    const ext = path.extname(file.originalFilename || file.newFilename || '.jpg');
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const buffer = fs.readFileSync(file.filepath);

    const { error: upErr } = await sb.storage
      .from('gallery-images')
      .upload(fileName, buffer, { contentType: file.mimetype });

    if (upErr) return res.status(500).json({ error: upErr.message });

    const { data: urlData } = sb.storage
      .from('gallery-images')
      .getPublicUrl(fileName);

    const { data, error: dbErr } = await sb
      .from('gallery-images')
      .insert({ title, subtitle, image_url: urlData.publicUrl, position_index: posIdx })
      .select()
      .single();

    if (dbErr) return res.status(500).json({ error: dbErr.message });
    return res.status(201).json(data);
  });
}

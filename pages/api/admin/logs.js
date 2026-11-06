import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAdminFromReq } from '../../../lib/auth';

// قراءة سجل نشاط الإداريين (للإداريين فقط). آخر ٢٠٠٠ سجل، الأحدث أولاً.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const admin = getAdminFromReq(req);
  if (!admin) return res.status(401).json({ error: 'غير مصرح' });
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(200).json({ rows: [], missing: false });
  const { data, error } = await supabase
    .from('admin_logs')
    .select('id, created_at, admin_username, category, action, summary, details, device')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) {
    const missing = /admin_logs/.test(error.message);
    return res.status(200).json({ rows: [], missing, error: error.message });
  }
  return res.status(200).json({ rows: data || [], missing: false });
}

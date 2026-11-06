import { clearAdminCookie, getAdminFromReq } from '../../../lib/auth';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { logAdmin } from '../../../lib/adminLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = getAdminFromReq(req);
  if (admin) await logAdmin(getSupabaseAdmin(), req, admin, 'auth', 'auth.logout', 'تسجيل خروج من لوحة الإدارة', null);
  clearAdminCookie(res);
  return res.status(200).json({ ok: true });
}

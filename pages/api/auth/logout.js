import { clearMemberCookie } from '../../../lib/auth';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  clearMemberCookie(res);
  return res.status(200).json({ ok: true });
}

import { clearAuthCookie } from '../../../lib/auth';

export default function handler(req, res) {
  clearAuthCookie(res);
  res.status(200).json({ ok: true });
}

import { getMemberFromReq } from '../../../lib/auth';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const m = getMemberFromReq(req);
  if (!m) return res.status(200).json({ user: null });
  return res.status(200).json({ user: { username: m.username, name: m.name, role: m.role } });
}

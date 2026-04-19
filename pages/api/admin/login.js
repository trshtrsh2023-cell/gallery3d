import { signToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = await signToken({ role: 'admin', username });
    setAuthCookie(res, token);
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
}

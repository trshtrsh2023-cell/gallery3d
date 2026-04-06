import { signToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;

  // الحساب الأول
  const isFirstAdmin = username === process.env.ADMIN_USERNAME && 
                     password === process.env.ADMIN_PASSWORD;

  // الحساب الثاني
  const isSecondAdmin = username === process.env.ADMIN_USERNAME_2 && 
                      password === process.env.ADMIN_PASSWORD_2;

  if (isFirstAdmin || isSecondAdmin) {
    const token = await signToken({ role: 'admin', username });
    setAuthCookie(res, token);
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
}
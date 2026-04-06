import { signToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;

  // تعريف الحساب الأول من متغيرات البيئة
  const admin1 = process.env.ADMIN_USERNAME;
  const pass1 = process.env.ADMIN_PASSWORD;

  // تعريف الحساب الثاني من متغيرات البيئة (التي ستضيفها في Vercel)
  const admin2 = process.env.ADMIN_USERNAME_2;
  const pass2 = process.env.ADMIN_PASSWORD_2;

  // التحقق مما إذا كانت البيانات تطابق الحساب الأول أو الحساب الثاني
  const isFirstAdmin = username === admin1 && password === pass1;
  const isSecondAdmin = admin2 && pass2 && username === admin2 && password === pass2;

  if (isFirstAdmin || isSecondAdmin) {
    const token = await signToken({ role: 'admin', username });
    setAuthCookie(res, token);
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
}
import { getAdminFromReq } from '../../../lib/auth';

// يُستخدم من لوحة التحكم للتحقق من وجود جلسة أدمن صالحة عند تحميل الصفحة
export default function handler(req, res) {
  const admin = getAdminFromReq(req);
  if (!admin) return res.status(401).json({ error: 'غير مسجل دخول' });
  return res.status(200).json({ ok: true, username: admin.username });
}

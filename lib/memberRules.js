import { checkName } from './chatFilter';

export const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// يرجع { ok, error, value }
export function validateRegistration(body) {
  const username = String(body.username || '').trim().toLowerCase();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const fullName = String(body.fullName || '').replace(/\s+/g, ' ').trim();
  if (!USERNAME_RE.test(username)) return { ok: false, error: 'اسم المستخدم 3–24 حرفاً إنجليزياً صغيراً أو أرقاماً أو (_ .)' };
  if (!EMAIL_RE.test(email) || email.length > 120) return { ok: false, error: 'البريد الإلكتروني غير صالح' };
  if (password.length < 8 || password.length > 100) return { ok: false, error: 'كلمة المرور 8 أحرف على الأقل' };
  if (!/[A-Za-zء-ي]/.test(password) || !/\d/.test(password)) return { ok: false, error: 'كلمة المرور يجب أن تحتوي على حروف وأرقام' };
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length < 3 || fullName.length > 80) return { ok: false, error: 'اكتب الاسم الثلاثي الحقيقي (ثلاث كلمات على الأقل)' };
  if (!checkName(fullName).ok || !checkName(username).ok) return { ok: false, error: 'الاسم يحتوي على ألفاظ غير لائقة' };
  return { ok: true, value: { username, email, password, fullName } };
}

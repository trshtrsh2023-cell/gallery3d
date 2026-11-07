// فلتر الألفاظ البذيئة للدردشة العامة (عربي + إنجليزي).
// يطبّع النص (تشكيل، تطويل، همزات، تكرار الحروف، أرقام بديلة) ثم يفحص:
//  1) كلمات كاملة (للكلمات القصيرة/الشائعة لتجنّب الإيجابيات الكاذبة)
//  2) احتواء داخل النص بعد حذف الفواصل (للألفاظ الفاحشة الطويلة فقط، لكشف التحايل بالمسافات)
// القوائم أدناه قابلة للتوسيع بسهولة.

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')       // تشكيل + تطويل
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[@]/g, 'a').replace(/\$/g, 's').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/5/g, 's')
    .replace(/(.)\1+/g, '$1');                         // تكرار الحرف

// كلمات كاملة (بعد التطبيع)
const WORD_LIST = [
  'كس', 'كسم', 'كسمك', 'كسختك', 'كسها', 'طيز', 'زب', 'زبي', 'عرص', 'نيك', 'نيكه', 'منيك', 'منيوك', 'متناك', 'خرا', 'خره', 'تفو',
  'كلب', 'كلاب', 'حمار', 'حيوان', 'غبي', 'تيس', 'خنزير', 'وسخ', 'حقير', 'قذر', 'زفت', 'ملعون', 'لعين', 'ابن الكلب',
  'سكس', 'جنس', 'sex', 'porn', 'fuck', 'shit', 'bitch', 'dick', 'cock', 'pussy', 'slut', 'whore', 'cunt', 'bastard', 'asshole', 'nigger', 'nigga', 'fck', 'wtf'
].map(norm);

// ألفاظ فاحشة طويلة: تُفحص كجزء من النص بعد حذف الفواصل
const SUBSTRING_LIST = [
  'شرموط', 'شرموطه', 'عاهره', 'قحبه', 'قحاب', 'منيوك', 'ديوث', 'ديوس', 'زانيه', 'ابن زنا', 'ولد زنا', 'ولد حرام', 'ابن حرام', 'ابن الحرام',
  'كسمك', 'كسختك', 'نيك امك', 'نيكمك', 'يلعن دين', 'يلعن ربك',
  'fuck', 'bitch', 'asshole', 'cunt', 'nigger', 'whore', 'pussy', 'motherfucker', 'bastard'
].map(norm).map((w) => w.replace(/\s+/g, ''));

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|info|xyz|me|io|sa|ly|app|co|tv)\b|t\.me\/|wa\.me\/|@[a-z0-9_]{3,})/i;
const PHONE_RE = /(\+?\d[\s\-\.]?){9,}/;

export function checkMessage(text) {
  const raw = String(text || '');
  if (URL_RE.test(raw)) return { ok: false, reason: 'الروابط غير مسموحة في الدردشة' };
  if (PHONE_RE.test(raw.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))) return { ok: false, reason: 'أرقام الهواتف غير مسموحة في الدردشة' };
  const n = norm(raw);
  const tokens = n.split(/[^a-zء-ي]+/).filter(Boolean);
  const joinedTokens = tokens.join(' ');
  for (const w of WORD_LIST) {
    if (!w.includes(' ') && tokens.includes(w)) return { ok: false, reason: 'الرسالة تحتوي على ألفاظ غير لائقة' };
    if (w.includes(' ') && (' ' + joinedTokens + ' ').includes(' ' + w + ' ')) return { ok: false, reason: 'الرسالة تحتوي على ألفاظ غير لائقة' };
  }
  const squashed = tokens.join('');
  for (const w of SUBSTRING_LIST) {
    if (w.length >= 4 && squashed.includes(w)) return { ok: false, reason: 'الرسالة تحتوي على ألفاظ غير لائقة' };
  }
  // إغراق بالأحرف/الحروف الكبيرة
  if (raw.length > 12 && (raw.match(/[A-Z]/g) || []).length / raw.length > 0.7) return { ok: false, reason: 'تجنّب الكتابة بحروف كبيرة كلها' };
  return { ok: true };
}

export function checkName(name) {
  const r = checkMessage(name);
  return r.ok ? { ok: true } : { ok: false, reason: 'الاسم يحتوي على ألفاظ غير لائقة' };
}

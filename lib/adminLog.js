import crypto from 'crypto';
import { parseUserAgent } from './device';

// سجل نشاط الإداريين: كل عملية مهمة (دخول/خروج/رفع/حذف/تعديل/حفظ المعرض/إدارة الحسابات)
// تُكتب في جدول admin_logs. لا يرمي أي خطأ أبداً — فشل التسجيل لا يُعطّل العملية الأصلية.
//
// category: auth | photo | layout | admin
// action:   مثل photo.add / photo.delete / layout.save ... (للتصفية والعرض)
// summary:  جملة عربية قصيرة تُعرض في الجدول
// details:  JSON حر (يحوي lines: [] للتفاصيل السطرية)
export async function logAdmin(supabase, req, who, category, action, summary, details) {
  try {
    if (!supabase) return;
    const username = typeof who === 'string' ? who : (who && who.username) || null;
    const ip = ((req && req.headers && req.headers['x-forwarded-for']) || (req && req.socket && req.socket.remoteAddress) || '').toString().split(',')[0].trim();
    const ua = (req && req.headers && req.headers['user-agent']) || '';
    const d = parseUserAgent(ua);
    const { error } = await supabase.from('admin_logs').insert([{
      admin_username: username,
      category,
      action,
      summary: String(summary || '').slice(0, 300),
      details: details || null,
      ip_hash: ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24) : null,
      device: [d.device_type, d.os, d.browser].filter(Boolean).join(' · ')
    }]);
    if (error) console.error('admin log insert error:', error.message);
  } catch (e) {
    console.error('admin log crashed:', e && e.message);
  }
}

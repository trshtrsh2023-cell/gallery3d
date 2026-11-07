import crypto from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { signMemberToken, setMemberCookie } from '../../../lib/auth';
import { limited } from '../../../lib/rateLimit';

// تسجيل/دخول عبر Google (Google Identity Services).
// يتطلب ضبط NEXT_PUBLIC_GOOGLE_CLIENT_ID في متغيرات البيئة (Client ID من Google Cloud Console).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (limited(req, 'google', 20, 10 * 60 * 1000)) return res.status(429).json({ error: 'محاولات كثيرة، حاول لاحقاً' });
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(501).json({ error: 'الدخول عبر Google غير مفعّل بعد' });
  try {
    const credential = String((req.body && req.body.credential) || '');
    if (!credential) return res.status(400).json({ error: 'بيانات Google ناقصة' });
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
    const info = await r.json().catch(() => ({}));
    if (!r.ok || info.aud !== clientId || !(info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com') || String(info.email_verified) !== 'true' || !info.email) {
      return res.status(401).json({ error: 'تعذّر التحقق من حساب Google' });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: 'الخادم غير مهيأ' });
    const email = String(info.email).toLowerCase();
    const sub = String(info.sub);

    let { data: m } = await supabase.from('members').select('id, username, full_name, role, google_sub').eq('google_sub', sub).maybeSingle();
    if (!m) ({ data: m } = await supabase.from('members').select('id, username, full_name, role, google_sub').eq('email', email).maybeSingle());
    if (m && !m.google_sub) await supabase.from('members').update({ google_sub: sub }).eq('id', m.id);
    if (!m) {
      let base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 18) || 'member';
      if (base.length < 3) base += 'usr';
      let username = base;
      for (let i = 0; i < 6; i++) {
        const { data: ex } = await supabase.from('members').select('id').eq('username', username).maybeSingle();
        if (!ex) break;
        username = base + crypto.randomInt(100, 9999);
      }
      const full = String(info.name || base).replace(/\s+/g, ' ').trim().slice(0, 80);
      const { data: created, error } = await supabase
        .from('members')
        .insert([{ username, email, full_name: full, google_sub: sub, role: 'member', last_login: new Date().toISOString() }])
        .select('id, username, full_name, role')
        .single();
      if (error) return res.status(500).json({ error: 'تعذّر إنشاء الحساب' });
      m = created;
    } else {
      await supabase.from('members').update({ last_login: new Date().toISOString() }).eq('id', m.id);
    }
    setMemberCookie(res, signMemberToken({ id: m.id, username: m.username, name: m.full_name, role: 'member' }));
    return res.status(200).json({ ok: true, user: { username: m.username, name: m.full_name, role: 'member' } });
  } catch (e) {
    console.error('google auth crashed:', e);
    return res.status(500).json({ error: 'خطأ غير متوقع' });
  }
}

import { createClient } from '@supabase/supabase-js';

// عميل Supabase على جانب الخادم فقط (service_role) — لا يُستورد أبداً
// في أي كود يعمل على المتصفح. يُنشأ بأمان داخل try/catch وبشكل كسول
// (lazy) حتى لا يُسقط البناء أو الصفحة عند غياب متغيرات البيئة.
let cached = null;

export function getSupabaseAdmin() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    return null;
  }
  try {
    cached = createClient(url, key, { auth: { persistSession: false } });
    return cached;
  } catch (e) {
    console.error('Supabase admin client init failed:', e);
    return null;
  }
}

// عميل عام للقراءة فقط (anon key) — يُستخدم في الـ API العامة مثل /api/photos
let cachedPublic = null;
export function getSupabasePublic() {
  if (cachedPublic) return cachedPublic;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    cachedPublic = createClient(url, key, { auth: { persistSession: false } });
    return cachedPublic;
  } catch (e) {
    console.error('Supabase public client init failed:', e);
    return null;
  }
}

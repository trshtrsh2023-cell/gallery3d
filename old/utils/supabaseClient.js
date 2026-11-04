// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("تنبيه: مفاتيح Supabase غير موجودة في ملف .env.local")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
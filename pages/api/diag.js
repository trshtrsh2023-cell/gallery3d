import { getSupabaseAdmin, getSupabasePublic } from '../../lib/supabaseAdmin';

// نقطة تشخيص عامة وآمنة: لا تُرجع أي مفاتيح أو كلمات مرور، فقط حالة كل
// جزء (موجود/يعمل أو لا) لمساعدتك على معرفة أين المشكلة بالضبط عند
// تعطّل تسجيل الدخول أو عدم ظهور الصور.
export default async function handler(req, res) {
  const out = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ADMIN_JWT_SECRET: !!process.env.ADMIN_JWT_SECRET,
      ADMIN_SETUP_SECRET: !!process.env.ADMIN_SETUP_SECRET
    },
    supabaseServiceClient: false,
    supabasePublicClient: false,
    adminsTableReachable: null,
    adminsCount: null,
    photosTableReachable: null,
    photosCount: null,
    storageBucketExists: null,
    notes: []
  };

  const admin = getSupabaseAdmin();
  out.supabaseServiceClient = !!admin;
  const pub = getSupabasePublic();
  out.supabasePublicClient = !!pub;

  if (!admin) {
    out.notes.push('تعذّر إنشاء عميل Supabase (service_role) — تحقق من NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في إعدادات البيئة على Vercel، ثم أعد نشر المشروع.');
  } else {
    try {
      const { count, error } = await admin.from('admins').select('id', { count: 'exact', head: true });
      if (error) {
        out.adminsTableReachable = false;
        out.notes.push('جدول admins غير قابل للوصول: ' + error.message + ' — تأكد من تنفيذ supabase_setup.sql كاملاً.');
      } else {
        out.adminsTableReachable = true;
        out.adminsCount = count ?? 0;
        if (!count) out.notes.push('لا يوجد أي حساب أدمن بعد — افتح /admin/setup لإنشاء أول حساب.');
      }
    } catch (e) {
      out.adminsTableReachable = false;
      out.notes.push('خطأ أثناء فحص جدول admins: ' + e.message);
    }

    try {
      const { count, error } = await admin.from('photos').select('id', { count: 'exact', head: true });
      if (error) {
        out.photosTableReachable = false;
        out.notes.push('جدول photos غير قابل للوصول: ' + error.message);
      } else {
        out.photosTableReachable = true;
        out.photosCount = count ?? 0;
      }
    } catch (e) {
      out.photosTableReachable = false;
    }

    try {
      const { data, error } = await admin.storage.listBuckets();
      if (!error && Array.isArray(data)) {
        out.storageBucketExists = data.some((b) => b.name === 'gallery-photos');
        if (!out.storageBucketExists) out.notes.push('لا يوجد bucket باسم gallery-photos في Storage — أنشئه واجعله Public.');
      }
    } catch (e) {
      // تجاهل، ليست حرجة لتسجيل الدخول
    }
  }

  return res.status(200).json(out);
}

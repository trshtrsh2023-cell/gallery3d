-- ============================================================
-- إعداد قاعدة بيانات معرض الفوتوغرافيا الافتراضي
-- جمعية الثقافة والفنون بالطائف
-- نفّذ هذا الملف كاملاً في Supabase → SQL Editor
-- ============================================================

-- جدول اللوحات / الصور المعروضة في المعرض
create table if not exists photos (
  id bigint generated always as identity primary key,
  title text,
  photographer text,
  camera text,
  year text,
  location text,
  image_url text not null,
  storage_path text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- جدول سجل زيارات المعرض (كل دخول زائر يسجَّل هنا)
create table if not exists visits (
  id bigint generated always as identity primary key,
  visitor_name text,
  ip_hash text,
  user_agent text,
  created_at timestamptz default now()
);

-- جدول حسابات الإدارة (دخول لوحة التحكم)
create table if not exists admins (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- تفعيل RLS: الوصول الفعلي يتم فقط من خادم Next.js عبر مفتاح service_role
-- (الذي يتجاوز RLS تلقائياً)، لذا نمنع أي وصول مباشر من المتصفح
alter table photos enable row level security;
alter table visits enable row level security;
alter table admins enable row level security;

-- السماح بالقراءة العامة لجدول الصور فقط (لعرضها في المعرض دون أدمن)
drop policy if exists "public read photos" on photos;
create policy "public read photos" on photos for select using (true);

-- ============================================================
-- دلو التخزين لصور المعرض (نفّذه مرة واحدة من Storage → New bucket
-- باسم gallery-photos واجعله Public، أو شغّل السطر التالي إن كانت
-- صلاحياتك تسمح بذلك من SQL Editor)
-- insert into storage.buckets (id, name, public) values ('gallery-photos','gallery-photos', true)
-- on conflict (id) do nothing;
-- ============================================================

-- ============================================================
-- لإنشاء أول حساب أدمن: لا تضع كلمة المرور نصاً صريحاً هنا.
-- شغّل الأمر التالي محلياً لتوليد password_hash:
--   node -e "console.log(require('bcryptjs').hashSync('كلمة_المرور_هنا', 10))"
-- ثم أدرج الناتج هنا:
-- insert into admins (username, password_hash) values ('admin', 'الهاش_الناتج_هنا');
-- ============================================================

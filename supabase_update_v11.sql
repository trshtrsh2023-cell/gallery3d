-- ============================================================
-- تحديثات قاعدة البيانات لنسخة v11
--   1) سجل نشاط الإداريين (admin_logs)
--   2) التأكد من عمود الجدران في gallery_layout
-- نفّذه في Supabase → SQL Editor (آمن لإعادة التشغيل أكثر من مرة)
-- ============================================================

create table if not exists admin_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_username text,
  category text,        -- auth | photo | layout | admin
  action text,          -- مثل photo.add / photo.delete / layout.save / auth.login
  summary text,
  details jsonb,        -- يحوي lines: [] للتفاصيل السطرية
  ip_hash text,
  device text
);
create index if not exists admin_logs_created_idx on admin_logs (created_at desc);
alter table admin_logs enable row level security;
-- لا سياسات عامة: القراءة والكتابة عبر الخادم فقط بمفتاح service_role

alter table gallery_layout add column if not exists walls jsonb;

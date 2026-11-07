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

-- ===== الدردشة العامة (دائمة: لا يُحذف شيء فعلياً) =====
create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  message text not null,
  ip_hash text
);
create index if not exists chat_messages_created_idx on chat_messages (created_at desc);
alter table chat_messages enable row level security;

-- ===== كائنات المعرض (مزهريات/نباتات/نصوص عربية) =====
alter table gallery_layout add column if not exists objects jsonb;

-- ----- الدردشة: موافقة رسائل الزوار + الحذف الناعم + التعديل -----
alter table chat_messages add column if not exists status text not null default 'approved';   -- approved | pending | rejected
alter table chat_messages add column if not exists role text not null default 'visitor';       -- visitor | member | admin
alter table chat_messages add column if not exists member_ref text;
alter table chat_messages add column if not exists deleted boolean not null default false;
alter table chat_messages add column if not exists deleted_at timestamptz;
alter table chat_messages add column if not exists deleted_by text;
alter table chat_messages add column if not exists original_message text;
alter table chat_messages add column if not exists edited_at timestamptz;
create index if not exists chat_messages_status_idx on chat_messages (status, deleted, id desc);

-- ===== الأعضاء (عضو / إداري) =====
create table if not exists members (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  username text not null unique,
  email text not null unique,
  full_name text not null,
  password_hash text,
  google_sub text unique,
  role text not null default 'member',
  last_login timestamptz
);
alter table members enable row level security;
alter table admins add column if not exists email text;

-- ===== إضاءة المعرض =====
alter table gallery_layout add column if not exists lighting jsonb;

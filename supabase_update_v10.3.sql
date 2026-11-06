-- ============================================================
-- تحديثات قاعدة البيانات لنسخة v10.3 فقط
--   1) جدول تخطيط الإطارات (محرر الإداريين ثلاثي الأبعاد)
--   2) أعمدة معلومات جهاز الزائر في سجل الزيارات
-- نفّذه في Supabase → SQL Editor (آمن لإعادة التشغيل أكثر من مرة)
-- ============================================================

-- 1) تخطيط الإطارات: صف واحد (id = 1) يحوي مصفوفة الإطارات كاملة
--    كل إطار: { n: الرقم, x, y, z: الموضع, r: الدوران (راديان), s: المقياس }
create table if not exists gallery_layout (
  id int primary key default 1,
  frames jsonb not null,
  updated_at timestamptz default now(),
  updated_by text
);
alter table gallery_layout enable row level security;
-- لا سياسات عامة: كل الوصول عبر /api/layout على الخادم بمفتاح service_role

-- 2) معلومات جهاز الزائر
alter table visits
  add column if not exists device_type text,   -- mobile | tablet | desktop | bot
  add column if not exists os text,            -- مثل: iOS 17 / Android 14 / Windows 10/11
  add column if not exists browser text,       -- Chrome / Safari / ...
  add column if not exists device_model text,  -- موديل الجهاز إن أتاحه المتصفح
  add column if not exists screen text,        -- دقة الشاشة مثل 390x844
  add column if not exists language text,
  add column if not exists country text,       -- رمز الدولة (يتوفر عند النشر على Vercel)
  add column if not exists city text;

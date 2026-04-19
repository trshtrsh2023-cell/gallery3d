-- ========================================
-- GALLERY 3D — إعداد قاعدة بيانات Supabase
-- !! شغّل هذا كاملاً بما فيه جدول visitors !!
-- شغّل هذا في SQL Editor في لوحة Supabase
-- ========================================

-- 1. جدول الصور
CREATE TABLE IF NOT EXISTS photos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,
  subtitle        TEXT DEFAULT '',
  image_url       TEXT NOT NULL,
  position_index  INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. فهرس للترتيب
CREATE INDEX IF NOT EXISTS photos_position_idx ON photos(position_index, created_at);

-- 3. RLS — السماح بالقراءة العامة
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read photos"
  ON photos FOR SELECT
  USING (true);

CREATE POLICY "Service role can do anything"
  ON photos FOR ALL
  USING (auth.role() = 'service_role');

-- ========================================
-- إعداد Storage
-- ========================================
-- افتح Storage في Supabase وأنشئ bucket اسمه:
-- gallery-images
-- واجعله Public ✅
--
-- أو شغّل هذا:
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- سياسة رفع الملفات (service role فقط)
CREATE POLICY "Service role upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery-images' AND auth.role() = 'service_role');

CREATE POLICY "Public read storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Service role delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery-images' AND auth.role() = 'service_role');

-- ========================================
-- جدول الزوار (presence)
-- ========================================
CREATE TABLE IF NOT EXISTS visitors (
  visitor_id  TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  x           FLOAT DEFAULT 0,
  z           FLOAT DEFAULT 13,
  yaw         FLOAT DEFAULT 0,
  last_seen   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS visitors_last_seen_idx ON visitors(last_seen);

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visitors"
  ON visitors FOR SELECT USING (true);

CREATE POLICY "Anyone can upsert visitors"
  ON visitors FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update visitors"
  ON visitors FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete visitors"
  ON visitors FOR DELETE USING (true);

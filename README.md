# 🎨 GALLERY 3D — معرض الفوتوغرافيا الافتراضي

## خطوات النشر على Vercel + Supabase

---

### 1️⃣ إعداد Supabase

1. اذهب إلى https://supabase.com وأنشئ مشروعًا جديدًا
2. من القائمة اليسرى → **SQL Editor** → New Query
3. انسخ محتوى ملف `supabase_setup.sql` والصقه وشغّله
4. من القائمة → **Storage** → أنشئ Bucket باسم `gallery-images` واجعله **Public**
5. احفظ هذه المعلومات:
   - Project URL (Settings > API > Project URL)
   - anon/public key (Settings > API > Project API keys)
   - service_role key (Settings > API > Project API keys)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5dmFmb2Fmb3hmaXNrZnJkYWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTcwNzUsImV4cCI6MjA5MDk5MzA3NX0.TvF58xAO4pfb613IoIBZTO1-q9Cxgl4878QnkVqr_AU

https://vyvafoafoxfiskfrdagz.supabase.co

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5dmFmb2Fmb3hmaXNrZnJkYWd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQxNzA3NSwiZXhwIjoyMDkwOTkzMDc1fQ.Xz1y-9Y3kxOJhE9YCCbTR62O5Em0dLJ0V4UJn-G8XEc
---

### 2️⃣ رفع الكود على GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/trshtrsh2023-cell/gallery3d.git
git push -u origin main
```

---

### 3️⃣ النشر على Vercel

1. اذهب إلى https://vercel.com وسجّل بحساب GitHub
2. New Project → اختر مستودعك
3. في قسم **Environment Variables** أضف:

| المتغير | القيمة |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح anon |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح service_role |
| `ADMIN_USERNAME` | اسم مستخدم الإدارة (مثلاً: admin) |
| `ADMIN_PASSWORD` | كلمة سر قوية |
| `JWT_SECRET` | نص عشوائي طويل (32+ حرف) |

4. اضغط **Deploy** ✅

---

### 4️⃣ الاستخدام

- **المعرض**: `https://your-app.vercel.app/`
- **الإدارة**: `https://your-app.vercel.app/admin/login`

---

### التحكم في المعرض

| زر | الوظيفة |
|----|---------|
| W / ↑ | تقدم للأمام |
| S / ↓ | تراجع للخلف |
| A / ← | تحرك يسارًا |
| D / → | تحرك يمينًا |
| Shift | ركض |
| ماوس | النظر حول المعرض |
| ESC | إيقاف التحكم |

---

### الميزات

- ✅ معرض ثلاثي الأبعاد بألوان فاتحة وزاهية
- ✅ 15 موضعًا للصور على الجدران
- ✅ إضاءة احترافية لكل صورة
- ✅ لوحة إدارة محمية بكلمة سر
- ✅ رفع الصور بالسحب والإفلات
- ✅ حذف الصور
- ✅ تخزين في Supabase Storage
- ✅ نشر مجاني على Vercel

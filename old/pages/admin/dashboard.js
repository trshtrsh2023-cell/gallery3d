import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const ACCENT_COLORS = ['#ff6b6b','#4ecdc4','#a78bfa','#fbbf24','#60a5fa','#34d399','#f97316','#e879f9'];

export default function Dashboard() {
  const router = useRouter();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', position_index: 0 });
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef();
  const dropRef = useRef();

  const fetchPhotos = async () => {
    setLoading(true);
    const res = await fetch('/api/photos');
    const data = await res.json();
    setPhotos(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchPhotos(); }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropRef.current.style.borderColor = '#e0d8d0';
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file || !form.title.trim()) {
      showMsg('يرجى اختيار صورة وإدخال العنوان', 'error'); return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    fd.append('title', form.title);
    fd.append('subtitle', form.subtitle);
    fd.append('position_index', form.position_index);

    const res = await fetch('/api/photos/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);

    if (res.ok) {
      showMsg('تمت إضافة الصورة بنجاح ✓');
      setForm({ title: '', subtitle: '', position_index: photos.length });
      setFile(null); setPreview(null);
      fetchPhotos();
    } else {
      showMsg(data.error || 'خطأ في الرفع', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) return;
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    if (res.ok) { showMsg('تم حذف الصورة'); fetchPhotos(); }
    else showMsg('خطأ في الحذف', 'error');
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <>
      <Head><title>لوحة التحكم · GALLERY</title></Head>
      <div style={{ minHeight: '100vh', background: '#faf8f4', fontFamily: 'Segoe UI, Tahoma, sans-serif' }}>

        {/* Header */}
        <div style={{
          background: '#1a1a2e', color: '#faf8f4',
          padding: '0 32px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ff6b6b', '#fbbf24', '#4ecdc4'].map(c => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <span style={{ letterSpacing: '0.25em', fontSize: '0.9rem' }}>GALLERY · لوحة التحكم</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="/" target="_blank" style={{
              color: '#9ca3af', fontSize: '0.8rem', letterSpacing: '0.1em',
              textDecoration: 'none', borderBottom: '1px solid #4b5563', paddingBottom: 1,
            }}>
              عرض المعرض ↗
            </a>
            <button onClick={logout} style={{
              background: 'transparent', border: '1px solid #374151',
              color: '#9ca3af', padding: '6px 16px', cursor: 'pointer',
              fontSize: '0.78rem', borderRadius: 4, letterSpacing: '0.1em',
            }}>خروج</button>
          </div>
        </div>

        {/* Notification */}
        {msg && (
          <div style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            background: msg.type === 'error' ? '#fff5f5' : '#f0fdf4',
            border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: msg.type === 'error' ? '#dc2626' : '#16a34a',
            padding: '12px 28px', borderRadius: 8, zIndex: 999,
            fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>{msg.text}</div>
        )}

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 }}>
            {[
              { label: 'إجمالي الصور', value: photos.length, color: '#a78bfa' },
              { label: 'مواقع متاحة', value: Math.max(0, 15 - photos.length), color: '#4ecdc4' },
              { label: 'آخر تحديث', value: photos.length ? new Date(photos[photos.length-1]?.created_at).toLocaleDateString('ar-SA') : '—', color: '#fbbf24' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: '#fff', borderRadius: 12, padding: '20px 24px',
                borderTop: `4px solid ${color}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 8, letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '1.8rem', color: '#1a1a2e', fontWeight: 300 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>

            {/* Upload Form */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1a1a2e', marginBottom: 24, letterSpacing: '0.05em' }}>
                إضافة صورة جديدة
              </h2>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onClick={() => fileRef.current.click()}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); dropRef.current.style.borderColor = '#a78bfa'; }}
                onDragLeave={() => dropRef.current.style.borderColor = '#e0d8d0'}
                style={{
                  border: '2px dashed #e0d8d0', borderRadius: 12,
                  padding: preview ? 8 : '36px 20px',
                  textAlign: 'center', cursor: 'pointer',
                  marginBottom: 20, transition: 'border-color 0.2s',
                  minHeight: preview ? 'auto' : 160,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {preview ? (
                  <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                ) : (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>🖼️</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>اضغط أو اسحب صورة هنا</div>
                    <div style={{ color: '#d1d5db', fontSize: '0.75rem', marginTop: 4 }}>PNG, JPG, WEBP — حتى 10MB</div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />

              {/* Fields */}
              {[
                { label: 'عنوان الصورة *', key: 'title', placeholder: 'مثال: غروب المدينة' },
                { label: 'وصف / تصنيف', key: 'subtitle', placeholder: 'مثال: تصوير حضري · 2024' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: 6 }}>{label}</label>
                  <input
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '10px 14px',
                      border: '1.5px solid #e0d8d0', borderRadius: 8,
                      fontSize: '0.9rem', color: '#1a1a2e', background: '#faf8f4',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                    onFocus={e => e.target.style.borderColor = '#a78bfa'}
                    onBlur={e => e.target.style.borderColor = '#e0d8d0'}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: 6 }}>موضع الصورة في المعرض (0–14)</label>
                <input
                  type="number" min={0} max={14}
                  value={form.position_index}
                  onChange={e => setForm(p => ({ ...p, position_index: parseInt(e.target.value) || 0 }))}
                  style={{
                    width: '100%', padding: '10px 14px',
                    border: '1.5px solid #e0d8d0', borderRadius: 8,
                    fontSize: '0.9rem', color: '#1a1a2e', background: '#faf8f4',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                style={{
                  width: '100%', padding: '13px',
                  background: (uploading || !file) ? '#e5e7eb' : '#1a1a2e',
                  color: (uploading || !file) ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 8, cursor: (uploading || !file) ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem', letterSpacing: '0.1em', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {uploading ? 'جاري الرفع...' : 'رفع الصورة →'}
              </button>
            </div>

            {/* Photos Grid */}
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1a1a2e', marginBottom: 24, letterSpacing: '0.05em' }}>
                الصور المعروضة ({photos.length})
              </h2>

              {loading ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>جاري التحميل...</div>
              ) : photos.length === 0 ? (
                <div style={{
                  background: '#fff', borderRadius: 12, padding: 40,
                  textAlign: 'center', color: '#d1d5db', border: '2px dashed #e0d8d0',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🖼️</div>
                  <div>لا توجد صور بعد</div>
                  <div style={{ fontSize: '0.8rem', marginTop: 6 }}>أضف صورتك الأولى من النموذج المجاور</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 560, overflowY: 'auto' }}>
                  {photos.map((p, i) => (
                    <div key={p.id} style={{
                      background: '#fff', borderRadius: 12, padding: '14px 16px',
                      display: 'flex', gap: 14, alignItems: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      borderRight: `4px solid ${ACCENT_COLORS[i % ACCENT_COLORS.length]}`,
                    }}>
                      <img
                        src={p.image_url} alt={p.title}
                        style={{ width: 60, height: 50, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a2e', fontSize: '0.9rem', marginBottom: 2 }}>
                          {p.title}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                          {p.subtitle} · موضع {p.position_index}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        style={{
                          background: '#fff5f5', border: '1px solid #fecaca',
                          color: '#ef4444', padding: '5px 12px', cursor: 'pointer',
                          borderRadius: 6, fontSize: '0.78rem', flexShrink: 0,
                        }}
                      >حذف</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { router.push('/admin/dashboard'); }
    else { setError(data.error || 'خطأ في تسجيل الدخول'); }
  };

  return (
    <>
      <Head><title>دخول الإدارة · GALLERY</title></Head>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #faf8f4, #f0ebe0)',
        fontFamily: 'Segoe UI, Tahoma, sans-serif', padding: 20,
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'fixed', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: '#ff6b6b', opacity: 0.08, filter: 'blur(4px)' }} />
        <div style={{ position: 'fixed', bottom: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: '#4ecdc4', opacity: 0.08, filter: 'blur(4px)' }} />
        <div style={{ position: 'fixed', top: '40%', right: -60, width: 250, height: 250, borderRadius: '50%', background: '#a78bfa', opacity: 0.08, filter: 'blur(4px)' }} />

        <div style={{
          background: '#fff', borderRadius: 16, padding: '48px 44px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)', width: '100%', maxWidth: 420,
          position: 'relative',
        }}>
          {/* Color dots */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
            {['#ff6b6b', '#fbbf24', '#4ecdc4', '#a78bfa'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>

          <h1 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 200, letterSpacing: '0.2em', color: '#1a1a2e', marginBottom: 6 }}>
            GALLERY
          </h1>
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem', letterSpacing: '0.15em', marginBottom: 36 }}>
            لوحة تحكم المعرض
          </p>

          <form onSubmit={handleSubmit}>
            {[
              { label: 'اسم المستخدم', key: 'username', type: 'text', placeholder: 'admin' },
              { label: 'كلمة السر', key: 'password', type: 'password', placeholder: '••••••••' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#6b7280', marginBottom: 8, letterSpacing: '0.05em' }}>
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  required
                  dir="ltr"
                  style={{
                    width: '100%', padding: '12px 16px',
                    border: '1.5px solid #e0d8d0', borderRadius: 8,
                    fontSize: '0.95rem', color: '#1a1a2e',
                    background: '#faf8f4', outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: 'monospace',
                  }}
                  onFocus={e => e.target.style.borderColor = '#a78bfa'}
                  onBlur={e => e.target.style.borderColor = '#e0d8d0'}
                />
              </div>
            ))}

            {error && (
              <div style={{
                background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8,
                padding: '10px 14px', color: '#ef4444', fontSize: '0.85rem',
                marginBottom: 20, textAlign: 'center',
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#d1d5db' : '#1a1a2e',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: '0.95rem', letterSpacing: '0.1em',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#ff6b6b'; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = '#1a1a2e'; }}
            >
              {loading ? '...' : 'دخول →'}
            </button>
          </form>

          <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: 24, fontSize: '0.8rem', color: '#d1cbc2', letterSpacing: '0.1em' }}>
            ← العودة للمعرض
          </a>
        </div>
      </div>
    </>
  );
}

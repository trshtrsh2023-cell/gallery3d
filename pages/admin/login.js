import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needSetup, setNeedSetup] = useState(false);
  useEffect(() => { fetch('/api/admin/setup', { cache: 'no-store' }).then((r) => r.json()).then((d) => setNeedSetup(!!d.needed)).catch(() => {}); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'تعذّر تسجيل الدخول');
        setLoading(false);
        return;
      }
      router.push('/admin/dashboard');
    } catch (e) {
      setError('تعذّر الاتصال بالخادم');
      setLoading(false);
    }
  }

  return (
    <div style={styles.page} dir="rtl">
      <Head>
        <title>دخول الإدارة — معرض الفوتوغرافيا الافتراضي</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <form onSubmit={handleSubmit} style={styles.box}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#c9a35b" strokeWidth="1.2" style={{ margin: '0 auto 10px' }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
          <line x1="9.69" y1="8" x2="21.17" y2="8" />
          <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
          <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
          <line x1="14.31" y1="16" x2="2.83" y2="16" />
          <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
        </svg>
        <h1 style={styles.title}>دخول الإدارة</h1>
        <p style={styles.sub}>معرض الفوتوغرافيا الافتراضي — جمعية الثقافة والفنون بالطائف</p>

        <input
          style={styles.input}
          placeholder="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          style={styles.input}
          placeholder="كلمة المرور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={styles.btn} disabled={loading}>
          {loading ? 'جاري الدخول…' : 'دخول'}
        </button>

        <a href="/" style={styles.back}>↩ العودة للمعرض</a>
        {needSetup && <a href="/admin/setup" style={{ ...styles.back, marginTop: '6px' }}>لا يوجد حساب إداري بعد — إعداد الحساب الأول</a>}
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 30%, #201b17 0%, #080706 70%)',
    fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif"
  },
  box: {
    width: 'min(90vw, 380px)', padding: '36px 32px', textAlign: 'center',
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '14px'
  },
  mark: { fontSize: '36px', color: '#c9a35b', marginBottom: '4px' },
  title: { color: '#f3efe8', fontSize: '20px', letterSpacing: '.1em', marginBottom: '6px', fontWeight: 400 },
  sub: { color: '#9a9388', fontSize: '12.5px', marginBottom: '24px', lineHeight: 1.7 },
  input: {
    width: '100%', padding: '12px 14px', marginBottom: '12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,.15)', background: 'rgba(0,0,0,.25)', color: '#f3efe8',
    fontSize: '14px', outline: 'none', textAlign: 'right'
  },
  error: { color: '#e08888', fontSize: '13px', marginBottom: '12px' },
  btn: {
    width: '100%', padding: '13px', background: 'linear-gradient(135deg,#c9a35b,#9c7a3c)',
    color: '#1a1408', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
  },
  back: { display: 'block', marginTop: '18px', color: '#8f887c', fontSize: '12.5px', textDecoration: 'none' }
};

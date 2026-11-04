import { useState } from 'react';
import Head from 'next/head';

export default function AdminSetup() {
  const [secret, setSecret] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diag, setDiag] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(''); setOk(false); setLoading(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'فشل الإنشاء'); setLoading(false); return; }
      setOk(true);
      setMsg(`تم إنشاء حساب الأدمن "${data.username}" بنجاح — يمكنك الآن تسجيل الدخول من /admin/login`);
    } catch (e) {
      setMsg('تعذّر الاتصال بالخادم');
    }
    setLoading(false);
  }

  async function runDiag() {
    setDiag('...جاري الفحص');
    try {
      const res = await fetch('/api/diag');
      const data = await res.json();
      setDiag(data);
    } catch (e) {
      setDiag({ error: 'تعذّر الوصول لنقطة التشخيص' });
    }
  }

  return (
    <div style={styles.page} dir="rtl">
      <Head>
        <title>إعداد أول حساب أدمن</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={styles.box}>
        <h1 style={styles.title}>إنشاء / تحديث حساب أدمن</h1>
        <p style={styles.sub}>
          هذه الصفحة محمية بسر الإعداد <code>ADMIN_SETUP_SECRET</code> الذي تضعه في متغيرات البيئة.
          استخدمها لإنشاء أول حساب أدمن دون الحاجة لتوليد bcrypt يدوياً.
        </p>

        <form onSubmit={handleSubmit}>
          <input style={styles.input} type="password" placeholder="ADMIN_SETUP_SECRET" value={secret} onChange={(e) => setSecret(e.target.value)} />
          <input style={styles.input} placeholder="اسم المستخدم (مثال: admin)" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input style={styles.input} type="password" placeholder="كلمة المرور (٦ أحرف على الأقل)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} style={styles.btn}>{loading ? '...جاري الإنشاء' : 'إنشاء / تحديث الحساب'}</button>
        </form>

        {msg && <div style={ok ? styles.okMsg : styles.errMsg}>{msg}</div>}

        <hr style={styles.hr} />

        <button onClick={runDiag} style={styles.diagBtn}>فحص الربط مع Supabase (تشخيص)</button>
        {diag && (
          <pre style={styles.pre}>{typeof diag === 'string' ? diag : JSON.stringify(diag, null, 2)}</pre>
        )}

        <a href="/admin/login" style={styles.back}>↩ الذهاب لتسجيل الدخول</a>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0d0b09', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" },
  box: { width: 'min(92vw, 520px)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '14px', padding: '28px' },
  title: { color: '#f3efe8', fontSize: '19px', marginBottom: '10px' },
  sub: { color: '#9a9388', fontSize: '12.5px', lineHeight: 1.8, marginBottom: '20px' },
  input: { width: '100%', padding: '11px 13px', marginBottom: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.15)', background: 'rgba(0,0,0,.25)', color: '#f3efe8', fontSize: '13.5px', outline: 'none', textAlign: 'right' },
  btn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg,#c9a35b,#9c7a3c)', color: '#1a1408', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' },
  okMsg: { marginTop: '14px', color: '#9fcf9f', fontSize: '13px', lineHeight: 1.7 },
  errMsg: { marginTop: '14px', color: '#e08888', fontSize: '13px', lineHeight: 1.7 },
  hr: { border: 'none', borderTop: '1px solid rgba(255,255,255,.1)', margin: '22px 0' },
  diagBtn: { width: '100%', padding: '10px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)', color: '#cfc6b8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  pre: { marginTop: '12px', background: '#000', color: '#9fcf9f', padding: '12px', borderRadius: '8px', fontSize: '11.5px', direction: 'ltr', textAlign: 'left', overflowX: 'auto', maxHeight: '320px' },
  back: { display: 'block', marginTop: '18px', color: '#8f887c', fontSize: '12.5px', textAlign: 'center', textDecoration: 'none' }
};

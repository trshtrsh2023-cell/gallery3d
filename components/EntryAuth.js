import { useEffect, useRef, useState } from 'react';

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const tabBtn = (on) => ({
  flex: 1, padding: '10px 6px', fontSize: '13.5px', cursor: 'pointer', fontFamily: 'inherit', border: 'none',
  borderBottom: on ? '2px solid #c9a35b' : '2px solid transparent', background: 'transparent', color: on ? '#f3efe8' : '#8a8478'
});
const goldBtn = { width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #c9a35b, #9c7a3c)', color: '#1a1408', border: 'none', borderRadius: '9px', fontSize: '15.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

// شاشة الدخول: زائر (اسم فقط) — عضو/إداري (دخول) — حساب جديد (مع مزايا التسجيل)
export default function EntryAuth({ visitorName, setVisitorName, onGuestEnter, entering, onAuthed }) {
  const [tab, setTab] = useState('guest');
  const [f, setF] = useState({ identifier: '', password: '', username: '', email: '', fullName: '', password2: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const gRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function post(url, body) {
    setBusy(true); setErr('');
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { setErr(d.error || 'تعذّر تنفيذ العملية'); setBusy(false); return; }
      setBusy(false);
      onAuthed(d.user);
    } catch (e) { setErr('تعذّر الاتصال بالخادم'); setBusy(false); }
  }

  const doLogin = () => {
    if (!f.identifier.trim() || !f.password) { setErr('أدخل اسم المستخدم أو البريد وكلمة المرور'); return; }
    post('/api/auth/login', { identifier: f.identifier, password: f.password });
  };
  const doRegister = () => {
    if (f.password !== f.password2) { setErr('كلمتا المرور غير متطابقتين'); return; }
    post('/api/auth/register', { username: f.username, email: f.email, password: f.password, fullName: f.fullName });
  };

  // زر Google (يظهر فقط إذا ضُبط NEXT_PUBLIC_GOOGLE_CLIENT_ID)
  useEffect(() => {
    if (!GOOGLE_ID || tab === 'guest') return undefined;
    let dead = false;
    const init = () => {
      if (dead || !window.google || !window.google.accounts || !gRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_ID, callback: (resp) => post('/api/auth/google', { credential: resp.credential }) });
      gRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(gRef.current, { theme: 'filled_black', size: 'large', text: tab === 'register' ? 'signup_with' : 'signin_with', shape: 'pill', width: 300, locale: 'ar' });
    };
    if (window.google && window.google.accounts) init();
    else if (!document.getElementById('gsi-client')) {
      const s = document.createElement('script');
      s.id = 'gsi-client'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
      s.onload = init; document.head.appendChild(s);
    } else { const t = setInterval(() => { if (window.google && window.google.accounts) { clearInterval(t); init(); } }, 300); return () => { dead = true; clearInterval(t); }; }
    return () => { dead = true; };
    // eslint-disable-next-line
  }, [tab]);

  const field = (label, k, props = {}) => (
    <label style={{ display: 'block', textAlign: 'right', marginBottom: '10px' }}>
      <span style={{ display: 'block', fontSize: '12px', color: '#9a9388', marginBottom: '4px' }}>{label}</span>
      <input className="ea-input" value={f[k]} onChange={set(k)} {...props} />
    </label>
  );

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        <button type="button" style={tabBtn(tab === 'guest')} onClick={() => { setTab('guest'); setErr(''); }}>زائر</button>
        <button type="button" style={tabBtn(tab === 'login')} onClick={() => { setTab('login'); setErr(''); }}>تسجيل الدخول</button>
        <button type="button" style={tabBtn(tab === 'register')} onClick={() => { setTab('register'); setErr(''); }}>حساب جديد</button>
      </div>

      {tab === 'guest' && (
        <>
          <input id="entryNameInput" placeholder="اكتب اسمك هنا..." value={visitorName} onChange={(e) => setVisitorName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onGuestEnter()} />
          <button onClick={onGuestEnter} disabled={entering} style={goldBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1408" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            {entering ? '...جاري الدخول' : 'دخول المعرض'}
          </button>
          <p style={{ color: '#8a8478', fontSize: '12px', lineHeight: 1.8, marginTop: '12px' }}>
            الدخول كزائر يكفي لتصفّح المعرض. للتفاعل الكامل (كتابة رسائل تظهر مباشرة) <a href="#" onClick={(e) => { e.preventDefault(); setTab('register'); }} style={{ color: '#c9a35b' }}>أنشئ حساباً مجانياً</a>.
          </p>
        </>
      )}

      {tab === 'login' && (
        <form onSubmit={(e) => { e.preventDefault(); doLogin(); }}>
          <div style={{ marginBottom: '12px' }}>
            {GOOGLE_ID && <div ref={gRef} style={{ width: '100%', minHeight: '46px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px', boxSizing: 'border-box', border: '1px solid rgba(201,163,91,.22)', borderRadius: '9px', background: 'rgba(0,0,0,.32)' }}></div>}
            {!GOOGLE_ID && (
            <button type="button" onClick={() => setErr('الدخول عبر Google غير مفعّل بعد — يحتاج المدير لإضافة NEXT_PUBLIC_GOOGLE_CLIENT_ID في إعدادات الموقع.')} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#fff', color: '#3c4043', border: '1px solid #dadce0', borderRadius: '9px', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: 0.92, boxSizing: 'border-box' }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              {tab === 'register' ? 'التسجيل عبر Google' : 'الدخول عبر Google'}
            </button>
          )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 2px', color: '#776f62', fontSize: '12px' }}><span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} /> أو بالبريد وكلمة المرور <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} /></div>
          </div>
          {field('اسم المستخدم أو البريد الإلكتروني', 'identifier', { autoComplete: 'username', dir: 'ltr', style: { textAlign: 'left' } })}
          {field('كلمة المرور', 'password', { type: 'password', autoComplete: 'current-password', dir: 'ltr', style: { textAlign: 'left' } })}
          {err && <div style={{ color: '#ff8a8a', fontSize: '13px', marginBottom: '10px' }}>{err}</div>}
          <button type="submit" disabled={busy} style={goldBtn}>{busy ? '...جاري الدخول' : 'دخول'}</button>

          <p style={{ color: '#8a8478', fontSize: '12px', marginTop: '12px' }}>الإداريون يدخلون من هنا أيضاً باسم المستخدم أو البريد.</p>
        </form>
      )}

      {tab === 'register' && (
        <form onSubmit={(e) => { e.preventDefault(); doRegister(); }}>
          <div style={{ background: 'rgba(201,163,91,.1)', border: '1px solid rgba(201,163,91,.3)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', textAlign: 'right', fontSize: '12.5px', lineHeight: 1.9, color: '#d8cfbd' }}>
            <b style={{ color: '#c9a35b' }}>مزايا التسجيل:</b>
            <div>✓ التفاعل في المعرض: رسائلك في الدردشة تظهر فوراً دون انتظار الموافقة</div>
            <div>✓ حسابك محفوظ: تبقى مسجّلاً دخولك دون إعادة كتابة اسمك</div>
            <div>✓ هوية معروفة بشارة «عضو» بين الزوار</div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            {GOOGLE_ID && <div ref={gRef} style={{ width: '100%', minHeight: '46px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px', boxSizing: 'border-box', border: '1px solid rgba(201,163,91,.22)', borderRadius: '9px', background: 'rgba(0,0,0,.32)' }}></div>}
            {!GOOGLE_ID && (
            <button type="button" onClick={() => setErr('الدخول عبر Google غير مفعّل بعد — يحتاج المدير لإضافة NEXT_PUBLIC_GOOGLE_CLIENT_ID في إعدادات الموقع.')} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#fff', color: '#3c4043', border: '1px solid #dadce0', borderRadius: '9px', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: 0.92, boxSizing: 'border-box' }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              {tab === 'register' ? 'التسجيل عبر Google' : 'الدخول عبر Google'}
            </button>
          )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 2px', color: '#776f62', fontSize: '12px' }}><span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} /> أو بالبريد وكلمة المرور <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} /></div>
          </div>
          {field('الاسم الثلاثي الحقيقي', 'fullName', { placeholder: 'مثال: محمد أحمد العتيبي', autoComplete: 'name', maxLength: 80 })}
          {field('اسم المستخدم (إنجليزي)', 'username', { dir: 'ltr', autoComplete: 'username', maxLength: 24, placeholder: 'username', style: { textAlign: 'left' } })}
          {field('البريد الإلكتروني', 'email', { type: 'email', dir: 'ltr', autoComplete: 'email', placeholder: 'name@example.com', style: { textAlign: 'left' } })}
          {field('كلمة المرور (8 أحرف على الأقل، حروف وأرقام)', 'password', { type: 'password', dir: 'ltr', autoComplete: 'new-password', style: { textAlign: 'left' } })}
          {field('تأكيد كلمة المرور', 'password2', { type: 'password', dir: 'ltr', autoComplete: 'new-password', style: { textAlign: 'left' } })}
          {err && <div style={{ color: '#ff8a8a', fontSize: '13px', marginBottom: '10px' }}>{err}</div>}
          <button type="submit" disabled={busy} style={goldBtn}>{busy ? '...جاري التسجيل' : 'إنشاء الحساب'}</button>
          {!GOOGLE_ID && (
            <button type="button" onClick={() => setErr('الدخول عبر Google غير مفعّل بعد — يحتاج المدير لإضافة NEXT_PUBLIC_GOOGLE_CLIENT_ID في إعدادات الموقع.')} style={{ width: '100%', marginTop: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#fff', color: '#3c4043', border: '1px solid #dadce0', borderRadius: '9px', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: 0.85 }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              {tab === 'register' ? 'التسجيل عبر Google' : 'الدخول عبر Google'}
            </button>
          )}

        </form>
      )}
    </div>
  );
}

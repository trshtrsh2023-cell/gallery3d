import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TOTAL_SLOTS = 25; // عدد مواقع اللوحات داخل الصالة (يجب أن يطابق SLOTS في pages/index.js)

export default function AdminDashboard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('photos'); // 'photos' | 'visits' | 'admins'
  const [photos, setPhotos] = useState([]);
  const [visits, setVisits] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [adminMsg, setAdminMsg] = useState('');
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });

  const [form, setForm] = useState({ title: '', photographer: '', camera: '', year: '', location: '', slot_index: '', file: null });

  useEffect(() => {
    fetch('/api/admin/me').then((r) => {
      if (!r.ok) { router.replace('/admin/login'); return; }
      setChecking(false);
      loadPhotos();
      loadVisits();
      loadAdmins();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPhotos = useCallback(() => {
    fetch('/api/admin/photos').then((r) => r.json()).then((d) => setPhotos(Array.isArray(d) ? d : []));
  }, []);

  const loadVisits = useCallback(() => {
    fetch('/api/visits').then((r) => r.json()).then((d) => setVisits(Array.isArray(d) ? d : []));
  }, []);

  const loadAdmins = useCallback(() => {
    fetch('/api/admin/admins').then((r) => r.json()).then((d) => setAdmins(Array.isArray(d) ? d : []));
  }, []);

  const usedSlots = photos.filter((p) => p.slot_index).map((p) => Number(p.slot_index));

  async function handleAddAdmin(e) {
    e.preventDefault();
    setAdminMsg('');
    if (!adminForm.username.trim() || adminForm.password.length < 6) {
      setAdminMsg('اسم المستخدم مطلوب، وكلمة المرور ٦ أحرف على الأقل');
      return;
    }
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminForm)
    });
    const data = await res.json();
    if (!res.ok) { setAdminMsg(data.error || 'فشل الإنشاء'); return; }
    setAdminForm({ username: '', password: '' });
    setAdminMsg('تمت إضافة الإداري بنجاح');
    loadAdmins();
  }

  async function handleDeleteAdmin(id) {
    if (!confirm('هل تريد حذف هذا الحساب الإداري؟')) return;
    const res = await fetch('/api/admin/admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'تعذّر الحذف'); return; }
    loadAdmins();
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, file }));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.file) { setMsg('اختر صورة أولاً'); return; }
    setBusy(true);
    setMsg('');
    try {
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(form.file);
      });

      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          fileName: form.file.name,
          title: form.title,
          photographer: form.photographer,
          camera: form.camera,
          year: form.year,
          location: form.location,
          slot_index: form.slot_index || null
        })
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'فشل الرفع'); setBusy(false); return; }

      setForm({ title: '', photographer: '', camera: '', year: '', location: '', slot_index: '', file: null });
      document.getElementById('fileInput').value = '';
      setMsg('تم رفع اللوحة بنجاح');
      loadPhotos();
    } catch (e) {
      setMsg('تعذّر رفع الملف');
    }
    setBusy(false);
  }

  async function handleDelete(id) {
    if (!confirm('هل تريد حذف هذه اللوحة نهائياً؟')) return;
    setBusy(true);
    await fetch('/api/admin/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setBusy(false);
    loadPhotos();
  }

  async function handleMove(index, dir) {
    const newList = [...photos];
    const swapWith = index + dir;
    if (swapWith < 0 || swapWith >= newList.length) return;
    [newList[index], newList[swapWith]] = [newList[swapWith], newList[index]];
    setPhotos(newList);

    const order = newList.map((p, i) => ({ id: p.id, sort_order: i + 1 }));
    await fetch('/api/admin/photos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    });
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/');
  }

  if (checking) {
    return <div style={styles.loadingPage}>جاري التحقق من الجلسة…</div>;
  }

  return (
    <div style={styles.page} dir="rtl">
      <Head>
        <title>لوحة تحكم المعرض — جمعية الثقافة والفنون بالطائف</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header style={styles.header}>
        <h1 style={styles.h1}>لوحة تحكم المعرض</h1>
        <div style={styles.headerBtns}>
          <a href="/" style={styles.linkBtn}>عرض المعرض ↗</a>
          <button onClick={handleLogout} style={styles.logoutBtn}>تسجيل الخروج</button>
        </div>
      </header>

      <nav style={styles.tabs}>
        <button onClick={() => setTab('photos')} style={tab === 'photos' ? styles.tabActive : styles.tab}>إدارة الصور</button>
        <button onClick={() => setTab('visits')} style={tab === 'visits' ? styles.tabActive : styles.tab}>سجل الزوار</button>
        <button onClick={() => setTab('admins')} style={tab === 'admins' ? styles.tabActive : styles.tab}>الإداريين</button>
      </nav>

      {tab === 'photos' && (
        <section style={styles.section}>
          <form onSubmit={handleUpload} style={styles.uploadForm}>
            <h2 style={styles.h2}>إضافة لوحة جديدة</h2>
            <input id="fileInput" type="file" accept="image/*" onChange={handleFile} style={styles.fileInput} />
            <div style={styles.formGrid}>
              <input style={styles.input} placeholder="اسم الصورة" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <input style={styles.input} placeholder="المصور" value={form.photographer} onChange={(e) => setForm((f) => ({ ...f, photographer: e.target.value }))} />
              <input style={styles.input} placeholder="الكاميرا" value={form.camera} onChange={(e) => setForm((f) => ({ ...f, camera: e.target.value }))} />
              <input style={styles.input} placeholder="السنة" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
              <input style={styles.input} placeholder="الموقع (مثال: الشفا)" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              <select
                style={styles.input}
                value={form.slot_index}
                onChange={(e) => setForm((f) => ({ ...f, slot_index: e.target.value }))}
              >
                <option value="">موقع اللوحة داخل الصالة (تلقائي)</option>
                {Array.from({ length: TOTAL_SLOTS }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n} disabled={usedSlots.includes(n)}>
                    الموقع رقم {n}{usedSlots.includes(n) ? ' — مشغول' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={busy} style={styles.uploadBtn}>{busy ? 'جاري الرفع…' : 'رفع اللوحة'}</button>
            {msg && <div style={styles.msg}>{msg}</div>}
          </form>

          <div style={styles.list}>
            {photos.length === 0 && <p style={styles.empty}>لا توجد لوحات بعد.</p>}
            {photos.map((p, i) => (
              <div key={p.id} style={styles.row}>
                <img src={p.image_url} alt={p.title} style={styles.thumb} />
                <div style={styles.rowInfo}>
                  <div style={styles.rowTitle}>{p.title || 'بدون عنوان'}{p.slot_index ? <span style={styles.slotBadge}> موقع {p.slot_index}</span> : null}</div>
                  <div style={styles.rowMeta}>{[p.photographer, p.camera, p.year, p.location].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={styles.rowActions}>
                  <button onClick={() => handleMove(i, -1)} style={styles.iconBtn} title="تحريك لأعلى">▲</button>
                  <button onClick={() => handleMove(i, 1)} style={styles.iconBtn} title="تحريك لأسفل">▼</button>
                  <button onClick={() => handleDelete(p.id)} style={styles.deleteBtn} title="حذف">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'visits' && (
        <section style={styles.section}>
          <h2 style={styles.h2}>سجل زيارات المعرض ({visits.length})</h2>
          <div style={styles.table}>
            <div style={{ ...styles.tr, ...styles.trHead }}>
              <div style={styles.td}>اسم الزائر</div>
              <div style={styles.td}>تاريخ الدخول</div>
            </div>
            {visits.map((v) => (
              <div key={v.id} style={styles.tr}>
                <div style={styles.td}>{v.visitor_name}</div>
                <div style={styles.td}>{new Date(v.created_at).toLocaleString('ar-SA')}</div>
              </div>
            ))}
            {visits.length === 0 && <p style={styles.empty}>لا توجد زيارات مسجّلة بعد.</p>}
          </div>
        </section>
      )}

      {tab === 'admins' && (
        <section style={styles.section}>
          <form onSubmit={handleAddAdmin} style={styles.uploadForm}>
            <h2 style={styles.h2}>إضافة إداري جديد</h2>
            <div style={styles.formGrid}>
              <input style={styles.input} placeholder="اسم المستخدم" value={adminForm.username} onChange={(e) => setAdminForm((f) => ({ ...f, username: e.target.value }))} />
              <input style={styles.input} type="password" placeholder="كلمة المرور (٦ أحرف على الأقل)" value={adminForm.password} onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <button type="submit" style={styles.uploadBtn}>إضافة إداري</button>
            {adminMsg && <div style={styles.msg}>{adminMsg}</div>}
          </form>

          <div style={styles.list}>
            {admins.map((a) => (
              <div key={a.id} style={styles.row}>
                <div style={styles.rowInfo}>
                  <div style={styles.rowTitle}>{a.username}</div>
                  <div style={styles.rowMeta}>عضو منذ {new Date(a.created_at).toLocaleDateString('ar-SA')}</div>
                </div>
                <div style={styles.rowActions}>
                  <button onClick={() => handleDeleteAdmin(a.id)} style={styles.deleteBtn}>حذف</button>
                </div>
              </div>
            ))}
            {admins.length === 0 && <p style={styles.empty}>لا يوجد إداريون بعد.</p>}
          </div>
        </section>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0d0b09', color: '#f3efe8', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", padding: '24px' },
  loadingPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0b09', color: '#c9a35b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
  h1: { fontSize: '20px', fontWeight: 400, letterSpacing: '.05em' },
  headerBtns: { display: 'flex', gap: '10px' },
  linkBtn: { color: '#c9a35b', fontSize: '13px', textDecoration: 'none', alignSelf: 'center' },
  logoutBtn: { background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#f3efe8', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,.1)' },
  tab: { background: 'none', border: 'none', color: '#9a9388', padding: '10px 18px', cursor: 'pointer', fontSize: '14px' },
  tabActive: { background: 'none', border: 'none', borderBottom: '2px solid #c9a35b', color: '#c9a35b', padding: '10px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
  section: { maxWidth: '820px', margin: '0 auto' },
  h2: { fontSize: '16px', marginBottom: '14px', color: '#d8cdb8', fontWeight: 500 },
  uploadForm: { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '12px', padding: '20px', marginBottom: '26px' },
  fileInput: { marginBottom: '14px', color: '#cfc6b8', fontSize: '13px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' },
  input: { padding: '10px 12px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.15)', background: 'rgba(0,0,0,.25)', color: '#f3efe8', fontSize: '13px', outline: 'none' },
  uploadBtn: { padding: '11px 24px', background: 'linear-gradient(135deg,#c9a35b,#9c7a3c)', color: '#1a1408', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13.5px' },
  msg: { marginTop: '10px', fontSize: '13px', color: '#9fcf9f' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  row: { display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '10px', padding: '10px' },
  thumb: { width: '64px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: '14px', color: '#f3efe8' },
  slotBadge: { fontSize: '10.5px', color: '#c9a35b', background: 'rgba(201,163,91,.12)', border: '1px solid rgba(201,163,91,.3)', borderRadius: '10px', padding: '2px 8px', marginRight: '8px' },
  rowMeta: { fontSize: '12px', color: '#8f887c', marginTop: '3px' },
  rowActions: { display: 'flex', gap: '6px', flexShrink: 0 },
  iconBtn: { background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#f3efe8', borderRadius: '6px', padding: '6px 9px', cursor: 'pointer', fontSize: '11px' },
  deleteBtn: { background: 'rgba(224,100,100,.15)', border: '1px solid rgba(224,100,100,.4)', color: '#e08888', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' },
  empty: { color: '#8f887c', fontSize: '13px' },
  table: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '10px', overflow: 'hidden' },
  tr: { display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,.06)' },
  trHead: { background: 'rgba(255,255,255,.04)', fontWeight: 600, color: '#c9a35b' },
  td: { padding: '10px 14px', fontSize: '13px' }
};

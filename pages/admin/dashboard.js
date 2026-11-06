import { Fragment, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { DEFAULT_FRAMES, normalizeFrames, assignPhotosToFrames } from '../../lib/galleryLayout';

// ============================================================================
// لوحة تحكم المعرض — نظرة عامة / اللوحات / الزوار والأجهزة / الإداريين
// ============================================================================

const LOCALE = 'ar-SA-u-ca-gregory-nu-latn';
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(LOCALE, { dateStyle: 'medium' }) : '—');
const dayKey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate(); };

const DEVICE_LABEL = { mobile: 'جوال', tablet: 'جهاز لوحي', desktop: 'كمبيوتر', bot: 'روبوت', unknown: 'غير معروف' };
const DEVICE_COLOR = { mobile: '#c9a35b', desktop: '#5fa8a0', tablet: '#b97a8f', bot: '#777', unknown: '#555' };

function regionName(code) {
  if (!code) return '';
  try { return new Intl.DisplayNames(['ar'], { type: 'region' }).of(code) || code; } catch (e) { return code; }
}

const ICONS = {
  home: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  cube: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05" /><path d="M12 22.08V12" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
  smartphone: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  tablet: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M12 18h.01" /></>,
  menu: <path d="M3 12h18M3 6h18M3 18h18" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14L21 3" /></>,
  up: <path d="M18 15l-6-6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  frame: <><rect x="3" y="3" width="18" height="18" rx="1" /><rect x="7" y="7" width="10" height="10" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>
};
function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}
const deviceIcon = (t) => (t === 'mobile' ? 'smartphone' : t === 'tablet' ? 'tablet' : 'monitor');

async function compressIfLarge(file) {
  if (file.size <= 3.5 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap === 'undefined') return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 3200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) {
    return file;
  }
}

const EMPTY_FORM = { title: '', photographer: '', camera: '', year: '', location: '', slot_index: '' };

export default function AdminDashboard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState('');
  const [tab, setTab] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);

  const [photos, setPhotos] = useState([]);
  const [frames, setFrames] = useState(DEFAULT_FRAMES);
  const [layoutIsDefault, setLayoutIsDefault] = useState(true);
  const [visits, setVisits] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [presence, setPresence] = useState({ count: 0, names: [] });
  const [diag, setDiag] = useState(null);
  const [loaded, setLoaded] = useState({ photos: false, visits: false });

  const [toast, setToast] = useState(null);
  const [confirmBox, setConfirmBox] = useState(null);

  // اللوحات
  const [pSearch, setPSearch] = useState('');
  const [pFilter, setPFilter] = useState('all');
  const [pView, setPView] = useState('grid');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // الزوار
  const [vSearch, setVSearch] = useState('');
  const [vDevice, setVDevice] = useState('all');
  const [vRange, setVRange] = useState('all');
  const [vPage, setVPage] = useState(1);

  // سجل نشاط الإداريين
  const [logs, setLogs] = useState([]);
  const [logsMissing, setLogsMissing] = useState(false);
  const [lAdmin, setLAdmin] = useState('all');
  const [lCat, setLCat] = useState('all');
  const [lRange, setLRange] = useState('all');
  const [lSearch, setLSearch] = useState('');
  const [lPage, setLPage] = useState(1);
  const [lOpen, setLOpen] = useState(null);

  // الإداريون
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });

  const showToast = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind, id: Date.now() });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 3400);
  }, []);

  const loadPhotos = useCallback(() => fetch('/api/admin/photos').then((r) => r.json()).then((d) => { setPhotos(Array.isArray(d) ? d : []); setLoaded((l) => ({ ...l, photos: true })); }).catch(() => {}), []);
  const loadVisits = useCallback(() => fetch('/api/visits').then((r) => r.json()).then((d) => { setVisits(Array.isArray(d) ? d : []); setLoaded((l) => ({ ...l, visits: true })); }).catch(() => {}), []);
  const loadLogs = useCallback(() => fetch('/api/admin/logs').then((r) => r.json()).then((d) => { setLogs(Array.isArray(d.rows) ? d.rows : []); setLogsMissing(!!d.missing); }).catch(() => {}), []);
  const loadAdmins = useCallback(() => fetch('/api/admin/admins').then((r) => r.json()).then((d) => setAdmins(Array.isArray(d) ? d : [])).catch(() => {}), []);
  const loadPresence = useCallback(() => fetch('/api/presence').then((r) => r.json()).then((d) => setPresence({ count: d.count || 0, names: Array.isArray(d.names) ? d.names : [] })).catch(() => {}), []);
  const loadLayout = useCallback(() => fetch('/api/layout').then((r) => r.json()).then((d) => {
    const f = normalizeFrames(d && d.frames);
    setFrames(f.length ? f : DEFAULT_FRAMES);
    setLayoutIsDefault(!!(d && d.isDefault));
  }).catch(() => {}), []);

  useEffect(() => {
    fetch('/api/admin/me').then(async (r) => {
      if (!r.ok) { router.replace('/admin/login'); return; }
      const d = await r.json().catch(() => ({}));
      setMe(d.username || '');
      setChecking(false);
      loadPhotos(); loadVisits(); loadAdmins(); loadLayout(); loadPresence(); loadLogs();
      fetch('/api/diag').then((x) => x.json()).then(setDiag).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checking) return undefined;
    const t = setInterval(loadPresence, 20000);
    return () => clearInterval(t);
  }, [checking, loadPresence]);

  // ---- تخصيص الصور على الإطارات (مطابق لما يراه الزائر) ----
  const placement = useMemo(() => assignPhotosToFrames(photos, frames, (p) => p.slot_index), [photos, frames]);
  const frameOfPhoto = useMemo(() => {
    const m = new Map();
    placement.byFrame.forEach((p, n) => m.set(p.id, n));
    return m;
  }, [placement]);
  const emptyFrames = frames.filter((f) => !placement.byFrame.has(f.n));

  // ---- إحصاءات الزيارات ----
  const stats = useMemo(() => {
    const todayKey = dayKey(new Date());
    const today = visits.filter((v) => dayKey(v.created_at) === todayKey).length;
    const unique = new Set(visits.map((v) => v.visitor_key || ('n:' + v.visitor_name))).size;
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ key: dayKey(d), label: d.getDate(), full: fmtDate(d), n: 0 });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    const dev = {}; const os = {}; const br = {};
    visits.forEach((v) => {
      const k = dayKey(v.created_at);
      if (k in idx) days[idx[k]].n++;
      const t = v.device_type || 'unknown';
      dev[t] = (dev[t] || 0) + 1;
      if (v.os) os[v.os.split(' ')[0]] = (os[v.os.split(' ')[0]] || 0) + 1;
      if (v.browser) br[v.browser] = (br[v.browser] || 0) + 1;
    });
    const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { today, unique, days, dev, os: top(os), br: top(br), maxDay: Math.max(1, ...days.map((d) => d.n)) };
  }, [visits]);

  // ---- العمليات ----
  async function api(url, method, body) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function handleDeletePhoto(p) {
    setConfirmBox({
      title: 'حذف اللوحة',
      text: `سيتم حذف «${p.title || 'بدون عنوان'}» نهائياً مع ملفها. يبقى إطارها في الصالة فارغاً.`,
      danger: true,
      yes: 'حذف',
      onYes: async () => {
        const r = await api('/api/admin/photos', 'DELETE', { id: p.id });
        if (!r.ok) showToast(r.data.error || 'تعذّر الحذف', 'err'); else showToast('تم حذف اللوحة');
        loadPhotos();
      }
    });
  }

  async function handleMovePhoto(index, dir) {
    const list = [...photos];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    setPhotos(list);
    await api('/api/admin/photos', 'PUT', { order: list.map((p, i) => ({ id: p.id, sort_order: i + 1 })) });
  }

  async function handleAddAdmin(e) {
    e.preventDefault();
    if (!adminForm.username.trim() || adminForm.password.length < 6) { showToast('اسم المستخدم مطلوب وكلمة المرور ٦ أحرف على الأقل', 'warn'); return; }
    const r = await api('/api/admin/admins', 'POST', adminForm);
    if (!r.ok) { showToast(r.data.error || 'فشل الإنشاء', 'err'); return; }
    setAdminForm({ username: '', password: '' });
    showToast('تمت إضافة الإداري');
    loadAdmins();
  }
  function handleDeleteAdmin(a) {
    setConfirmBox({
      title: 'حذف حساب إداري',
      text: `هل تريد حذف الحساب «${a.username}»؟`,
      danger: true,
      yes: 'حذف',
      onYes: async () => {
        const r = await api('/api/admin/admins', 'DELETE', { id: a.id });
        if (!r.ok) showToast(r.data.error || 'تعذّر الحذف', 'err'); else showToast('تم حذف الحساب');
        loadAdmins();
      }
    });
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/');
  }

  // ---- الزوار: تصفية + تصدير ----
  const filteredVisits = useMemo(() => {
    const now = Date.now();
    const lim = vRange === 'today' ? null : vRange === '7' ? 7 : vRange === '30' ? 30 : 0;
    const q = vSearch.trim().toLowerCase();
    return visits.filter((v) => {
      if (vDevice !== 'all' && (v.device_type || 'unknown') !== vDevice) return false;
      if (vRange === 'today' && dayKey(v.created_at) !== dayKey(new Date())) return false;
      if (lim && now - new Date(v.created_at).getTime() > lim * 86400000) return false;
      if (q && !((v.visitor_name || '').toLowerCase().includes(q) || (v.city || '').toLowerCase().includes(q) || (v.device_model || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [visits, vSearch, vDevice, vRange]);
  useEffect(() => { setVPage(1); }, [vSearch, vDevice, vRange]);
  const PER = 15;
  const pages = Math.max(1, Math.ceil(filteredVisits.length / PER));
  const pageRows = filteredVisits.slice((vPage - 1) * PER, vPage * PER);

  function exportCsv() {
    const head = ['الاسم', 'التاريخ', 'نوع الجهاز', 'النظام', 'المتصفح', 'الموديل', 'الشاشة', 'الدولة', 'المدينة', 'اللغة'];
    const esc = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
    const rows = filteredVisits.map((v) => [v.visitor_name, new Date(v.created_at).toISOString(), DEVICE_LABEL[v.device_type || 'unknown'], v.os, v.browser, v.device_model, v.screen, regionName(v.country), v.city, v.language].map(esc).join(','));
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'visitors-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---- اللوحات: تصفية ----
  const shownPhotos = photos
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => {
      const q = pSearch.trim().toLowerCase();
      if (q && !([p.title, p.photographer, p.location, p.camera].join(' ').toLowerCase().includes(q))) return false;
      const placed = frameOfPhoto.has(p.id);
      if (pFilter === 'placed' && !placed) return false;
      if (pFilter === 'unplaced' && placed) return false;
      return true;
    });

  // ---- سجل النشاط: تصفية + تصدير ----
  const CAT_LABEL = { auth: 'الدخول والخروج', photo: 'اللوحات', layout: 'تعديل المعرض', admin: 'الحسابات' };
  const logAdmins = useMemo(() => [...new Set(logs.map((l) => l.admin_username).filter(Boolean))], [logs]);
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const days = lRange === 'today' ? 1 : lRange === '7' ? 7 : lRange === '30' ? 30 : 0;
    const q = lSearch.trim().toLowerCase();
    return logs.filter((l) => {
      if (lAdmin !== 'all' && l.admin_username !== lAdmin) return false;
      if (lCat !== 'all' && l.category !== lCat) return false;
      if (days && now - new Date(l.created_at).getTime() > days * 86400000) return false;
      if (q && !((l.summary || '').toLowerCase().includes(q) || JSON.stringify((l.details && l.details.lines) || []).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [logs, lAdmin, lCat, lRange, lSearch]);
  useEffect(() => { setLPage(1); }, [lAdmin, lCat, lRange, lSearch]);
  const LPER = 20;
  const lPages = Math.max(1, Math.ceil(filteredLogs.length / LPER));
  const logRows = filteredLogs.slice((lPage - 1) * LPER, lPage * LPER);

  function exportLogsCsv() {
    const esc = (x) => '"' + String(x ?? '').replace(/"/g, '""') + '"';
    const head = ['الوقت', 'الإداري', 'القسم', 'العملية', 'الملخص', 'التفاصيل', 'الجهاز'];
    const rows = filteredLogs.map((l) => [new Date(l.created_at).toISOString(), l.admin_username, CAT_LABEL[l.category] || l.category, l.action, l.summary, ((l.details && l.details.lines) || []).join(' | '), l.device].map(esc).join(','));
    const blob = new Blob(['\ufeff' + [head.map(esc).join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'admin-logs-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  if (checking) return <div className="d-loading" dir="rtl"><style dangerouslySetInnerHTML={{ __html: CSS }} />جاري التحقق من الجلسة…</div>;

  const NAV = [
    { id: 'overview', label: 'نظرة عامة', icon: 'home' },
    { id: 'photos', label: 'اللوحات', icon: 'image', badge: photos.length },
    { id: 'visits', label: 'الزوار والأجهزة', icon: 'users', badge: visits.length },
    { id: 'logs', label: 'سجل النشاط', icon: 'list', badge: logs.length },
    { id: 'admins', label: 'الإداريون', icon: 'shield' }
  ];
  const titles = { overview: 'نظرة عامة', photos: 'إدارة اللوحات', visits: 'الزوار والأجهزة', logs: 'سجل نشاط الإداريين', admins: 'الإداريون' };

  return (
    <div className="d-app" dir="rtl">
      <Head>
        <title>لوحة تحكم المعرض — جمعية الثقافة والفنون بالطائف</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {navOpen && <div className="d-scrim" onClick={() => setNavOpen(false)} />}
      <aside className={'d-side' + (navOpen ? ' open' : '')}>
        <div className="d-brand">
          <div className="d-logo"><Icon name="frame" size={22} /></div>
          <div><b>معرض الطائف</b><span>لوحة التحكم</span></div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={'d-nav' + (tab === n.id ? ' on' : '')} onClick={() => { setTab(n.id); setNavOpen(false); if (n.id === 'logs') loadLogs(); }}>
              <Icon name={n.icon} /> <span>{n.label}</span>
              {n.badge !== undefined && <em>{n.badge}</em>}
            </button>
          ))}
          <div className="d-sep" />
          <a className="d-nav hl" href="/admin/editor"><Icon name="cube" /> <span>محرر الصالة ثلاثي الأبعاد</span><Icon name="external" size={14} /></a>
          <a className="d-nav" href="/" target="_blank" rel="noreferrer"><Icon name="globe" /> <span>عرض المعرض</span><Icon name="external" size={14} /></a>
        </nav>
        <div className="d-user">
          <div className="av">{(me || 'A').slice(0, 1).toUpperCase()}</div>
          <div className="nm"><b>{me || 'مسؤول'}</b><span>إداري</span></div>
          <button onClick={handleLogout} title="تسجيل الخروج" aria-label="تسجيل الخروج"><Icon name="logout" /></button>
        </div>
      </aside>

      <main className="d-main">
        <header className="d-top">
          <button className="d-burger" onClick={() => setNavOpen(true)} aria-label="القائمة"><Icon name="menu" /></button>
          <h1>{titles[tab]}</h1>
          <div className="d-online" title="الزوار المتواجدون الآن"><i /> {presence.count} متصل الآن</div>
        </header>

        <div className="d-content">
          {/* ===================== نظرة عامة ===================== */}
          {tab === 'overview' && (
            <>
              <div className="d-cards">
                <Card icon="image" label="اللوحات المرفوعة" value={photos.length} sub={`${placement.byFrame.size} معروضة في الصالة`} />
                <Card icon="frame" label="الإطارات في الصالة" value={frames.length} sub={`${emptyFrames.length} فارغ بانتظار صورة`} tone={emptyFrames.length ? 'gold' : ''} />
                <Card icon="users" label="إجمالي الزيارات" value={visits.length} sub={`${stats.unique} زائر مختلف تقريباً`} />
                <Card icon="pulse" label="زيارات اليوم" value={stats.today} sub={`${presence.count} داخل المعرض الآن`} />
              </div>

              <div className="d-grid2">
                <section className="d-panel">
                  <h2>الزيارات — آخر ١٤ يوماً</h2>
                  <div className="d-chart" role="img" aria-label="رسم أعمدة لعدد الزيارات اليومية">
                    {stats.days.map((d) => (
                      <div key={d.key} className="col" title={`${d.full}: ${d.n}`}>
                        <span className="v">{d.n || ''}</span>
                        <div className="bar" style={{ height: Math.max(3, (d.n / stats.maxDay) * 100) + '%', opacity: d.n ? 1 : 0.25 }} />
                        <span className="l">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="d-panel">
                  <h2>أجهزة الزوار</h2>
                  {visits.length === 0 ? <p className="d-empty">لا توجد زيارات بعد.</p> : (
                    <>
                      <div className="d-stack" role="img" aria-label="توزيع أنواع الأجهزة">
                        {Object.entries(stats.dev).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                          <div key={k} style={{ width: (n / visits.length) * 100 + '%', background: DEVICE_COLOR[k] || '#555' }} title={`${DEVICE_LABEL[k]}: ${n}`} />
                        ))}
                      </div>
                      <ul className="d-legend">
                        {Object.entries(stats.dev).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                          <li key={k}><i style={{ background: DEVICE_COLOR[k] || '#555' }} /> {DEVICE_LABEL[k] || k} <b>{Math.round((n / visits.length) * 100)}%</b> <small>({n})</small></li>
                        ))}
                      </ul>
                      <div className="d-split">
                        <div><h4>أنظمة التشغيل</h4>{stats.os.map(([k, n]) => <div key={k} className="d-kv"><span>{k}</span><b>{n}</b></div>)}</div>
                        <div><h4>المتصفحات</h4>{stats.br.map(([k, n]) => <div key={k} className="d-kv"><span>{k}</span><b>{n}</b></div>)}</div>
                      </div>
                    </>
                  )}
                </section>
              </div>

              <div className="d-grid2">
                <section className="d-panel">
                  <div className="d-ph"><h2>آخر الزوار</h2><button className="d-link" onClick={() => setTab('visits')}>عرض الكل</button></div>
                  {visits.slice(0, 6).map((v) => (
                    <div key={v.id} className="d-mini">
                      <span className="ic"><Icon name={deviceIcon(v.device_type)} size={16} /></span>
                      <div><b>{v.visitor_name}</b><small>{[DEVICE_LABEL[v.device_type || 'unknown'], v.os, v.browser].filter(Boolean).join(' · ')}</small></div>
                      <time>{fmtDateTime(v.created_at)}</time>
                    </div>
                  ))}
                  {visits.length === 0 && <p className="d-empty">لا توجد زيارات بعد.</p>}
                </section>

                <section className="d-panel">
                  <h2>حالة النظام</h2>
                  <ul className="d-health">
                    <Health ok={diag && diag.supabaseServiceClient} label="الاتصال بـ Supabase" />
                    <Health ok={diag && diag.photosTableReachable} label="جدول اللوحات" />
                    <Health ok={diag && diag.storageBucketExists} label="مخزن الصور (gallery-photos)" />
                    <Health ok={diag && diag.env && diag.env.ADMIN_JWT_SECRET} label="مفتاح جلسات الإدارة (ADMIN_JWT_SECRET)" />
                    <Health ok={!layoutIsDefault} warn={layoutIsDefault} label={layoutIsDefault ? 'تخطيط الصالة: افتراضي (لم يُحفظ مخصص بعد)' : 'تخطيط الصالة: مخصص ومحفوظ'} />
                  </ul>
                  <div className="d-actions">
                    <a className="d-btn gold" href="/admin/editor"><Icon name="cube" size={16} /> فتح محرر الصالة</a>
                    <button className="d-btn" onClick={() => { setTab('photos'); setUploadOpen(true); }}><Icon name="upload" size={16} /> رفع لوحة</button>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* ===================== اللوحات ===================== */}
          {tab === 'photos' && (
            <>
              <section className="d-panel">
                <div className="d-ph">
                  <h2>خريطة الإطارات <small>({placement.byFrame.size} من {frames.length} ممتلئ)</small></h2>
                  <a className="d-link" href="/admin/editor">تعديل المواقع ←</a>
                </div>
                <div className="d-fmap">
                  {frames.map((f) => {
                    const p = placement.byFrame.get(f.n);
                    return (
                      <button
                        key={f.n}
                        className={'fm' + (p ? ' full' : '')}
                        style={p ? { backgroundImage: `url("${p.image_url}")` } : undefined}
                        onClick={() => (p ? setEditing(p) : (setUploadOpen(f.n))) }
                        title={p ? (p.title || 'بدون عنوان') + ' — اضغط للتعديل' : 'إطار فارغ — اضغط لرفع لوحة فيه'}
                      >
                        <span className="n">{f.n}</span>
                        {!p && <Icon name="plus" size={14} />}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="d-toolbar">
                <label className="d-search"><Icon name="search" size={16} /><input placeholder="بحث بالعنوان أو المصور أو الموقع…" value={pSearch} onChange={(e) => setPSearch(e.target.value)} /></label>
                <select value={pFilter} onChange={(e) => setPFilter(e.target.value)}>
                  <option value="all">كل اللوحات</option>
                  <option value="placed">داخل إطار</option>
                  <option value="unplaced">بلا إطار</option>
                </select>
                <div className="d-seg">
                  <button className={pView === 'grid' ? 'on' : ''} onClick={() => setPView('grid')}>شبكة</button>
                  <button className={pView === 'list' ? 'on' : ''} onClick={() => setPView('list')}>قائمة</button>
                </div>
                <button className="d-btn gold" onClick={() => setUploadOpen(true)}><Icon name="plus" size={16} /> لوحة جديدة</button>
              </div>

              {!loaded.photos && <p className="d-empty">جاري التحميل…</p>}
              {loaded.photos && photos.length === 0 && (
                <div className="d-blank"><Icon name="image" size={34} /><p>لا توجد لوحات بعد. الإطارات في الصالة ظاهرة فارغة بانتظار رفع الصور.</p><button className="d-btn gold" onClick={() => setUploadOpen(true)}>رفع أول لوحة</button></div>
              )}

              <div className={pView === 'grid' ? 'd-pgrid' : 'd-plist'}>
                {shownPhotos.map(({ p, i }) => {
                  const fn = frameOfPhoto.get(p.id);
                  return (
                    <article key={p.id} className="d-pcard">
                      <div className="im" style={{ backgroundImage: `url("${p.image_url}")` }}>
                        <span className={'bd' + (fn ? '' : ' no')}>{fn ? `إطار ${fn}` : 'بلا إطار'}</span>
                      </div>
                      <div className="bd2">
                        <b>{p.title || 'بدون عنوان'}</b>
                        <small>{[p.photographer, p.camera, p.year, p.location].filter(Boolean).join(' · ') || '—'}</small>
                      </div>
                      <div className="ac">
                        <button onClick={() => handleMovePhoto(i, -1)} title="ترتيب: للأعلى"><Icon name="up" size={15} /></button>
                        <button onClick={() => handleMovePhoto(i, 1)} title="ترتيب: للأسفل"><Icon name="down" size={15} /></button>
                        <button onClick={() => setEditing(p)} title="تعديل"><Icon name="edit" size={15} /></button>
                        <button className="dg" onClick={() => handleDeletePhoto(p)} title="حذف"><Icon name="trash" size={15} /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {loaded.photos && photos.length > 0 && shownPhotos.length === 0 && <p className="d-empty">لا نتائج مطابقة.</p>}
            </>
          )}

          {/* ===================== الزوار ===================== */}
          {tab === 'visits' && (
            <>
              <div className="d-cards sm">
                {['mobile', 'tablet', 'desktop'].map((k) => (
                  <Card key={k} icon={deviceIcon(k)} label={DEVICE_LABEL[k]} value={stats.dev[k] || 0} sub={visits.length ? Math.round(((stats.dev[k] || 0) / visits.length) * 100) + '% من الزيارات' : ''} />
                ))}
                <Card icon="pulse" label="متواجدون الآن" value={presence.count} sub={presence.names.slice(0, 3).join('، ') || 'لا أحد حالياً'} />
              </div>

              <div className="d-toolbar">
                <label className="d-search"><Icon name="search" size={16} /><input placeholder="بحث بالاسم أو المدينة أو الموديل…" value={vSearch} onChange={(e) => setVSearch(e.target.value)} /></label>
                <select value={vDevice} onChange={(e) => setVDevice(e.target.value)}>
                  <option value="all">كل الأجهزة</option>
                  <option value="mobile">جوال</option>
                  <option value="tablet">جهاز لوحي</option>
                  <option value="desktop">كمبيوتر</option>
                  <option value="unknown">غير معروف</option>
                </select>
                <select value={vRange} onChange={(e) => setVRange(e.target.value)}>
                  <option value="all">كل الفترات</option>
                  <option value="today">اليوم</option>
                  <option value="7">آخر ٧ أيام</option>
                  <option value="30">آخر ٣٠ يوماً</option>
                </select>
                <button className="d-btn" onClick={exportCsv} disabled={!filteredVisits.length}><Icon name="download" size={16} /> تصدير Excel/CSV</button>
              </div>

              <section className="d-panel flush">
                <div className="d-tablewrap">
                  <table className="d-table">
                    <thead><tr><th>الزائر</th><th>الجهاز</th><th>النظام</th><th>المتصفح</th><th>الشاشة</th><th>الموقع</th><th>وقت الدخول</th></tr></thead>
                    <tbody>
                      {pageRows.map((v) => (
                        <tr key={v.id}>
                          <td><b>{v.visitor_name}</b></td>
                          <td><span className="dv"><Icon name={deviceIcon(v.device_type)} size={15} /> {DEVICE_LABEL[v.device_type || 'unknown']}{v.device_model ? <small> · {v.device_model}</small> : null}</span></td>
                          <td>{v.os || '—'}</td>
                          <td>{v.browser || '—'}</td>
                          <td dir="ltr" style={{ textAlign: 'right' }}>{v.screen || '—'}</td>
                          <td>{[regionName(v.country), v.city].filter(Boolean).join('، ') || '—'}</td>
                          <td>{fmtDateTime(v.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {loaded.visits && filteredVisits.length === 0 && <p className="d-empty pad">لا توجد زيارات مطابقة.</p>}
                </div>
                <div className="d-pager">
                  <span>{filteredVisits.length} زيارة</span>
                  <div>
                    <button disabled={vPage <= 1} onClick={() => setVPage((p) => p - 1)}>السابق</button>
                    <b>{vPage} / {pages}</b>
                    <button disabled={vPage >= pages} onClick={() => setVPage((p) => p + 1)}>التالي</button>
                  </div>
                </div>
              </section>
              <p className="d-note">الجهاز يُستخرج من متصفح الزائر (النوع والنظام والمتصفح ودقة الشاشة). موديل الآيفون الدقيق لا تكشفه المتصفحات، وموديل أندرويد يظهر حين يتيحه المتصفح. الدولة/المدينة تظهر عند النشر على Vercel. لا يُحفظ عنوان IP نفسه.</p>
            </>
          )}

          {/* ===================== الإداريون ===================== */}
          {tab === 'logs' && (
            <>
              {logsMissing && <div className="d-note warnbox">جدول السجلات غير موجود بعد — نفّذ ملف <b>supabase_update_v11.sql</b> في Supabase SQL Editor ليبدأ تسجيل النشاط.</div>}
              <div className="d-toolbar">
                <label className="d-search"><Icon name="search" size={16} /><input placeholder="بحث في ملخص العملية وتفاصيلها…" value={lSearch} onChange={(e) => setLSearch(e.target.value)} /></label>
                <select value={lAdmin} onChange={(e) => setLAdmin(e.target.value)}>
                  <option value="all">كل الإداريين</option>
                  {logAdmins.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={lCat} onChange={(e) => setLCat(e.target.value)}>
                  <option value="all">كل الأقسام</option>
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={lRange} onChange={(e) => setLRange(e.target.value)}>
                  <option value="all">كل الفترات</option>
                  <option value="today">اليوم</option>
                  <option value="7">آخر ٧ أيام</option>
                  <option value="30">آخر ٣٠ يوماً</option>
                </select>
                <button className="d-btn" onClick={loadLogs}>تحديث</button>
                <button className="d-btn" onClick={exportLogsCsv} disabled={!filteredLogs.length}><Icon name="download" size={16} /> تصدير CSV</button>
              </div>
              <section className="d-panel flush">
                <div className="d-tablewrap">
                  <table className="d-table logs">
                    <thead><tr><th>الوقت</th><th>الإداري</th><th>القسم</th><th>العملية</th><th>التفاصيل</th></tr></thead>
                    <tbody>
                      {logRows.map((l) => {
                        const lines = (l.details && l.details.lines) || [];
                        const open = lOpen === l.id;
                        return (
                          <Fragment key={l.id}>
                            <tr className="lrow" onClick={() => lines.length && setLOpen(open ? null : l.id)}>
                              <td>{fmtDateTime(l.created_at)}</td>
                              <td><b>{l.admin_username || '—'}</b></td>
                              <td><span className={'lcat ' + l.category}>{CAT_LABEL[l.category] || l.category}</span></td>
                              <td className="lsum">{l.summary}</td>
                              <td>{lines.length ? <span className="d-link">{open ? 'إخفاء' : `عرض (${lines.length})`}</span> : '—'}</td>
                            </tr>
                            {open && (
                              <tr className="ldetail"><td colSpan={5}>
                                <ul>{lines.map((x, i) => <li key={i}>{x}</li>)}</ul>
                                {l.device && <small>الجهاز: {l.device}</small>}
                              </td></tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredLogs.length === 0 && <p className="d-empty pad">{logs.length === 0 ? 'لا توجد سجلات بعد.' : 'لا سجلات مطابقة.'}</p>}
                </div>
                <div className="d-pager">
                  <span>{filteredLogs.length} سجل</span>
                  <div>
                    <button disabled={lPage <= 1} onClick={() => setLPage((p) => p - 1)}>السابق</button>
                    <b>{lPage} / {lPages}</b>
                    <button disabled={lPage >= lPages} onClick={() => setLPage((p) => p + 1)}>التالي</button>
                  </div>
                </div>
              </section>
              <p className="d-note">يُسجَّل تلقائياً: الدخول والخروج ومحاولات الدخول الفاشلة، رفع اللوحات وتعديلها وحذفها وإعادة ترتيبها، كل عملية حفظ في محرر المعرض بتفاصيلها (إطارات وجدران وتوزيع اللوحات)، وإضافة/حذف الإداريين.</p>
            </>
          )}

          {tab === 'admins' && (
            <div className="d-grid2 wide">
              <section className="d-panel">
                <h2>إضافة إداري جديد</h2>
                <form onSubmit={handleAddAdmin} className="d-form">
                  <label>اسم المستخدم<input value={adminForm.username} onChange={(e) => setAdminForm((f) => ({ ...f, username: e.target.value }))} autoComplete="off" /></label>
                  <label>كلمة المرور<input type="password" placeholder="٦ أحرف على الأقل" value={adminForm.password} onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" /></label>
                  <button className="d-btn gold" type="submit"><Icon name="plus" size={16} /> إضافة</button>
                </form>
              </section>
              <section className="d-panel">
                <h2>الحسابات ({admins.length})</h2>
                {admins.map((a) => (
                  <div key={a.id} className="d-mini">
                    <span className="ic av">{a.username.slice(0, 1).toUpperCase()}</span>
                    <div><b>{a.username}{a.username === me && <em className="you">أنت</em>}</b><small>منذ {fmtDate(a.created_at)}</small></div>
                    {a.username !== me && <button className="d-ico dg" onClick={() => handleDeleteAdmin(a)} title="حذف"><Icon name="trash" size={15} /></button>}
                  </div>
                ))}
                {admins.length === 0 && <p className="d-empty">لا يوجد إداريون.</p>}
              </section>
            </div>
          )}
        </div>
      </main>

      {uploadOpen && (
        <UploadModal
          frames={frames}
          placement={placement}
          initialSlot={typeof uploadOpen === 'number' ? uploadOpen : ''}
          onClose={() => setUploadOpen(false)}
          onDone={() => { setUploadOpen(false); showToast('تم رفع اللوحة'); loadPhotos(); }}
          onError={(m) => showToast(m, 'err')}
        />
      )}
      {editing && (
        <EditModal
          photo={editing}
          frames={frames}
          placement={placement}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); showToast('تم حفظ التعديل'); loadPhotos(); }}
          onError={(m) => showToast(m, 'err')}
        />
      )}
      {confirmBox && (
        <div className="d-modal" onClick={() => setConfirmBox(null)}>
          <div className="d-dialog sm" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmBox.title}</h3>
            <p>{confirmBox.text}</p>
            <div className="d-dlgbtns">
              <button className="d-btn" onClick={() => setConfirmBox(null)}>إلغاء</button>
              <button className={'d-btn ' + (confirmBox.danger ? 'danger' : 'gold')} onClick={async () => { const c = confirmBox; setConfirmBox(null); await c.onYes(); }}>{confirmBox.yes || 'تأكيد'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div key={toast.id} className={'d-toast ' + toast.kind}>{toast.msg}</div>}
    </div>
  );
}

function Card({ icon, label, value, sub, tone }) {
  return (
    <div className={'d-card ' + (tone || '')}>
      <div className="ic"><Icon name={icon} size={20} /></div>
      <div><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>
    </div>
  );
}
function Health({ ok, warn, label }) {
  const state = ok ? 'ok' : warn ? 'warn' : 'bad';
  return <li className={state}><Icon name={ok ? 'check' : 'alert'} size={16} /> {label}</li>;
}

function SlotSelect({ value, onChange, frames, placement, ownId }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">تلقائي (أول إطار شاغر)</option>
      {frames.map((f) => {
        const occ = placement.byFrame.get(f.n);
        const taken = occ && occ.id !== ownId;
        return <option key={f.n} value={f.n} disabled={taken}>الإطار {f.n}{taken ? ' — مشغول' : (!occ ? ' — فارغ' : '')}</option>;
      })}
    </select>
  );
}

function UploadModal({ frames, placement, initialSlot, onClose, onDone, onError }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, slot_index: initialSlot ? String(initialSlot) : '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  function pick(f) {
    if (!f) return;
    if (!/^image\//.test(f.type)) { onError('اختر ملف صورة'); return; }
    setFile(f);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!file) { onError('اختر صورة أولاً'); return; }
    setBusy(true);
    try {
      const f = await compressIfLarge(file);
      if (f.size > 8.5 * 1024 * 1024) { onError('حجم الصورة كبير جداً (الحد ٨ ميجابايت)'); setBusy(false); return; }
      const fileBase64 = await new Promise((resolve, reject) => {
        const rd = new FileReader();
        rd.onload = () => resolve(rd.result);
        rd.onerror = reject;
        rd.readAsDataURL(f);
      });
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, fileName: f.name, ...form, slot_index: form.slot_index || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError(data.error || 'فشل الرفع'); setBusy(false); return; }
      onDone();
    } catch (err) {
      onError('تعذّر رفع الملف');
      setBusy(false);
    }
  }

  return (
    <div className="d-modal" onClick={() => !busy && onClose()}>
      <form className="d-dialog" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="d-dh"><h3>رفع لوحة جديدة</h3><button type="button" onClick={onClose} aria-label="إغلاق"><Icon name="x" /></button></div>
        <div
          className={'d-drop' + (drag ? ' on' : '') + (preview ? ' has' : '')}
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files && e.dataTransfer.files[0]); }}
        >
          {preview ? <img src={preview} alt="معاينة" /> : <><Icon name="upload" size={30} /><p>اسحب الصورة هنا أو اضغط للاختيار</p><small>الصور الكبيرة تُضغط تلقائياً قبل الرفع</small></>}
          <input id="fileInput" ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files && e.target.files[0])} />
        </div>
        <div className="d-fgrid">
          <label>اسم اللوحة<input value={form.title} onChange={set('title')} /></label>
          <label>المصور<input value={form.photographer} onChange={set('photographer')} /></label>
          <label>الكاميرا<input value={form.camera} onChange={set('camera')} /></label>
          <label>السنة<input value={form.year} onChange={set('year')} /></label>
          <label>الموقع<input value={form.location} onChange={set('location')} placeholder="مثال: الشفا" /></label>
          <label>الإطار داخل الصالة<SlotSelect value={form.slot_index} onChange={(v) => setForm((f) => ({ ...f, slot_index: v }))} frames={frames} placement={placement} /></label>
        </div>
        <div className="d-dlgbtns">
          <button type="button" className="d-btn" onClick={onClose} disabled={busy}>إلغاء</button>
          <button type="submit" className="d-btn gold" disabled={busy}>{busy ? 'جاري الرفع…' : 'رفع اللوحة'}</button>
        </div>
      </form>
    </div>
  );
}

function EditModal({ photo, frames, placement, onClose, onDone, onError }) {
  const [form, setForm] = useState({
    title: photo.title || '', photographer: photo.photographer || '', camera: photo.camera || '',
    year: photo.year || '', location: photo.location || '', slot_index: photo.slot_index ? String(photo.slot_index) : ''
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/admin/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: photo.id, ...form, slot_index: form.slot_index || null })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { onError(data.error || 'تعذّر الحفظ'); setBusy(false); return; }
    onDone();
  }
  return (
    <div className="d-modal" onClick={() => !busy && onClose()}>
      <form className="d-dialog" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="d-dh"><h3>تعديل اللوحة</h3><button type="button" onClick={onClose} aria-label="إغلاق"><Icon name="x" /></button></div>
        <div className="d-editprev"><img src={photo.image_url} alt={photo.title || ''} /></div>
        <div className="d-fgrid">
          <label>اسم اللوحة<input value={form.title} onChange={set('title')} /></label>
          <label>المصور<input value={form.photographer} onChange={set('photographer')} /></label>
          <label>الكاميرا<input value={form.camera} onChange={set('camera')} /></label>
          <label>السنة<input value={form.year} onChange={set('year')} /></label>
          <label>الموقع<input value={form.location} onChange={set('location')} /></label>
          <label>الإطار داخل الصالة<SlotSelect value={form.slot_index} onChange={(v) => setForm((f) => ({ ...f, slot_index: v }))} frames={frames} placement={placement} ownId={photo.id} /></label>
        </div>
        <div className="d-dlgbtns">
          <button type="button" className="d-btn" onClick={onClose} disabled={busy}>إلغاء</button>
          <button type="submit" className="d-btn gold" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ'}</button>
        </div>
      </form>
    </div>
  );
}

const CSS = `
  .d-app, .d-loading { --gold:#c9a35b; --gold2:#f0cf8a; --bg:#0d0b09; --panel:#16130f; --panel2:#1c1813; --line:rgba(255,255,255,.08); --txt:#f3efe8; --mut:#9a9388; --ok:#7fc58f; --bad:#e58a8a; }
  html, body { margin:0; background:#0d0b09; }
  .d-loading { min-height:100vh; display:flex; align-items:center; justify-content:center; color:#c9a35b; background:#0d0b09; font-family:'Segoe UI',Tahoma,Arial,sans-serif; }
  .d-app { min-height:100vh; display:flex; background:var(--bg); color:var(--txt); font-family:'Segoe UI',Tahoma,Arial,sans-serif; }
  .d-app * { box-sizing:border-box; }
  .d-app button, .d-app input, .d-app select { font-family:inherit; }
  .d-side { width:256px; flex-shrink:0; background:var(--panel); border-left:1px solid var(--line); display:flex; flex-direction:column; padding:18px 14px; position:sticky; top:0; height:100vh; }
  .d-brand { display:flex; align-items:center; gap:11px; padding:4px 6px 18px; }
  .d-logo { width:42px; height:42px; border-radius:11px; background:linear-gradient(135deg,#c9a35b,#8f6d2f); color:#1a1408; display:flex; align-items:center; justify-content:center; }
  .d-brand b { display:block; font-size:15px; } .d-brand span { font-size:11.5px; color:var(--mut); }
  .d-side nav { display:flex; flex-direction:column; gap:3px; flex:1; }
  .d-nav { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; background:none; border:none; color:#cfc6b8; font-size:14px; cursor:pointer; text-decoration:none; text-align:right; }
  .d-nav span { flex:1; }
  .d-nav em { font-style:normal; font-size:11px; background:rgba(255,255,255,.08); padding:1px 8px; border-radius:10px; color:var(--mut); }
  .d-nav:hover { background:rgba(255,255,255,.06); }
  .d-nav.on { background:rgba(201,163,91,.14); color:var(--gold2); }
  .d-nav.hl { color:var(--gold2); }
  .d-sep { height:1px; background:var(--line); margin:10px 4px; }
  .d-user { display:flex; align-items:center; gap:10px; padding:12px 8px 2px; border-top:1px solid var(--line); }
  .av { width:34px; height:34px; border-radius:50%; background:rgba(201,163,91,.2); color:var(--gold2); display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; }
  .d-user .nm { flex:1; min-width:0; } .d-user b { display:block; font-size:13px; } .d-user span { font-size:11px; color:var(--mut); }
  .d-user button { background:none; border:1px solid var(--line); color:var(--mut); border-radius:8px; padding:6px; cursor:pointer; display:flex; }
  .d-user button:hover { color:var(--bad); border-color:rgba(229,138,138,.4); }
  .d-main { flex:1; min-width:0; }
  .d-top { display:flex; align-items:center; gap:12px; padding:16px 28px; border-bottom:1px solid var(--line); position:sticky; top:0; background:rgba(13,11,9,.92); backdrop-filter:blur(8px); z-index:20; }
  .d-top h1 { margin:0; font-size:19px; font-weight:600; flex:1; }
  .d-burger { display:none; background:none; border:1px solid var(--line); color:var(--txt); border-radius:9px; padding:7px; cursor:pointer; }
  .d-online { display:flex; align-items:center; gap:8px; font-size:12.5px; color:#cfc6b8; background:rgba(255,255,255,.05); border:1px solid var(--line); padding:6px 13px; border-radius:20px; }
  .d-online i { width:8px; height:8px; border-radius:50%; background:var(--ok); box-shadow:0 0 0 3px rgba(127,197,143,.2); }
  .d-content { padding:24px 28px 50px; max-width:1280px; margin:0 auto; }
  .d-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:14px; margin-bottom:18px; }
  .d-card { display:flex; gap:14px; align-items:flex-start; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; }
  .d-card .ic { width:40px; height:40px; border-radius:11px; background:rgba(201,163,91,.13); color:var(--gold2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .d-card span { display:block; font-size:12.5px; color:var(--mut); }
  .d-card b { display:block; font-size:27px; line-height:1.25; font-weight:700; }
  .d-card small { color:var(--mut); font-size:11.5px; }
  .d-card.gold { border-color:rgba(201,163,91,.35); }
  .d-grid2 { display:grid; grid-template-columns:1.25fr 1fr; gap:16px; margin-bottom:16px; }
  .d-grid2.wide { grid-template-columns:1fr 1fr; }
  .d-panel { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:18px; margin-bottom:16px; }
  .d-grid2 .d-panel { margin-bottom:0; }
  .d-panel.flush { padding:0; overflow:hidden; }
  .d-panel h2 { margin:0 0 14px; font-size:14.5px; font-weight:600; color:#e8dcc4; }
  .d-panel h2 small { color:var(--mut); font-weight:400; font-size:12px; }
  .d-ph { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; } .d-ph h2 { margin:0; }
  .d-link { background:none; border:none; color:var(--gold); font-size:12.5px; cursor:pointer; text-decoration:none; }
  .d-chart { display:flex; align-items:flex-end; gap:6px; height:190px; padding-top:6px; }
  .d-chart .col { flex:1; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; min-width:0; }
  .d-chart .bar { width:100%; max-width:30px; background:linear-gradient(180deg,#e0bd78,#9c7a3c); border-radius:5px 5px 2px 2px; }
  .d-chart .v { font-size:11px; color:#d8cdb8; height:14px; } .d-chart .l { font-size:10.5px; color:var(--mut); }
  .d-stack { display:flex; height:14px; border-radius:7px; overflow:hidden; background:#222; gap:2px; margin-bottom:12px; }
  .d-legend { list-style:none; margin:0 0 14px; padding:0; display:flex; flex-direction:column; gap:7px; font-size:13px; }
  .d-legend li { display:flex; align-items:center; gap:8px; } .d-legend i { width:10px; height:10px; border-radius:3px; } .d-legend b { margin-inline-start:auto; } .d-legend small { color:var(--mut); }
  .d-split { display:grid; grid-template-columns:1fr 1fr; gap:14px; border-top:1px solid var(--line); padding-top:12px; }
  .d-split h4 { margin:0 0 8px; font-size:12px; color:var(--mut); font-weight:500; }
  .d-kv { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; } .d-kv b { color:var(--gold2); }
  .d-mini { display:flex; align-items:center; gap:12px; padding:9px 0; border-bottom:1px solid var(--line); }
  .d-mini:last-child { border-bottom:none; }
  .d-mini .ic { width:32px; height:32px; border-radius:9px; background:rgba(255,255,255,.06); display:flex; align-items:center; justify-content:center; color:var(--gold2); flex-shrink:0; }
  .d-mini .ic.av { border-radius:50%; }
  .d-mini > div { flex:1; min-width:0; } .d-mini b { display:block; font-size:13.5px; font-weight:500; } .d-mini small { color:var(--mut); font-size:11.5px; }
  .d-mini time { font-size:11.5px; color:var(--mut); white-space:nowrap; }
  .you { font-style:normal; font-size:10.5px; margin-inline-start:8px; background:rgba(201,163,91,.2); color:var(--gold2); padding:1px 8px; border-radius:10px; }
  .d-health { list-style:none; margin:0 0 16px; padding:0; display:flex; flex-direction:column; gap:9px; font-size:13px; }
  .d-health li { display:flex; align-items:center; gap:9px; } .d-health .ok { color:var(--ok); } .d-health .bad { color:var(--bad); } .d-health .warn { color:var(--gold2); }
  .d-actions { display:flex; gap:10px; flex-wrap:wrap; }
  .d-btn { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.14); color:var(--txt); padding:9px 15px; border-radius:10px; cursor:pointer; font-size:13px; text-decoration:none; white-space:nowrap; }
  .d-btn:hover:not(:disabled) { background:rgba(255,255,255,.13); }
  .d-btn:disabled { opacity:.5; cursor:not-allowed; }
  .d-btn.gold { background:linear-gradient(135deg,#c9a35b,#9c7a3c); color:#1a1408; border:none; font-weight:700; }
  .d-btn.danger { background:rgba(224,100,100,.2); border-color:rgba(224,100,100,.5); color:#f3b0b0; }
  .d-toolbar { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
  .d-search { flex:1; min-width:220px; display:flex; align-items:center; gap:9px; background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:0 13px; color:var(--mut); }
  .d-search input { flex:1; background:none; border:none; outline:none; color:var(--txt); padding:10px 0; font-size:13px; }
  .d-toolbar select { background:var(--panel); border:1px solid var(--line); color:var(--txt); border-radius:10px; padding:10px 12px; font-size:13px; outline:none; }
  .d-seg { display:flex; background:var(--panel); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  .d-seg button { background:none; border:none; color:var(--mut); padding:9px 14px; cursor:pointer; font-size:13px; }
  .d-seg button.on { background:rgba(201,163,91,.16); color:var(--gold2); }
  .d-fmap { display:grid; grid-template-columns:repeat(auto-fill,minmax(64px,1fr)); gap:8px; }
  .fm { aspect-ratio:4/3; border-radius:9px; border:1px dashed rgba(255,255,255,.25); background:rgba(255,255,255,.03) center/cover no-repeat; color:var(--mut); cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center; padding:0; }
  .fm.full { border:1px solid rgba(201,163,91,.6); }
  .fm .n { position:absolute; top:4px; right:4px; background:rgba(0,0,0,.7); color:var(--gold2); font-size:11px; font-weight:700; border-radius:6px; padding:0 6px; }
  .fm:hover { filter:brightness(1.2); border-color:var(--gold); }
  .d-pgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; }
  .d-pcard { background:var(--panel); border:1px solid var(--line); border-radius:14px; overflow:hidden; display:flex; flex-direction:column; }
  .d-pcard .im { aspect-ratio:4/3; background:#000 center/cover no-repeat; position:relative; }
  .d-pcard .bd { position:absolute; top:10px; right:10px; background:rgba(0,0,0,.75); color:var(--gold2); font-size:11.5px; padding:3px 10px; border-radius:20px; }
  .d-pcard .bd.no { color:#f0c987; border:1px solid rgba(240,201,135,.4); }
  .d-pcard .bd2 { padding:12px 14px 4px; flex:1; } .d-pcard .bd2 b { display:block; font-size:14px; font-weight:600; } .d-pcard .bd2 small { color:var(--mut); font-size:12px; }
  .ac { display:flex; gap:6px; padding:10px 12px 12px; }
  .ac button, .d-ico { background:rgba(255,255,255,.06); border:1px solid var(--line); color:#cfc6b8; border-radius:8px; padding:6px 9px; cursor:pointer; display:inline-flex; }
  .ac button:hover, .d-ico:hover { background:rgba(255,255,255,.13); }
  .ac .dg, .d-ico.dg { color:var(--bad); margin-inline-start:auto; } .ac .dg:hover, .d-ico.dg:hover { background:rgba(224,100,100,.18); }
  .d-plist { display:flex; flex-direction:column; gap:10px; }
  .d-plist .d-pcard { flex-direction:row; align-items:center; }
  .d-plist .im { width:110px; aspect-ratio:4/3; flex-shrink:0; }
  .d-plist .bd2 { padding:8px 16px; } .d-plist .ac { padding:10px; }
  .d-plist .ac .dg { margin-inline-start:0; }
  .d-blank { text-align:center; padding:50px 20px; color:var(--mut); background:var(--panel); border:1px dashed var(--line); border-radius:14px; }
  .d-blank p { margin:12px 0 18px; }
  .d-empty { color:var(--mut); font-size:13px; } .d-empty.pad { padding:30px; text-align:center; }
  .d-tablewrap { overflow-x:auto; }
  .d-table { width:100%; border-collapse:collapse; font-size:13px; min-width:820px; }
  .d-table th { text-align:right; font-weight:500; color:var(--mut); font-size:12px; padding:12px 16px; background:rgba(255,255,255,.03); border-bottom:1px solid var(--line); white-space:nowrap; }
  .d-table td { padding:11px 16px; border-bottom:1px solid var(--line); white-space:nowrap; }
  .d-table tr:hover td { background:rgba(255,255,255,.025); }
  .dv { display:inline-flex; align-items:center; gap:7px; } .dv small { color:var(--mut); }
  .d-pager { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; font-size:12.5px; color:var(--mut); }
  .d-pager div { display:flex; align-items:center; gap:12px; color:var(--txt); }
  .d-pager button { background:rgba(255,255,255,.07); border:1px solid var(--line); color:var(--txt); border-radius:8px; padding:6px 14px; cursor:pointer; } .d-pager button:disabled { opacity:.4; cursor:not-allowed; }
  .d-note { font-size:12px; color:var(--mut); line-height:1.8; margin:4px 2px 0; }
  .d-form { display:flex; flex-direction:column; gap:12px; }
  .d-form label, .d-fgrid label { display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--mut); }
  .d-form input, .d-fgrid input, .d-fgrid select { background:rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.14); color:var(--txt); border-radius:9px; padding:10px 12px; font-size:13px; outline:none; }
  .d-form input:focus, .d-fgrid input:focus, .d-fgrid select:focus { border-color:var(--gold); }
  .d-form .d-btn { align-self:flex-start; }
  .d-modal { position:fixed; inset:0; background:rgba(0,0,0,.66); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; z-index:100; padding:16px; }
  .d-dialog { background:var(--panel2); border:1px solid var(--line); border-radius:16px; padding:20px; width:100%; max-width:620px; max-height:92vh; overflow-y:auto; }
  .d-dialog.sm { max-width:400px; }
  .d-dialog h3 { margin:0 0 8px; font-size:16px; } .d-dialog p { color:#cfc6b8; font-size:13.5px; line-height:1.8; margin:0 0 18px; }
  .d-dh { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; } .d-dh h3 { margin:0; }
  .d-dh button { background:none; border:none; color:var(--mut); cursor:pointer; display:flex; }
  .d-dlgbtns { display:flex; gap:10px; justify-content:flex-end; margin-top:18px; }
  .d-drop { border:2px dashed rgba(255,255,255,.2); border-radius:14px; padding:26px 14px; text-align:center; color:var(--mut); cursor:pointer; margin-bottom:14px; }
  .d-drop.on { border-color:var(--gold); background:rgba(201,163,91,.07); } .d-drop.has { padding:8px; }
  .d-drop p { margin:8px 0 2px; color:#d8cdb8; font-size:13.5px; } .d-drop small { font-size:11.5px; }
  .d-drop img { max-width:100%; max-height:240px; border-radius:9px; display:block; margin:0 auto; }
  .d-editprev { text-align:center; margin-bottom:14px; } .d-editprev img { max-width:100%; max-height:200px; border-radius:10px; }
  .d-fgrid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .d-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#1f3d27; border:1px solid #3d7a4d; color:#d6f2dc; padding:11px 20px; border-radius:11px; font-size:13.5px; z-index:200; box-shadow:0 10px 30px rgba(0,0,0,.5); }
  .d-toast.err { background:#451f1f; border-color:#8a3d3d; color:#f6d6d6; } .d-toast.warn { background:#453a1f; border-color:#8a7a3d; color:#f6ecd6; }
  .lrow { cursor:pointer; } .lsum { white-space:normal !important; min-width:260px; }
  .lcat { font-size:11.5px; padding:2px 10px; border-radius:20px; background:rgba(255,255,255,.08); }
  .lcat.layout { background:rgba(201,163,91,.18); color:var(--gold2); } .lcat.photo { background:rgba(95,168,160,.2); color:#8fd6cc; } .lcat.auth { background:rgba(255,255,255,.08); } .lcat.admin { background:rgba(185,122,143,.22); color:#e0a9bb; }
  .ldetail td { background:rgba(255,255,255,.03); white-space:normal !important; } .ldetail ul { margin:0 0 6px; padding:0 18px 0 0; line-height:2; font-size:12.5px; } .ldetail small { color:var(--mut); }
  .warnbox { background:rgba(240,201,135,.08); border:1px solid rgba(240,201,135,.3); border-radius:10px; padding:10px 14px; color:#f0c987; margin-bottom:14px; }
  .d-scrim { display:none; }
  @media (max-width: 960px) {
    .d-grid2, .d-grid2.wide { grid-template-columns:1fr; }
    .d-side { position:fixed; right:0; top:0; z-index:60; transform:translateX(100%); transition:transform .25s; box-shadow:-10px 0 40px rgba(0,0,0,.5); }
    .d-side.open { transform:none; }
    .d-scrim { display:block; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:50; }
    .d-burger { display:flex; }
    .d-top, .d-content { padding-left:16px; padding-right:16px; }
  }
  @media (max-width: 560px) { .d-fgrid { grid-template-columns:1fr; } .d-split { grid-template-columns:1fr; } .d-plist .im { width:84px; } }
`;

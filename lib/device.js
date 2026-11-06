// استخراج معلومات الجهاز من ترويسة User-Agent (بدون أي مكتبة خارجية) بالإضافة
// لما يرسله المتصفح نفسه (دقة الشاشة، نقاط اللمس، موديل أندرويد إن أتاحه).
// ملاحظة: متصفحات آيفون لا تكشف الموديل الدقيق (iPhone 14 مثلاً) إطلاقاً، ومتصفح
// Chrome على أندرويد يُخفي الموديل في الـUser-Agent لكن يمكن قراءته عبر
// userAgentData (يُرسله المعرض تلقائياً حين يتوفر).

export function parseUserAgent(ua = '', hints = {}) {
  const s = String(ua || '');
  const touch = Number(hints.touch) || 0;
  let os = 'غير معروف';
  let osVersion = null;
  let model = hints.model ? String(hints.model).slice(0, 60) : null;
  let type = 'desktop';

  if (/iPhone/.test(s)) {
    os = 'iOS'; type = 'mobile'; model = model || 'iPhone';
    osVersion = (s.match(/OS (\d+)[_\d]*/) || [])[1] || null;
  } else if (/iPad/.test(s) || (/Macintosh/.test(s) && touch > 1)) {
    // iPadOS 13+ يرسل UA يشبه ماك؛ نكشفه عبر نقاط اللمس
    os = 'iPadOS'; type = 'tablet'; model = model || 'iPad';
    osVersion = (s.match(/OS (\d+)[_\d]*/) || [])[1] || null;
  } else if (/Android/.test(s)) {
    os = 'Android';
    type = /Mobile/.test(s) ? 'mobile' : 'tablet';
    osVersion = (s.match(/Android (\d+(?:\.\d+)?)/) || [])[1] || null;
    if (!model) {
      const m = s.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|[;)])/);
      const guess = m && m[1] && m[1].trim();
      if (guess && guess !== 'K' && guess.length > 1) model = guess.slice(0, 60);
    }
  } else if (/Windows NT/.test(s)) {
    os = 'Windows';
    osVersion = /Windows NT 10/.test(s) ? '10/11' : (s.match(/Windows NT ([\d.]+)/) || [])[1] || null;
  } else if (/Mac OS X/.test(s)) {
    os = 'macOS';
  } else if (/CrOS/.test(s)) {
    os = 'ChromeOS';
  } else if (/Linux/.test(s)) {
    os = 'Linux';
  }

  let browser = 'غير معروف';
  if (/Edg(e|A|iOS)?\//.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(s)) browser = 'Opera';
  else if (/SamsungBrowser/.test(s)) browser = 'Samsung Internet';
  else if (/Firefox\/|FxiOS/.test(s)) browser = 'Firefox';
  else if (/CriOS|Chrome\//.test(s)) browser = 'Chrome';
  else if (/Safari\//.test(s)) browser = 'Safari';

  if (/bot|crawler|spider|preview/i.test(s)) type = 'bot';

  return { device_type: type, os: osVersion ? `${os} ${osVersion}` : os, browser, device_model: model };
}

// يستخرج الدولة/المدينة من ترويسات Vercel (تتوفر تلقائياً عند النشر عليه فقط)
export function geoFromHeaders(headers = {}) {
  const country = (headers['x-vercel-ip-country'] || '').toString().slice(0, 2).toUpperCase() || null;
  let city = headers['x-vercel-ip-city'] || '';
  try { city = decodeURIComponent(city); } catch (e) { /* يبقى كما هو */ }
  return { country, city: (city || '').toString().slice(0, 60) || null };
}

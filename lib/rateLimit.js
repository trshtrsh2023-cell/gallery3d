// محدّد معدّل بسيط في الذاكرة (لكل نسخة خادم). يكفي لإبطاء التخمين وسوء الاستخدام.
const buckets = new Map();

export function clientIp(req) {
  return ((req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || 'unknown').toString().split(',')[0].trim();
}

// يرجع true إذا تجاوز الحد
export function limited(req, key, max, windowMs) {
  const k = key + ':' + clientIp(req);
  const now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.start > windowMs) b = { start: now, n: 0 };
  b.n++;
  buckets.set(k, b);
  if (buckets.size > 5000) { for (const [kk, v] of buckets) if (now - v.start > windowMs) buckets.delete(kk); }
  return b.n > max;
}

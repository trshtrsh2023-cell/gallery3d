let visitors = {};
export default function handler(req, res) {
  if (req.method === 'POST') {
    const { visitor_id, name, x, z, yaw } = req.body;
    if (!visitor_id) return res.status(400).json({ error: 'Missing ID' });
    visitors[visitor_id] = { name, x, z, yaw, lastUpdate: Date.now() };
    return res.status(200).json({ success: true });
  }
  if (req.method === 'GET') {
    const now = Date.now();
    // تنظيف الزوار اللي غادروا (بعد 10 ثواني)
    Object.keys(visitors).forEach(id => {
      if (now - visitors[id].lastUpdate > 10000) delete visitors[id];
    });
    return res.status(200).json(Object.values(visitors));
  }
  res.status(405).end();
}
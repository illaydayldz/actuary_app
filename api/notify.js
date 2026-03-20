const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(method, ...args) {
  const res = await fetch(`${REDIS_URL}/${method}/${args.map(a => encodeURIComponent(a)).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST /api/notify → bildirim gönder
  // body: { toCode, fromName, type: 'like', postText }
  if (req.method === 'POST') {
    const { toCode, fromName, type, postText } = req.body;
    if (!toCode || !fromName) return res.status(400).json({ error: 'eksik alan' });

    const notif = JSON.stringify({
      fromName,
      type,
      postText: postText?.slice(0, 60),
      time: Date.now()
    });

    // Listeye ekle (max 20 bildirim)
    await redis('lpush', `notifs:${toCode}`, notif);
    await redis('ltrim', `notifs:${toCode}`, 0, 19);
    await redis('expire', `notifs:${toCode}`, 86400 * 7); // 7 gün

    return res.status(200).json({ ok: true });
  }

  // GET /api/notify?code=FROG-XXXX → bildirimleri çek ve temizle
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code gerekli' });

    const raw = await redis('lrange', `notifs:${code}`, 0, 19);
    const notifs = (raw || []).map(n => {
      try { return JSON.parse(n); } catch { return null; }
    }).filter(Boolean);

    // Okundu işaretle — listeyi temizle
    await redis('del', `notifs:${code}`);

    return res.status(200).json({ notifs });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

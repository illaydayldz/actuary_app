const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}/${cmd}/${args.map(a => encodeURIComponent(a)).join('/')}`, {
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

  // POST /api/friends → kullanıcı profilini kaydet
  if (req.method === 'POST') {
    const { code, name, score, streak, done } = req.body;
    if (!code) return res.status(400).json({ error: 'code gerekli' });
    const profile = JSON.stringify({ code, name, score, streak, done, updatedAt: Date.now() });
    await redis('set', `user:${code}`, profile);
    await redis('expire', `user:${code}`, 86400 * 30); // 30 gün
    return res.status(200).json({ ok: true });
  }

  // GET /api/friends?codes=FROG-XXXX,FROG-YYYY → arkadaş profilleri
  if (req.method === 'GET') {
    const { codes } = req.query;
    if (!codes) return res.status(400).json({ error: 'codes gerekli' });
    const codeList = codes.split(',').filter(Boolean).slice(0, 20);
    const profiles = await Promise.all(
      codeList.map(async code => {
        const raw = await redis('get', `user:${code}`);
        return raw ? JSON.parse(raw) : null;
      })
    );
    return res.status(200).json({ profiles: profiles.filter(Boolean) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

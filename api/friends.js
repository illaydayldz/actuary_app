const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

async function redis(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { code, name, score, streak, done } = req.body;
    if (!code) return res.status(400).json({ error: 'code gerekli' });
    const profile = JSON.stringify({ code, name, score, streak, done, updatedAt: Date.now() });
    await redis('SET', `user:${code}`, profile, 'EX', 86400 * 30);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const { codes } = req.query;
    if (!codes) return res.status(400).json({ error: 'codes gerekli' });
    const codeList = codes.split(',').filter(Boolean).slice(0, 20);
    const profiles = await Promise.all(
      codeList.map(async code => {
        const raw = await redis('GET', `user:${code}`);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      })
    );
    return res.status(200).json({ profiles: profiles.filter(Boolean) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

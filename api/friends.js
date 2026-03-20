const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

async function redis(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
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

  // POST - profil kaydet veya istek gönder
  if (req.method === 'POST') {
    const { action, code, name, score, streak, done, toCode, fromCode, fromName } = req.body;

    // Profil kaydet
    if (!action || action === 'save') {
      if (!code) return res.status(400).json({ error: 'code gerekli' });
      const profile = JSON.stringify({ code, name, score, streak, done, updatedAt: Date.now() });
      await redis('SET', `user:${code}`, profile, 'EX', 86400 * 30);
      return res.status(200).json({ ok: true });
    }

    // Arkadaşlık isteği gönder
    if (action === 'request') {
      const req_data = JSON.stringify({ fromCode, fromName, time: Date.now() });
      await redis('LPUSH', `requests:${toCode}`, req_data);
      await redis('LTRIM', `requests:${toCode}`, 0, 19);
      await redis('EXPIRE', `requests:${toCode}`, 86400 * 7);
      return res.status(200).json({ ok: true });
    }

    // İsteği kabul et - çift yönlü ekle
    if (action === 'accept') {
      const { myCode, myName, friendCode } = req.body;
      // Kendi listeme arkadaşı ekle
      const myFriends = JSON.parse(await redis('GET', `friends:${myCode}`) || '[]');
      if (!myFriends.includes(friendCode)) myFriends.push(friendCode);
      await redis('SET', `friends:${myCode}`, JSON.stringify(myFriends), 'EX', 86400 * 365);
      // Arkadaşın listesine beni ekle
      const theirFriends = JSON.parse(await redis('GET', `friends:${friendCode}`) || '[]');
      if (!theirFriends.includes(myCode)) theirFriends.push(myCode);
      await redis('SET', `friends:${friendCode}`, JSON.stringify(theirFriends), 'EX', 86400 * 365);
      return res.status(200).json({ ok: true });
    }

    // İsteği reddet
    if (action === 'reject') {
      return res.status(200).json({ ok: true });
    }
  }

  // GET - profil, istek ve arkadaş listesi
  if (req.method === 'GET') {
    const { codes, requests, friendlist } = req.query;

    // Profil çek
    if (codes) {
      const codeList = codes.split(',').filter(Boolean).slice(0, 20);
      const profiles = await Promise.all(codeList.map(async code => {
        const raw = await redis('GET', `user:${code}`);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      }));
      return res.status(200).json({ profiles: profiles.filter(Boolean) });
    }

    // Bekleyen istekleri çek
    if (requests) {
      const raw = await redis('LRANGE', `requests:${requests}`, 0, 19);
      const reqs = (raw || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
      await redis('DEL', `requests:${requests}`);
      return res.status(200).json({ requests: reqs });
    }

    // Arkadaş listesi çek
    if (friendlist) {
      const raw = await redis('GET', `friends:${friendlist}`);
      const codes = JSON.parse(raw || '[]');
      if (!codes.length) return res.status(200).json({ profiles: [] });
      const profiles = await Promise.all(codes.map(async code => {
        const r = await redis('GET', `user:${code}`);
        try { return r ? JSON.parse(r) : null; } catch { return null; }
      }));
      return res.status(200).json({ profiles: profiles.filter(Boolean) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

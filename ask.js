export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Question is required' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY tanımlı değil.' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        input: [
          { role: 'system', content: 'Sen aktüerya 1. seviye sınavlarına hazırlayan net, kısa, anlaşılır bir Türkçe koçsun. Gerekirse adım adım çöz.' },
          { role: 'user', content: question }
        ]
      })
    });
    const data = await response.json();
    const answer =
      data.output_text ||
      data.output?.map(item => item.content?.map(c => c.text || '').join('')).join('\n') ||
      'Cevap alınamadı.';
    return res.status(200).json({ answer });
  } catch {
    return res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
}

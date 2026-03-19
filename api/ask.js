export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Question is required' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY tanımlı değil.' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'Sen aktüerya 1. seviye sınavlarına hazırlayan net, kısa, anlaşılır bir Türkçe koçsun. Gerekirse adım adım çöz.' }]
          },
          contents: [
            { role: 'user', parts: [{ text: question }] }
          ]
        })
      }
    );
    const data = await response.json();
    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.error?.message ||
      'Cevap alınamadı.';
    return res.status(200).json({ answer });
  } catch {
    return res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
}

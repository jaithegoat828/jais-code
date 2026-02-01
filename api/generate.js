// Serverless proxy for OpenAI requests (Vercel/Netlify compatible)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: 'Missing server API key. Set OPENAI_API_KEY in your deployment environment.' });
  }

  const { prompt = '', genre = 'fantasy', length = 3, mode = 'simple', creativity = 1 } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Invalid or missing prompt.' });

  // Basic abuse protection (very small in-memory rate limiting for demo purposes)
  // Note: Serverless environments may not reliably persist this between invocations.
  if (!global.__rateLimit) global.__rateLimit = new Map();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = global.__rateLimit.get(ip) || { count: 0, t: now };
  if (now - record.t < 1000 && record.count > 10) {
    return res.status(429).json({ error: 'Too many requests. Slow down.' });
  }
  if (now - record.t > 1000) {
    record.count = 0; record.t = now;
  }
  record.count += 1;
  global.__rateLimit.set(ip, record);

  try {
    const systemMsg = `You are a helpful creative writing assistant. Produce a short, coherent story based on the user's prompt. Keep it under ~500 words and respect the genre and tone hints.`;
    const userMsg = `Prompt: ${prompt}\nGenre: ${genre}\nLengthHint: ${length}\nToneHint: creativity=${creativity}, mode=${mode}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 700,
        temperature: Math.max(0.4, Math.min(2, 0.6 + creativity * 0.6)),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI error', response.status, text);
      return res.status(500).json({ error: 'OpenAI API error. Check server logs.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || 'No result from OpenAI.';
    return res.status(200).json({ story: content });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error contacting OpenAI.' });
  }
}

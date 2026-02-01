// Serverless proxy for OpenAI requests (Vercel/Netlify compatible)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: 'Missing server API key. Set OPENAI_API_KEY in your deployment environment.' });
  }

  const { prompt = '', genre = 'fantasy', length = 3, mode = 'simple', creativity = 1, model = null } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Invalid or missing prompt.' });

  // If prompt is very short, suggest a clarifying question instead of generating directly
  const words = (prompt || '').split(/\s+/).filter(Boolean).length;
  if (words < 3 && !req.body._clarified) {
    const suggestion = `Could you tell me: who is the main character? Where does this take place? What tone do you want (e.g., whimsical, dark, neutral)?`;
    return res.status(200).json({ clarify: suggestion });
  }

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
    const fewShots = [
      { prompt: 'A child finds a clock that can reverse slow moments', story: 'A child wound the small clock and watched the noon sun dip back into morning. Small chances returned; lost words were found, and with them an apology was made. In the quiet after, the child learned that some hours must stay where they belong.' },
      { prompt: 'An android remembers an old lullaby', story: 'When the machine whistled the old lullaby, the station remembered how to sleep. In the hush, the android found a name written on a crate and decided to care for it as if it were a child.' },
    ];

    const systemMsg = `You are a concise, creative writing assistant. Given a prompt, return a clear, coherent short story (3–6 paragraphs). Always include a named protagonist when possible, show one action the protagonist takes, and end with a short reflective sentence or line. Respect the genre and tone hints.`;

    const examplesText = fewShots.map(s => `Example Prompt: ${s.prompt}\nExample Story: ${s.story}`).join('\n\n');

    const userMsg = `Prompt: ${prompt}\nGenre: ${genre}\nLengthHint: ${length}\nToneHint: creativity=${creativity}, mode=${mode}, tone=${req.body.tone || 'neutral'}`;

    // Primary request
    const chosenModel = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const payload = {
      model: chosenModel,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'system', content: examplesText },
        { role: 'user', content: userMsg },
      ],
      max_tokens: 900,
      temperature: Math.max(0.4, Math.min(2, 0.5 + creativity * 0.6)),
    };

    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI error', response.status, text);
      return res.status(500).json({ error: 'OpenAI API error. Check server logs.' });
    }

    let data = await response.json();
    let content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';

    // If the response seems too short or low-quality, retry once with slightly higher temperature
    if ((content || '').length < 120) {
      console.warn('Short response received, retrying with higher temperature');
      payload.temperature = Math.min(2, (payload.temperature || 0.8) + 0.6);
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        data = await response.json();
        content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || content;
      }
    }

    // Basic sanitization and trimming
    content = (content || '').trim();
    if (!content) return res.status(500).json({ error: 'OpenAI returned empty content.' });

    return res.status(200).json({ story: content });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error contacting OpenAI.' });
  }
}

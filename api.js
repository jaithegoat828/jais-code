// Client-side helper for remote generation (if VITE_OPENAI_API_KEY is set).
// If you prefer server-side proxying, replace this with a serverless function and keep keys out of client code.

export async function remoteGenerateClient({ prompt, model = 'gpt-4o-mini', genre = 'fantasy', length = 3, creativity = 1, tone = 'neutral', seed = null, grade = 'Adult' } = {}) {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) throw new Error('Missing client API key');

  const controller = new AbortController();
  // 30 second timeout
  const t = setTimeout(() => controller.abort(), Number(import.meta.env.VITE_REMOTE_TIMEOUT_MS || 30000));
  try {
    // Instruct model to return JSON with title and story to simplify parsing
    const system = `You are Jai Bot, a helpful story generator. Return a JSON object with {"title":"...","story":"..."}. Keep the story coherent and appropriate for the requested grade.`;
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: `Generate a ${genre} story for grade ${grade}. Tone: ${tone}. Prompt: ${prompt}. Keep it concise but full-bodied.` }
    ];

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ model, messages, max_tokens: 800, temperature: 0.8 }),
      signal: controller.signal
    });
    clearTimeout(t);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Remote API error: ${resp.status} ${resp.statusText} ${text}`);
    }
    const data = await resp.json();
    const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!raw) throw new Error('No content from remote model');

    // Try to parse JSON from the model output; fallback to plain text
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // naive extraction: try to find a title line and rest as story
      const m = raw.match(/\*\*(.*?)\*\*/);
      let title = m ? m[1] : '';
      if (!title) {
        const firstLine = raw.split(/\n/)[0] || '';
        if (firstLine.length < 80) title = firstLine;
      }
      return { title: title || 'Remote Story', story: raw };
    }
    return { title: parsed.title || 'Remote Story', story: parsed.story || parsed.text || raw };
  } catch (err) {
    clearTimeout(t);
    throw err;
  }
}

export async function getBookInfo() {
  return 'This app uses the local Jai Bot; remote generation is optional when configured.';
}

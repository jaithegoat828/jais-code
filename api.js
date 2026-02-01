export async function getBookInfo(prompt, opts = {}) {
  // Call the serverless proxy at /api/generate. This keeps the real OpenAI key server-side.
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ...opts }),
    });

    if (!response.ok) {
      const json = await response.json().catch(() => null);
      if (json && json.error && json.error.includes('Missing server API key')) {
        return 'Missing server API key. Deploy the serverless function and set OPENAI_API_KEY.';
      }
      console.error('Serverless proxy error:', response.status, json);
      return 'Server error contacting story service.';
    }

    const data = await response.json();
    return data.story || 'No response from story service.';
  } catch (err) {
    console.error(err);
    return 'Network error contacting story service.';
  }
}

// Accept feedback (ratings, comments) and persist where possible.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const { prompt = '', rating = null, comment = '', source = 'web' } = body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    // If a GitHub token is supplied, open an issue with the feedback (keeps things centralized)
    const GH = process.env.GITHUB_TOKEN || process.env.DEPLOY_GITHUB_TOKEN;
    const title = `Feedback: ${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}`;
    const bodyText = `Source: ${source}\nRating: ${rating ?? 'n/a'}\n\nPrompt:\n${prompt}\n\nComment:\n${comment}`;

    if (GH) {
      const repo = process.env.GITHUB_REPO || process.env.REPO || null; // expecting owner/repo
      if (repo) {
        // create issue
        const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
          method: 'POST',
          headers: { Authorization: `token ${GH}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body: bodyText }),
        });
        if (!response.ok) {
          const txt = await response.text();
          console.error('GitHub issue creation failed', response.status, txt);
        }
      }
    }

    // Fallback: append to a file on disk (works in many dev environments)
    try {
      const fs = require('fs');
      const entry = `${new Date().toISOString()}\t${rating}\t${source}\t${prompt.replace(/\n/g, ' ')}\t${comment.replace(/\n/g, ' ')}\n`;
      const path = process.env.FEEDBACK_LOG_PATH || '/tmp/jais_feedback.log';
      fs.appendFileSync(path, entry);
    } catch (e) {
      console.warn('Could not write feedback to disk:', e.message);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error saving feedback.' });
  }
}

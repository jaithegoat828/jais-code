// Tiny Markov-chain based story generator.
// No external data; uses a small built-in corpus and can generate text seeded by user prompt.

const CORPUS = [
  "Once upon a time a traveler found a map that led to a hidden valley full of singing stones.",
  "The city hummed at night with a thousand lanterns and a language that only the wind remembered.",
  "A child discovered a clock that could reverse the slow moments and make lost days return.",
  "The robot learned to whistle the old lullaby and the stars listened closely.",
  "A librarian kept a book that smelled of rain and opened only when nobody believed in it.",
  "The sea told stories of ships that never returned and the shore kept them in shells.",
  "On the last day of summer, the forest whispered secrets about paths that moved when you weren't looking.",
  "A signal from the ruins pulled the curious to the cliff and they followed echoes into the night.",
  "The portrait blinked at midnight and the house remembered its name.",
  "They planted a tree that grew letters instead of leaves, and children read stories to the roots.",
];

function tokenize(text) {
  return text
    .replace(/["'.,\/?!:;()]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function buildMarkov(order = 3) {
  const model = new Map();
  for (const line of CORPUS) {
    const words = tokenize(line);
    for (let i = 0; i <= words.length - order; i++) {
      const key = words.slice(i, i + order).join(' ');
      const next = words[i + order];
      if (!model.has(key)) model.set(key, []);
      if (next) model.get(key).push(next);
    }
  }
  return { order, model };
}

function pickWeighted(arr, temperature = 1) {
  if (!arr || arr.length === 0) return null;
  // simple weighting: count frequencies
  const freqs = {};
  for (const x of arr) freqs[x] = (freqs[x] || 0) + 1;
  const entries = Object.entries(freqs);
  // apply temperature by raising counts: higher temperature = more uniform
  const weights = entries.map(([k, v]) => ({ k, w: Math.pow(v, 1 / Math.max(0.1, temperature)) }));
  const total = weights.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of weights) {
    r -= e.w;
    if (r <= 0) return e.k;
  }
  return weights[weights.length - 1].k;
}

export function generateMarkovStory({ prompt = '', length = 80, temperature = 1, order = 2 } = {}) {
  const { model } = buildMarkov(order);

  const seedWords = tokenize(prompt).slice(0, order);
  let key = seedWords.length === order ? seedWords.join(' ') : pick(Array.from(model.keys()));

  const out = [];
  const maxWords = Math.max(40, length * 20);

  const recentNgrams = new Set();
  for (let i = 0; i < maxWords; i++) {
    let nexts = model.get(key) || [];
    // Try to avoid choosing a next word that creates a ngram we've just seen
    let candidate = pickWeighted(nexts, temperature) || '';
    if (candidate) {
      const trial = key.split(' ').slice(1).concat(candidate).join(' ').toLowerCase();
      if (recentNgrams.has(trial)) {
        // try to pick an alternative that doesn't repeat the ngram
        const alternatives = Array.from(new Set(nexts)).filter(x => x !== candidate);
        let found = null;
        for (let a of alternatives) {
          const t = key.split(' ').slice(1).concat(a).join(' ').toLowerCase();
          if (!recentNgrams.has(t)) { found = a; break; }
        }
        if (found) candidate = found; else break; // if no alternative, stop to avoid loop
      }
    }

    const next = candidate || pickWeighted(Array.from(model.keys()), temperature) || '';
    if (!next) break;
    out.push(next);
    const parts = key.split(' ').slice(1);
    parts.push(next);
    key = parts.join(' ');
    // track recent ngrams
    const ngram = (key).toLowerCase();
    recentNgrams.add(ngram);
    if (recentNgrams.size > 100) {
      // keep it bounded
      const it = recentNgrams.values().next().value;
      recentNgrams.delete(it);
    }
  }

  // Post-process into paragraphs
  const words = out.join(' ');

  // Lightweight post-processing to reduce repeats and fix basic punctuation
  function removeRepetitionLocal(text) {
    const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    const seen = new Set();
    const outS = [];
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      if (i > 0 && s === sentences[i-1]) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      outS.push(s);
    }
    return outS.join(' ');
  }

  function fixPuncLocal(text) {
    if (!text) return text;
    text = text.replace(/\s+([?.!,])/g, '$1');
    text = text.replace(/(^|[.!?]\s+)([a-z])/g, (m, p, ch) => p + ch.toUpperCase());
    if (!/[.!?]$/.test(text.trim())) text = text.trim() + '.';
    return text;
  }

  let cleaned = removeRepetitionLocal(words);
  cleaned = fixPuncLocal(cleaned);

  const sentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, Math.max(3, Math.floor(length / 10)));

  const title = prompt ? `${prompt.split(' ').slice(0,3).join(' ')} — A Short Story` : `Echoes of ${words.split(' ').slice(0,3).join(' ')}`;

  return {
    title: title.replace(/\s+/g, ' ').trim(),
    story: sentences.join('\n\n'),
  };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const AVAILABLE = ['markov'];

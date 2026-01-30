// Simple offline story generator using templates and small sentence banks.
// No external requests — runs entirely in the browser.

const GENRES = {
  fantasy: {
    title: ["The Lost", "The Last", "The Hidden", "The Secret"],
    subject: ["kingdom", "wizard", "sword", "forest", "dragon"],
    hook: [
      "who dreamed of freedom",
      "that guarded an ancient secret",
      "who could hear the whispers of the trees",
      "who couldn't remember their past",
    ],
  },
  sciFi: {
    title: ["Echoes of", "Return to", "Beyond the", "The Last"],
    subject: ["colony", "station", "android", "signal", "planet"],
    hook: [
      "lost in orbit",
      "that remembered too much",
      "chasing a ghost signal",
      "that knew the coordinates of home",
    ],
  },
  mystery: {
    title: ["The Case of", "A Whisper About", "The Disappearance of", "Notes on"],
    subject: ["the portrait", "the librarian", "a missing map", "the clocktower"],
    hook: [
      "on a rainy night",
      "covered in ash",
      "with a broken key",
      "whose footsteps stopped at midnight",
    ],
  },
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sentenceBank() {
  return {
    beginnings: [
      "Once,",
      "Long ago,",
      "In a small village,",
      "In the future,",
      "On the night the stars fell,",
    ],
    middles: [
      "a traveler met a secret.",
      "an idea grew into a legend.",
      "someone found a map to somewhere no one had been.",
      "the city whispered in a language only a child could hear.",
      "the machine learned the taste of rain.",
    ],
    ends: [
      "And they would never be the same.",
      "No one believed them, but the stars did.",
      "It became the kind of story told in half-lights.",
      "For a long time, people wondered what happened next.",
    ],
  };
}

import { generateMarkovStory } from "./StoryModel.js";

export function generateStory({ prompt = "", genre = "fantasy", length = 3, mode = "simple", creativity = 1 } = {}) {
  if (mode === "markov") {
    // convert length/creativity into parameters for markov
    const mkLen = Math.max(60, length * 40);
    const temperature = Math.max(0.4, Math.min(2, creativity));
    return generateMarkovStory({ prompt, length: mkLen, temperature });
  }

  // Simple generator
  const g = GENRES[genre] || GENRES.fantasy;
  const sb = sentenceBank();

  const title = `${pick(g.title)} ${pick(g.subject)}`;
  const hook = `${pick(g.subject)} ${pick(g.hook)}`;
  const firstLine = `${pick(sb.beginnings)} ${hook}`;

  const body = [];
  for (let i = 0; i < length; i++) {
    const r = Math.random();
    if (r < 0.4) {
      body.push(pick(sb.middles));
    } else if (r < 0.8) {
      body.push(
        `They discovered ${pick(["a door", "a book", "a signal", "a map", "a key"])}, and it changed everything.`
      );
    } else {
      const p = prompt ? prompt.split(" ").slice(0, 3).join(" ") : pick(sb.middles);
      body.push(`${p} became the turning point.`);
    }
  }

  const ending = pick(sb.ends);

  const full = `${title}\n\n${firstLine}\n\n${body.join(" ")}\n\n${ending}`;
  const processed = postProcessText(full, prompt);
  return {
    title,
    story: processed,
  };
}

// Ensure sentences end with proper punctuation and capitalize sentences.
function fixPunctuationAndCapitalize(text) {
  if (!text) return text;
  // Normalize whitespace while preserving paragraph breaks
  text = text.replace(/\r\n/g, "\n");

  // Split into paragraphs and process each paragraph separately
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim());
  const fixed = paragraphs.map((p) => {
    if (!p) return "";
    // Normalize internal whitespace
    p = p.replace(/\s+/g, " ");
    // Split into sentences using existing punctuation if present
    let sentences = p.split(/(?<=[.!?])\s+/);
    // If the paragraph had no sentence terminators, treat whole paragraph as one sentence
    if (sentences.length === 1 && !/[.!?]/.test(sentences[0])) sentences = [sentences[0]];
    sentences = sentences.map((s) => {
      s = s.trim();
      if (s.length === 0) return "";
      // Ensure sentence ends with punctuation
      if (!/[.!?]$/.test(s)) s = s + ".";
      // Capitalize first alpha character
      s = s.replace(/^[^A-Za-z]*([a-z])/, (m, ch) => m.replace(ch, ch.toUpperCase()));
      return s;
    }).filter(Boolean);
    return sentences.join(" ");
  });

  return fixed.join("\n\n");
}

// --- Post-processing helpers to improve coherence and avoid looping ---

// Remove repetition and short circular loops by collapsing repeated sentences and n-grams
function removeRepetition(text) {
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (i > 0 && s === sentences[i-1]) continue; // drop immediate repeat
    if (seen.has(s)) continue; // avoid duplicate sentence reuse
    seen.add(s);
    out.push(s);
  }
  // Remove short repeated windows (n-gram repeats)
  let joined = out.join(' ');
  const words = joined.split(/\s+/).filter(Boolean);
  const maxWindow = 4;
  const seenWindows = new Set();
  const resultWords = [];
  for (let i = 0; i < words.length; i++) {
    const windowKey = words.slice(Math.max(0, i - maxWindow + 1), i + 1).join(' ').toLowerCase();
    if (seenWindows.has(windowKey)) continue;
    resultWords.push(words[i]);
    seenWindows.add(windowKey);
  }
  return resultWords.join(' ');
}

const DEFAULT_VERBS = [
  'saw','found','opened','learned','whispered','followed','planted','created','noticed','shelved','said','spoke','walked','listened','remembered','discovered','changed','went','helped','guarded','opened','shouted','wrote','read','built'
];

function sentenceHasVerb(sentence) {
  if (!sentence) return false;
  const s = sentence.toLowerCase();
  for (const v of DEFAULT_VERBS) if (s.indexOf(' '+v+' ') !== -1) return true;
  if (/(\bis\b|\bare\b|\bwas\b|\bwere\b|\bhas\b|\bhave\b|\bdo\b|\bdid\b|\bdoes\b)/i.test(sentence)) return true;
  return false;
}

function detectEntities(text, prompt) {
  const entities = new Set();
  const roleWords = ['librarian','traveler','robot','child','portrait','tree','signal','house','city','machine','teacher'];
  for (const r of roleWords) if (new RegExp('\\b'+r+'\\b','i').test(text)) entities.add(r);
  if (prompt) {
    prompt.split(/\s+/).forEach(w => {
      const cleaned = w.replace(/[^A-Za-z0-9]/g, '');
      if (!cleaned) return;
      if (/[A-Z][a-z]/.test(w) || roleWords.includes(cleaned.toLowerCase())) entities.add(cleaned);
    });
  }
  (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).forEach(w => entities.add(w));
  return Array.from(entities).slice(0,6);
}

function ensureEntityActions(text, prompt) {
  if (!text) return text;
  const entities = detectEntities(text, prompt);
  if (entities.length === 0) return text;
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const entityHasAction = {};
  for (const e of entities) entityHasAction[e.toLowerCase()] = false;
  for (const s of sentences) {
    for (const e of entities) {
      if (s.toLowerCase().includes(e.toLowerCase())) {
        if (sentenceHasVerb(s)) entityHasAction[e.toLowerCase()] = true;
      }
    }
  }
  const out = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    out.push(s);
    for (const e of entities) {
      if (!entityHasAction[e.toLowerCase()] && s.toLowerCase().includes(e.toLowerCase())) {
        const verb = DEFAULT_VERBS[Math.floor(Math.random()*DEFAULT_VERBS.length)];
        const entityName = /^[A-Z]/.test(e) ? e : `The ${e}`;
        const actionSentence = `${entityName} ${verb} something important.`;
        out.push(actionSentence);
        entityHasAction[e.toLowerCase()] = true;
      }
    }
  }
  return out.join(' ');
}

function grammarPatch(text) {
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const roleObjects = ['book','map','key','door','signal','tree','letter','song','clock'];
  const out = sentences.map(s => {
    if (sentenceHasVerb(s)) return s;
    const words = s.split(/\s+/).filter(Boolean);
    // If the sentence mentions a known role/entity, create a clearer action sentence
    const entities = detectEntities(s, '');
    if (entities.length > 0) {
      const e = entities[0];
      const verb = DEFAULT_VERBS[Math.floor(Math.random()*DEFAULT_VERBS.length)];
      const obj = roleObjects[Math.floor(Math.random()*roleObjects.length)];
      const entityName = /^[A-Z]/.test(e) ? e : `The ${e}`;
      return `${entityName} ${verb} the ${obj}.`;
    }
    // Fallback: use a generic subject and verb
    const verb = DEFAULT_VERBS[Math.floor(Math.random()*DEFAULT_VERBS.length)];
    return `They ${verb} something.`;
  });
  return out.join(' ');
}

function postProcessText(text, prompt = '') {
  if (!text) return text;
  let t = removeRepetition(text);
  t = ensureEntityActions(t, prompt);
  t = grammarPatch(t);
  t = fixPunctuationAndCapitalize(t);
  return t;
}

// Paginate plain text by word count and optionally insert page markers like '--- Page 1/3 ---'.
export function formatStory(text, { wordsPerPage = 100, insertPageMarkers = true } = {}) {
  if (!text) return text;
  // First, fix punctuation & capitalization
  let fixed = fixPunctuationAndCapitalize(text);

  // Split into words while preserving minimal whitespace between words
  const words = fixed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return fixed;

  const pages = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    const chunk = words.slice(i, i + wordsPerPage).join(" ");
    pages.push(chunk);
  }

  if (!insertPageMarkers) {
    // No markers — just join with double line breaks between pages
    return pages.join("\n\n");
  }

  const total = pages.length;
  const out = pages.map((p, idx) => `--- Page ${idx + 1}/${total} ---\n\n${p}`);
  return out.join("\n\n");
}

export function availableGenres() {
  return Object.keys(GENRES);
}

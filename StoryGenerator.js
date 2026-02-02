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
  drama: {
    title: ["The Weight of", "After the", "The Quiet of"],
    subject: ["a family", "a small town", "a theatre", "a hospital"],
    hook: [
      "that kept secrets",
      "the day everything shifted",
      "at the edge of forgiveness",
    ],
  },
  romance: {
    title: ["A Letter to", "The Summer of", "When Two"],
    subject: ["strangers", "the baker", "a summer love", "a long goodbye"],
    hook: [
      "that began with a mistake",
      "between shifts at the cafe",
      "under a rain that wouldn't stop",
    ],
  },
  adventure: {
    title: ["Voyage to", "Across the", "The Map of"],
    subject: ["uncharted islands", "a cavern", "a forgotten trail"],
    hook: [
      "with a tattered map",
      "that promised treasure",
      "where compasses spun foolishly",
    ],
  },
  children: {
    title: ["The Little", "The Littlest", "The Wonderful"],
    subject: ["bear", "library", "house", "garden"],
    hook: [
      "who loved to sing",
      "that had a secret door",
      "with a pocket full of stars",
    ],
  },
  horror: {
    title: ["The House at", "The Whispering", "Beneath the"],
    subject: ["Crow Lane", "the Old Mill", "the Lake"],
    hook: [
      "that never slept",
      "with a door that breathed",
      "that smelled of the sea",
    ],
  },
};

// Seeded RNG helper (mulberry32-like) — deterministic when a numeric seed is provided
function createRNG(seed) {
  if (seed == null) return Math.random;
  let a = Number(seed) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

function sentenceBank() {
  return {
    beginnings: [
      "Once,",
      "Long ago,",
      "In a small village,",
      "In the future,",
      "On the night the stars fell,",
      "When the leaves turned silver,",
      "Under a low moon,",
    ],
    middles: [
      "a traveler met a secret.",
      "an idea grew into a legend.",
      "someone found a map to somewhere no one had been.",
      "the city whispered in a language only a child could hear.",
      "the machine learned the taste of rain.",
      "a rumor curled through the market like smoke.",
      "a strange compass pointed where compasses shouldn't.",
    ],
    ends: [
      "And they would never be the same.",
      "No one believed them, but the stars did.",
      "It became the kind of story told in half-lights.",
      "For a long time, people wondered what happened next.",
      "The world kept its secret for a little longer.",
    ],
  };
}

const DISCOVERY_TEMPLATES = [
  "They discovered {object}, and it changed everything.",
  "Finding {object} shifted the course of their days.",
  "A {object} appeared, and life tilted toward the unknown.",
  "They unearthed {object}; from that moment, nothing was the same.",
];

const ADDITIONAL_PROTAGONISTS = [
  "a traveler",
  "the librarian",
  "an old wizard",
  "a curious child",
  "an android",
  "a wandering bard",
];

import { generateMarkovStory } from "./StoryModel.js";

function chooseProtagonist(prompt = '', rng = Math.random) {
  if (!prompt) return pick(ADDITIONAL_PROTAGONISTS, rng);
  // extract capitalized words or known roles
  const m = prompt.match(/\b([A-Z][a-z]{2,})\b/g);
  if (m && m.length) return m[0];
  const roleMatch = prompt.match(/\b(librarian|traveler|robot|child|portrait|tree|teacher|wizard|king|queen)\b/i);
  if (roleMatch) return roleMatch[0];
  return pick(ADDITIONAL_PROTAGONISTS, rng);
}

function generateScaffoldedStory({ title, protagonist, prompt = '', genre = 'default', length = 3, rng = Math.random, creativity = 1 } = {}) {
  // 3-act scaffold: setup, conflict, resolution
  const sb = sentenceBank();
  const setup = `${pick(sb.beginnings, rng)} ${protagonist} ${pick([
    'found something unexpected.',
    'heard a rumor that would not let go.',
    'stumbled upon a whisper from the past.',
  ], rng)}`;

  const conflict = `${pick(['Soon','Before long','Then,'], rng)} ${protagonist} ${pick([
    'was forced to choose.',
    'followed the map into a place with no sound.',
    'faced a secret that would not stay buried.',
  ], rng)}`;

  const resolution = `${pick(['In the end','Finally','At last'], rng)} ${protagonist} ${pick([
    'held the answer in their hands.',
    'understood the cost of the key.',
    'learned what the sword truly guarded.',
  ], rng)}`;

  // optionally spice with small Markov output for texture
  let texture = '';
  if (creativity > 1.2) {
    const m = generateMarkovStory({ prompt, length: Math.max(40, length * 20), temperature: Math.min(2, 0.6 + creativity * 0.6), seed: Math.floor(rng() * 1e9) });
    texture = '\n\n' + m.story.split(/\n\n/).slice(0, 2).join('\n\n');
  }

  const full = `${title}\n\n${setup}\n\n${conflict}\n\n${resolution}${texture}`;
  return {
    title,
    story: postProcessText(full, prompt, genre, rng),
  };
}

export function normalizeGenres(input) {
  if (!input) return ['fantasy'];
  if (Array.isArray(input)) return input.map(g => String(g).toLowerCase()).filter(Boolean);
  if (typeof input === 'string') {
    const s = input.toLowerCase().trim();
    if (s === 'all' || s === 'any' || s === 'all genres') return Object.keys(GENRES);
    // split comma-separated
    if (s.indexOf(',') !== -1) return s.split(',').map(x => x.trim()).filter(Boolean);
    return [s];
  }
  return ['fantasy'];
}

export function resolveGenrePool(genres, rng = Math.random) {
  // genres: array of names
  const pool = { title: [], subject: [], hook: [] };
  const gNames = genres && genres.length ? genres : ['fantasy'];
  for (const name of gNames) {
    const g = GENRES[name] || GENRES[Object.keys(GENRES).find(k=>k===name)];
    if (!g) continue;
    pool.title.push(...g.title);
    pool.subject.push(...g.subject);
    pool.hook.push(...g.hook);
  }
  // fallback to fantasy if empty
  if (pool.title.length === 0) {
    pool.title.push(...GENRES.fantasy.title);
    pool.subject.push(...GENRES.fantasy.subject);
    pool.hook.push(...GENRES.fantasy.hook);
  }
  return pool;
}

export function generateStory({ prompt = "", genre = "fantasy", genres = null, strict = false, length = 3, mode = "simple", creativity = 1, seed = null, tone = 'neutral', engine = 'jai', grade = 'Adult' } = {}) {
  const rng = createRNG(seed);
  // support genres or single genre input
  const wanted = genres ? normalizeGenres(genres) : normalizeGenres(genre);

  // Jai Pro pipeline: outline -> expand -> polish -> score
  if (engine === 'jai-pro') {
    const g = (wanted && wanted[0]) || 'default';
    const outline = generateOutline(prompt, g, rng);

    // For Professional grade, generate an ensemble and pick best
    if (grade === 'Professional') {
      const candidates = generateCandidates(outline, prompt, g, rng, grade, tone, 6);
      const winner = candidates[0];
      return { title: winner.title || titleCase(outline.title), story: winner.story, meta: { engine: 'jai-pro', score: winner.score, candidates: candidates.map(c => ({ seed: c.seed, score: c.score })) } };
    }

    const parts = outline.beats.map((b) => expandBeat(b, prompt, g, rng, grade));
    const raw = `${titleCase(outline.title)}\n\n${parts.join('\n\n')}`;
    const polished = polishText(raw, { grade, tone, rng });
    const score = scoreStory(polished, outline, prompt);
    return { title: titleCase(outline.title), story: polished, meta: { engine: 'jai-pro', score } };
  }

  if (mode === "markov") {
    // convert length/creativity into parameters for markov
    const mkLen = Math.max(60, length * 40);
    const temperature = Math.max(0.4, Math.min(2, 0.5 + creativity * 0.75));
    // include genre tokens to bias markov
    const genreSeed = wanted.join(' ');
    const mkPrompt = `${genreSeed} ${prompt}`.trim();
    const mk = generateMarkovStory({ prompt: mkPrompt, length: mkLen, temperature, seed });
    // tone adjust the markov story body as well
    mk.story = toneAdjust(mk.story, tone);
    return mk;
  }

  // Simple generator using a pool from resolved genres
  const gpool = resolveGenrePool(wanted, rng);
  const sb = sentenceBank();

  const title = `${pick(gpool.title, rng)} ${pick(gpool.subject, rng)}`;
  const protagonist = chooseProtagonist(prompt, rng);

  if (mode === 'scaffold') {
    const scaffolded = generateScaffoldedStory({ title, protagonist, prompt, genre: wanted[0] || 'fantasy', length, rng, creativity });
    scaffolded.story = toneAdjust(scaffolded.story, tone);
    return scaffolded;
  }

  const hook = `${pick(gpool.subject, rng)} ${pick(gpool.hook, rng)}`;
  const firstLine = `${pick(sb.beginnings, rng)} ${hook}`;

  const body = [];
  for (let i = 0; i < length; i++) {
    const r = rng();
    if (r < 0.35) {
      body.push(pick(sb.middles, rng));
    } else if (r < 0.75) {
      const obj = pick(["a door", "a book", "a signal", "a map", "a key", "a brass key", "an old journal", "a strange console"], rng);
      const tmpl = pick(DISCOVERY_TEMPLATES, rng);
      body.push(tmpl.replace("{object}", obj));
    } else {
      // If strict, try to use more of the prompt content verbatim
      if (strict && prompt) {
        body.push(`${prompt.trim()} became the turning point.`);
      } else {
        const p = prompt ? prompt.split(" ").slice(0, 3).join(" ") : pick(sb.middles, rng);
        body.push(`${p} became the turning point.`);
      }
    }
  }

  const ending = pick(sb.ends, rng);

  const full = `${title}\n\n${firstLine}\n\n${body.join(" ")}\n\n${ending}`;
  // pass array of genres for post-processing so ensureEntityActions can use relevant objects
  const processed = postProcessText(full, prompt, (wanted && wanted[0]) || 'default', rng, tone);
  // If strict, force inclusion of prompt tokens as sentences if missing (only include meaningful tokens)
  if (strict && prompt) {
    const stopwords = new Set(['the','a','an','is','it','who','what','where','when','why','and','or','to','of','in','on','at','this','that','their','they','them','his','her','its','with','for','by','as','be','were','was','do','does','did']);
    const cleanTokens = prompt.split(/\s+/)
      .map(t => t.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(Boolean)
      .filter(t => t.length >= 4 && !stopwords.has(t.toLowerCase()))
      .slice(0, 6);

    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    let out = processed;
    for (const m of cleanTokens) {
      if (!new RegExp(`\\b${escapeRegExp(m)}\\b`, 'i').test(out)) {
        const clean = m.replace(/[!?\.]+$/g, '');
        out += `\n\nThey remembered ${clean}.`;
      }
    }
    return { title, story: out };
  }

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

// Objects/helpers per genre to create more natural actions
const GENRE_ACTION_OBJECTS = {
  fantasy: ['sword','spellbook','rune','talisman','oak'],
  sciFi: ['console','circuit','antenna','reactor','data core'],
  mystery: ['book','map','key','letter','casefile'],
  default: ['object','item','thing']
};

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

function ensureEntityActions(text, prompt, genre='default', rng = Math.random) {
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
  // Ensure a small chain of actions exists for key entities (protagonist -> seeks -> faces -> resolves)
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    out.push(s);
    const objects = GENRE_ACTION_OBJECTS[genre] || GENRE_ACTION_OBJECTS.default;
    for (const e of entities) {
      if (!entityHasAction[e.toLowerCase()] && s.toLowerCase().includes(e.toLowerCase())) {
        const verb = DEFAULT_VERBS[Math.floor(rng()*DEFAULT_VERBS.length)];
        const obj = objects[Math.floor(rng()*objects.length)];
        const entityName = /^[A-Z]/.test(e) ? e : `The ${e}`;
        const actionSentence = `${entityName} ${verb} the ${obj}.`;
        out.push(actionSentence);
        entityHasAction[e.toLowerCase()] = true;
      }
    }
  }
  return out.join(' ');
}

function grammarPatch(text, genre='default', rng = Math.random) {
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const objects = GENRE_ACTION_OBJECTS[genre] || GENRE_ACTION_OBJECTS.default;
  const out = sentences.map(s => {
    if (sentenceHasVerb(s)) return s;
    const words = s.split(/\s+/).filter(Boolean);
    // If the sentence mentions a known role/entity, create a clearer action sentence
    const entities = detectEntities(s, '');
    if (entities.length > 0) {
      const e = entities[0];
      const verb = DEFAULT_VERBS[Math.floor(rng()*DEFAULT_VERBS.length)];
      const obj = objects[Math.floor(rng()*objects.length)];
      const entityName = /^[A-Z]/.test(e) ? e : `The ${e}`;
      return `${entityName} ${verb} the ${obj}.`;
    }
    // Fallback: use a generic subject and verb and an object consistent with genre
    const verb = DEFAULT_VERBS[Math.floor(rng()*DEFAULT_VERBS.length)];
    const obj = objects[Math.floor(rng()*objects.length)];
    return `They ${verb} the ${obj}.`;
  });
  return out.join(' ');
}

function clarifyPrompt(prompt) {
  if (!prompt) return `Could you tell me: who is the main character? Where does this take place? What tone do you want (e.g., whimsical, dark, neutral)?`;
  const words = (prompt || '').split(/\s+/).filter(Boolean).length;
  if (words < 3) return `Could you add a little more detail? Who, where, and tone help (e.g., 'a lonely librarian in a rain-soaked city, whimsical')`;
  return null;
}

// Make a concise 3-act outline from the prompt + genre to guide Jai Pro
function generateOutline(prompt, genre = 'default', rng = Math.random) {
  const protagonist = chooseProtagonist(prompt, rng);
  const inciting = pick([
    `${protagonist} discovers a secret that changes everything`,
    `${protagonist} finds something they weren't meant to find`,
    `${protagonist} receives a letter that reopens an old wound`,
  ], rng);
  const turning = pick([
    `${protagonist} must decide between safety and truth`,
    `${protagonist} follows a trail that leads into danger`,
    `${protagonist} faces a choice that reveals who they are`,
  ], rng);
  const climax = pick([
    `${protagonist} confronts the source of the problem and pays a price`,
    `${protagonist} makes a sacrifice that changes the town`,
    `${protagonist} uses an unexpected skill to resolve the conflict`,
  ], rng);

  const title = `${pick(resolveGenrePool([genre], rng).title, rng)} ${pick(resolveGenrePool([genre], rng).subject, rng)}`;
  return {
    title,
    protagonist,
    beats: [inciting, turning, climax],
  };
}

function expandBeat(beat, prompt = '', genre = 'default', rng = Math.random, grade = 'Adult') {
  // Expand a single beat into a short paragraph; adapt complexity by grade
  const sb = sentenceBank();
  const sentences = [];
  sentences.push(`${pick(sb.beginnings, rng)} ${beat.replace(/^\s+|\s+$/g, '')}`);
  // Add 1-3 supporting sentences depending on grade and randomness
  const extra = grade === 'K' || grade === 1 ? 1 : Math.min(3, Math.max(1, Math.round(rng() * 3)));
  for (let i = 0; i < extra; i++) {
    const r = rng();
    if (r < 0.4) sentences.push(pick(sb.middles, rng));
    else if (r < 0.8) sentences.push(pick(DISCOVERY_TEMPLATES, rng).replace("{object}", pick(GENRE_ACTION_OBJECTS[genre] || GENRE_ACTION_OBJECTS.default, rng)));
    else sentences.push(pick(sb.ends, rng));
  }
  return sentences.join(' ');
}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function titleCase(s) {
  if (!s) return s;
  return s.replace(/\b(\w+)/g, (m) => m[0].toUpperCase() + m.slice(1));
}

function adjustForGrade(text, grade = 'Adult') {
  if (!text) return text;
  // Simple grade adjustments: shorten sentences for younger grades and replace a few complex words
  const replacements = {
    'discovered': 'found',
    'discover': 'find',
    'unexpected': 'surprising',
    'confronts': 'faces',
    'confront': 'face',
    'sacrifice': 'give up',
    'remembers': 'remembers',
    'reveals': 'shows',
  };
  let out = text;
  if (grade === 'K' || grade === 1 || grade === 2) {
    // shorten sentences by splitting and trimming
    out = out.split(/(?<=[.!?])\s+/).map(s => s.split(/[,;:]/)[0]).join(' ');
  }
  // word replacements
  for (const [k, v] of Object.entries(replacements)) out = out.replace(new RegExp(`\\b${escapeRegExp(k)}\\b`, 'gi'), v);
  return out;
}

function polishText(text, { grade = 'Adult', tone = 'neutral', rng = Math.random } = {}) {
  if (!text) return text;
  let t = removeRepetition(text);
  t = ensureEntityActions(t, '', 'default', rng);
  t = grammarPatch(t, 'default', rng);
  t = fixPunctuationAndCapitalize(t);
  t = toneAdjust(t, tone);
  t = adjustForGrade(t, grade);
  // small final polish: ensure title-case for the title line if present
  return t;
}

function scoreStory(text, outline, prompt) {
  // Enhanced scoring: repetition penalty, beat coverage, prompt coverage, length, entity consistency, coherence, lexical complexity
  const s = {
    repetitionPenalty: 0,
    beatCoverage: 0,
    promptCoverage: 0,
    lengthScore: 0,
    entityConsistency: 0,
    coherence: 0,
    lexicalComplexity: 0,
  };
  if (!text) return { score: 0, details: s };
  const base = text.toLowerCase();

  // sentences
  const sentences = base.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  let repeats = 0;
  for (const se of sentences) { if (seen.has(se)) repeats++; else seen.add(se); }
  s.repetitionPenalty = repeats;

  // beat coverage (do beats appear at least partially)
  if (outline && outline.beats) {
    let covered = 0;
    for (const b of outline.beats) {
      const key = b.split(' ').slice(0,3).join(' ').toLowerCase();
      if (base.includes(key)) covered++;
    }
    s.beatCoverage = covered / outline.beats.length;
  }

  // prompt tokens coverage (ignore very short tokens)
  const toks = (prompt || '').split(/\s+/).filter(Boolean);
  let pc = 0;
  for (const tkn of toks) if (tkn.length > 3 && base.includes(tkn.toLowerCase())) pc++;
  s.promptCoverage = toks.length ? (pc / toks.length) : 1;

  // length score: prefer moderate length
  s.lengthScore = Math.min(1, sentences.length / Math.max(4, Math.min(12, sentences.length)));

  // entity consistency: entities mentioned and given actions
  const entities = detectEntities(text, prompt);
  if (entities.length) {
    let consistent = 0;
    for (const e of entities) {
      const re = new RegExp(`\\b${e.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
      const mentions = sentences.filter(s => re.test(s));
      if (mentions.length >= 1) {
        // check that entity appears in at least one sentence with a verb
        if (mentions.some(s => sentenceHasVerb(s))) consistent++;
      }
    }
    s.entityConsistency = consistent / entities.length;
  } else {
    s.entityConsistency = 1; // neutral if no entities
  }

  // coherence: proportion of sentences that reference a known entity or pronoun (simple heuristic)
  const pronounRe = /\b(he|she|they|them|his|her|their)\b/i;
  let coherentCount = 0;
  for (let i = 0; i < sentences.length; i++) {
    const snt = sentences[i];
    const hasEntity = entities.some(e => new RegExp(`\\b${e.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(snt));
    if (hasEntity || pronounRe.test(snt)) coherentCount++;
  }
  s.coherence = sentences.length ? (coherentCount / sentences.length) : 0;

  // lexical complexity: average word length (normalized)
  const words = base.split(/\s+/).filter(Boolean);
  const avgLen = words.length ? words.reduce((a,b)=>a+b.length,0) / words.length : 0;
  s.lexicalComplexity = Math.min(1, Math.max(0, (avgLen - 4) / 4));

  // aggregate score with weights tuned for quality
  const score = Math.max(0,
    s.beatCoverage * 2.0 +
    s.promptCoverage * 1.0 +
    s.lengthScore * 0.8 +
    s.entityConsistency * 1.2 +
    s.coherence * 1.0 +
    s.lexicalComplexity * 0.5 -
    s.repetitionPenalty * 0.4
  );

  return { score, details: s };
}

function generateCandidates(outline, prompt, genre = 'default', rng = Math.random, grade = 'Adult', tone = 'neutral', count = 4) {
  // Produce multiple candidates using varying internal RNGs and pick the best by score
  const candidates = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.floor(rng() * 1e9);
    const irng = createRNG(seed);
    const parts = outline.beats.map(b => expandBeat(b, prompt, genre, irng, grade));
    const raw = `${titleCase(outline.title)}\n\n${parts.join('\n\n')}`;
    const polished = polishText(raw, { grade, tone, rng: irng });
    const sc = scoreStory(polished, outline, prompt);
    candidates.push({ title: titleCase(outline.title), story: polished, score: sc.score, details: sc.details, seed });
  }
  candidates.sort((a,b)=>b.score - a.score);
  return candidates;
}

function toneAdjust(text, tone = 'neutral') {
  if (!text) return text;
  if (tone === 'dark') {
    // add atmospheric sentences
    return text.replace(/\n\n$/, '') + "\n\nA shadow lingered at the edge of their days.";
  }
  if (tone === 'whimsical') {
    return text.replace(/\n\n$/, '') + "\n\nSmall wonders piled up like confetti around them.";
  }
  if (tone === 'child') {
    return text.replace(/\n\n$/, '') + "\n\nAnd they learned something gentle before the story ended.";
  }
  if (tone === 'dramatic') {
    return text.replace(/\n\n$/, '') + "\n\nIt changed everything, and nothing would be the same again.";
  }
  return text;
}

function postProcessText(text, prompt = '', genre='default', rng = Math.random, tone = 'neutral') {
  if (!text) return text;
  let t = removeRepetition(text);
  t = ensureEntityActions(t, prompt, genre, rng);
  t = grammarPatch(t, genre, rng);
  t = fixPunctuationAndCapitalize(t);
  t = toneAdjust(t, tone);
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

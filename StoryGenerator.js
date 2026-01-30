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
  return {
    title,
    story: full,
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

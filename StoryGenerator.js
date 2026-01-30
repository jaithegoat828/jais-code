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

export function generateStory({ prompt = "", genre = "fantasy", length = 3 } = {}) {
  // Build a small, coherent story using templates and sentence banks.
  const g = GENRES[genre] || GENRES.fantasy;
  const sb = sentenceBank();

  // Title
  const title = `${pick(g.title)} ${pick(g.subject)}`;

  // Hook + first line
  const hook = `${pick(g.subject)} ${pick(g.hook)}`;
  const firstLine = `${pick(sb.beginnings)} ${hook}`;

  // Body: create `length` sentences mixing template and prompt
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
      // Incorporate prompt words if provided
      const p = prompt ? prompt.split(" ").slice(0, 3).join(" ") : pick(sb.middles);
      body.push(`${p} became the turning point.`);
    }
  }

  // Ending
  const ending = pick(sb.ends);

  const full = `${title}\n\n${firstLine}\n\n${body.join(" ")}\n\n${ending}`;
  return {
    title,
    story: full,
  };
}

export function availableGenres() {
  return Object.keys(GENRES);
}

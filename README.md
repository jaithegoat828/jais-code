# jais-code

A simple Vite + React demo that runs a local storyteller called **Jai Bot** — no external API required.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Run locally:

```bash
npm run dev
```

3. Build for GitHub Pages and deploy (workflow is included):

```bash
npm run build
# The GitHub Action will deploy `dist/` to the `gh-pages` branch on push to `main`.
```

## Local-only: Jai Bot ✅

This project uses a fully local story generator named **Jai Bot**. There is no remote API or external key required — the app generates stories on-device so it works offline and preserves privacy.

Highlights:
- **No external calls**: Everything runs in the browser using the built-in generation logic.
- **Clarifying questions**: If your prompt is short, Jai Bot can ask a clarifying question in the UI to get better input.
- **Feedback stored locally**: Ratings and comments are saved in `localStorage` and can be exported from the UI as a JSON file.

## Features
- Broad genre coverage including **Fiction** and **Nonfiction**, multi-genre mixes and **Strict** mode to follow prompts closely.
- Deterministic seeding (enter a seed to reproduce a result).
- Page markers and simple pagination controls for long stories.
- Tone selector and creativity slider to vary output.

Files:
- `StoryGenerator.js` — local generation logic (templates + sentence bank).
- `StoryModel.js` — small Markov-chain based generator for varied, offline results.
- `App.jsx` — UI and controls for Jai Bot, with history, ratings, and export.

This setup is ideal for demos, school projects, and situations where you prefer not to call external services.


## Notes
- Vite base is set to `/jais-code/` in `vite.config.js` so the site works on GitHub Pages.

## Offline story generator (works without internet) ✅

This project includes a **local, offline story generator** named *Jai Bot* that runs entirely in the browser — no external API or key required. It supports multi-genre mixes, variable length, deterministic seeding, clarifying questions for short prompts, and tone adjustments.

New formatting features:
- **Pagination:** insert page markers and split output into pages. The default is **100 words per page**; this can be changed in the UI. Page markers like `--- Page 1/5 ---` are included in downloads and copy/share operations when enabled.
- **Punctuation & Sentences:** the generator ensures sentences end with `.`, `!`, or `?` where appropriate and capitalizes sentence starts to make output more readable and school-ready.

Format selector — Game & Mod support 🎮🧩
- Use the **Format** dropdown to pick: `Story`, `Game guide`, or `Mod idea`.
- The app detects game names and versions from your prompt (for example: `Minecraft 1.20.1 create new age`) and will include compatibility notes and version-aware guidance when available.
- `Game guide` produces structured tips (Overview, Getting Started, Features, Tips, Compatibility).
- `Mod idea` produces a mod concept, features, implementation steps, and compatibility notes.

Example prompts:
- "Minecraft 1.20.1 create new age"
- "Make a mod that adds wings to players for Minecraft 1.20"
- "Design a sci-fi game level with a ghost signal"

Files:
- `StoryGenerator.js` — local generation logic (templates + sentence bank). Supports **multi-genre** mixes and **Strict** mode to follow prompts closely, clarifying questions for short prompts, and tone adjustments.
- `StoryModel.js` — small Markov-chain based generator for varied, offline results (no network required). Markov seeding accepts genres and a numeric seed for determinism.
- `App.jsx` — UI and controls for Jai Bot, with history, ratings, and export. The app runs fully offline by default.
- **Save / Share / Copy** buttons: Save downloads the story as a `.txt` file (works on Chromebooks), Share uses the Web Share API when available, and Copy puts the story on the clipboard.

This is safe for environments that cannot access the web and is ideal for school projects or demos.

Remote generation (optional)
- You can enable **remote** generation using a client API key by setting `VITE_OPENAI_API_KEY` in a `.env` file (NOT recommended for public repos — prefer a server-side proxy to keep keys secret). When `engine` is set to **Remote**, the app can call OpenAI's chat completions directly from the browser and fetch richer, higher-quality results. The UI supports model selection and a 30s timeout to allow longer responses.

Security note: Do not commit your API key to the repo. Using a server-side proxy (serverless function) is safer — include a function named `/api/remote-generate` in your deployment if you prefer not to expose keys to the client.

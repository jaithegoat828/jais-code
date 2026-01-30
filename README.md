# jais-code

Simple Vite + React demo that uses the OpenAI API.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Add your API key (do NOT commit this):

```
cp .env.example .env
# edit .env and add your key
```

3. Run locally:

```
npm run dev
```

4. Build for GitHub Pages and deploy (workflow is included):

```
npm run build
# The GitHub Action will deploy `dist/` to the `gh-pages` branch on push to `main`.
```

## Security note ⚠️

This app calls the OpenAI API directly from the browser using `VITE_OPENAI_API_KEY`. That means the key is bundled into the client at runtime and can be exposed to end users. For production or class projects, prefer using a server-side function or proxy to keep your API key secret. See the README for options.

## Notes
- Vite base is set to `/jais-code/` in `vite.config.js` so the site works on GitHub Pages.

## Offline story generator (works without internet) ✅

This project now includes a **local, offline story generator** that does not call external APIs. Use the checkbox in the app to toggle the local generator on; it supports simple genres, variable length, and uses your prompt as a seed.

New formatting features:
- **Pagination:** the app can insert page markers and split output into pages. The default is **100 words per page**; this can be changed in the UI. Page markers look like `--- Page 1/5 ---` and are included in downloads and copy/share operations when enabled.
- **Punctuation & Sentences:** the generator now ensures sentences end with `.`, `!`, or `?` where appropriate and capitalizes sentence starts to make output more school-ready.

Note: If you do not set `VITE_OPENAI_API_KEY` in a `.env` file, the app will automatically **disable remote mode** and **fallback to the local generator**. If you try to use remote without a key, the app will switch to local and show a helpful message.

If you'd like to force the app to run **offline-only** even when an API key exists, set `VITE_FORCE_LOCAL=true` in your `.env` file. When enabled, the UI will show "(Offline-only mode enabled via VITE_FORCE_LOCAL)" and remote calls will be bypassed.

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
- `StoryGenerator.js` — local generation logic (templates + sentence bank)
- `StoryModel.js` — small Markov-chain based generator for more 'AI-like' results (no network required)
- UI updated in `App.jsx` to control generator options (Simple vs Advanced Markov), creativity, and auto-fallback when no key is present
- **Save / Share / Copy** buttons: Save downloads the story as a `.txt` file (works on Chromebooks), Share uses the Web Share API when available, and Copy puts the story on the clipboard.

This is safe for environments that cannot access the web and is ideal for school projects or demos.

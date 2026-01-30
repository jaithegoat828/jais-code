import { useState } from "react";
import { getBookInfo } from "./api.js";
import { generateStory, availableGenres, formatStory } from "./StoryGenerator.js";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [useLocal, setUseLocal] = useState(true);
  const [genre, setGenre] = useState("fantasy");
  const [length, setLength] = useState(3);
  const [mode, setMode] = useState("simple"); // 'simple' or 'markov'
  const [creativity, setCreativity] = useState(1);
  const [insertPageMarkers, setInsertPageMarkers] = useState(true);
  const [wordsPerPage, setWordsPerPage] = useState(100);

  // Detect whether an API key is present at build/run time.
  const hasApiKey = !!import.meta.env.VITE_OPENAI_API_KEY;
  // Optional: force local-only offline mode via .env (set VITE_FORCE_LOCAL=true)
  const forceLocal = String(import.meta.env.VITE_FORCE_LOCAL).toLowerCase() === 'true';

  async function handleSearch() {
    if (!prompt.trim()) return;
    setLoading(true);

    // If forceLocal is enabled, always use local generator
    if (forceLocal) {
      const { title, story } = generateStory({ prompt, genre, length, mode, creativity });
      const formatted = formatStory(story, { wordsPerPage, insertPageMarkers });
      setResult(`(Offline mode enabled)\n\n**${title}**\n\n${formatted}`);
      setLoading(false);
      return;
    }

    // If user attempted remote mode but no key exists, auto-fallback to local generator
    if (!useLocal && !hasApiKey) {
      const { title, story } = generateStory({ prompt, genre, length });
      const formatted = formatStory(story, { wordsPerPage, insertPageMarkers });
      setResult(`(No API key found — switched to local generator)\n\n**${title}**\n\n${formatted}`);
      setUseLocal(true);
      setLoading(false);
      return;
    }

    if (useLocal) {
      const { title, story } = generateStory({ prompt, genre, length, mode, creativity });
      const formatted = formatStory(story, { wordsPerPage, insertPageMarkers });
      setResult(`**${title}**\n\n${formatted}`);
      setLoading(false);
      return;
    }

    const response = await getBookInfo(prompt);

    // Helpful handling for common error messages from getBookInfo
    if (typeof response === "string" && response.includes("Missing API key")) {
      // Auto-fallback and show friendly guidance
      const { title, story } = generateStory({ prompt, genre, length });
      const formatted = formatStory(story, { wordsPerPage, insertPageMarkers });
      setResult(`(Missing API key — using local generator instead)\n\n**${title}**\n\n${formatted}`);
      setUseLocal(true);
      setLoading(false);
      return;
    }

    // If the remote response looks like a long story, apply light formatting for pages/punctuation
    if (typeof response === "string" && response.length > 200) {
      const formattedRemote = formatStory(response, { wordsPerPage, insertPageMarkers });
      setResult(formattedRemote);
      setLoading(false);
      return;
    }

    setResult(response);
    setLoading(false);
  }

  return (
    <div className="container">
      <h1>JAIS Story Generator</h1>

      <label style={{ display: "block", marginTop: 10 }}>
        <input
          type="checkbox"
          checked={useLocal}
          onChange={(e) => setUseLocal(e.target.checked)}
          disabled={forceLocal || !hasApiKey} // disable toggling when offline forced or no API key
        />{' '}
        Use local offline generator (no internet)
        {!hasApiKey && !forceLocal && (
          <span style={{ marginLeft: 8, color: '#f5c542', fontSize: 12 }}>
            (No API key found — remote mode disabled)
          </span>
        )}
        {forceLocal && (
          <span style={{ marginLeft: 8, color: '#6ecb7c', fontSize: 12 }}>
            (Offline-only mode enabled via VITE_FORCE_LOCAL)
          </span>
        )}
      </label>

      <input
        type="text"
        placeholder="Enter a prompt or seed words..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        <label>
          Generator:{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="simple">Simple templates</option>
            <option value="markov">Advanced (Markov)</option>
          </select>
        </label>

        <label style={{ marginLeft: 12 }}>
          Genre:{' '}
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            {availableGenres().map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: 12 }}>
          Length: {length}
          <input
            type="range"
            min="1"
            max="6"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </label>

        <label style={{ marginLeft: 12 }}>
          Creativity: {creativity.toFixed(1)}
          <input
            type="range"
            min="0.4"
            max="2"
            step="0.1"
            value={creativity}
            onChange={(e) => setCreativity(Number(e.target.value))}
          />
        </label>

        <label style={{ marginLeft: 12 }}>
          <input
            type="checkbox"
            checked={insertPageMarkers}
            onChange={(e) => setInsertPageMarkers(e.target.checked)}
          />{' '}
          Insert page markers (words per page)
        </label>

        <label style={{ marginLeft: 8 }}>
          {wordsPerPage} words/page
          <input
            type="number"
            min="20"
            step="10"
            value={wordsPerPage}
            onChange={(e) => setWordsPerPage(Number(e.target.value))}
            style={{ width: 80, marginLeft: 6 }}
          />
        </label>
      </div>

      <button onClick={handleSearch} style={{ marginTop: 12 }}>Generate</button>

      {loading && <p className="loading">Generating…</p>}

      {result && (
        <div className="result-box">
          <h2>Result</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{result}</pre>

          <div className="actions">
            <button
              className="btn"
              onClick={() => {
                // Download as .txt; extract bold title if present
                const match = result.match(/\*\*(.*?)\*\*/);
                const title = match ? match[1] : "story";
                const text = result.replace(/\*\*(.*?)\*\*/g, "$1");
                const filename = `${title.replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "-")}.txt`;
                const blob = new Blob([text], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >Save</button>

            <button
              className="btn"
              onClick={async () => {
                const text = result.replace(/\*\*(.*?)\*\*/g, "$1");
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "Story", text });
                  } catch (err) {
                    // user cancelled or share not supported
                    console.error(err);
                    alert("Share failed or cancelled.");
                  }
                } else if (navigator.clipboard) {
                  try {
                    await navigator.clipboard.writeText(text);
                    alert("Story copied to clipboard (use Ctrl+V to paste/share). If you want to save, press Save.");
                  } catch (err) {
                    console.error(err);
                    alert("Copy failed.");
                  }
                } else {
                  alert("Sharing not available — use Save to download the story.");
                }
              }}
            >Share / Copy</button>

            <button
              className="btn"
              onClick={async () => {
                try {
                  const text = result.replace(/\*\*(.*?)\*\*/g, "$1");
                  await navigator.clipboard.writeText(text);
                  alert("Story copied to clipboard.");
                } catch (err) {
                  console.error(err);
                  alert("Copy failed.");
                }
              }}
            >Copy</button>
          </div>
        </div>
      )}
    </div>
  );
}

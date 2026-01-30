import { useState } from "react";
import { getBookInfo } from "./api.js";
import { generateStory, availableGenres } from "./StoryGenerator.js";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [useLocal, setUseLocal] = useState(true);
  const [genre, setGenre] = useState("fantasy");
  const [length, setLength] = useState(3);

  async function handleSearch() {
    if (!prompt.trim()) return;
    setLoading(true);

    if (useLocal) {
      const { title, story } = generateStory({ prompt, genre, length });
      setResult(`**${title}**\n\n${story}`);
      setLoading(false);
      return;
    }

    const response = await getBookInfo(prompt);
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
        />{' '}
        Use local offline generator (no internet)
      </label>

      <input
        type="text"
        placeholder="Enter a prompt or seed words..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div style={{ marginTop: 10 }}>
        <label>
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

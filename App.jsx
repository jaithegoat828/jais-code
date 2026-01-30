import { useState } from "react";
import { getBookInfo } from "./api.js";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!prompt.trim()) return;
    setLoading(true);
    const response = await getBookInfo(prompt);
    setResult(response);
    setLoading(false);
  }

  return (
    <div className="container">
      <h1>JAIS Book Helper</h1>

      <input
        type="text"
        placeholder="Enter a book or topic..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button onClick={handleSearch}>Search</button>

      {loading && <p className="loading">Thinking…</p>}

      {result && (
        <div className="result-box">
          <h2>AI Result</h2>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

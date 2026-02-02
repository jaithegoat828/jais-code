import { useState } from "react";
import { generateStory, availableGenres, formatStory } from "./StoryGenerator.js"; // Jai Bot local AI only (no remote API)

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState("fantasy");
  const [strictFollow, setStrictFollow] = useState(false);
  const [length, setLength] = useState(3);
  const [mode, setMode] = useState("simple"); // 'simple', 'markov', or 'scaffold'
  const [creativity, setCreativity] = useState(1);
  const [seed, setSeed] = useState("");
  const [tone, setTone] = useState('neutral');
  const [engine, setEngine] = useState('jai-pro');
  const [remoteModel, setRemoteModel] = useState('gpt-4o-mini');
  const REMOTE_TIMEOUT_MS = 30000; // 30 seconds
  const [grade, setGrade] = useState('Adult');
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('story_history') || '[]'); } catch(e) { return []; }
  });

  // map numeric prompts like '1' to sample prompts to help quick testing
  function resolveNumericPrompt(p) {
    const t = (p || '').trim();
    if (/^[0-9]+$/.test(t)) {
      const n = Math.max(1, Math.min(SAMPLE_PROMPTS.length, Number(t)));
      return SAMPLE_PROMPTS[n-1];
    }
    return p;
  }
  const [clarifyQuestion, setClarifyQuestion] = useState('');
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [autoAskClarify, setAutoAskClarify] = useState(true);
  // Local feedback store
  const addLocalFeedback = (rating, comment='') => {
    const r = JSON.parse(localStorage.getItem('local_feedback') || '[]');
    r.unshift({ id: Date.now(), prompt, rating, comment, tone, strict: strictFollow, engine, grade, source: 'local' });
    localStorage.setItem('local_feedback', JSON.stringify(r));
  };
  const exportFeedback = () => {
    const data = localStorage.getItem('local_feedback') || '[]';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'jais-feedback.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const [insertPageMarkers, setInsertPageMarkers] = useState(true);
  const [wordsPerPage, setWordsPerPage] = useState(100);

  const SAMPLE_PROMPTS = [
    'Lost sword in an ancient forest',
    'A robot learns to hum a lullaby',
    'A librarian hides a map behind a portrait',
    'Design a cozy fantasy quest for children',
  ];

  async function handleSearch() {
    if (!prompt.trim()) return;
    setLoading(true);

    // If prompt is very short and auto-ask is enabled, ask a clarifying question
    const words = (prompt||'').split(/\s+/).filter(Boolean).length;
    if (words < 3 && autoAskClarify && !clarifyQuestion) {
      setClarifyQuestion('Who is the main character? Where does this take place? What tone do you want?');
      setLoading(false);
      return;
    }

    // If we asked for clarification, require the user to provide an answer (or skip) before generating
    if (clarifyQuestion && !clarifyAnswer) {
      // user hasn't provided clarification yet
      setLoading(false);
      return;
    }

    const genresArg = Array.isArray(genre) ? genre : [genre];
    // resolve numeric prompts (e.g., '1' -> sample prompt 1)
    const rawPrompt = clarifyAnswer ? `${clarifyAnswer} ${prompt}` : prompt;
    const q = resolveNumericPrompt(rawPrompt);

    // If choosing remote engine, try the remote model (requires client API key in .env)
    if (engine === 'remote') {
      const key = import.meta.env.VITE_OPENAI_API_KEY;
      if (!key) {
        // no client key — fallback to local generator and inform the user
        const fallback = generateStory({ prompt: q, genres: genresArg, strict: strictFollow, length, mode, creativity, seed: seed || null, tone, engine: 'jai-pro', grade });
        const formatted = formatStory(fallback.story || fallback, { wordsPerPage, insertPageMarkers });
        setResult(`(Missing client API key — using local Jai Pro)\n\n**${fallback.title}**\n\n${formatted}`);
        setLoading(false);
        return;
      }
      try {
        const payload = { prompt: q, model: remoteModel, genre: genresArg[0] || 'fantasy', length, creativity, tone, seed: seed || null, grade };
        const remoteRes = await fetch('/api/remote-generate', { // path used for dev servers; api.js supports client-side direct call too
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!remoteRes.ok) throw new Error('Remote generation failed');
        const json = await remoteRes.json();
        const rtitle = json.title || 'Untitled';
        const rstory = json.story || json;
        const formatted = formatStory(rstory, { wordsPerPage, insertPageMarkers });
        setResult(`**${rtitle}**\n\n${formatted}`);
        const entry = { id: Date.now(), prompt, source: 'remote', engine: 'remote', model: remoteModel, grade, preview: rstory.slice(0,250) };
        const h = [entry, ...history].slice(0,20); setHistory(h); localStorage.setItem('story_history', JSON.stringify(h));
      } catch (e) {
        console.error(e);
        // fallback to local
        const fallback = generateStory({ prompt: q, genres: genresArg, strict: strictFollow, length, mode, creativity, seed: seed || null, tone, engine: 'jai-pro', grade });
        const formatted = formatStory(fallback.story || fallback, { wordsPerPage, insertPageMarkers });
        setResult(`(Remote generation failed — using local Jai Pro)\n\n**${fallback.title}**\n\n${formatted}`);
      } finally {
        setClarifyQuestion(''); setClarifyAnswer(''); setLoading(false);
      }
      return;
    }

    const res = generateStory({ prompt: q, genres: genresArg, strict: strictFollow, length, mode, creativity, seed: seed || null, tone, engine, grade });
    const title = res.title || 'Untitled';
    const story = res.story || (typeof res === 'string' ? res : '');
    const formatted = formatStory(story, { wordsPerPage, insertPageMarkers });
    // include Jai Pro score if present
    const scoreLine = res.meta && res.meta.score ? `\n\n(Score: ${res.meta.score.toFixed(2)})` : '';
    let out = `**${title}**\n\n${formatted}${scoreLine}`;
    // If candidates are present, show a compact summary and option to explain
    if (res.meta && res.meta.candidates) {
      out += `\n\n(Top ${res.meta.candidates.length} candidates generated — best seed ${res.meta.candidates[0].seed}, score ${res.meta.candidates[0].score.toFixed(2)})`;
    }
    setResult(out);
    const entry = { id: Date.now(), prompt, source: 'local', engine, grade, preview: story.slice(0,250) };
    const h = [entry, ...history].slice(0,20);
    setHistory(h); localStorage.setItem('story_history', JSON.stringify(h));
    setClarifyQuestion('');
    setClarifyAnswer('');
    setLoading(false);

  }

  return (
    <div className="container">
      <h1>JAIS Story Generator</h1>

      <div style={{ display: "block", marginTop: 10 }}>
        <span style={{ fontWeight: 600, color: '#6ecb7c' }}>Jai Bot (local AI) — runs entirely in your browser</span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Enter a prompt or seed words..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ width: 220 }}>
          <option value="">-- Sample prompts --</option>
          {SAMPLE_PROMPTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <label>Tone: </label>
        <select value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="neutral">Neutral</option>
          <option value="whimsical">Whimsical</option>
          <option value="dark">Dark</option>
          <option value="child">Child-friendly</option>
          <option value="dramatic">Dramatic</option>
        </select>

        <label style={{ marginLeft: 8 }}>Engine: </label>
        <select value={engine} onChange={(e) => setEngine(e.target.value)}>
          <option value="jai">Jai (fast)</option>
          <option value="jai-pro">Jai Pro (outline → expand → polish)</option>
          <option value="remote">Remote (online model)</option>
        </select>

        {engine === 'remote' && (
          <>
            <label style={{ marginLeft: 8 }}>Model: </label>
            <select value={remoteModel} onChange={(e) => setRemoteModel(e.target.value)}>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini-instruct">gpt-4o-mini-instruct</option>
            </select>
          </>
        )}

        <label style={{ marginLeft: 8 }}>Grade: </label>
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="K">K</option>
          {Array.from({length:12}, (_,i)=>(i+1)).map(n=> <option key={n} value={n}>{n}</option>)}
          <option value="Adult">Adult</option>
          <option value="Professional">Professional</option>
        </select>

        <label style={{ marginLeft: 8 }}>
          <input type="checkbox" checked={autoAskClarify} onChange={(e)=>setAutoAskClarify(e.target.checked)} /> Auto-ask clarify
        </label>

        <span style={{ marginLeft: 12, color: '#6ecb7c', fontWeight: 600 }}>Jai Bot (local AI)</span>
      </div>

      {clarifyQuestion && (
        <div style={{ marginTop: 10, padding: 10, border: '1px dashed #ddd', borderRadius: 6, background: '#fbfbfb' }}>
          <div style={{ fontWeight: 700 }}>Clarify — please answer:</div>
          <div style={{ marginTop: 6, color: '#333' }}>{clarifyQuestion}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <input value={clarifyAnswer} onChange={(e)=>setClarifyAnswer(e.target.value)} placeholder="Add detail (e.g., 'a lonely librarian in a rain-soaked city, whimsical')" style={{ flex: 1 }} />
            <button className="btn" onClick={() => { handleSearch(); }} style={{ background: '#6ecb7c' }}>Use answer & generate</button>
            <button className="btn" onClick={() => { setClarifyQuestion(''); setClarifyAnswer(''); }}>Skip</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <label>
          Generator:{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="simple">Simple templates</option>
            <option value="markov">Advanced (Markov)</option>
            <option value="scaffold">Scaffolded (3-act)</option>
          </select> 
        </label>

        <label style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          Genre(s):
          <select multiple value={Array.isArray(genre) ? genre : [genre]} onChange={(e) => setGenre(Array.from(e.target.selectedOptions).map(o=>o.value))} style={{ minWidth: 160 }}>
            {availableGenres().map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <label style={{ marginLeft: 6 }}>
            <input type="checkbox" checked={Array.isArray(genre) && genre.length === availableGenres().length} onChange={(e) => { if (e.target.checked) setGenre(availableGenres()); else setGenre(['fantasy']); }} /> All genres
          </label>
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
          Seed (optional):
          <input
            type="text"
            placeholder="e.g., 42"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            style={{ width: 120, marginLeft: 6 }}
          />
        </label>

        <label style={{ marginLeft: 12 }}>
          <input type="checkbox" checked={strictFollow} onChange={(e) => setStrictFollow(e.target.checked)} /> <strong>Strict:</strong> follow prompt exactly
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

            <button className="btn" onClick={() => { setLoading(true); setCreativity(Math.min(2, creativity + 0.3)); handleSearch(); }} style={{ background: '#ffa500' }}>Regenerate</button>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13, marginRight: 6 }}>Rate:</span>
              {[1,2,3,4,5].map(n => (
                <button key={n} className="btn" onClick={async () => {
                  addLocalFeedback(n);
                  alert('Thanks for the feedback! (saved locally)');
                }} style={{ background: '#8b5cf6' }}>{n}</button>
              ))}
              <button className="btn" onClick={exportFeedback} style={{ marginLeft: 10, background: '#444' }}>Export feedback</button>
            </div>

            <div style={{ marginLeft: 8 }}>
              <button className="btn" onClick={() => {
                const t = history[0]; if (t) { setPrompt(t.prompt); setResult(t.preview); }
              }}>Show last</button>
            </div>

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

          {history.length > 0 && (
            <div style={{ marginTop: 12, textAlign: 'left' }}>
              <h3>Recent</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {history.map(h => (
                  <li key={h.id} style={{ marginBottom: 8 }}>
                    <button className="btn" style={{ background: '#333', padding: '8px 10px', width: '100%', textAlign: 'left' }} onClick={() => {
                      setPrompt(h.prompt); setResult(h.preview);
                    }}>
                      <strong>{h.engine ? h.engine.toUpperCase() : (h.source === 'remote' ? 'REMOTE' : 'LOCAL')}</strong> {h.grade ? ` (Grade ${h.grade})` : ''}: {h.prompt.slice(0, 80)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

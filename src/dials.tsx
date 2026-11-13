import { useState } from "react";

const CALM = ["Your", "order", "is", "on", "the", "way.", "Delivery", "partner", "Arjun", "is", "near", "the", "main", "gate."];
const WILD = ["Your", "order", "is", "on", "the", "way,", "gliding", "like", "a", "samosa", "through", "monsoon", "clouds,", "destiny", "unfolding."];

export function Dials({ onMap }: { onMap: () => void }) {
  const [heat, setHeat] = useState(1.9);
  const [cap, setCap] = useState(12);
  const [locked, setLocked] = useState(false);
  const words = (heat >= 1.2 ? WILD : CALM).slice(0, cap);
  const reason = words.length < (heat >= 1.2 ? WILD.length : CALM.length) ? "length" : "stop";
  const honest = heat >= 0.3 && heat <= 0.8 && cap >= 14 && reason === "stop";

  return (
    <div className="bg mission">
      <header className="topbar">
        <div className="brand-lock">
          <strong>DevQuest</strong>
          <span className="muted">Afterfault · Mission 3.6</span>
        </div>
        <button className="btn ghost" type="button" onClick={onMap}>All topics</button>
      </header>
      <div className="layout">
        <aside className="panel">
          <p className="kicker">Mission 3.6</p>
          <h1>The Dials</h1>
          <p className="who">The stream finishes. The reply still sounds wrong.</p>
          <div className="mentor">
            <div className="orb" aria-hidden />
            <p className="vyapti">Temperature changes the voice. The token cap can cut a finished sentence short.</p>
          </div>
        </aside>
        <main className="stage">
          <h2>Tune Ila's tablet</h2>
          <p>She left temperature at 1.9. One reply writes poetry. Another stops at twelve words with finish_reason length.</p>
          <label>
            Temperature {heat.toFixed(1)}
            <input type="range" min={0} max={2} step={0.1} value={heat} onChange={(event) => { setHeat(Number(event.target.value)); setLocked(false); }} />
          </label>
          <label>
            Max tokens {cap}
            <input type="range" min={4} max={20} step={1} value={cap} onChange={(event) => { setCap(Number(event.target.value)); setLocked(false); }} />
          </label>
          <div className="scope" aria-label="Reply words">
            {words.map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}
          </div>
          <p className="terminal">finish_reason: {reason} · words {words.length}</p>
          <p>{heat >= 1.2 ? "The bot is doing poetry. Turn the heat down." : reason === "length" ? "Clean stop, but the thought was cut. Raise the token cap." : "Voice is steady and the line can finish."}</p>
          <button className="btn" type="button" disabled={!honest} onClick={() => setLocked(true)}>Ship these dials</button>
          {locked && <p className="good">Dials set. Temperature stays in range, and the reply is allowed to finish.</p>}
        </main>
        <aside className="panel side">
          <p className="kicker">Target</p>
          <div className="check"><div className="row"><span>Temperature</span><span className="mono">0.3–0.8</span></div></div>
          <div className="check"><div className="row"><span>Max tokens</span><span className="mono">14+</span></div></div>
          <div className="check"><div className="row"><span>finish_reason</span><span className="mono">stop</span></div></div>
          <p className="fine">A high temperature rambles. A tiny cap ends the reply even when the stream is healthy.</p>
        </aside>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { Difficulty } from "./game/types";
import { TUNING } from "./game/types";
import { rankFromAttempts } from "./game/rank";
import { Hud } from "./ui/Hud";
import { Effects, useFx } from "./ui/Effects";

const CALM = ["Your", "order", "is", "on", "the", "way.", "Delivery", "partner", "Arjun", "is", "near", "the", "main", "gate."];
const WILD = ["Your", "order", "is", "on", "the", "way,", "gliding", "like", "a", "samosa", "through", "monsoon", "clouds,", "destiny", "unfolding."];

export function Dials({ onMap, difficulty = "guided" }: { onMap: () => void; difficulty?: Difficulty }) {
  return (
    <Effects>
      <DialsInner onMap={onMap} difficulty={difficulty} />
    </Effects>
  );
}

function DialsInner({ onMap, difficulty }: { onMap: () => void; difficulty: Difficulty }) {
  const fx = useFx();
  const tune = TUNING[difficulty];
  const [heat, setHeat] = useState(1.9);
  const [cap, setCap] = useState(12);
  const [locked, setLocked] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  const [typed, setTyped] = useState("");
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const pool = heat >= 1.2 ? WILD : CALM;
  const words = pool.slice(0, cap);
  const reason = words.length < pool.length ? "length" : "stop";
  const heatOk = heat >= 0.3 && heat <= 0.8;
  const capOk = cap >= 14;
  const honest = heatOk && capOk && reason === "stop";
  const rank = rankFromAttempts(1);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id));
  }, []);

  function play() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setPlaying(true);
    setTyped("");
    let i = 0;
    const tick = () => {
      i += 1;
      setTyped(words.slice(0, i).join(" "));
      if (i < words.length) {
        const id = window.setTimeout(tick, 180);
        timers.current.push(id);
      } else setPlaying(false);
    };
    const id = window.setTimeout(tick, 120);
    timers.current.push(id);
  }

  function ship() {
    if (!honest || locked) return;
    setLocked(true);
    fx.loot("Calm Voice");
    fx.toast("+24 XP · dials locked", "xp");
  }

  return (
    <div className="bg mission has-hud">
      <Hud
        hearts={tune.hearts}
        maxHearts={tune.hearts}
        xp={locked ? 24 : 0}
        rank={rank}
        packetLoss={honest ? 0 : heat >= 1.2 ? 42 : reason === "length" ? 28 : 12}
        objective="3.6 · Tune Ila's tablet"
        timeLeftMs={0}
        showTimer={false}
        coins={locked ? 12 : 0}
      />
      <header className="topbar">
        <div className="brand-lock">
          <strong>DevQuest</strong>
          <span className="muted">Afterfault · Mission 3.6</span>
        </div>
        <button className="btn ghost" type="button" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button className="btn ghost" type="button" onClick={onMap}>District</button>
      </header>
      <div className="layout">
        <aside className="panel">
          <p className="kicker">Mission 3.6</p>
          <h1>The Dials</h1>
          <p className="who">The stream finishes. The reply still sounds wrong.</p>
          <div className="mentor">
            <div className="orb" aria-hidden />
            <p className="vyapti">
              {locked
                ? "Dials set. Temperature stays in range, and the reply is allowed to finish."
                : "Temperature changes the voice. The token cap can cut a finished sentence short. Move both into the target band."}
            </p>
          </div>
        </aside>
        <main className="stage">
          <p className="kicker">How to win</p>
          <h2>Tune Ila's tablet</h2>
          <p>She left temperature at 1.9. One reply writes poetry. Another stops at twelve words with finish_reason length. Lower the heat, then raise the cap until the line can finish honestly.</p>
          <label>
            Temperature {heat.toFixed(1)} {heatOk ? "· in band" : heat >= 1.2 ? "· poetry" : "· still warm"}
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={heat}
              aria-valuemin={0}
              aria-valuemax={2}
              onChange={(event) => { setHeat(Number(event.target.value)); setLocked(false); }}
            />
          </label>
          <label>
            Max tokens {cap} {capOk ? "· enough room" : "· will cut the thought"}
            <input
              type="range"
              min={4}
              max={20}
              step={1}
              value={cap}
              onChange={(event) => { setCap(Number(event.target.value)); setLocked(false); }}
            />
          </label>
          <div className={`scope ${heat >= 1.2 ? "wild" : ""}`} aria-label="Reply words">
            {words.map((word, index) => <span key={`${word}-${index}`} style={{ animationDelay: `${index * 40}ms` }}>{word}</span>)}
          </div>
          <div className="row">
            <button className="btn ghost" type="button" onClick={play} disabled={playing}>Hear the stream</button>
            <p className="terminal">finish_reason: {reason} · words {words.length}{typed ? ` · live: ${typed}` : ""}</p>
          </div>
          <p className={honest ? "good" : ""}>
            {heat >= 1.2
              ? "The bot is doing poetry. Turn the heat down into 0.3–0.8."
              : reason === "length"
                ? "Voice is calmer, but the thought was cut. Raise the token cap to 14 or more."
                : heatOk
                  ? "Voice is steady and the line can finish. Ship it."
                  : "The line can finish, but the temperature is still outside 0.3–0.8."}
          </p>
          <button className="btn" type="button" disabled={!honest} onClick={ship}>Ship these dials</button>
          {locked && (
            <div className="result-card">
              <p className="kicker">Match result</p>
              <h3>Calm Voice unlocked</h3>
              <ul>
                <li>Temperature {heat.toFixed(1)} · cap {cap}</li>
                <li>finish_reason stop</li>
                <li>+24 XP · 12 coins</li>
              </ul>
            </div>
          )}
        </main>
        <aside className="panel side">
          <p className="kicker">Target</p>
          <div className={`check ${heatOk ? "ok" : ""}`}><div className="row"><span>Temperature</span><span className="mono">0.3–0.8</span></div></div>
          <div className={`check ${capOk ? "ok" : ""}`}><div className="row"><span>Max tokens</span><span className="mono">14+</span></div></div>
          <div className={`check ${reason === "stop" ? "ok" : ""}`}><div className="row"><span>finish_reason</span><span className="mono">stop</span></div></div>
          <p className="fine">A high temperature rambles. A tiny cap ends the reply even when the stream is healthy.</p>
        </aside>
      </div>
    </div>
  );
}

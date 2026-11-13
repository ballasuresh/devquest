import { useEffect, useMemo, useRef, useState } from "react";
import type { Difficulty, Rank } from "../game/types";
import { Joystick } from "./Joystick";

export type HubMission = "line" | "dials";

type Node = { id: HubMission; x: number; y: number; mark: string; label: string; blurb: string };

const NODES: Node[] = [
  { id: "line", x: 36, y: 52, mark: "3.5", label: "The Unfinished Line", blurb: "A support reply freezes mid-sentence. Assemble the stream and say whether it finished." },
  { id: "dials", x: 68, y: 42, mark: "3.6", label: "The Dials", blurb: "Replies finish, but some turn into poetry and some stop at twelve words." },
];

const PREF = "dq-battle-pref";

type Pref = { difficulty: Difficulty; seenHelp: boolean; theme: "dark" | "light" };

function loadPref(): Pref {
  try {
    const raw = localStorage.getItem(PREF);
    if (raw) return { difficulty: "guided", seenHelp: false, theme: "dark", ...JSON.parse(raw) };
  } catch {
    /* keep defaults */
  }
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  return { difficulty: "guided", seenHelp: false, theme };
}

function progressPeek(): { xp: number; rank: Rank | null } {
  try {
    const raw = localStorage.getItem("dq-m35");
    if (!raw) return { xp: 0, rank: null };
    const data = JSON.parse(raw) as { xp?: number; attempts?: number; stage?: string };
    const xp = data.xp ?? 0;
    if (data.stage !== "win") return { xp, rank: null };
    const attempts = data.attempts ?? 1;
    const rank: Rank = attempts <= 1 ? "Gold" : attempts === 2 ? "Silver" : "Bronze";
    return { xp, rank };
  } catch {
    return { xp: 0, rank: null };
  }
}

export function WorldHub({ onEnter }: { onEnter: (id: HubMission, difficulty: Difficulty) => void }) {
  const [pref, setPref] = useState<Pref>(loadPref);
  const [p, setP] = useState({ x: 50, y: 78 });
  const [near, setNear] = useState<HubMission | null>(null);
  const [card, setCard] = useState<HubMission | null>(null);
  const joy = useRef({ x: 0, y: 0 });
  const peek = useMemo(progressPeek, []);

  useEffect(() => {
    localStorage.setItem(PREF, JSON.stringify(pref));
    document.documentElement.dataset.theme = pref.theme;
  }, [pref]);

  useEffect(() => {
    const keys = new Set<string>();
    let x = 50;
    let y = 78;
    let last = performance.now();
    let raf = 0;
    const speed = 0.62;

    const tick = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      let dx = joy.current.x;
      let dy = joy.current.y;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      const mag = Math.hypot(dx, dy);
      if (mag > 1) {
        dx /= mag;
        dy /= mag;
      }
      if (dx || dy) {
        x = Math.max(5, Math.min(95, x + dx * speed * dt));
        y = Math.max(12, Math.min(90, y + dy * speed * dt));
        setP({ x, y });
      }
      let next: HubMission | null = null;
      let best = 10;
      for (const n of NODES) {
        const dist = Math.hypot(x - n.x, y - n.y);
        if (dist < best) {
          best = dist;
          next = n.id;
        }
      }
      setNear(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
      keys.add(k);
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "e" || e.key === "E" || e.key === "Enter") {
        if (card) {
          onEnter(card, pref.difficulty);
          return;
        }
        if (near) setCard(near);
      }
      if (e.key === "Escape") setCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [near, card, pref.difficulty, onEnter]);

  const focus = NODES.find((n) => n.id === (card ?? near)) ?? null;
  const art = pref.theme === "light" ? "/art/port-day.jpg" : "/art/port-night.jpg";

  return (
    <div className="hub">
      <header className="hub-top">
        <div className="brand-lock">
          <strong>DevQuest</strong>
          <span className="muted">Afterfault · The Retry Storm</span>
        </div>
        <div className="hub-stats">
          {peek.rank && <span className={`hud2-rank rank-${peek.rank.toLowerCase()}`}>{peek.rank}</span>}
          {peek.xp > 0 && <span className="xp-chip"><strong>{peek.xp}</strong> XP</span>}
        </div>
        <button
          className="btn ghost"
          type="button"
          onClick={() => setPref((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))}
        >
          {pref.theme === "dark" ? "Light" : "Dark"}
        </button>
      </header>

      <div className="hub-hero">
        <p className="kicker">Crisis district</p>
        <h1>Drop in.</h1>
        <p className="lede">Move with WASD or the stick. Walk up to a mission and press E — or just tap the beacon.</p>
      </div>

      <div className="hub-map" style={{ backgroundImage: `linear-gradient(180deg, rgba(7,8,12,.15), rgba(7,8,12,.55)), url(${art})` }}>
        {NODES.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`hub-node${near === n.id ? " near" : ""}${card === n.id ? " open" : ""}`}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            onClick={() => setCard(n.id)}
          >
            <span className="mark">{n.mark}</span>
            <strong>{n.label}</strong>
          </button>
        ))}
        <div className="hub-pawn" style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-hidden />
        {near && !card && (
          <div className="hub-prompt">
            <kbd>E</kbd> Enter {NODES.find((n) => n.id === near)?.label}
          </div>
        )}
      </div>

      <div className="hub-modes" role="radiogroup" aria-label="Difficulty">
        {(["micro", "guided", "ranked"] as Difficulty[]).map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={pref.difficulty === d}
            className={`hub-mode${pref.difficulty === d ? " on" : ""}`}
            onClick={() => setPref((s) => ({ ...s, difficulty: d }))}
          >
            <strong>{d === "micro" ? "Micro" : d === "guided" ? "Guided" : "Ranked"}</strong>
            <span>
              {d === "micro" && "Five hearts, slow clock, full hints."}
              {d === "guided" && "Three hearts, balanced pace, mentor on."}
              {d === "ranked" && "Strict timer, almost no hints, best loot."}
            </span>
          </button>
        ))}
      </div>

      <Joystick onMove={(dx, dy) => { joy.current = { x: dx, y: dy }; }} />
      {near && (
        <button className="hub-enter" type="button" onClick={() => setCard(near)}>
          Enter
        </button>
      )}

      {!pref.seenHelp && (
        <div className="hub-help" role="dialog" aria-label="How to play">
          <p className="kicker">First drop</p>
          <h2>How this lobby works</h2>
          <ul>
            <li><b>Move</b> with W A S D or the on-screen stick.</li>
            <li><b>Enter</b> a glowing beacon with E, Enter, or a tap.</li>
            <li><b>Hearts</b> drop on a wrong call. At zero you respawn at the last stage — XP stays.</li>
            <li>Pick a difficulty before you walk in. You can change it here any time.</li>
          </ul>
          <button className="btn" type="button" onClick={() => setPref((s) => ({ ...s, seenHelp: true }))}>
            Got it — I'm in
          </button>
        </div>
      )}

      {card && focus && (
        <div className="hub-card-wrap" role="dialog" aria-labelledby="hub-card-title">
          <article className="hub-card">
            <p className="kicker">Mission {focus.mark}</p>
            <h2 id="hub-card-title">{focus.label}</h2>
            <p>{focus.blurb}</p>
            <p className="fine">Difficulty: <b>{pref.difficulty}</b>. You can back out to this district any time.</p>
            <div className="row">
              <button className="btn" type="button" onClick={() => onEnter(focus.id, pref.difficulty)}>
                Enter mission
              </button>
              <button className="btn ghost" type="button" onClick={() => setCard(null)}>
                Stay in the district
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

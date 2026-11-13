import { useEffect, useRef } from "react";
import { go, href } from "./hash";
import { loadStats } from "./stats";

const ACTIONS = [
  { id: "play" as const, label: "Play Arena", hint: "Enter", primary: true },
  { id: "academy" as const, label: "Academy", hint: "A", primary: false },
  { id: "howto" as const, label: "How to Play", hint: "H", primary: false },
  { id: "settings" as const, label: "Settings", hint: "S", primary: false },
  { id: "scores" as const, label: "High Scores", hint: "R", primary: false },
];

export function Title() {
  const stats = loadStats();
  const focus = useRef(0);
  const btns = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    btns.current[0]?.focus();
    const on = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "arrowright" || k === "s" && e.key === "ArrowDown") {
        /* handled below */
      }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        focus.current = (focus.current + 1) % ACTIONS.length;
        btns.current[focus.current]?.focus();
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        focus.current = (focus.current + ACTIONS.length - 1) % ACTIONS.length;
        btns.current[focus.current]?.focus();
      }
      if (e.key === "Enter" || e.key === " ") {
        if ((e.target as HTMLElement).tagName !== "A") {
          e.preventDefault();
          go("play");
        }
      }
      if (k === "a") go("academy");
      if (k === "h") go("howto");
      if (k === "s" && e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        if ((e.target as HTMLElement).tagName !== "INPUT") go("settings");
      }
      if (k === "r") go("scores");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  return (
    <main className="dq-page dq-title">
      <p className="kicker">Afterfault</p>
      <h1>DEVQUEST</h1>
      <p className="lede">The Line Must Hold</p>
      <ul className="dq-title-actions">
        {ACTIONS.map((a, i) => (
          <li key={a.id}>
            <a
              ref={(el) => { btns.current[i] = el; }}
              href={href(a.id)}
              className={`dq-menu-btn${a.primary ? " primary" : ""}`}
              onClick={(e) => { e.preventDefault(); go(a.id); }}
              onFocus={() => { focus.current = i; }}
            >
              <span>{a.label}</span>
              <kbd>{a.hint}</kbd>
            </a>
          </li>
        ))}
      </ul>
      <p className="dq-title-score">
        {stats.best ? `High score  ${stats.best}  ·  ${stats.played} runs` : "Slash the stream glitches. Dash through fire. Don't let the line freeze."}
      </p>
      <p className="fine">Arrow keys move the menu. Enter selects. Esc goes back from any other screen.</p>
    </main>
  );
}

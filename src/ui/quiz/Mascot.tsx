import { useId } from "react";
import "./quiz.css";

export type Mood = "idle" | "happy" | "sad" | "wow" | "think";

export function Mascot({ mood = "idle", line }: { mood?: Mood; line?: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <div className={`quiz-mascot is-${mood}`} aria-hidden={line ? undefined : true}>
      <svg className="quiz-mascot-svg" viewBox="0 0 120 120" width="96" height="96" role="img" aria-label="Vyapti">
        <defs>
          <radialGradient id={`${gid}-glow`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="62" r="42" fill={`url(#${gid}-glow)`} />
        <ellipse cx="60" cy="108" rx="28" ry="6" fill="rgba(0,0,0,0.18)" />
        {/* eyes */}
        {mood === "sad" ? (
          <>
            <path d="M40 58 q8 8 16 0" fill="none" stroke="#1c1406" strokeWidth="3" strokeLinecap="round" />
            <path d="M64 58 q8 8 16 0" fill="none" stroke="#1c1406" strokeWidth="3" strokeLinecap="round" />
            <circle cx="42" cy="70" r="3" fill="#38bdf8" />
            <circle cx="80" cy="72" r="2.5" fill="#38bdf8" />
          </>
        ) : mood === "happy" || mood === "wow" ? (
          <>
            <ellipse cx="46" cy="56" rx="7" ry={mood === "wow" ? 9 : 5} fill="#1c1406" />
            <ellipse cx="74" cy="56" rx="7" ry={mood === "wow" ? 9 : 5} fill="#1c1406" />
            <circle cx="48" cy="54" r="2" fill="#fff" />
            <circle cx="76" cy="54" r="2" fill="#fff" />
          </>
        ) : mood === "think" ? (
          <>
            <ellipse cx="46" cy="58" rx="6" ry="4" fill="#1c1406" />
            <path d="M68 54 q8 8 14 2" fill="none" stroke="#1c1406" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="46" cy="56" rx="6.5" ry="7" fill="#1c1406" />
            <ellipse cx="74" cy="56" rx="6.5" ry="7" fill="#1c1406" />
            <circle cx="48" cy="54" r="2" fill="#fff" />
            <circle cx="76" cy="54" r="2" fill="#fff" />
          </>
        )}
        {/* mouth */}
        {mood === "happy" && <path d="M46 76 q14 14 28 0" fill="none" stroke="#1c1406" strokeWidth="3.5" strokeLinecap="round" />}
        {mood === "wow" && <ellipse cx="60" cy="80" rx="6" ry="8" fill="#1c1406" />}
        {mood === "sad" && <path d="M48 86 q12 -12 24 0" fill="none" stroke="#1c1406" strokeWidth="3.5" strokeLinecap="round" />}
        {mood === "think" && <path d="M52 80 h16" stroke="#1c1406" strokeWidth="3" strokeLinecap="round" />}
        {mood === "idle" && <path d="M50 78 q10 8 20 0" fill="none" stroke="#1c1406" strokeWidth="3" strokeLinecap="round" />}
        {/* sparkles when happy */}
        {(mood === "happy" || mood === "wow") && (
          <>
            <path className="qm-star" d="M16 28 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3 z" fill="#f5c518" />
            <path className="qm-star" d="M100 22 l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3 z" fill="#fde68a" />
          </>
        )}
      </svg>
      {line && <p className="quiz-mascot-line">{line}</p>}
    </div>
  );
}

export function CartoonProgress({
  items,
}: {
  items: Array<{ name: string; have: number; total: number; emoji: string }>;
}) {
  return (
    <div className="quiz-progress" aria-label="Mission checks">
      {items.map((it) => {
        const pct = it.total ? Math.min(100, (it.have / it.total) * 100) : 0;
        const done = it.have >= it.total && it.total > 0;
        return (
          <div className={`quiz-bar${done ? " done" : ""}`} key={it.name}>
            <div className="quiz-bar-top">
              <span className="quiz-bar-emoji" aria-hidden>{it.emoji}</span>
              <span>{it.name}</span>
              <span className="mono">{it.have}/{it.total}</span>
            </div>
            <svg viewBox="0 0 100 12" className="quiz-bar-svg" aria-hidden>
              <rect x="0" y="1" width="100" height="10" rx="5" fill="rgba(255,255,255,0.1)" />
              <rect x="0" y="1" width={pct} height="10" rx="5" fill={done ? "#22c55e" : "#f5c518"}>
                <animate attributeName="width" from="0" to={String(pct)} dur="0.5s" fill="freeze" />
              </rect>
              {pct > 8 && (
                <circle cx={Math.max(6, pct - 5)} cy="6" r="3" fill="#fff" opacity="0.7" />
              )}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

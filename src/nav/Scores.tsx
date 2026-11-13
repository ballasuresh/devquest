import { useState } from "react";
import { go, href } from "./hash";
import { clearStats, loadStats, type Stats } from "./stats";

function when(at: number) {
  try {
    return new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function Scores() {
  const [stats, setStats] = useState<Stats>(loadStats);

  return (
    <main className="dq-page dq-scores">
      <p className="kicker">Records</p>
      <h1>High Scores</h1>
      <div className="dq-score-grid">
        <div className="dq-stat"><b>{stats.best}</b><span>Best score</span></div>
        <div className="dq-stat"><b>{stats.played}</b><span>Runs</span></div>
        <div className="dq-stat"><b>{stats.kills}</b><span>Total kills</span></div>
      </div>
      {stats.runs.length === 0 ? (
        <p className="lede">No runs yet. Play the arena and your scores will land here.</p>
      ) : (
        <ol className="dq-run-list">
          {stats.runs.map((r, i) => (
            <li key={`${r.at}-${i}`}>
              <strong>{r.score}</strong>
              <span>Wave {r.wave} · {r.kills} kills · {r.xp} XP</span>
              <time>{when(r.at)}</time>
            </li>
          ))}
        </ol>
      )}
      <div className="dq-page-actions">
        <a className="dq-menu-btn primary" href={href("play")} onClick={(e) => { e.preventDefault(); go("play"); }}>Play Arena</a>
        <a className="dq-menu-btn" href={href("title")} onClick={(e) => { e.preventDefault(); go("title"); }}>Home</a>
        {stats.played > 0 && (
          <button className="dq-menu-btn ghost" type="button" onClick={() => { if (confirm("Clear all scores and stats?")) setStats(clearStats()); }}>
            Clear stats
          </button>
        )}
      </div>
    </main>
  );
}

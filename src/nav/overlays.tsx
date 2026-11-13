import { HowToPlay } from "./HowToPlay";
import { Settings } from "./Settings";
import { go } from "./hash";

export type PausePage = "menu" | "settings" | "controls" | "quit";

export type RunStats = { score: number; wave: number; kills: number; xp: number; best: number; isBest?: boolean };

export function PauseOverlay({
  page,
  setPage,
  onResume,
  onRestart,
  onQuit,
}: {
  page: PausePage;
  setPage: (p: PausePage) => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  if (page === "settings") {
    return (
      <div className="dq-overlay" role="dialog" aria-label="Settings">
        <Settings embedded onBack={() => setPage("menu")} />
      </div>
    );
  }
  if (page === "controls") {
    return (
      <div className="dq-overlay" role="dialog" aria-label="Controls">
        <HowToPlay embedded onBack={() => setPage("menu")} />
      </div>
    );
  }
  if (page === "quit") {
    return (
      <div className="dq-overlay" role="dialog" aria-labelledby="dq-quit-title">
        <div className="dq-modal">
          <p className="kicker">Leave run</p>
          <h2 id="dq-quit-title">Quit to title?</h2>
          <p>This run ends. Your last score is kept if you already finished a wave, but the current fight is lost.</p>
          <div className="dq-page-actions">
            <button className="dq-menu-btn primary" type="button" onClick={onQuit}>Quit to Title</button>
            <button className="dq-menu-btn" type="button" onClick={() => setPage("menu")}>Stay</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="dq-overlay" role="dialog" aria-labelledby="dq-pause-title">
      <div className="dq-modal">
        <p className="kicker">Paused</p>
        <h2 id="dq-pause-title">The line holds — for now</h2>
        <ul className="dq-title-actions">
          <li><button className="dq-menu-btn primary" type="button" autoFocus onClick={onResume}>Resume <kbd>Esc</kbd></button></li>
          <li><button className="dq-menu-btn" type="button" onClick={onRestart}>Restart</button></li>
          <li><button className="dq-menu-btn" type="button" onClick={() => setPage("settings")}>Settings</button></li>
          <li><button className="dq-menu-btn" type="button" onClick={() => setPage("controls")}>Controls</button></li>
          <li><button className="dq-menu-btn" type="button" onClick={() => setPage("quit")}>Quit to Title</button></li>
        </ul>
      </div>
    </div>
  );
}

export function GameOverOverlay({ stats, onRestart, onTitle }: { stats: RunStats; onRestart: () => void; onTitle: () => void }) {
  return (
    <div className="dq-overlay" role="dialog" aria-labelledby="dq-over-title">
      <div className="dq-modal">
        <p className="kicker">Run over</p>
        <h2 id="dq-over-title">The Line Broke</h2>
        {stats.isBest && <p className="dq-new-best">New high score</p>}
        <div className="dq-score-grid">
          <div className="dq-stat"><b>{stats.score}</b><span>Score</span></div>
          <div className="dq-stat"><b>{stats.wave}</b><span>Wave</span></div>
          <div className="dq-stat"><b>{stats.kills}</b><span>Kills</span></div>
        </div>
        <p className="fine">Best {stats.best} · {stats.xp} XP this run</p>
        <ul className="dq-title-actions">
          <li><button className="dq-menu-btn primary" type="button" autoFocus onClick={onRestart}>Restart <kbd>R</kbd></button></li>
          <li><button className="dq-menu-btn" type="button" onClick={onTitle}>Home / Title <kbd>Esc</kbd></button></li>
          <li><button className="dq-menu-btn" type="button" onClick={() => go("academy")}>Academy</button></li>
          <li><button className="dq-menu-btn" type="button" onClick={() => go("scores")}>High Scores</button></li>
          <li><button className="dq-menu-btn" type="button" onClick={() => go("settings")}>Settings</button></li>
        </ul>
      </div>
    </div>
  );
}

export function LeaveUpgrade({ onStay, onQuit }: { onStay: () => void; onQuit: () => void }) {
  return (
    <div className="dq-overlay" role="dialog" aria-labelledby="dq-leave-title">
      <div className="dq-modal">
        <p className="kicker">Upgrade</p>
        <h2 id="dq-leave-title">Leave without a pick?</h2>
        <p>Pick a card to keep fighting, or quit this run and return to the title screen.</p>
        <div className="dq-page-actions">
          <button className="dq-menu-btn primary" type="button" autoFocus onClick={onStay}>Back to cards</button>
          <button className="dq-menu-btn" type="button" onClick={onQuit}>Quit to Title</button>
        </div>
      </div>
    </div>
  );
}

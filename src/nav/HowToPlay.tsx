import { go, href } from "./hash";

const ROWS = [
  { action: "Move", keys: "W A S D or Arrow keys", touch: "Left stick", pad: "Left stick" },
  { action: "Aim", keys: "Mouse", touch: "Slash faces your last move", pad: "Right stick (aims slash)" },
  { action: "Slash", keys: "Left click, J, or Space", touch: "SLASH button", pad: "A / South" },
  { action: "Dash", keys: "Shift, K, or Right click", touch: "DASH button", pad: "B / East or LB" },
  { action: "Pause", keys: "Esc", touch: "Pause button", pad: "Start" },
  { action: "Mute", keys: "M (in a run)", touch: "Settings", pad: "—" },
];

export function HowToPlay({ embedded, onBack }: { embedded?: boolean; onBack?: () => void }) {
  return (
    <main className={`dq-page dq-help${embedded ? " embedded" : ""}`}>
      <p className="kicker">Controls</p>
      <h1>How to Play</h1>
      <p className="lede">You are the Line Keeper. Clear waves of stream glitches, pick a upgrade between waves, and break the Freeze Monster on wave 6.</p>
      <div className="dq-help-table" role="table" aria-label="Controls">
        <div className="dq-help-row head" role="row">
          <span>Action</span><span>Keyboard & mouse</span><span>Touch</span>
        </div>
        {ROWS.map((r) => (
          <div className="dq-help-row" role="row" key={r.action}>
            <strong>{r.action}</strong>
            <span>{r.keys}</span>
            <span>{r.touch}</span>
          </div>
        ))}
      </div>
      <ul className="dq-help-tips">
        <li>A three-hit slash chain ends in a wide spin.</li>
        <li>Dash through an attack for a <b>PERFECT</b> bonus — you are invincible during the dash.</li>
        <li>Red circles on the floor are tells. Step out before they slam.</li>
        <li>Between waves, pick one of three upgrades. Your XP and score stay with you.</li>
        <li>Story missions live in the Academy and do not interrupt a run until you quit.</li>
      </ul>
      <div className="dq-page-actions">
        <a className="dq-menu-btn primary" href={href("play")} onClick={(e) => { e.preventDefault(); if (onBack && embedded) { onBack(); return; } go("play"); }}>
          {embedded ? "Back to pause" : "Play Arena"}
        </a>
        {!embedded && (
          <a className="dq-menu-btn" href={href("title")} onClick={(e) => { e.preventDefault(); go("title"); }}>Home</a>
        )}
        {embedded && onBack && (
          <button className="dq-menu-btn" type="button" onClick={onBack}>Back</button>
        )}
      </div>
    </main>
  );
}

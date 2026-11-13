import { useEffect, useState } from "react";
import { go, href } from "./hash";
import { loadPrefs, savePrefs, onPrefs, type Prefs } from "./prefs";

export function Settings({ embedded, onBack }: { embedded?: boolean; onBack?: () => void }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  useEffect(() => onPrefs(setPrefs), []);

  function update(patch: Partial<Prefs>) {
    setPrefs(savePrefs(patch));
  }

  return (
    <main className={`dq-page dq-settings${embedded ? " embedded" : ""}`}>
      <p className="kicker">Options</p>
      <h1>Settings</h1>
      <form className="dq-settings-form" onSubmit={(e) => e.preventDefault()}>
        <label className="dq-toggle">
          <input type="checkbox" checked={!prefs.muted} onChange={(e) => update({ muted: !e.target.checked })} />
          <span>Sound {prefs.muted ? "off" : "on"}</span>
        </label>
        <label className="dq-toggle">
          <input type="checkbox" checked={prefs.music} disabled={prefs.muted} onChange={(e) => update({ music: e.target.checked })} />
          <span>Music {prefs.music ? "on" : "off"}</span>
        </label>
        <label className="dq-slider">
          <span>Volume {Math.round(prefs.volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(prefs.volume * 100)}
            disabled={prefs.muted}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
          />
        </label>
        <label className="dq-toggle">
          <input type="checkbox" checked={prefs.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} />
          <span>Reduced motion {prefs.reducedMotion ? "on" : "off"} — less shake and fewer particles</span>
        </label>
      </form>
      <div className="dq-page-actions">
        {embedded && onBack ? (
          <button className="dq-menu-btn primary" type="button" onClick={onBack}>Back</button>
        ) : (
          <>
            <a className="dq-menu-btn primary" href={href("title")} onClick={(e) => { e.preventDefault(); go("title"); }}>Home</a>
            <a className="dq-menu-btn" href={href("play")} onClick={(e) => { e.preventDefault(); go("play"); }}>Play Arena</a>
          </>
        )}
      </div>
    </main>
  );
}

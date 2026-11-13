import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, type GameHandle, type GameSnap } from "./game";
import { recordRun } from "../nav/stats";
import { GameOverOverlay, LeaveUpgrade, PauseOverlay, type PausePage, type RunStats } from "../nav/overlays";

export function Arena({ onAcademy, onTitle }: { onAcademy: () => void; onTitle: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const game = useRef<GameHandle | null>(null);
  const [snap, setSnap] = useState<GameSnap | null>(null);
  const [page, setPage] = useState<PausePage>("menu");
  const [leave, setLeave] = useState(false);
  const recorded = useRef(false);

  const onState = useCallback((s: GameSnap) => {
    setSnap(s);
    if (s.justDied && !recorded.current) {
      recorded.current = true;
      recordRun({ score: s.score, wave: s.wave, kills: s.kills, xp: s.xp, at: Date.now() });
    }
    if (s.mode === "play" && !s.paused) {
      recorded.current = false;
      setPage("menu");
      setLeave(false);
    }
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = createGame(canvas, { onAcademy, onTitle, onState });
    game.current = g;
    g.begin();
    return () => {
      g.destroy();
      game.current = null;
    };
  }, [onAcademy, onTitle, onState]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const g = game.current;
      const s = g?.getState() ?? snap;
      if (!g || !s) return;
      e.preventDefault();
      e.stopPropagation();
      if (s.mode === "dead") {
        onTitle();
        return;
      }
      if (s.mode === "upgrade") {
        setLeave((v) => !v);
        return;
      }
      if (s.paused) {
        if (page !== "menu") {
          if (page === "quit") setPage("menu");
          else setPage("menu");
          return;
        }
        g.resume();
        return;
      }
      if (s.mode === "play") {
        setPage("menu");
        g.pause();
      }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, [snap, page, onTitle]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const s = game.current?.getState() ?? snap;
      if (!s || s.mode !== "dead") return;
      const k = e.key.toLowerCase();
      if (k === "r" || k === "enter" || k === " ") {
        e.preventDefault();
        recorded.current = false;
        game.current?.restart();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [snap]);

  const over: RunStats | null = snap && snap.mode === "dead" ? {
    score: snap.score, wave: snap.wave, kills: snap.kills, xp: snap.xp, best: snap.best,
    isBest: snap.score >= snap.best && snap.score > 0,
  } : null;

  return (
    <div className="arena-wrap">
      <canvas ref={ref} className="arena-canvas" aria-label="DevQuest action battle" />
      {snap?.mode === "play" && !snap.paused && (
        <button
          className="dq-pause-btn"
          type="button"
          aria-label="Pause"
          onClick={() => { setPage("menu"); game.current?.pause(); }}
        >
          Pause
        </button>
      )}
      {snap?.paused && snap.mode === "play" && (
        <PauseOverlay
          page={page}
          setPage={setPage}
          onResume={() => game.current?.resume()}
          onRestart={() => { recorded.current = false; game.current?.restart(); }}
          onQuit={() => game.current?.quit() ?? onTitle()}
        />
      )}
      {snap?.mode === "upgrade" && leave && (
        <LeaveUpgrade
          onStay={() => setLeave(false)}
          onQuit={() => game.current?.quit() ?? onTitle()}
        />
      )}
      {over && (
        <GameOverOverlay
          stats={over}
          onRestart={() => { recorded.current = false; game.current?.restart(); }}
          onTitle={onTitle}
        />
      )}
    </div>
  );
}

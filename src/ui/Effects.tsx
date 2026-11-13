import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastKind = "xp" | "loot" | "hit" | "info" | "good";

type Toast = { id: number; text: string; kind: ToastKind };
type Loot = { id: number; name: string };

type FxApi = {
  hits: number;
  shake: () => void;
  toast: (text: string, kind?: ToastKind) => void;
  loot: (name: string) => void;
};

const FxCtx = createContext<FxApi | null>(null);

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Effects({ children }: { children: ReactNode }) {
  const [hits, setHits] = useState(0);
  const [shake, setShake] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drops, setDrops] = useState<Loot[]>([]);
  const id = useRef(1);

  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(false), reducedMotion() ? 80 : 280);
    return () => window.clearTimeout(t);
  }, [shake]);

  const api = useMemo<FxApi>(() => ({
    hits,
    shake: () => {
      setHits((n) => n + 1);
      setShake(true);
    },
    toast: (text, kind = "info") => {
      const next: Toast = { id: id.current++, text, kind };
      setToasts((list) => [...list.slice(-4), next]);
      window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== next.id)), 2200);
    },
    loot: (name) => {
      const next: Loot = { id: id.current++, name };
      setDrops((list) => [...list, next]);
      window.setTimeout(() => setDrops((list) => list.filter((t) => t.id !== next.id)), 1600);
    },
  }), [hits]);

  return (
    <FxCtx.Provider value={api}>
      <div className={shake && !reducedMotion() ? "screen-shake" : undefined}>
        {children}
        <div className="fx-toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`fx-toast ${t.kind}`}>{t.text}</div>
          ))}
        </div>
        {drops.map((d) => (
          <div key={d.id} className="fx-loot" role="status">
            <b>Loot</b>
            <span>{d.name}</span>
          </div>
        ))}
      </div>
    </FxCtx.Provider>
  );
}

export function useFx() {
  const ctx = useContext(FxCtx);
  if (!ctx) throw new Error("fx");
  return ctx;
}

export function useOptionalFx() {
  return useContext(FxCtx);
}

/** Stable callback identity helper for joystick move vectors. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return useCallback(() => ref.current, []);
}

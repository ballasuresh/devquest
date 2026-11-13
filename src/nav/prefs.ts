const KEY = "dq-prefs-v1";
export const PREFS_EVENT = "dq-prefs";

export type Prefs = {
  muted: boolean;
  music: boolean;
  volume: number;
  reducedMotion: boolean;
};

const defaults = (): Prefs => {
  const motion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return { muted: false, music: true, volume: 0.7, reducedMotion: motion };
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = { ...defaults(), ...JSON.parse(raw) } as Prefs;
    parsed.volume = Math.max(0, Math.min(1, Number(parsed.volume) || 0.7));
    return parsed;
  } catch {
    return defaults();
  }
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...loadPrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: next }));
  return next;
}

export function onPrefs(fn: (p: Prefs) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<Prefs>).detail ?? loadPrefs());
  window.addEventListener(PREFS_EVENT, handler);
  return () => window.removeEventListener(PREFS_EVENT, handler);
}

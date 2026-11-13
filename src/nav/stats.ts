const KEY = "dq-action-stats-v1";
const OLD = "dq-action-best";

export type Run = { score: number; wave: number; kills: number; xp: number; at: number };

export type Stats = {
  best: number;
  runs: Run[];
  played: number;
  kills: number;
};

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Stats;
      return { best: p.best || 0, runs: p.runs || [], played: p.played || 0, kills: p.kills || 0 };
    }
    const old = Number(localStorage.getItem(OLD) || 0) || 0;
    return { best: old, runs: [], played: 0, kills: 0 };
  } catch {
    return { best: 0, runs: [], played: 0, kills: 0 };
  }
}

export function recordRun(run: Run): Stats {
  const cur = loadStats();
  const runs = [run, ...cur.runs].slice(0, 20);
  const next: Stats = {
    best: Math.max(cur.best, run.score),
    runs,
    played: cur.played + 1,
    kills: cur.kills + run.kills,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    localStorage.setItem(OLD, String(next.best));
  } catch { /* ignore */ }
  return next;
}

export function clearStats(): Stats {
  const empty: Stats = { best: 0, runs: [], played: 0, kills: 0 };
  try {
    localStorage.setItem(KEY, JSON.stringify(empty));
    localStorage.setItem(OLD, "0");
  } catch { /* ignore */ }
  return empty;
}

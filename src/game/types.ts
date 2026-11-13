export type Difficulty = "micro" | "guided" | "ranked";
export type Rank = "Bronze" | "Silver" | "Gold";

export type RoundResult = {
  attempts: number;
  timeMs: number;
  heartsLost: number;
  streakBest: number;
};

export type Reward = { xp: number; coins: number; badge?: string };

export type BattleTune = {
  hearts: number;
  timeMs: number;
  hints: boolean;
  xpMul: number;
};

export const TUNING: Record<Difficulty, BattleTune> = {
  micro: { hearts: 5, timeMs: 180_000, hints: true, xpMul: 1 },
  guided: { hearts: 3, timeMs: 90_000, hints: true, xpMul: 1.25 },
  ranked: { hearts: 3, timeMs: 45_000, hints: false, xpMul: 1.75 },
};

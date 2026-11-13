import type { Difficulty, Rank, Reward, RoundResult } from "./types";

export function rankFromAttempts(attempts: number): Rank {
  if (attempts <= 1) return "Gold";
  if (attempts === 2) return "Silver";
  return "Bronze";
}

export function rewardFor(result: RoundResult, difficulty: Difficulty): Reward {
  const base = difficulty === "ranked" ? 40 : difficulty === "guided" ? 28 : 18;
  const streak = Math.min(20, result.streakBest * 2);
  const timeBonus = result.timeMs < 60_000 ? 8 : result.timeMs < 120_000 ? 4 : 0;
  const heartTax = result.heartsLost * 2;
  const xp = Math.max(8, base + streak + timeBonus - heartTax);
  const coins = Math.max(4, Math.round(xp / 2) + (result.attempts === 1 ? 6 : 0));
  const badge = result.attempts <= 1 ? "Ember Thread" : result.attempts === 2 ? "Amber Filament" : "Line Badge";
  return { xp, coins, badge };
}

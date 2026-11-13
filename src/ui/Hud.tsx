import type { Rank } from "../game/types";

export function Hud(props: {
  hearts: number;
  maxHearts: number;
  xp: number;
  xpMax?: number;
  rank: Rank;
  packetLoss: number;
  objective: string;
  timeLeftMs: number;
  streak?: number;
  coins?: number;
  showTimer?: boolean;
}) {
  const secs = Math.max(0, Math.ceil(props.timeLeftMs / 1000));
  const urgent = props.showTimer !== false && secs <= 10;
  const xpMax = props.xpMax ?? 100;
  const xpPct = Math.max(0, Math.min(100, (props.xp / xpMax) * 100));
  const hearts = Array.from({ length: props.maxHearts }, (_, i) => i < props.hearts);
  return (
    <div className="hud2" role="region" aria-label="Battle HUD">
      <div className="hud2-left">
        <div className="hud2-hearts" aria-label={`${props.hearts} of ${props.maxHearts} hearts`}>
          {hearts.map((on, i) => (
            <span key={i} className={on ? "on" : ""} aria-hidden>
              {on ? "♥" : "♡"}
            </span>
          ))}
        </div>
        <div className={`hud2-rank rank-${props.rank.toLowerCase()}`}>{props.rank}</div>
        {props.coins !== undefined && <div className="hud2-coins" aria-label={`${props.coins} coins`}>{props.coins}¢</div>}
      </div>
      <div className="hud2-mid">
        <div className="hud2-objective">{props.objective}</div>
        <div className="hud2-xp" aria-label={`${props.xp} XP`}>
          <i style={{ width: `${xpPct}%` }} />
        </div>
      </div>
      <div className="hud2-right">
        {props.streak ? <div className="hud2-streak" aria-label={`streak ${props.streak}`}>×{props.streak}</div> : null}
        {props.showTimer !== false && (
          <div className={`hud2-timer${urgent ? " urgent" : ""}`} aria-label={`${secs} seconds left`}>
            {secs}s
          </div>
        )}
        <div className="hud2-loss" aria-label={`packet loss ${props.packetLoss}%`}>
          <b>LOSS</b>
          <span>{props.packetLoss}%</span>
        </div>
      </div>
    </div>
  );
}

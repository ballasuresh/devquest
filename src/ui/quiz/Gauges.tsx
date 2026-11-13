import "./quiz.css";
export function ThermoGauge({ value, min = 0, max = 2, ok }: { value: number; min?: number; max?: number; ok: boolean }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const h = 90 * pct;
  const color = value >= 1.2 ? "#ef4444" : ok ? "#22c55e" : "#f59e0b";
  return (
    <div className={`quiz-gauge${ok ? " ok" : ""}`} aria-label={`Temperature ${value.toFixed(1)}`}>
      <svg viewBox="0 0 64 140" width="64" height="140">
        <rect x="22" y="8" width="20" height="100" rx="10" fill="#0b1020" stroke="#374151" strokeWidth="3" />
        <rect x="25" y={105 - h} width="14" height={h} rx="7" fill={color} />
        <circle cx="32" cy="118" r="16" fill={color} stroke="#1c1406" strokeWidth="3" />
        <text x="32" y="123" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1c1406">{value.toFixed(1)}</text>
        <text x="48" y="28" fontSize="9" fill="#ef4444">hot</text>
        <text x="48" y="95" fontSize="9" fill="#22d3ee">cool</text>
      </svg>
      <span>{ok ? "🌡️ in band" : "🌡️ tune me"}</span>
    </div>
  );
}

export function BucketGauge({ value, min = 4, max = 20, ok }: { value: number; min?: number; max?: number; ok: boolean }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const fillH = 70 * pct;
  return (
    <div className={`quiz-gauge${ok ? " ok" : ""}`} aria-label={`Max tokens ${value}`}>
      <svg viewBox="0 0 80 130" width="80" height="130">
        <path d="M16 20 h48 l8 80 h-64 z" fill="#0b1020" stroke="#374151" strokeWidth="3" />
        <path d={`M22 ${96 - fillH} L58 ${96 - fillH * 0.95} L62 96 H18 z`} fill={ok ? "#22c55e" : "#f5c518"} />
        <ellipse cx="40" cy={96 - fillH} rx={18 + pct * 2} ry="5" fill={ok ? "#86efac" : "#fde68a"} />
        <text x="40" y="118" textAnchor="middle" fontSize="14" fontWeight="800" fill="currentColor">{value}</text>
      </svg>
      <span>{ok ? "🪣 enough room" : "🪣 will cut the thought"}</span>
    </div>
  );
}

export function SignalLight({ reason }: { reason: string }) {
  const stop = reason === "stop";
  return (
    <div className={`quiz-gauge${stop ? " ok" : ""}`} aria-label={`finish_reason ${reason}`}>
      <svg viewBox="0 0 70 140" width="70" height="140">
        <rect x="16" y="8" width="38" height="104" rx="12" fill="#111827" stroke="#374151" strokeWidth="3" />
        <circle cx="35" cy="32" r="12" fill={stop ? "#14532d" : "#ef4444"} opacity={stop ? 0.35 : 1} />
        <circle cx="35" cy="60" r="12" fill={!stop ? "#f59e0b" : "#713f12"} opacity={!stop ? 1 : 0.35} />
        <circle cx="35" cy="88" r="12" fill={stop ? "#22c55e" : "#14532d"} opacity={stop ? 1 : 0.35} />
        <text x="35" y="132" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">{reason}</text>
      </svg>
      <span>{stop ? "🚦 stop — done" : "🚦 length — cut short"}</span>
    </div>
  );
}

export function StreamGraph({ words, wild }: { words: string[]; wild: boolean }) {
  const n = words.length;
  return (
    <div className="quiz-stream-graph" aria-hidden>
      <svg viewBox={`0 0 ${Math.max(20, n * 28 + 16)} 64`} width="100%" height="72" preserveAspectRatio="xMidYMid meet">
        {words.map((w, i) => {
          const h = 16 + (w.length % 5) * 6 + (wild ? 10 : 0);
          return (
            <g key={`${w}-${i}`} transform={`translate(${8 + i * 28}, 0)`}>
              <rect x="2" y={56 - h} width="22" height={h} rx="6" fill={wild ? "#fb923c" : "#7c3aed"}>
                <animate attributeName="y" from="56" to={String(56 - h)} dur="0.35s" begin={`${i * 0.05}s`} fill="freeze" />
                <animate attributeName="height" from="0" to={String(h)} dur="0.35s" begin={`${i * 0.05}s`} fill="freeze" />
              </rect>
              <text x="13" y="62" textAnchor="middle" fontSize="7" fill="currentColor">{i + 1}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

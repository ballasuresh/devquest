import { useEffect, useId, useRef, useState } from "react";
import { asChoices, emojiFor } from "./emojis";
import "./quiz.css";

export type Choice = { emoji: string; label: string };

export function EmojiAnswers(props: {
  choices: Array<string | Choice>;
  onPick: (index: number) => boolean | void;
  disabled?: boolean;
  locked?: boolean;
  value?: number;
  name?: string;
  hotkeys?: boolean;
}) {
  const choices: Choice[] = props.choices.map((c) => (typeof c === "string" ? { emoji: emojiFor(c), label: c } : c));
  const [picked, setPicked] = useState<number | null>(props.value !== undefined && props.value >= 0 ? props.value : null);
  const [verdict, setVerdict] = useState<"good" | "bad" | "">("");
  const [burst, setBurst] = useState(0);
  const [busy, setBusy] = useState(false);
  const labelId = useId();
  const valueRef = useRef(props.value);
  valueRef.current = props.value;
  const hotkeys = props.hotkeys !== false;

  useEffect(() => {
    if (props.value !== undefined) setPicked(props.value >= 0 ? props.value : null);
  }, [props.value]);

  useEffect(() => {
    if (!hotkeys) return;
    function onKey(e: KeyboardEvent) {
      if (props.disabled || props.locked || busy) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const n = e.key >= "1" && e.key <= "6" ? Number(e.key) - 1 : -1;
      if (n < 0 || n >= choices.length) return;
      e.preventDefault();
      pick(n);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function pick(index: number) {
    if (props.disabled || props.locked || busy) return;
    const result = props.onPick(index);
    setPicked(index);
    if (result === true) {
      setVerdict("good");
      setBurst((n) => n + 1);
    } else if (result === false) {
      setBusy(true);
      setVerdict("bad");
      window.setTimeout(() => {
        setVerdict("");
        setBusy(false);
        if (valueRef.current === undefined || valueRef.current < 0) setPicked(null);
      }, 700);
    }
  }

  return (
    <div className={`emoji-q${verdict === "bad" ? " is-wrong" : ""}${verdict === "good" ? " is-right" : ""}`} role="group" aria-labelledby={props.name ? labelId : undefined}>
      {props.name && <span id={labelId} className="sr-only">{props.name}</span>}
      {verdict === "good" && <ConfettiBurst key={burst} />}
      <div className={`emoji-grid cols-${Math.min(4, Math.max(2, choices.length))}`}>
        {choices.map((c, i) => {
          const on = picked === i;
          const cls = on && verdict === "good" ? "good" : on && verdict === "bad" ? "bad" : on ? "on" : "";
          return (
            <button
              key={`${c.label}-${i}`}
              type="button"
              className={`emoji-card ${cls}`}
              disabled={Boolean(props.disabled || props.locked)}
              onClick={() => pick(i)}
              aria-pressed={on}
            >
              <span className="emoji-face" aria-hidden>{c.emoji}</span>
              <span className="emoji-label">{c.label}</span>
              {hotkeys && <kbd className="emoji-key">{i + 1}</kbd>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfettiBurst() {
  const bits = Array.from({ length: 18 }, (_, i) => i);
  const colors = ["#f5c518", "#7c3aed", "#22c55e", "#ef4444", "#22d3ee", "#fb923c"];
  return (
    <div className="emoji-confetti" aria-hidden>
      {bits.map((i) => (
        <i
          key={i}
          style={{
            left: `${6 + ((i * 5.2) % 88)}%`,
            animationDelay: `${(i % 7) * 40}ms`,
            background: colors[i % colors.length],
          }}
        />
      ))}
    </div>
  );
}

export function asEmojiChoices(labels: string[]) {
  return asChoices(labels);
}

# Afterfault 3.5 Battle UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a PUBG/FreeFire-feel **2D Ultra UI + Movement Hub** experience and a fully playable Mission 3.5 stage flow (Discovery→Mastery) with HUD, hearts, timer, rewards, checkpoints, and a tested “Line Keeper” stream assembler.

**Architecture:** Keep React/Vite. Add a small `src/game/*` domain (pure logic + state machine) used by React screens. Keep visuals CSS-first (particles/shake via CSS + minimal JS). Persist progress via existing `src/store.tsx` + `src/api.ts` (theme/progress) and localStorage.

**Tech Stack:** React 19, Vite, TypeScript, CSS, **Vitest** (unit tests for pure game logic), existing Node API server.

---

## File structure (new + modified)

**Create**
- `src/game/types.ts` — shared game types (difficulty, rank, rewards)
- `src/game/rank.ts` — rank computation
- `src/game/checkpoints.ts` — checkpoint model + transitions
- `src/game/lineKeeper.ts` — stream assembly logic (pure)
- `src/game/mission35.ts` — Mission 3.5 state machine + tuning per difficulty
- `src/ui/Hud.tsx` — HUD overlay (HP/XP/rank/timer/packet loss/objective)
- `src/ui/Effects.tsx` — shake + toast + loot pop orchestrator
- `src/ui/Joystick.tsx` — mobile joystick control (touch)
- `src/ui/WorldHub.tsx` — movement hub wrapper (WASD + joystick + “E interact”)
- `src/ui/afterfault/Mission35.tsx` — mission shell + stage screens
- `src/ui/afterfault/stages/Discovery.tsx`
- `src/ui/afterfault/stages/Explore.tsx`
- `src/ui/afterfault/stages/Assign.tsx`
- `src/ui/afterfault/stages/Predictions.tsx`
- `src/ui/afterfault/stages/CodeCraft.tsx`
- `src/ui/afterfault/stages/DebugBoss.tsx`
- `src/ui/afterfault/stages/Mastery.tsx`
- `test/lineKeeper.test.ts` — unit tests
- `test/rank.test.ts` — unit tests

**Modify**
- `src/store.tsx` — add game/session state + actions
- `src/App.tsx` — route to new WorldHub + Mission35 shell (or gate behind a flag)
- `src/styles.css` — new “Ultra UI” HUD styles + effects primitives
- `package.json` — add test scripts + Vitest deps

---

### Task 1: Add Vitest test runner (TS-friendly unit tests)

**Files:**
- Modify: `C:\Users\user\Desktop\Devquest\package.json`
- Create: `C:\Users\user\Desktop\Devquest\vite.test.config.ts`

- [ ] **Step 1: Edit `package.json` to add test scripts and dev deps**

Add to `devDependencies` (versions can be latest compatible):

```json
{
  "devDependencies": {
    "vitest": "^3.2.0",
    "@vitest/coverage-v8": "^3.2.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Create `vite.test.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

- [ ] **Step 3: Install deps**

Run: `npm i -D vitest @vitest/coverage-v8`  
Expected: packages installed, no errors.

- [ ] **Step 4: Run tests (should be zero tests, but runner works)**

Run: `npm test`  
Expected: “No test files found” (or 0 tests) and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.test.config.ts
git commit -m "chore(test): add vitest"
```

---

### Task 2: Implement rank rules + tests (Bronze/Silver/Gold)

**Files:**
- Create: `C:\Users\user\Desktop\Devquest\src\game\types.ts`
- Create: `C:\Users\user\Desktop\Devquest\src\game\rank.ts`
- Test: `C:\Users\user\Desktop\Devquest\test\rank.test.ts`

- [ ] **Step 1: Create `src/game/types.ts`**

```ts
export type Difficulty = "micro" | "guided" | "ranked";
export type Rank = "Bronze" | "Silver" | "Gold";

export type RoundResult = {
  attempts: number; // how many tries for the stage set / mastery
  timeMs: number;
  heartsLost: number;
  streakBest: number;
};

export type Reward = { xp: number; coins: number; badge?: string };
```

- [ ] **Step 2: Create `src/game/rank.ts`**

```ts
import type { Rank } from "./types";

export function rankFromAttempts(attempts: number): Rank {
  if (attempts <= 1) return "Gold";
  if (attempts === 2) return "Silver";
  return "Bronze";
}
```

- [ ] **Step 3: Write failing tests `test/rank.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { rankFromAttempts } from "../src/game/rank";

describe("rankFromAttempts", () => {
  it("Gold on first try", () => {
    expect(rankFromAttempts(1)).toBe("Gold");
  });

  it("Silver on second try", () => {
    expect(rankFromAttempts(2)).toBe("Silver");
  });

  it("Bronze on 3+ tries", () => {
    expect(rankFromAttempts(3)).toBe("Bronze");
    expect(rankFromAttempts(9)).toBe("Bronze");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/rank.ts test/rank.test.ts
git commit -m "feat(game): add rank rules"
```

---

### Task 3: Implement Line Keeper (stream assembler) + tests

**Files:**
- Create: `C:\Users\user\Desktop\Devquest\src\game\lineKeeper.ts`
- Test: `C:\Users\user\Desktop\Devquest\test\lineKeeper.test.ts`

- [ ] **Step 1: Create `src/game/lineKeeper.ts`**

```ts
export type StreamChunk = {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type LineKeeperOut = {
  text: string;
  pieces: number;
  finishReason: string;
  usage: { prompt: number; completion: number; total: number } | null;
};

export function keepLine(chunks: StreamChunk[]): LineKeeperOut {
  const parts: string[] = [];
  let pieces = 0;
  let finishReason = "";
  let usage: LineKeeperOut["usage"] = null;

  for (const chunk of chunks) {
    if (chunk.usage) {
      usage = {
        prompt: chunk.usage.prompt_tokens ?? 0,
        completion: chunk.usage.completion_tokens ?? 0,
        total: chunk.usage.total_tokens ?? 0,
      };
    }
    const first = chunk.choices?.[0];
    if (!first) continue;
    const delta = first.delta?.content ?? "";
    const fr = first.finish_reason ?? "";
    if (delta) {
      parts.push(delta);
      pieces += 1;
    }
    if (fr) finishReason = fr;
  }

  return { text: parts.join(""), pieces, finishReason: finishReason || "unknown", usage };
}
```

- [ ] **Step 2: Write tests `test/lineKeeper.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { keepLine, type StreamChunk } from "../src/game/lineKeeper";

describe("keepLine", () => {
  it("assembles deltas in order and captures finish_reason", () => {
    const chunks: StreamChunk[] = [
      { choices: [{ delta: { content: "Your order " }, finish_reason: null }] },
      { choices: [{ delta: { content: "is on the " }, finish_reason: null }] },
      { choices: [{ delta: { content: "way." }, finish_reason: "stop" }] },
    ];
    const out = keepLine(chunks);
    expect(out.text).toBe("Your order is on the way.");
    expect(out.pieces).toBe(3);
    expect(out.finishReason).toBe("stop");
  });

  it("ignores chunks with no choices", () => {
    const out = keepLine([{ usage: { total_tokens: 19 } }]);
    expect(out.text).toBe("");
    expect(out.pieces).toBe(0);
    expect(out.finishReason).toBe("unknown");
    expect(out.usage?.total).toBe(19);
  });

  it("captures usage even if it arrives late", () => {
    const chunks: StreamChunk[] = [
      { choices: [{ delta: { content: "Hi" }, finish_reason: null }] },
      { usage: { prompt_tokens: 2, completion_tokens: 7, total_tokens: 9 } },
      { choices: [{ delta: { content: "!" }, finish_reason: "stop" }] },
    ];
    const out = keepLine(chunks);
    expect(out.usage).toEqual({ prompt: 2, completion: 7, total: 9 });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/game/lineKeeper.ts test/lineKeeper.test.ts
git commit -m "feat(game): add line keeper stream assembler"
```

---

### Task 4: Add mission/game session state to `src/store.tsx`

**Files:**
- Modify: `C:\Users\user\Desktop\Devquest\src\store.tsx`

- [ ] **Step 1: Add types + initial state**

Add (near existing save state) a session model:

```ts
type BattleSession = {
  difficulty: "micro" | "guided" | "ranked";
  hearts: number;
  packetLoss: number; // 0..100
  streak: number;
  bestStreak: number;
  checkpoint: number; // stage index 0..6
  coins: number;
};

const freshSession = (): BattleSession => ({
  difficulty: "guided",
  hearts: 3,
  packetLoss: 0,
  streak: 0,
  bestStreak: 0,
  checkpoint: 0,
  coins: 0,
});
```

- [ ] **Step 2: Add actions**

```ts
function hit(state: BattleSession): BattleSession {
  const hearts = Math.max(0, state.hearts - 1);
  return { ...state, hearts, streak: 0, packetLoss: Math.min(100, state.packetLoss + 12) };
}

function heal(state: BattleSession): BattleSession {
  return { ...state, packetLoss: Math.max(0, state.packetLoss - 6) };
}
```

- [ ] **Step 3: Wire into provider value**

Expose:
- `session`
- `setDifficulty(d)`
- `damage()`
- `checkpoint(stageIndex)`
- `resetSession()`

- [ ] **Step 4: Manual verify in dev**

Run: `npm run dev` and ensure app still loads.

- [ ] **Step 5: Commit**

```bash
git add src/store.tsx
git commit -m "feat(game): add battle session state"
```

---

### Task 5: Add HUD + effects primitives

**Files:**
- Create: `C:\Users\user\Desktop\Devquest\src\ui\Hud.tsx`
- Create: `C:\Users\user\Desktop\Devquest\src\ui\Effects.tsx`
- Modify: `C:\Users\user\Desktop\Devquest\src\styles.css`

- [ ] **Step 1: Create `src/ui/Hud.tsx`**

```tsx
import type { Rank } from "../game/types";

export function Hud(props: {
  hearts: number;
  xp: number;
  rank: Rank;
  packetLoss: number;
  objective: string;
  timeLeftMs: number;
}) {
  const secs = Math.max(0, Math.ceil(props.timeLeftMs / 1000));
  return (
    <div className="hud2">
      <div className="hud2-left">
        <div className="hud2-hearts" aria-label={`${props.hearts} hearts`}>
          {[0,1,2].map((i) => <span key={i} className={i < props.hearts ? "on" : ""}>♥</span>)}
        </div>
        <div className="hud2-rank">{props.rank}</div>
      </div>
      <div className="hud2-mid">
        <div className="hud2-objective">{props.objective}</div>
        <div className="hud2-xp"><i style={{ width: `${Math.min(100, props.xp)}%` }} /></div>
      </div>
      <div className="hud2-right">
        <div className="hud2-timer">{secs}s</div>
        <div className="hud2-loss" aria-label={`packet loss ${props.packetLoss}%`}>
          <b>LOSS</b><span>{props.packetLoss}%</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS in `src/styles.css`**

```css
.hud2{
  position: fixed; left: 12px; right: 12px; top: 12px;
  display: grid; grid-template-columns: 1fr 2fr 1fr;
  gap: 10px; align-items: center; z-index: 50;
  padding: 10px 12px; border-radius: 16px;
  background: rgba(8,10,16,.72); border: 1px solid rgba(255,255,255,.14);
  backdrop-filter: blur(10px);
}
.hud2-hearts{display:flex;gap:6px;font-size:18px;color:rgba(255,255,255,.28)}
.hud2-hearts .on{color:#ef4444;text-shadow:0 0 10px rgba(239,68,68,.6)}
.hud2-rank{font-family:var(--serif);font-size:18px;color:#f5c518}
.hud2-objective{font-weight:700;color:#fff}
.hud2-xp{height:10px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.hud2-xp i{display:block;height:100%;background:linear-gradient(90deg,#7c3aed,#f5c518)}
.hud2-timer{justify-self:end;font-weight:800;color:#fff}
.hud2-loss{justify-self:end;display:flex;gap:8px;align-items:baseline}
.hud2-loss b{letter-spacing:.14em;font-size:11px;color:#a1a1aa}
.hud2-loss span{font-weight:800;color:#f59e0b}
```

- [ ] **Step 3: Create `src/ui/Effects.tsx` (shake wrapper)**

```tsx
import { useEffect, useState } from "react";

export function Effects({ hit, children }: { hit: number; children: React.ReactNode }) {
  const [shake, setShake] = useState(false);
  useEffect(() => {
    if (!hit) return;
    setShake(true);
    const t = window.setTimeout(() => setShake(false), 260);
    return () => window.clearTimeout(t);
  }, [hit]);
  return <div className={shake ? "screen-shake" : ""}>{children}</div>;
}
```

Add CSS:

```css
.screen-shake{animation:screenShake .26s linear}
@keyframes screenShake{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
```

- [ ] **Step 4: Manual verify**

Mount `Hud` in an existing page temporarily and confirm it renders on top.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Hud.tsx src/ui/Effects.tsx src/styles.css
git commit -m "feat(ui): add battle HUD and effects primitives"
```

---

### Task 6: Implement Movement Hub (WASD + mobile joystick + E interact)

**Files:**
- Create: `C:\Users\user\Desktop\Devquest\src\ui\Joystick.tsx`
- Create: `C:\Users\user\Desktop\Devquest\src\ui\WorldHub.tsx`
- Modify: `C:\Users\user\Desktop\Devquest\src\App.tsx`

- [ ] **Step 1: Create `src/ui/Joystick.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";

export function Joystick({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function up() { setDrag(false); setPos({ x: 0, y: 0 }); onMove(0,0); }
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [onMove]);

  return (
    <div className="joy" ref={ref}
      onPointerDown={(e) => { setDrag(true); (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        if (!drag) return;
        const box = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (box.width / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (box.height / 2)));
        setPos({ x: dx * 18, y: dy * 18 });
        onMove(dx, dy);
      }}
    >
      <i style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />
    </div>
  );
}
```

- [ ] **Step 2: Add minimal CSS**

```css
.joy{position:fixed;left:16px;bottom:16px;width:110px;height:110px;border-radius:999px;
background:rgba(8,10,16,.55);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px);z-index:60}
.joy i{position:absolute;left:50%;top:50%;width:54px;height:54px;border-radius:999px;
transform:translate(-50%,-50%);background:rgba(245,197,24,.9);box-shadow:0 0 18px rgba(245,197,24,.45)}
```

- [ ] **Step 3: Create `src/ui/WorldHub.tsx` (simple pawn + mission radius)**

```tsx
import { useEffect, useMemo, useState } from "react";
import { Joystick } from "./Joystick";

type Node = { id: string; x: number; y: number; label: string };

const NODES: Node[] = [
  { id: "m35", x: 62, y: 48, label: "3.5 Unfinished Line" },
];

export function WorldHub({ onEnter35 }: { onEnter35: () => void }) {
  const [p, setP] = useState({ x: 52, y: 72 }); // percent coords
  const [v, setV] = useState({ x: 0, y: 0 }); // -1..1

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setP((cur) => ({ x: Math.max(4, Math.min(96, cur.x + v.x * 0.35)), y: Math.max(8, Math.min(92, cur.y + v.y * 0.35)) }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v.x, v.y]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        if (near35) onEnter35();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  });

  const near35 = useMemo(() => {
    const n = NODES[0];
    const dx = p.x - n.x;
    const dy = p.y - n.y;
    return Math.hypot(dx, dy) < 9;
  }, [p.x, p.y]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = { x: 0, y: 0 };
      if (e.type === "keydown") {
        if (e.key === "ArrowLeft" || e.key === "a") d.x = -1;
        if (e.key === "ArrowRight" || e.key === "d") d.x = 1;
        if (e.key === "ArrowUp" || e.key === "w") d.y = -1;
        if (e.key === "ArrowDown" || e.key === "s") d.y = 1;
        setV((cur) => ({ x: cur.x || d.x, y: cur.y || d.y }));
      } else {
        if (["ArrowLeft","ArrowRight","a","d"].includes(e.key)) setV((cur) => ({ ...cur, x: 0 }));
        if (["ArrowUp","ArrowDown","w","s"].includes(e.key)) setV((cur) => ({ ...cur, y: 0 }));
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("keyup", key); };
  }, []);

  return (
    <div className="hub">
      <div className="hub-map">
        <button className={`hub-node ${near35 ? "near" : ""}`} style={{ left: `${NODES[0].x}%`, top: `${NODES[0].y}%` }} onClick={onEnter35}>
          {NODES[0].label}
        </button>
        <div className="hub-pawn" style={{ left: `${p.x}%`, top: `${p.y}%` }} />
        {near35 && <div className="hub-prompt">E • Enter</div>}
      </div>
      <Joystick onMove={(dx, dy) => setV({ x: dx, y: dy })} />
    </div>
  );
}
```

- [ ] **Step 4: Add CSS**

```css
.hub{min-height:100vh;background:radial-gradient(900px 420px at 0% -10%, rgba(124,58,237,.22), transparent 55%), #07080c}
.hub-map{position:relative;width:min(1100px, calc(100% - 32px));height:min(640px, 70vh);margin:72px auto 0;border-radius:24px;
border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.35)), url('/art/port-day.jpg') center/cover no-repeat;overflow:hidden}
.hub-node{position:absolute;transform:translate(-50%,-50%);padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.22);
background:rgba(8,10,16,.72);color:#fff;font-weight:800}
.hub-node.near{box-shadow:0 0 0 6px rgba(245,197,24,.22);border-color:#f5c518}
.hub-pawn{position:absolute;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#f5c518;box-shadow:0 0 18px rgba(245,197,24,.55)}
.hub-prompt{position:absolute;left:16px;bottom:16px;background:rgba(8,10,16,.72);border:1px solid rgba(245,197,24,.55);
color:#fff;border-radius:14px;padding:8px 12px;font-weight:800}
```

- [ ] **Step 5: Wire to `src/App.tsx`**

Replace `return <Isles />;` with a simple router gate:

```tsx
import { useState } from "react";
import { WorldHub } from "./ui/WorldHub";
import { Mission35 } from "./ui/afterfault/Mission35";

export function App() {
  const [view, setView] = useState<"hub" | "m35">("hub");
  return view === "hub" ? <WorldHub onEnter35={() => setView("m35")} /> : <Mission35 onExit={() => setView("hub")} />;
}
```

- [ ] **Step 6: Manual verify**

Run: `npm run dev` and verify:
- WASD moves pawn
- Joystick moves pawn on mouse/touch
- Near node shows “E Enter”
- Press E enters mission

- [ ] **Step 7: Commit**

```bash
git add src/ui/Joystick.tsx src/ui/WorldHub.tsx src/App.tsx src/styles.css
git commit -m "feat(hub): add movement hub with joystick and interact"
```

---

### Task 7: Implement Mission 3.5 shell + stage progression (gamified)

**Files:**
- Create: `src/ui/afterfault/Mission35.tsx`
- Create: `src/ui/afterfault/stages/*` (7 files)

- [ ] **Step 1: Create `src/ui/afterfault/Mission35.tsx`**

```tsx
import { useMemo, useState } from "react";
import { Hud } from "../../ui/Hud";
import { Effects } from "../../ui/Effects";
import { rankFromAttempts } from "../../game/rank";
import { Discovery } from "./stages/Discovery";
import { Explore } from "./stages/Explore";
import { Assign } from "./stages/Assign";
import { Predictions } from "./stages/Predictions";
import { CodeCraft } from "./stages/CodeCraft";
import { DebugBoss } from "./stages/DebugBoss";
import { Mastery } from "./stages/Mastery";

const STAGES = ["Discovery","Explore","Assign","Predictions","Code","Debug","Mastery"] as const;
type StageId = (typeof STAGES)[number];

export function Mission35({ onExit }: { onExit: () => void }) {
  const [stage, setStage] = useState<StageId>("Discovery");
  const [hearts, setHearts] = useState(3);
  const [hit, setHit] = useState(0);
  const [xp, setXp] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const rank = useMemo(() => rankFromAttempts(attempts), [attempts]);

  const damage = () => { setHit((n) => n + 1); setHearts((h) => Math.max(0, h - 1)); setPacketLoss((p) => Math.min(100, p + 12)); };
  const reward = (n = 8) => setXp((x) => Math.min(100, x + n));

  const common = { damage, reward, next: (to: StageId) => setStage(to) };

  return (
    <Effects hit={hit}>
      <Hud hearts={hearts} xp={xp} rank={rank} packetLoss={packetLoss} objective={`3.5 • ${stage}`} timeLeftMs={120000} />
      <div className="m35">
        <button className="btn ghost" onClick={onExit}>← Hub</button>
        {stage === "Discovery" && <Discovery {...common} />}
        {stage === "Explore" && <Explore {...common} />}
        {stage === "Assign" && <Assign {...common} />}
        {stage === "Predictions" && <Predictions {...common} />}
        {stage === "Code" && <CodeCraft {...common} />}
        {stage === "Debug" && <DebugBoss {...common} />}
        {stage === "Mastery" && <Mastery {...common} />}
      </div>
    </Effects>
  );
}
```

- [ ] **Step 2: Create one stage (Discovery) and wire “wrong = damage, right = reward + next”**

`src/ui/afterfault/stages/Discovery.tsx`

```tsx
export function Discovery(props: { damage: () => void; reward: () => void; next: (id: any) => void }) {
  return (
    <div className="card" style={{ width: "min(980px, calc(100% - 32px))", margin: "90px auto" }}>
      <p className="kicker">Drop Zone</p>
      <h2>The Unfinished Line</h2>
      <p className="muted">Chats freeze mid-sentence. Ops says all green. Identify the failure type.</p>
      <div className="grid-3">
        <button className="choice" onClick={() => props.damage()}>Server down (500)</button>
        <button className="choice good" onClick={() => { props.reward(); props.next("Explore"); }}>Stream stopped early / partial chunks</button>
        <button className="choice" onClick={() => props.damage()}>Bad JSON body</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create remaining stages as MVP mini-games (same pattern)**

Implement each stage with:
- a simple interactive objective
- a clear win button path
- a wrong path that calls `damage()`

Stages:
- Explore: assemble 3 deltas in order
- Assign: pick “Assembler”
- Predictions: pick correct finish_reason
- CodeCraft: run Line Keeper sample
- DebugBoss: survive 3 waves
- Mastery: one-shot quiz, show rank card

- [ ] **Step 4: Manual verify**

Run: `npm run dev` and verify stage progression works end-to-end.

- [ ] **Step 5: Commit**

```bash
git add src/ui/afterfault
git commit -m "feat(m35): add mission shell and stage progression MVP"
```

---

## Plan self-review checklist

- Spec coverage:
  - HUD + hearts + packet loss + rank: Tasks 5,7
  - Movement hub + E interact + joystick: Task 6
  - Line Keeper: Task 3
  - Rank rules: Task 2
  - Mission 3.5 stage flow: Task 7
- Placeholder scan: no TBD/TODO required for the MVP path.

## Execution choice

Plan complete and saved to `docs/superpowers/plans/2026-11-12-afterfault-battle-ui.md`.

Two execution options:
1) **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks
2) **Inline Execution** — execute tasks in this session in batches with checkpoints

Which approach?


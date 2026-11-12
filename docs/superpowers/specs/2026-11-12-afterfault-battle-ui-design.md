# DevQuest — Afterfault 3.5 “The Unfinished Line” (2D Ultra UI + Movement Hub) — Design Spec

Date: 2026-11-12  
Owner: DevQuest team (implementation in this repo)  
Scope: Transform the existing DevQuest React/Vite experience into a **mobile-game-feel** product (PUBG/FreeFire vibe) while keeping the **Mission 3.5** stage structure from the storyboard (**Discovery → Explore → Assign → Predictions → Code → Debug → Mastery**).

## Goals

- Deliver a **high-polish 2D game UI** (“2D Ultra UI”) with strong game feel: HUD, motion, particles, shake, loot/rewards, ranked progression.
- Provide a **movement-based world hub** (WASD + mobile joystick) with **interact key** (“E”) to enter missions.
- Convert Mission 3.5 into **round-based gameplay**, not “teaching pages”: the player learns by playing and failing forward.
- Keep everything shippable in the current stack (React 19 + Vite + CSS) with good performance on mobile.

## Non-goals

- True 3D/WebGL shooter gameplay.
- Multiplayer networking.
- Real-money store / monetization.
- Full fidelity replication of PUBG/FreeFire branding or assets.

## Current repo context (baseline)

- UI is React + CSS (`src/styles.css`) with existing “game-like” patterns (hearts, shake, glow, stage HUD).
- There is an existing movement-style hub already demonstrated in the deployed Afterfault demo; this repo already has “Isles” gameplay and mission progression.
- A lightweight server exists (`server/index.mjs`) and API client (`src/api.ts`) supporting progress/theme persistence.

## Player fantasy (what it should feel like)

“I’m dropped into a crisis district. I move like in a lobby. The HUD feels like a shooter. Every stage is a fight round. I win by assembling the ‘Unfinished Line’ under pressure, get loot, rank up, and unlock the next district.”

## Approach options considered

### Option A — 2D Ultra UI + Movement Hub (Recommended)
- **Pros**: Fastest path to “mobile game vibe” in current stack; best performance; low risk; easy iteration.
- **Cons**: Not full 3D.

### Option B — Tap-only missions
- **Pros**: Fastest content delivery.
- **Cons**: Misses the requested “PUBG/FreeFire feel” of movement + interact.

### Option C — 3D/WebGL
- **Pros**: Maximum “real game engine feel”.
- **Cons**: Large scope, heavy perf risk, significantly slower to complete.

## High-level architecture

### Major modules

- **World Hub** (movement + mission entry)
  - Map background + mission nodes + NPC markers
  - Player “pawn” (2D sprite) + collisions/interaction radius
  - Input layer (desktop keyboard + mobile joystick)
- **Mission Engine** (stage runner)
  - Stage state machine: Discovery → Explore → Assign → Predictions → Code → Debug → Mastery
  - Round rules: HP, timer, combos, checkpoints, rewards
- **HUD System**
  - Always-on overlay: HP, XP, rank, timer, “packet loss” meter, mission objective
  - Toaster events (XP pop, loot drops)
- **Effects Layer**
  - Particles (sparks, glow, dust)
  - Screen shake (hit, crit, fail)
  - Sound hooks (optional; stubbed if no assets)
- **Progression**
  - Local + remote persistence: current stage, XP, rank, unlocked cosmetics, difficulty mode

### Data flow

- UI actions (movement, interact, round actions) → **Mission Engine** updates state → HUD updates + effects.
- On checkpoint/clear: update store + call API endpoints (where available).

## Game systems (core requirements)

### 1) HUD (always visible in missions)

- **HP/hearts**: 3 hearts default; wrong action removes 1 heart.
- **XP bar**: shows XP for mission + session.
- **Rank badge**: Bronze / Silver / Gold.
- **Timer**: per round (configurable).
- **Packet Loss meter**: narrative-themed error meter (goes up on mistakes; down on good streaks).
- **Objective banner**: “Fix the Unfinished Line” with sub-goal.

Acceptance criteria:
- HUD does not block primary interactions on mobile; adapts responsively.
- Reduced motion mode disables non-essential animations.

### 2) Fail-forward + checkpoints

- Wrong action → heart decreases + shake + short freeze-frame + hint marker (if Mentor enabled).
- At 0 hearts → **respawn** at last checkpoint (not full restart).
- Checkpoints: after each stage completion.

Acceptance criteria:
- Player never loses previously earned stage XP permanently in the same run.

### 3) Rewards + loot

- Earn: XP, coins, badges, cosmetics (avatar frames/titles).
- Drop animation: “loot pop” + sound hook.
- Show “match result card” at stage clear: accuracy, time, streak, rewards.

Acceptance criteria:
- Rewards are deterministic (no gambling RNG needed for MVP).

### 4) Difficulty modes

- **Micro**: short/easy; generous HP; slower timer; more UI hints.
- **Guided**: normal; balanced timer; limited hints.
- **Ranked**: hard; strict timer; minimal hints; best rewards.

Acceptance criteria:
- Difficulty affects only tuning, not core content (same flow).

## World Hub (movement-based)

### Controls

- Desktop: WASD / arrow keys, **E** interact.
- Mobile: on-screen joystick + interact button.

### Interactions

- Mission nodes have an interaction radius.
- When inside radius, show prompt: **“E Enter”** (desktop) or **Enter** button (mobile).
- Clicking/tapping a mission node opens its mission card and “Enter mission”.

Acceptance criteria:
- Mission entry works via both mouse click and E key.

## Mission 3.5 gameplay mapping (Storyboard → Game Rounds)

> We keep the stage names but convert each into a “combat round” with win/lose rules.

### Stage 1: Discovery — “Drop Zone + First Contact”

- Player sees the crisis (chat reply freezing mid-sentence + ops board “all good”).
- Mini-game: pick the correct “intel card” describing the failure.
- Wrong pick: lose 1 heart + “packet loss” increases.

Win condition:
- Select correct failure type and advance.

### Stage 2: Explore — “Loot the Chunks”

- The player opens “chunk crates” (stream events).
- Task: assemble a sentence from deltas; detect `finish_reason`.

Win condition:
- Correct final assembled message + correct completion signal.

### Stage 3: Assign — “Loadout Selection”

- Choose which system owns the fix (Assembler / Validator / Retry handler).

Win condition:
- Select correct responsibility for MVP (Assembler in client mission engine).

### Stage 4: Predictions — “Aim Training”

- Player must commit outcomes before running:
  - stream pieces count bucket
  - finish reason
  - usage timing
  - missing fields behavior

Win condition:
- Hit a streak threshold (combo multiplier).

### Stage 5: Code — “Craft the Line Keeper”

- Player “crafts” the Line Keeper by filling missing code blocks (guided) or writing the logic (ranked).
- The Line Keeper must:
  - accept stream chunks
  - append deltas in order
  - ignore chunks without `choices`/delta
  - track `usage` when it arrives
  - stop on `finish_reason: stop`

Win condition:
- Pass tests + finish within timer.

### Stage 6: Debug — “Boss Fight: Freeze Monster”

- Boss sends wave patterns:
  - missing `choices`
  - repeated deltas
  - premature stop
  - usage late
- Player patches logic and reruns under pressure.

Win condition:
- Survive waves and pass “boss check”.

### Stage 7: Mastery — “Ranked Match”

- New scenario with the same concept; no mentor.

Win condition:
- Clear in 1 run for Gold; 2 for Silver; 3+ for Bronze.

## Visual style (2D Ultra UI)

- **Look**: glossy HUD, soft bloom, glowing objectives, cinematic panels.
- **Motion**: micro-interactions (button press depth), screen shake, particles, parallax backgrounds.
- **Accessibility**: `prefers-reduced-motion` disables shake/particles.

## Technical plan boundaries (what code will change)

- Add **Game state** in store (HP, streak, checkpoint, rank, difficulty).
- Add **movement hub** module (inputs, pawn, map interactions).
- Add **mission stage runner** module for 3.5 (reusing existing component patterns where possible).
- Add **HUD + effects** components (CSS-first; no heavy libs).

## Testing / Verification

- Manual: mobile viewport checks (≤520px), keyboard controls, mission enter via E, stage progression, checkpoint respawn.
- Unit-ish: pure functions for stream assembly (Line Keeper) tested via small harness.

## MVP milestone definition (what “complete” means)

Mission 3.5 is considered “complete” for demo when:

- Player can move in hub and enter Mission 3.5 with E or click.
- All 7 stages are playable with win/lose rules and checkpoints.
- HUD works, looks game-like, and rewards show after each stage.
- Ranked mode exists (harder timer + reduced hints) and produces a rank result card.


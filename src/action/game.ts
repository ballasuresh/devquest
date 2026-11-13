import { createAudio, type AudioApi } from "./audio";

export type GameHooks = { onAcademy: () => void };
export type GameHandle = { destroy: () => void };

type Mode = "title" | "play" | "upgrade" | "dead";
type Kind = "glitch" | "wraith" | "cursor" | "storm" | "boss";
type Team = "enemy" | "player";

type Enemy = {
  kind: Kind;
  x: number; y: number; vx: number; vy: number;
  r: number; hp: number; max: number;
  angle: number; cd: number; wind: number;
  flash: number; alive: boolean;
  phase: number; split: number;
  t: number;
};

type Bullet = {
  x: number; y: number; vx: number; vy: number;
  r: number; dmg: number; life: number; team: Team;
  color: string;
};

type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number;
  color: string; glow: boolean;
};

type Floater = { x: number; y: number; text: string; life: number; color: string };
type Drop = { x: number; y: number; kind: "heart" | "ember" | "coin"; t: number };
type Card = { id: string; title: string; body: string };

type Player = {
  x: number; y: number; vx: number; vy: number;
  r: number; angle: number;
  hp: number; max: number;
  dash: number; dashCd: number; iframe: number;
  atk: number; combo: number; comboT: number;
  frozen: number;
  dmg: number; speed: number; range: number;
  dashMaxCd: number;
  shot: number; steal: number; thorn: number;
};

const HIT = "dq-action-best";
const GOLD = "#f5c518";
const PURPLE = "#a78bfa";
const RED = "#ef4444";
const TEAL = "#22d3ee";
const GREEN = "#4ade80";
const ORANGE = "#fb923c";

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function ang(y: number, x: number) { return Math.atan2(y, x); }
function wrap(a: number) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function pick<T>(arr: T[]): T { return arr[(Math.random() * arr.length) | 0]; }
function norm(x: number, y: number, s = 1): [number, number] {
  const d = Math.hypot(x, y) || 1;
  return [(x / d) * s, (y / d) * s];
}

function inArc(ex: number, ey: number, px: number, py: number, facing: number, range: number, spread: number, er: number) {
  const dx = ex - px, dy = ey - py;
  const d = Math.hypot(dx, dy);
  if (d > range + er) return false;
  return Math.abs(wrap(ang(dy, dx) - facing)) < spread;
}

export function createGame(canvas: HTMLCanvasElement, hooks: GameHooks): GameHandle {
  const audio: AudioApi = createAudio();
  const gfx = canvas.getContext("2d");
  if (!gfx) throw new Error("canvas");
  const ctx: CanvasRenderingContext2D = gfx;

  const keys = new Set<string>();
  const mouse = { x: 0, y: 0, left: false, right: false, aim: false };
  const joy = { x: 0, y: 0, active: false, id: -1 };
  const btnA = { on: false, id: -1 }; // attack
  const btnB = { on: false, id: -1 }; // dash
  let showTouch = "ontouchstart" in window;
  let w = 1280, h = 720, dpr = 1;
  let mode: Mode = "title";
  let wave = 0, score = 0, best = 0, combo = 0, comboT = 0, xp = 0;
  let shake = 0, hitstop = 0, banner = "", bannerT = 0;
  let spawnQ: { delay: number; fn: (() => void) | null }[] = [];
  let living = 0;
  let upgrade: Card[] = [];
  let hoverCard = -1;
  let paused = false;
  let time = 0;
  let raf = 0;
  let last = 0;
  let killed = 0;
  let bossNamed = false;

  try { best = Number(localStorage.getItem(HIT) || 0) || 0; } catch { /* ignore */ }

  const bg = new Image();
  bg.src = "/art/port-night.jpg";

  const player: Player = freshPlayer();
  const enemies: Enemy[] = [];
  const bullets: Bullet[] = [];
  const parts: Particle[] = [];
  const floats: Floater[] = [];
  const drops: Drop[] = [];

  function freshPlayer(): Player {
    return {
      x: 0, y: 0, vx: 0, vy: 0, r: 16, angle: -Math.PI / 2,
      hp: 100, max: 100,
      dash: 0, dashCd: 0, iframe: 0,
      atk: 0, combo: 0, comboT: 0,
      frozen: 0,
      dmg: 22, speed: 265, range: 76,
      dashMaxCd: 0.72,
      shot: 0, steal: 0, thorn: 0,
    };
  }

  function burst(x: number, y: number, color: string, n = 12, speed = 220, glow = true, size = 3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      if (parts.length > 420) parts.shift();
      parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.3 + Math.random() * 0.45, max: 0.6,
        size: size * (0.5 + Math.random()), color, glow,
      });
    }
  }

  function float(x: number, y: number, text: string, color = "#fff") {
    floats.push({ x, y, text, life: 0.8, color });
  }

  function rumble(n: number) { shake = Math.max(shake, n); }

  function say(text: string, dur = 1.6) { banner = text; bannerT = dur; }

  function resetRun() {
    Object.assign(player, freshPlayer());
    player.x = w / 2;
    player.y = h * 0.62;
    enemies.length = 0;
    bullets.length = 0;
    parts.length = 0;
    floats.length = 0;
    drops.length = 0;
    spawnQ.length = 0;
    wave = 0;
    score = 0;
    combo = 0;
    comboT = 0;
    xp = 0;
    killed = 0;
    living = 0;
    shake = 0;
    hitstop = 0;
    bossNamed = false;
    upgrade = [];
    paused = false;
  }

  function edge(): [number, number] {
    const side = (Math.random() * 4) | 0;
    if (side === 0) return [Math.random() * w, -20];
    if (side === 1) return [Math.random() * w, h + 20];
    if (side === 2) return [-20, Math.random() * h];
    return [w + 20, Math.random() * h];
  }

  function spawn(kind: Kind, x?: number, y?: number, scale = 1) {
    const [sx, sy] = x === undefined || y === undefined ? edge() : [x, y];
    const base: Record<Kind, { r: number; hp: number }> = {
      glitch: { r: 13, hp: 28 },
      wraith: { r: 14, hp: 24 },
      cursor: { r: 18, hp: 58 },
      storm: { r: 16, hp: 40 },
      boss: { r: 52, hp: 820 },
    };
    const b = base[kind];
    const hp = Math.round(b.hp * scale * (1 + (wave - 1) * 0.12));
    enemies.push({
      kind, x: sx, y: sy, vx: 0, vy: 0,
      r: b.r * (kind === "storm" ? scale : 1),
      hp, max: hp, angle: 0, cd: 0.4 + Math.random() * 0.6,
      wind: 0, flash: 0, alive: true, phase: 1, split: scale, t: 0,
    });
    living += 1;
  }

  function queueWave() {
    wave += 1;
    living = 0;
    const s = 1 + Math.max(0, wave - 6) * 0.15;
    const plan: { at: number; fn: () => void }[] = [];
    const add = (at: number, fn: () => void) => plan.push({ at, fn });

    if (wave === 6 || (wave > 6 && wave % 6 === 0)) {
      audio.sfx("boss");
      say("BOSS  ·  THE FREEZE MONSTER", 2.4);
      bossNamed = true;
      add(0.8, () => spawn("boss", w / 2, 80, s));
    } else {
      audio.sfx("wave");
      say(`WAVE  ${wave}`, 1.5);
      const g = 3 + wave + (wave > 7 ? wave : 0);
      for (let i = 0; i < Math.min(g, 14); i++) add(0.25 * i, () => spawn("glitch", undefined, undefined, s));
      if (wave >= 2) for (let i = 0; i < 1 + ((wave / 2) | 0); i++) add(0.5 + i * 0.4, () => spawn("wraith", undefined, undefined, s));
      if (wave >= 3) for (let i = 0; i < (wave >= 8 ? 3 : 1); i++) add(1 + i * 0.6, () => spawn("cursor", undefined, undefined, s));
      if (wave >= 4) for (let i = 0; i < 1 + ((wave - 3) / 2 | 0); i++) add(0.8 + i * 0.5, () => spawn("storm", undefined, undefined, s));
    }
    spawnQ = plan.map((p) => ({ delay: p.at, fn: p.fn as (() => void) | null }));
  }

  const ALL_CARDS: Card[] = [
    { id: "ember", title: "Ember Edge", body: "+30% slash damage. Hits feel heavier." },
    { id: "vital", title: "Vital Thread", body: "+30 max HP and heal 40." },
    { id: "swift", title: "Swift Packet", body: "+18% move speed." },
    { id: "arc", title: "Wide Arc", body: "Slash reaches 35% farther." },
    { id: "ghost", title: "Ghost Dash", body: "Dash recovers faster and travels longer." },
    { id: "shot", title: "Line Shot", body: "Your slash also fires a piercing bolt." },
    { id: "steal", title: "Ember Leech", body: "Heal for a portion of damage dealt." },
    { id: "thorn", title: "Thorn Dash", body: "Dashing bursts a ring of damage." },
    { id: "heal", title: "Full Buffer", body: "Restore all health." },
  ];

  function applyCard(id: string) {
    switch (id) {
      case "ember": player.dmg *= 1.3; break;
      case "vital": player.max += 30; player.hp = Math.min(player.max, player.hp + 40); break;
      case "swift": player.speed *= 1.18; break;
      case "arc": player.range *= 1.35; break;
      case "ghost": player.dashMaxCd = Math.max(0.38, player.dashMaxCd * 0.7); break;
      case "shot": player.shot += 1; break;
      case "steal": player.steal += 0.1; break;
      case "thorn": player.thorn += 1; break;
      case "heal": player.hp = player.max; break;
    }
    audio.sfx("upgrade");
  }

  function offerUpgrades() {
    const pool = ALL_CARDS.slice();
    upgrade = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const k = (Math.random() * pool.length) | 0;
      upgrade.push(pool.splice(k, 1)[0]);
    }
    hoverCard = -1;
    mode = "upgrade";
  }

  function begin() {
    audio.unlock();
    audio.startMusic();
    resetRun();
    mode = "play";
    queueWave();
  }

  function hurtPlayer(dmg: number, kx: number, ky: number) {
    if (player.iframe > 0 || player.dash > 0 || mode !== "play") {
      if (player.dash > 0 && dmg > 0) {
        audio.sfx("perfect");
        float(player.x, player.y - 28, "PERFECT", GOLD);
        score += 50;
        player.iframe = Math.max(player.iframe, 0.2);
      }
      return;
    }
    player.hp -= dmg;
    player.iframe = 0.55;
    player.vx += kx;
    player.vy += ky;
    player.frozen = Math.max(0, player.frozen - 0.15);
    audio.sfx("hurt");
    burst(player.x, player.y, RED, 16, 280);
    rumble(12);
    hitstop = 0.06;
    if (player.hp <= 0) {
      player.hp = 0;
      mode = "dead";
      audio.sfx("dead");
      burst(player.x, player.y, GOLD, 40, 360);
      say("THE LINE BROKE", 99);
      if (score > best) {
        best = score;
        try { localStorage.setItem(HIT, String(best)); } catch { /* ignore */ }
      }
    }
  }

  function thornBurst() {
    if (!player.thorn) return;
    burst(player.x, player.y, GOLD, 20, 320);
    const rad = 78 + player.thorn * 16;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - player.x, e.y - player.y) < rad + e.r) {
        hitEnemy(e, player.dmg * 0.6 * player.thorn, e.x - player.x, e.y - player.y);
      }
    }
  }

  function startDash() {
    if (player.dashCd > 0 || player.dash > 0 || player.frozen > 0.4) return;
    let [dx, dy] = [Math.cos(player.angle), Math.sin(player.angle)];
    if (joy.active && (joy.x || joy.y)) [dx, dy] = norm(joy.x, joy.y);
    else {
      const mx = moveX(), my = moveY();
      if (mx || my) [dx, dy] = norm(mx, my);
    }
    player.angle = ang(dy, dx);
    player.dash = 0.15;
    player.dashCd = player.dashMaxCd;
    player.iframe = Math.max(player.iframe, 0.18);
    player.vx = dx * 720;
    player.vy = dy * 720;
    player.frozen = 0;
    audio.sfx("dash");
    burst(player.x, player.y, GOLD, 8, 140, true, 2);
    thornBurst();
  }

  function startAttack() {
    if (player.atk > 0 || player.frozen > 0.25) return;
    const chain = player.comboT > 0 ? player.combo + 1 : 0;
    player.combo = chain % 3;
    player.comboT = 0.45;
    player.atk = player.combo === 2 ? 0.28 : 0.18;
    audio.sfx("slash");
    const facing = player.angle;
    const range = player.range * (player.combo === 2 ? 1.35 : 1);
    const spread = player.combo === 2 ? 2.6 : 0.95;
    const dmg = player.dmg * (player.combo === 2 ? 1.55 : 1 + player.combo * 0.15);
    let hits = 0;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (inArc(e.x, e.y, player.x, player.y, facing, range, spread, e.r)) {
        const [kx, ky] = norm(e.x - player.x, e.y - player.y, 280);
        hitEnemy(e, dmg, kx, ky);
        hits += 1;
      }
    }
    for (const b of bullets) {
      if (b.team === "enemy" && inArc(b.x, b.y, player.x, player.y, facing, range, spread, b.r)) {
        b.life = 0;
        burst(b.x, b.y, TEAL, 5, 140, true, 2);
      }
    }
    if (player.shot) {
      const bolts = player.shot;
      for (let i = 0; i < bolts; i++) {
        const a = facing + (i - (bolts - 1) / 2) * 0.18;
        bullets.push({
          x: player.x + Math.cos(a) * 22, y: player.y + Math.sin(a) * 22,
          vx: Math.cos(a) * 620, vy: Math.sin(a) * 620,
          r: 5, dmg: player.dmg * 0.55, life: 0.7, team: "player", color: GOLD,
        });
      }
      audio.sfx("shoot", 0.7);
    }
    if (hits) {
      hitstop = player.combo === 2 ? 0.07 : 0.035;
      rumble(6 + hits * 2);
    }
  }

  function hitEnemy(e: Enemy, dmg: number, kx: number, ky: number) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.flash = 0.1;
    e.vx += kx * (e.kind === "boss" ? 0.15 : 1);
    e.vy += ky * (e.kind === "boss" ? 0.15 : 1);
    audio.sfx("hit", 0.7);
    float(e.x, e.y - e.r, `${Math.round(dmg)}`, GOLD);
    burst(e.x, e.y, e.kind === "boss" ? GREEN : GOLD, 10, 240);
    if (player.steal) player.hp = Math.min(player.max, player.hp + dmg * player.steal);
    if (e.hp <= 0) kill(e);
  }

  function kill(e: Enemy) {
    if (!e.alive) return;
    e.alive = false;
    living = Math.max(0, living - 1);
    killed += 1;
    const value = e.kind === "boss" ? 1500 : e.kind === "cursor" ? 220 : e.kind === "storm" ? 160 : e.kind === "wraith" ? 140 : 80;
    combo += 1;
    comboT = 2.2;
    const gain = Math.round(value * (1 + combo * 0.15));
    score += gain;
    xp += Math.round(value / 4);
    audio.sfx(e.kind === "boss" ? "boss" : "kill");
    float(e.x, e.y, `+${gain}`, GREEN);
    burst(e.x, e.y, e.kind === "boss" ? GREEN : PURPLE, e.kind === "boss" ? 50 : 22, 400);
    rumble(e.kind === "boss" ? 22 : 8);
    if (e.kind === "storm" && e.split > 0.55) {
      spawn("storm", e.x + 12, e.y, e.split * 0.55);
      spawn("storm", e.x - 12, e.y, e.split * 0.55);
    }
    if (e.kind === "boss") {
      say("THE LINE HOLDS", 2.5);
      hitstop = 0.4;
    }
    if (Math.random() < (e.kind === "boss" ? 1 : 0.18)) {
      const kinds: Drop["kind"][] = ["coin", "coin", "ember", "heart"];
      drops.push({ x: e.x, y: e.y, kind: e.kind === "boss" ? "heart" : pick(kinds), t: 8 });
    }
  }

  function moveX() {
    let x = 0;
    if (keys.has("a") || keys.has("arrowleft")) x -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    return x + joy.x;
  }
  function moveY() {
    let y = 0;
    if (keys.has("w") || keys.has("arrowup")) y -= 1;
    if (keys.has("s") || keys.has("arrowdown")) y += 1;
    return y + joy.y;
  }

  function wantAttack() {
    return keys.has("j") || mouse.left || btnA.on;
  }
  function wantDash() {
    return keys.has("shift") || keys.has("k") || mouse.right || btnB.on;
  }

  const pad = 36;

  function bound(o: { x: number; y: number; r: number; vx: number; vy: number }) {
    if (o.x < pad + o.r) { o.x = pad + o.r; o.vx = Math.abs(o.vx) * 0.3; }
    if (o.x > w - pad - o.r) { o.x = w - pad - o.r; o.vx = -Math.abs(o.vx) * 0.3; }
    if (o.y < 70 + o.r) { o.y = 70 + o.r; o.vy = Math.abs(o.vy) * 0.3; }
    if (o.y > h - 28 - o.r) { o.y = h - 28 - o.r; o.vy = -Math.abs(o.vy) * 0.3; }
  }

  function updatePlayer(dt: number) {
    if (player.frozen > 0) player.frozen = Math.max(0, player.frozen - dt);
    if (player.iframe > 0) player.iframe -= dt;
    if (player.dashCd > 0) player.dashCd -= dt;
    if (player.comboT > 0) player.comboT -= dt; else player.combo = 0;
    if (player.atk > 0) player.atk -= dt;

    const frozenSlow = player.frozen > 0 ? 0.28 : 1;
    let mx = moveX(), my = moveY();
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }

    if (player.dash > 0) {
      player.dash -= dt;
      burst(player.x, player.y, "rgba(245,197,24,0.5)", 1, 10, true, 4);
    } else {
      player.vx = lerp(player.vx, mx * player.speed * frozenSlow, 1 - Math.pow(0.001, dt));
      player.vy = lerp(player.vy, my * player.speed * frozenSlow, 1 - Math.pow(0.001, dt));
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    bound(player);

    if (mouse.aim || (showTouch === false && (mouse.x || mouse.y))) {
      player.angle = ang(mouse.y - player.y, mouse.x - player.x);
    } else if (mag > 0.2) {
      player.angle = ang(my, mx);
    }

    if (wantDash()) startDash();
    if (wantAttack()) startAttack();
  }

  function fire(e: Enemy, speed: number, color: string, dmg: number, spread = 0, n = 1) {
    for (let i = 0; i < n; i++) {
      const a = e.angle + (i - (n - 1) / 2) * spread;
      bullets.push({
        x: e.x + Math.cos(a) * (e.r + 4),
        y: e.y + Math.sin(a) * (e.r + 4),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: e.kind === "boss" ? 8 : 5, dmg, life: 3.2, team: "enemy", color,
      });
    }
    audio.sfx("shoot", 0.45);
  }

  function aimAt(e: Enemy) {
    e.angle = ang(player.y - e.y, player.x - e.x);
  }

  function steer(e: Enemy, tx: number, ty: number, speed: number, dt: number) {
    const [sx, sy] = norm(tx - e.x, ty - e.y, speed);
    e.vx = lerp(e.vx, sx, 1 - Math.pow(0.02, dt));
    e.vy = lerp(e.vy, sy, 1 - Math.pow(0.02, dt));
  }

  function updateEnemies(dt: number) {
    for (const e of enemies) {
      if (!e.alive) continue;
      e.t += dt;
      e.cd = Math.max(0, e.cd - dt);
      e.flash = Math.max(0, e.flash - dt);
      const wasWind = e.wind;
      if (e.wind > 0) e.wind = Math.max(0, e.wind - dt);
      const popped = wasWind > 0 && e.wind === 0;
      aimAt(e);

      if (e.kind === "glitch") {
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        if (e.wind > 0) { e.vx *= 0.9; e.vy *= 0.9; }
        else if (e.cd <= 0 && d < 130) {
          e.wind = 0.22;
          e.cd = 1.15;
        } else if (e.wind === 0 && e.cd > 0.95) {
          const [sx, sy] = norm(player.x - e.x, player.y - e.y, 520);
          e.vx = sx; e.vy = sy;
        } else {
          steer(e, player.x, player.y, 125 + wave * 4, dt);
        }
      }

      if (e.kind === "wraith") {
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        const desired = 230;
        const ox = e.x + Math.cos(e.t * 1.4) * 80;
        const oy = e.y + Math.sin(e.t * 1.4) * 80;
        if (d < desired - 30) steer(e, e.x - (player.x - e.x), e.y - (player.y - e.y), 140, dt);
        else if (d > desired + 50) steer(e, player.x, player.y, 110, dt);
        else steer(e, ox, oy, 80, dt);
        if (e.cd <= 0) {
          e.wind = 0.35;
          e.cd = 1.5;
        }
        if (popped) fire(e, 280, TEAL, 10);
      }

      if (e.kind === "cursor") {
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        if (e.wind > 0) { e.vx *= 0.8; e.vy *= 0.8; }
        else if (e.cd <= 0 && d < 200) {
          e.wind = 0.75;
          e.cd = 2.2;
        } else {
          steer(e, player.x, player.y, 58, dt);
        }
        if (popped) {
          const radius = 96;
          burst(e.x, e.y, TEAL, 24, 300);
          audio.sfx("slam");
          rumble(10);
          if (Math.hypot(player.x - e.x, player.y - e.y) < radius + player.r) {
            const [kx, ky] = norm(player.x - e.x, player.y - e.y, 380);
            hurtPlayer(16, kx, ky);
            if (player.dash <= 0) player.frozen = Math.max(player.frozen, 0.65);
          }
        }
      }

      if (e.kind === "storm") {
        const wob = Math.sin(e.t * 6) * 90;
        const [px, py] = norm(player.x - e.x, player.y - e.y);
        steer(e, e.x + px * 40 + -py * wob, e.y + py * 40 + px * wob, 150, dt);
      }

      if (e.kind === "boss") {
        updateBoss(e, dt, popped);
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= Math.pow(0.5, dt);
      e.vy *= Math.pow(0.5, dt);
      bound(e);

      // contact damage
      if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r - 2) {
        const [kx, ky] = norm(player.x - e.x, player.y - e.y, 340);
        const dmg = e.kind === "boss" ? 16 : e.kind === "cursor" ? 12 : 8;
        hurtPlayer(dmg, kx, ky);
        e.vx -= kx * 0.4; e.vy -= ky * 0.4;
      }
    }
    // compact dead occasionally
    if (enemies.length > 40) {
      for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) enemies.splice(i, 1);
    }
  }

  function updateBoss(e: Enemy, dt: number, popped: boolean) {
    const hpRatio = e.hp / e.max;
    const phase = hpRatio < 0.33 ? 3 : hpRatio < 0.66 ? 2 : 1;
    if (phase > e.phase) {
      e.phase = phase;
      say(phase === 2 ? "PHASE 2  ·  ALL-GOOD SHIELD" : "PHASE 3  ·  ENRAGE", 1.8);
      audio.sfx("boss");
      rumble(16);
      if (phase === 2) {
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI * 2 * i) / 4;
          spawn("glitch", e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80);
        }
      }
    }
    steer(e, player.x, player.y, phase === 3 ? 95 : 62, dt);
    if (e.cd <= 0) {
      e.wind = phase === 3 ? 0.35 : 0.5;
      e.cd = phase === 3 ? 1.15 : 2.0;
    }
    // shockwave at end of wind
    if (popped) {
      audio.sfx("slam");
      rumble(16);
      burst(e.x, e.y, GREEN, 30, 400);
      // ring check: distance near expanding ring at impact (close range)
      const d = Math.hypot(player.x - e.x, player.y - e.y);
      if (d < 160 + player.r) {
        const [kx, ky] = norm(player.x - e.x, player.y - e.y, 480);
        hurtPlayer(18, kx, ky);
      }
      const n = phase === 3 ? 16 : 8;
      fire(e, 260 + phase * 30, phase === 3 ? RED : GREEN, 12, (Math.PI * 2) / n, n);
    }
    if (phase >= 2 && e.cd === 0 && e.t > 2 && Math.floor(e.t / 5) !== Math.floor((e.t - dt) / 5)) {
      spawn("wraith", undefined, undefined, 0.9);
    }
  }

  function updateBullets(dt: number) {
    for (const b of bullets) {
      if (b.life <= 0) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < 0 || b.x > w || b.y < 0 || b.y > h) b.life = 0;
      if (b.team === "enemy") {
        if (Math.hypot(b.x - player.x, b.y - player.y) < b.r + player.r) {
          b.life = 0;
          const [kx, ky] = norm(player.x - b.x, player.y - b.y, 260);
          hurtPlayer(b.dmg, kx, ky);
        }
      } else {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
            const [kx, ky] = norm(e.x - b.x, e.y - b.y, 200);
            hitEnemy(e, b.dmg, kx, ky);
            b.life = 0;
            break;
          }
        }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].life <= 0) bullets.splice(i, 1);
  }

  function updateDrops(dt: number) {
    for (const d of drops) {
      d.t -= dt;
      const dist = Math.hypot(d.x - player.x, d.y - player.y);
      if (dist < 120) {
        const [sx, sy] = norm(player.x - d.x, player.y - d.y, 280);
        d.x += sx * dt;
        d.y += sy * dt;
      }
      if (dist < player.r + 14) {
        d.t = 0;
        audio.sfx("pickup");
        if (d.kind === "heart") {
          player.hp = Math.min(player.max, player.hp + 28);
          float(d.x, d.y, "+HP", GREEN);
        } else if (d.kind === "ember") {
          player.iframe = Math.max(player.iframe, 0.2);
          player.dmg *= 1.08;
          float(d.x, d.y, "EMBER", ORANGE);
        } else {
          score += 25;
          float(d.x, d.y, "+25", GOLD);
        }
        burst(d.x, d.y, GOLD, 10, 160);
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].t <= 0) drops.splice(i, 1);
  }

  function updateFx(dt: number) {
    for (const p of parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
      p.life -= dt;
    }
    if (parts.length) {
      let wri = 0;
      for (let i = 0; i < parts.length; i++) if (parts[i].life > 0) parts[wri++] = parts[i];
      parts.length = wri;
    }
    for (const f of floats) { f.y -= 36 * dt; f.life -= dt; }
    for (let i = floats.length - 1; i >= 0; i--) if (floats[i].life <= 0) floats.splice(i, 1);
    if (shake > 0) shake = Math.max(0, shake - dt * 28);
    if (bannerT > 0) bannerT -= dt;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
  }

  function tickWorld(dt: number) {
    for (const q of spawnQ) q.delay -= dt;
    for (const q of spawnQ) if (q.delay <= 0 && q.fn) { q.fn(); q.fn = null; }
    spawnQ = spawnQ.filter((q) => q.delay > 0);

    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateDrops(dt);
    updateFx(dt);

    const awaiting = spawnQ.length > 0;
    const anyAlive = enemies.some((e) => e.alive);
    if (mode === "play" && !awaiting && !anyAlive && wave > 0) {
      // wave cleared
      living = 0;
      enemies.length = 0;
      score += 100 * wave;
      if (wave === 6) {
        say("DISTRICT SECURE  ·  KEEP HOLDING", 2);
        offerUpgrades();
      } else {
        offerUpgrades();
      }
    }
  }

  function drawBackground() {
    if (bg.complete && bg.naturalWidth) {
      const s = Math.max(w / bg.naturalWidth, h / bg.naturalHeight);
      const bw = bg.naturalWidth * s, bh = bg.naturalHeight * s;
      ctx.globalAlpha = 0.42;
      ctx.drawImage(bg, (w - bw) / 2, (h - bh) / 2, bw, bh);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "#07080c";
      ctx.fillRect(0, 0, w, h);
    }
    const g = ctx.createRadialGradient(w * 0.5, h * 0.4, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    g.addColorStop(0, "rgba(20,10,40,0.25)");
    g.addColorStop(1, "rgba(4,6,12,0.82)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = "rgba(245,197,24,0.07)";
    ctx.lineWidth = 1;
    const step = 48;
    ctx.beginPath();
    for (let x = pad; x <= w - pad; x += step) { ctx.moveTo(x, 70); ctx.lineTo(x, h - 24); }
    for (let y = 70; y <= h - 24; y += step) { ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); }
    ctx.stroke();
    ctx.strokeStyle = "rgba(245,197,24,0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, 70, w - pad * 2, h - 94);
    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (p.iframe > 0 && ((time * 20) | 0) % 2 === 0) ctx.globalAlpha = 0.45;
    if (p.frozen > 0) ctx.globalAlpha = 0.7;
    // glow
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 18;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1c1406";
    ctx.beginPath();
    ctx.arc(5, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(6.5, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // cape
    ctx.fillStyle = "rgba(124,58,237,0.85)";
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.quadraticCurveTo(-22 - Math.sin(time * 8) * 3, 0, -6, 7);
    ctx.closePath();
    ctx.fill();
    // slash arc
    if (p.atk > 0) {
      const t = p.combo === 2 ? p.atk / 0.28 : p.atk / 0.18;
      const range = p.range * (p.combo === 2 ? 1.35 : 1);
      const spread = p.combo === 2 ? 2.6 : 0.95;
      ctx.strokeStyle = `rgba(245,197,24,${0.95 * t})`;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, range * 0.85, -spread * t, spread * (1.05 - t * 0.2));
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    if (p.frozen > 0) {
      ctx.strokeStyle = "rgba(34,211,238,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEnemy(e: Enemy) {
    if (!e.alive) return;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.flash > 0) ctx.globalAlpha = 0.45;
    const colors: Record<Kind, string> = { glitch: PURPLE, wraith: TEAL, cursor: "#67e8f9", storm: ORANGE, boss: GREEN };
    const c = colors[e.kind];
    // telegraph
    if (e.wind > 0) {
      ctx.restore();
      const rad = e.kind === "cursor" ? 96 : e.kind === "boss" ? 160 : e.r + 40;
      ctx.save();
      ctx.translate(e.x, e.y);
      const k = 1 - e.wind / (e.kind === "cursor" ? 0.75 : e.kind === "boss" ? 0.5 : 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,68,68,${0.12 + k * 0.18})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(239,68,68,${0.4 + k * 0.5})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.shadowColor = c;
    ctx.shadowBlur = 14;
    ctx.fillStyle = c;
    ctx.rotate(e.angle);
    ctx.beginPath();
    if (e.kind === "glitch") {
      ctx.moveTo(12, 0); ctx.lineTo(-8, 8); ctx.lineTo(-4, 0); ctx.lineTo(-8, -8); ctx.closePath();
    } else if (e.kind === "wraith") {
      ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
    } else if (e.kind === "cursor") {
      ctx.moveTo(0, -16); ctx.lineTo(12, 14); ctx.lineTo(0, 8); ctx.lineTo(-12, 14); ctx.closePath();
    } else if (e.kind === "storm") {
      const r = e.r;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + time * 6;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + 0.4) * r * 0.5, Math.sin(a + 0.4) * r * 0.5);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    if (e.kind === "boss") {
      ctx.fillStyle = "#052e16";
      ctx.beginPath();
      ctx.arc(14, -10, 8, 0, Math.PI * 2);
      ctx.arc(14, 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GREEN;
      ctx.beginPath();
      ctx.arc(16, -10, 3, 0, Math.PI * 2);
      ctx.arc(16, 10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "800 11px Outfit, sans-serif";
      ctx.fillStyle = GREEN;
      ctx.textAlign = "center";
      ctx.rotate(-e.angle);
      ctx.fillText("ALL GOOD", 0, 6);
    }
    ctx.restore();
    // hp bar
    if (e.hp < e.max || e.kind === "boss") {
      const bw = e.kind === "boss" ? 160 : 34;
      const bx = e.x - bw / 2, by = e.y - e.r - 12;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(bx, by, bw, e.kind === "boss" ? 8 : 4);
      ctx.fillStyle = e.kind === "boss" ? GREEN : RED;
      ctx.fillRect(bx, by, bw * clamp(e.hp / e.max, 0, 1), e.kind === "boss" ? 8 : 4);
    }
  }

  function drawHud() {
    // HP
    const hw = 220, hh = 14;
    ctx.fillStyle = "rgba(8,10,16,0.7)";
    ctx.fillRect(24, 18, hw, hh);
    ctx.fillStyle = player.hp / player.max < 0.3 ? RED : "#ef4444";
    ctx.fillRect(24, 18, hw * clamp(player.hp / player.max, 0, 1), hh);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(24, 18, hw, hh);
    ctx.font = "600 12px Outfit, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(`HP  ${Math.ceil(player.hp)} / ${player.max}`, 24, 14);

    // dash
    ctx.fillStyle = "rgba(8,10,16,0.7)";
    ctx.fillRect(24, 38, 140, 6);
    const d = player.dashCd <= 0 ? 1 : 1 - clamp(player.dashCd / player.dashMaxCd, 0, 1);
    ctx.fillStyle = GOLD;
    ctx.fillRect(24, 38, 140 * d, 6);

    ctx.textAlign = "right";
    ctx.font = "800 28px Fraunces, Georgia, serif";
    ctx.fillStyle = GOLD;
    ctx.fillText(String(score), w - 24, 36);
    ctx.font = "600 12px Outfit, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(`WAVE ${wave}   BEST ${best}   XP ${xp}`, w - 24, 54);
    if (combo >= 2) {
      ctx.fillStyle = GOLD;
      ctx.font = "800 22px Outfit, sans-serif";
      ctx.fillText(`x${combo} COMBO`, w - 24, 80);
    }
    if (bossNamed && enemies.some((e) => e.alive && e.kind === "boss")) {
      ctx.textAlign = "center";
      ctx.font = "700 13px Outfit, sans-serif";
      ctx.fillStyle = GREEN;
      ctx.fillText("THE FREEZE MONSTER", w / 2, 22);
    }
    if (banner && bannerT > 0) {
      ctx.textAlign = "center";
      ctx.globalAlpha = clamp(bannerT * 2, 0, 1);
      ctx.font = "800 42px Fraunces, Georgia, serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(banner, w / 2, h * 0.3);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
    ctx.font = "500 12px Outfit, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("WASD move   CLICK / J slash   SHIFT / K dash   ESC pause   M mute", 24, h - 10);
  }

  function drawTitle() {
    drawBackground();
    // embers
    for (let i = 0; i < 24; i++) {
      const x = ((time * 30 + i * 97) % (w + 40)) - 20;
      const y = (Math.sin(time * 0.6 + i) * 40) + (i * 37) % h;
      ctx.fillStyle = `rgba(245,197,24,${0.2 + (i % 5) * 0.08})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = GOLD;
    ctx.font = "700 16px Outfit, sans-serif";
    ctx.letterSpacing = "0.28em";
    ctx.fillText("AFTERFAULT", w / 2, h * 0.26);
    ctx.letterSpacing = "0";
    ctx.fillStyle = "#fff";
    ctx.font = "800 86px Fraunces, Georgia, serif";
    ctx.fillText("DEVQUEST", w / 2, h * 0.38);
    ctx.font = "500 22px Outfit, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("The Line Must Hold", w / 2, h * 0.45);
    const pulse = 0.85 + Math.sin(time * 4) * 0.15;
    roundBtn(w / 2, h * 0.58, 210, 54, `rgba(245,197,24,${pulse})`, "#1c1406", "START  THE  FIGHT");
    roundBtn(w / 2, h * 0.68, 210, 44, "rgba(8,10,16,0.75)", "#fff", "ACADEMY  ·  STORY MISSIONS");
    ctx.font = "500 14px Outfit, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(best ? `High score  ${best}` : "Slash the stream glitches. Dash through fire. Don't let the line freeze.", w / 2, h * 0.78);
    ctx.font = "500 12px Outfit, sans-serif";
    ctx.fillText("Move  WASD    Slash  Click or J    Dash  Shift or K    Touch controls on mobile", w / 2, h * 0.84);
  }

  function roundBtn(x: number, y: number, bw: number, bh: number, fill: string, ink: string, label: string) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = "800 16px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
    ctx.textBaseline = "alphabetic";
  }

  function hitBtn(x: number, y: number, mx: number, my: number, bw: number, bh: number) {
    return mx > x - bw / 2 && mx < x + bw / 2 && my > y - bh / 2 && my < y + bh / 2;
  }

  function drawUpgrade() {
    ctx.fillStyle = "rgba(4,6,12,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.fillStyle = GOLD;
    ctx.font = "700 14px Outfit, sans-serif";
    ctx.fillText("WAVE CLEARED  ·  PICK A MOD", w / 2, h * 0.22);
    ctx.fillStyle = "#fff";
    ctx.font = "800 36px Fraunces, Georgia, serif";
    ctx.fillText("Power up the Line Keeper", w / 2, h * 0.28);
    const n = upgrade.length;
    const bw = Math.min(240, (w - 80) / 3 - 12);
    const total = n * bw + (n - 1) * 20;
    const sx = w / 2 - total / 2;
    upgrade.forEach((c, i) => {
      const x = sx + i * (bw + 20);
      const y = h * 0.42;
      const hot = hoverCard === i;
      ctx.fillStyle = hot ? "rgba(245,197,24,0.18)" : "rgba(8,10,16,0.88)";
      ctx.strokeStyle = hot ? GOLD : "rgba(255,255,255,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, 200, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.font = "700 12px Outfit, sans-serif";
      ctx.fillText(`0${i + 1}`, x + bw / 2, y + 32);
      ctx.fillStyle = "#fff";
      ctx.font = "700 20px Fraunces, Georgia, serif";
      ctx.fillText(c.title, x + bw / 2, y + 70);
      ctx.font = "500 14px Outfit, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      wrapText(c.body, x + bw / 2, y + 106, bw - 28, 20);
    });
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 13px Outfit, sans-serif";
    ctx.fillText("Click a card or press 1  2  3", w / 2, h * 0.82);
  }

  function wrapText(text: string, x: number, y: number, max: number, lh: number) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    ctx.textAlign = "center";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > max) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lh;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawDead() {
    ctx.fillStyle = "rgba(8,0,0,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.fillStyle = RED;
    ctx.font = "800 64px Fraunces, Georgia, serif";
    ctx.fillText("THE LINE BROKE", w / 2, h * 0.36);
    ctx.fillStyle = "#fff";
    ctx.font = "600 20px Outfit, sans-serif";
    ctx.fillText(`Score  ${score}    Wave  ${wave}    Kills  ${killed}`, w / 2, h * 0.46);
    if (score >= best && score > 0) {
      ctx.fillStyle = GOLD;
      ctx.fillText("New high score", w / 2, h * 0.52);
    }
    roundBtn(w / 2, h * 0.64, 210, 54, GOLD, "#1c1406", "RESTART");
    roundBtn(w / 2, h * 0.74, 210, 44, "rgba(8,10,16,0.8)", "#fff", "TITLE");
  }

  function joyLayout() {
    return {
      jx: 110, jy: h - 110, jr: 64,
      ax: w - 110, ay: h - 100, ar: 42,
      bx: w - 200, by: h - 88, br: 32,
    };
  }

  function drawTouch() {
    if (!showTouch) return;
    const L = joyLayout();
    ctx.fillStyle = "rgba(8,10,16,0.45)";
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(L.jx, L.jy, L.jr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const kx = L.jx + joy.x * 28, ky = L.jy + joy.y * 28;
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(kx, ky, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = btnA.on ? GOLD : "rgba(245,197,24,0.8)";
    ctx.beginPath(); ctx.arc(L.ax, L.ay, L.ar, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1c1406";
    ctx.font = "800 13px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SLASH", L.ax, L.ay);
    ctx.fillStyle = btnB.on ? "#fff" : "rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.arc(L.bx, L.by, L.br, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillText("DASH", L.bx, L.by);
    ctx.textBaseline = "alphabetic";
  }

  function drawPaused() {
    ctx.fillStyle = "rgba(4,6,12,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "800 48px Fraunces, Georgia, serif";
    ctx.fillText("PAUSED", w / 2, h * 0.45);
    ctx.font = "500 16px Outfit, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Esc to resume    M mute    Academy from the title screen", w / 2, h * 0.54);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ox = shake ? (Math.random() - 0.5) * shake : 0;
    const oy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.translate(ox, oy);

    if (mode === "title") {
      drawTitle();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return;
    }

    drawBackground();

    for (const d of drops) {
      const bob = Math.sin(time * 6 + d.x) * 3;
      ctx.fillStyle = d.kind === "heart" ? RED : d.kind === "ember" ? ORANGE : GOLD;
      ctx.beginPath();
      ctx.arc(d.x, d.y + bob, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of enemies) drawEnemy(e);
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    drawPlayer();

    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      ctx.globalAlpha = clamp(p.life / (p.max || 0.5), 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    for (const f of floats) {
      ctx.globalAlpha = clamp(f.life * 1.6, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "800 16px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    ctx.translate(-ox, -oy);
    drawHud();
    if (mode === "upgrade") drawUpgrade();
    if (mode === "dead") drawDead();
    if (paused && mode === "play") drawPaused();
    drawTouch();
  }

  function frame(now: number) {
    const raw = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    time += raw;
    if (hitstop > 0) hitstop -= raw;
    else if (mode === "play" && !paused) tickWorld(raw);
    else updateFx(raw);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    const parent = canvas.parentElement;
    const cw = parent?.clientWidth || window.innerWidth;
    const ch = parent?.clientHeight || window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(640, cw);
    h = Math.max(400, ch);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    if (mode === "title" || player.x === 0) {
      player.x = w / 2;
      player.y = h * 0.62;
    }
  }

  function toLocal(e: { clientX: number; clientY: number }) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
  }

  function cardAt(x: number, y: number) {
    const n = upgrade.length;
    const bw = Math.min(240, (w - 80) / 3 - 12);
    const total = n * bw + (n - 1) * 20;
    const sx = w / 2 - total / 2;
    for (let i = 0; i < n; i++) {
      const cx = sx + i * (bw + 20);
      const cy = h * 0.42;
      if (x >= cx && x <= cx + bw && y >= cy && y <= cy + 200) return i;
    }
    return -1;
  }

  function pickCard(i: number) {
    if (i < 0 || i >= upgrade.length) return;
    applyCard(upgrade[i].id);
    upgrade = [];
    mode = "play";
    queueWave();
  }

  function onTitleClick(x: number, y: number) {
    audio.unlock();
    if (hitBtn(w / 2, h * 0.58, x, y, 210, 54)) { audio.sfx("ui"); begin(); return; }
    if (hitBtn(w / 2, h * 0.68, x, y, 210, 44)) { audio.sfx("ui"); hooks.onAcademy(); }
  }

  function touchAt(x: number, y: number) {
    const L = joyLayout();
    const inJ = Math.hypot(x - L.jx, y - L.jy) < L.jr + 20;
    const inA = Math.hypot(x - L.ax, y - L.ay) < L.ar + 8;
    const inB = Math.hypot(x - L.bx, y - L.by) < L.br + 8;
    return { inJ, inA, inB, L };
  }

  function onDown(e: PointerEvent) {
    audio.unlock();
    const { x, y } = toLocal(e);
    mouse.x = x; mouse.y = y;
    if (mode === "title") { onTitleClick(x, y); return; }
    if (mode === "dead") {
      if (hitBtn(w / 2, h * 0.64, x, y, 210, 54)) { audio.sfx("ui"); begin(); }
      else if (hitBtn(w / 2, h * 0.74, x, y, 210, 44)) { audio.sfx("ui"); mode = "title"; }
      return;
    }
    if (mode === "upgrade") {
      const i = cardAt(x, y);
      if (i >= 0) pickCard(i);
      return;
    }
    if (e.pointerType === "touch" || e.pointerType === "pen") showTouch = true;
    if (showTouch && mode === "play") {
      const t = touchAt(x, y);
      if (t.inJ) {
        joy.active = true; joy.id = e.pointerId;
        joy.x = clamp((x - t.L.jx) / t.L.jr, -1, 1);
        joy.y = clamp((y - t.L.jy) / t.L.jr, -1, 1);
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (t.inA) { btnA.on = true; btnA.id = e.pointerId; startAttack(); return; }
      if (t.inB) { btnB.on = true; btnB.id = e.pointerId; startDash(); return; }
    }
    if (e.button === 2 || e.buttons === 2) { mouse.right = true; startDash(); }
    else { mouse.left = true; mouse.aim = true; startAttack(); }
  }

  function onMove(e: PointerEvent) {
    const { x, y } = toLocal(e);
    mouse.x = x; mouse.y = y; mouse.aim = true;
    if (mode === "upgrade") hoverCard = cardAt(x, y);
    if (joy.active && e.pointerId === joy.id) {
      const L = joyLayout();
      const dx = x - L.jx, dy = y - L.jy;
      const m = Math.hypot(dx, dy) || 1;
      const s = Math.min(1, m / L.jr);
      joy.x = (dx / m) * s;
      joy.y = (dy / m) * s;
    }
  }

  function onUp(e: PointerEvent) {
    if (e.pointerId === joy.id) { joy.active = false; joy.id = -1; joy.x = 0; joy.y = 0; }
    if (e.pointerId === btnA.id) { btnA.on = false; btnA.id = -1; }
    if (e.pointerId === btnB.id) { btnB.on = false; btnB.id = -1; }
    if (e.button === 2) mouse.right = false;
    else mouse.left = false;
  }

  function onKey(e: KeyboardEvent, down: boolean) {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    if (down && ["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
    if (down) keys.add(k); else keys.delete(k);
    if (!down) return;
    audio.unlock();
    if (k === "m") { audio.toggleMute(); say(audio.muted() ? "MUTED" : "SOUND ON", 0.8); }
    if (k === "escape") {
      if (mode === "play") paused = !paused;
      else if (mode === "upgrade") { /* stay */ }
    }
    if (mode === "title" && (k === "enter" || k === " ")) begin();
    if (mode === "title" && k === "a") hooks.onAcademy();
    if (mode === "dead" && (k === "enter" || k === "r" || k === " ")) begin();
    if (mode === "dead" && k === "t") mode = "title";
    if (mode === "upgrade" && (k === "1" || k === "2" || k === "3")) pickCard(Number(k) - 1);
    if (mode === "play" && !paused && (k === "j" || k === " ")) startAttack();
    if (mode === "play" && !paused && (k === "shift" || k === "k")) startDash();
  }

  const onCtx = (e: Event) => e.preventDefault();
  const onBlur = () => { keys.clear(); mouse.left = false; mouse.right = false; };

  function onResize() { resize(); }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("contextmenu", onCtx);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", onResize);
  const kd = (e: KeyboardEvent) => onKey(e, true);
  const ku = (e: KeyboardEvent) => onKey(e, false);
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);

  resize();
  last = performance.now();
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      audio.stopMusic();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
    },
  };
}

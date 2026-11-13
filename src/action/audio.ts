/** Procedural combat SFX and a low drone, via Web Audio. No asset files. */

export type Sfx =
  | "slash"
  | "hit"
  | "dash"
  | "hurt"
  | "kill"
  | "pickup"
  | "wave"
  | "boss"
  | "ui"
  | "dead"
  | "shoot"
  | "upgrade"
  | "perfect"
  | "slam";

export type AudioApi = {
  unlock: () => void;
  sfx: (name: Sfx, vol?: number) => void;
  startMusic: () => void;
  stopMusic: () => void;
  toggleMute: () => boolean;
  toggleMusic: () => boolean;
  muted: () => boolean;
  musicOn: () => boolean;
  applyPrefs: (p: { muted: boolean; music: boolean; volume: number }) => void;
  volume: () => number;
};

export function createAudio(): AudioApi {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let musicGain: GainNode | null = null;
  let muted = false;
  let music = true;
  let volume = 0.7;
  let musicTimer = 0;
  let step = 0;

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = music ? 0.18 : 0;
      musicGain.connect(master);
    }
    if (ctx.state === "suspended") void ctx.resume();
  }

  function env(duration: number, peak: number, when = 0) {
    if (!ctx || !master) return null;
    const g = ctx.createGain();
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    g.connect(master);
    return { g, t, duration };
  }

  function osc(type: OscillatorType, freq: number, duration: number, peak: number, slide?: number, when = 0) {
    if (!ctx || !master) return;
    const e = env(duration, peak, when);
    if (!e) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, e.t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), e.t + duration);
    o.connect(e.g);
    o.start(e.t);
    o.stop(e.t + duration + 0.02);
  }

  function noise(duration: number, peak: number, hp = 400, when = 0) {
    if (!ctx || !master) return;
    const e = env(duration, peak, when);
    if (!e) return;
    const n = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    src.connect(f);
    f.connect(e.g);
    src.start(e.t);
    src.stop(e.t + duration + 0.02);
  }

  function sfx(name: Sfx, vol = 1) {
    if (muted) return;
    unlock();
    const v = vol;
    switch (name) {
      case "slash":
        noise(0.1, 0.22 * v, 1800);
        osc("sawtooth", 720, 0.09, 0.12 * v, 180);
        break;
      case "hit":
        osc("square", 240, 0.08, 0.2 * v, 70);
        noise(0.07, 0.18 * v, 600);
        break;
      case "dash":
        noise(0.16, 0.2 * v, 800);
        osc("sine", 420, 0.14, 0.08 * v, 140);
        break;
      case "hurt":
        osc("sawtooth", 180, 0.22, 0.22 * v, 60);
        noise(0.18, 0.16 * v, 200);
        break;
      case "kill":
        osc("triangle", 520, 0.16, 0.16 * v, 880);
        osc("sine", 260, 0.2, 0.1 * v, 520);
        break;
      case "pickup":
        osc("sine", 660, 0.1, 0.14 * v);
        osc("sine", 990, 0.12, 0.1 * v, undefined, 0.06);
        break;
      case "wave":
        osc("triangle", 220, 0.28, 0.14 * v, 440);
        osc("sine", 110, 0.4, 0.1 * v);
        break;
      case "boss":
        osc("sawtooth", 80, 0.6, 0.22 * v, 40);
        osc("square", 50, 0.5, 0.12 * v);
        noise(0.4, 0.14 * v, 100);
        break;
      case "ui":
        osc("sine", 740, 0.06, 0.1 * v);
        break;
      case "dead":
        osc("sawtooth", 200, 0.7, 0.2 * v, 40);
        noise(0.5, 0.16 * v, 150);
        break;
      case "shoot":
        osc("square", 640, 0.07, 0.1 * v, 280);
        noise(0.05, 0.08 * v, 2000);
        break;
      case "upgrade":
        osc("sine", 392, 0.14, 0.12 * v);
        osc("sine", 523, 0.16, 0.12 * v, undefined, 0.08);
        osc("sine", 784, 0.22, 0.12 * v, undefined, 0.16);
        break;
      case "perfect":
        osc("sine", 880, 0.1, 0.12 * v);
        osc("sine", 1320, 0.14, 0.1 * v, undefined, 0.05);
        break;
      case "slam":
        osc("sine", 70, 0.28, 0.28 * v, 30);
        noise(0.22, 0.2 * v, 80);
        break;
    }
  }

  function pulse() {
    if (!ctx || !musicGain || muted || !music) return;
    const t = ctx.currentTime;
    const notes = [55, 55, 82.5, 55, 73.4, 55, 82.5, 110];
    const f = notes[step % notes.length];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.value = f;
    filter.type = "lowpass";
    filter.frequency.value = 320;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(filter);
    filter.connect(g);
    g.connect(musicGain);
    o.start(t);
    o.stop(t + 0.45);
    if (step % 4 === 0) {
      const hat = ctx.createOscillator();
      const hg = ctx.createGain();
      hat.type = "triangle";
      hat.frequency.value = 880;
      hg.gain.setValueAtTime(0.08, t);
      hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      hat.connect(hg);
      hg.connect(musicGain);
      hat.start(t);
      hat.stop(t + 0.1);
    }
    step += 1;
  }

  function applyMaster() {
    if (master) master.gain.value = muted ? 0 : volume;
    if (musicGain) musicGain.gain.value = music && !muted ? 0.18 : 0;
  }

  function startMusic() {
    unlock();
    music = true;
    applyMaster();
    if (musicTimer) return;
    pulse();
    musicTimer = window.setInterval(pulse, 480);
  }

  function stopMusic() {
    if (musicTimer) {
      window.clearInterval(musicTimer);
      musicTimer = 0;
    }
  }

  return {
    unlock,
    sfx,
    startMusic,
    stopMusic,
    toggleMute() {
      muted = !muted;
      applyMaster();
      return muted;
    },
    toggleMusic() {
      music = !music;
      if (music) startMusic();
      else applyMaster();
      return music;
    },
    muted: () => muted,
    musicOn: () => music,
    volume: () => volume,
    applyPrefs(p) {
      muted = p.muted;
      music = p.music;
      volume = Math.max(0, Math.min(1, p.volume));
      if (music && !muted) startMusic();
      else applyMaster();
    },
  };
}

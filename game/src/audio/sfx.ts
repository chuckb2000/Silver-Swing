// Generated sound effects with ZzFX (MIT, Frank Force). The synth is loaded on
// the first user gesture so browsers' autoplay rules are respected.

type Params = (number | undefined)[];

const SOUNDS: Record<string, Params> = {
  click: [0.35, 0, 760, 0, 0.008, 0.03, 1, 1.5],
  back: [0.3, 0, 520, 0, 0.008, 0.04, 1, 1.5, -40],
  tick: [0.25, 0, 1300, 0, 0.004, 0.02, 1],
  whoosh: [0.55, 0.08, 220, 0.06, 0.05, 0.16, 4, 0.6, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 900],
  strike: [0.75, 0.04, 820, 0, 0.012, 0.07, 1, 2.2, -18, 0, 0, 0, 0, 1.4, 0, 0, 0, 0.5],
  perfect: [0.85, 0.02, 1250, 0, 0.015, 0.11, 0, 1.6, -24, 0, 540, 0.03, 0, 0.6, 0, 0, 0, 0.55],
  putt: [0.45, 0.03, 980, 0, 0.004, 0.035, 1, 1.8, -10],
  cup: [0.7, 0.06, 420, 0, 0.02, 0.12, 1, 1.2, -6, 0, 0, 0, 0.045, 0.3],
  splash: [0.7, 0.25, 160, 0.01, 0.12, 0.45, 4, 1, 4, 0, 0, 0, 0, 1.5, 0, 0, 0.04, 0.55, 0, 0, -1100],
  thud: [0.6, 0.1, 140, 0, 0.02, 0.09, 1, 2.5, -4, 0, 0, 0, 0, 1],
  wood: [0.55, 0.12, 300, 0, 0.012, 0.07, 2, 2, -12, 0, 0, 0, 0, 0.4],
  sand: [0.45, 0.2, 120, 0.01, 0.05, 0.2, 4, 1, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0.5, 0, 0, -1500],
  good: [0.45, 0, 523, 0.02, 0.06, 0.18, 0, 1.2, 0, 0, 262, 0.08],
  great: [0.5, 0, 659, 0.02, 0.1, 0.3, 0, 1.2, 0, 0, 330, 0.07, 0.11],
  bad: [0.45, 0, 196, 0.02, 0.1, 0.25, 1, 1.4, -6],
  chirp: [0.12, 0.2, 2600, 0.01, 0.03, 0.06, 0, 1.5, 90, 0, 0, 0, 0.07],
};

// ZzFX normally scales everything by 0.3 in its own player; we bypass that player
const MASTER_SCALE = 0.35;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let zz: { buildSamples: (...p: Params) => number[]; sampleRate: number } | null = null;
const cache = new Map<string, AudioBuffer>();
let volume = 0.7;
let muted = false;
let ambience: AudioBufferSourceNode | null = null;
let birdTimer: number | null = null;

export async function initAudio(): Promise<void> {
  if (ctx) {
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
    return;
  }
  try {
    const mod = await import('zzfx');
    zz = mod.ZZFX as unknown as typeof zz;
    // the library makes its own context; reuse it so only one exists
    ctx = (mod.ZZFX as unknown as { audioContext: AudioContext }).audioContext;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume * MASTER_SCALE;
    master.connect(ctx.destination);
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
  } catch {
    ctx = null;
  }
}

export function setVolume(v: number, m: boolean) {
  volume = v;
  muted = m;
  if (master) master.gain.value = muted ? 0 : volume * MASTER_SCALE;
}

function buffer(name: string): AudioBuffer | null {
  if (!ctx || !zz) return null;
  const hit = cache.get(name);
  if (hit) return hit;
  const p = SOUNDS[name];
  if (!p) return null;
  const samples = zz.buildSamples(...p);
  const b = ctx.createBuffer(1, samples.length, zz.sampleRate);
  b.getChannelData(0).set(samples);
  cache.set(name, b);
  return b;
}

export function sfx(name: keyof typeof SOUNDS | string, gain = 1, rate = 1) {
  if (!ctx || !master || muted) return;
  const b = buffer(name);
  if (!b) return;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master);
  src.start();
}

/** Quiet looping outdoor ambience: filtered wind noise plus occasional chirps. */
export function startAmbience() {
  if (!ctx || !master || ambience) return;
  const len = ctx.sampleRate * 6;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // brown-ish noise
    const swell = 0.6 + 0.4 * Math.sin((i / len) * Math.PI * 2 * 2) ** 2;
    d[i] = last * 3.2 * swell;
  }
  // crossfade the loop ends
  for (let i = 0; i < 2000; i++) {
    const t = i / 2000;
    d[i] = d[i] * t + d[len - 2000 + i] * (1 - t);
  }
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = 0.18;
  src.connect(g).connect(master);
  src.start();
  ambience = src;
  const chirpLoop = () => {
    if (Math.random() < 0.7) {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) setTimeout(() => sfx('chirp', 0.6 + Math.random() * 0.4, 0.85 + Math.random() * 0.4), k * 140);
    }
    birdTimer = window.setTimeout(chirpLoop, 3500 + Math.random() * 7000);
  };
  birdTimer = window.setTimeout(chirpLoop, 2500);
}

export function stopAmbience() {
  try { ambience?.stop(); } catch { /* already stopped */ }
  ambience = null;
  if (birdTimer !== null) clearTimeout(birdTimer);
  birdTimer = null;
}

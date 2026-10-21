// A stroke's flight as the striking player's game simulated it, sent to the
// other player's game to play back exactly. Their browser doesn't simulate
// the stroke again: the physics uses Math.sin, Math.hypot and friends, whose
// last digit may differ between browsers, and a ball on a cup's lip or a
// branch's edge could then end differently on the two screens.
//
// Every second sample is kept (60 a second: playback fills the steps between
// linearly), as little-endian float32 in base64. About 10 KB for a drive.

import { HZ, SimEvent, SimResult } from '../physics/sim';

const STEP = 2;
const MAX_SAMPLES = 60 * HZ; // a minute of simulation; the simulator stops at 45 s

export interface PathData {
  v: 1;
  n: number;
  s: string;
  end: { x: number; y: number; z: number };
  rest: number;
  holed: boolean;
  water: boolean;
  cross: { x: number; y: number } | null;
  landing: SimResult['landing'];
  ev: SimEvent[];
  dur: number;
  tree: boolean;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The stroke's samples (every second one, and always the last) and its outcome, as a string. */
export function encodePath(sim: SimResult): string {
  const keep: number[] = [];
  for (let i = 0; i < sim.n; i += STEP) keep.push(i);
  if (keep[keep.length - 1] !== sim.n - 1) keep.push(sim.n - 1);
  const buf = new ArrayBuffer(keep.length * 12);
  const dv = new DataView(buf);
  keep.forEach((i, k) => {
    for (let c = 0; c < 3; c++) dv.setFloat32(k * 12 + c * 4, sim.samples[i * 3 + c], true);
  });
  const d: PathData = {
    v: 1, n: sim.n, s: toBase64(new Uint8Array(buf)), end: { ...sim.end }, rest: sim.restSurface, holed: sim.holed, water: sim.inWater,
    cross: sim.waterCross, landing: sim.landing, ev: sim.events, dur: sim.duration, tree: sim.hitTree,
  };
  return JSON.stringify(d);
}

/** A sent stroke back as a SimResult for playback (every step filled in), or null if it doesn't read. */
export function decodePath(text: string): SimResult | null {
  let d: PathData;
  try { d = JSON.parse(text) as PathData; } catch { return null; }
  if (!d || d.v !== 1 || !Number.isInteger(d.n) || d.n < 1 || d.n > MAX_SAMPLES || typeof d.s !== 'string' || !d.end || !Array.isArray(d.ev)) return null;
  let bytes: Uint8Array;
  try { bytes = fromBase64(d.s); } catch { return null; }
  // kept samples: steps 0, 2, 4 ... and the last step
  const kept = Math.ceil(d.n / STEP) + ((d.n - 1) % STEP === 0 ? 0 : 1);
  if (bytes.length !== kept * 12) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const at = (k: number, c: number) => dv.getFloat32(k * 12 + c * 4, true);
  const stepOf = (k: number) => (k === kept - 1 ? d.n - 1 : k * STEP);
  const samples = new Float32Array(d.n * 3);
  for (let i = 0; i < d.n; i++) {
    const k0 = Math.min(kept - 1, Math.floor(i / STEP));
    const k1 = Math.min(kept - 1, k0 + 1);
    const a = stepOf(k0), b = stepOf(k1);
    const f = b > a ? (i - a) / (b - a) : 0;
    for (let c = 0; c < 3; c++) samples[i * 3 + c] = at(k0, c) + (at(k1, c) - at(k0, c)) * f;
  }
  if (![...samples].every(Number.isFinite)) return null;
  return {
    samples, n: d.n, end: d.end, restSurface: d.rest, holed: !!d.holed, inWater: !!d.water, waterCross: d.cross ?? null,
    landing: d.landing ?? null, events: d.ev, duration: d.dur, hitTree: !!d.tree,
  };
}

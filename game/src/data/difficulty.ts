// Difficulty presets (spec 9) and the round's wind.

import { Rng } from '../systems/physics/rng';
import { MPH } from '../systems/physics/sim';

export type Difficulty = 'easy' | 'normal' | 'pro';

export interface Preset {
  name: Difficulty;
  secondsPer100: number; // meter: its starting speed, as the time 100 % of the bar would take at it
  fastSecondsPer100: number; // meter: its speed at 100 % (it speeds up on the way to it)
  perfectZone: number;   // +-% of bar
  landingPreview: boolean;
  windScale: number;     // multiplies the course's wind range
}

export const PRESETS: Record<Difficulty, Preset> = {
  easy: { name: 'easy', secondsPer100: 2.0, fastSecondsPer100: 1.6, perfectZone: 3.5, landingPreview: true, windScale: 0.6 },
  normal: { name: 'normal', secondsPer100: 1.6, fastSecondsPer100: 1.3, perfectZone: 2.5, landingPreview: true, windScale: 1 },
  pro: { name: 'pro', secondsPer100: 1.25, fastSecondsPer100: 1.0, perfectZone: 1.8, landingPreview: false, windScale: 1 },
};

export interface Wind {
  dir: number;   // radians, direction the wind blows TOWARD (0 = east)
  mph: number;
  vx: number;    // m/s
  vy: number;
}

export interface WindRange { minMph: number; maxMph: number }

/** Typical wind for a course without its own range. */
export const DEFAULT_WIND: WindRange = { minMph: 1, maxMph: 7 };

const DRIFT_DEG = 18;   // the direction moves at most this much from one hole to the next
const DRIFT_MPH = 1.2;  // and the speed at most this much

export function makeWind(dir: number, mph: number): Wind {
  return { dir, mph, vx: Math.cos(dir) * mph * MPH, vy: Math.sin(dir) * mph * MPH };
}

/**
 * Wind for each hole of a round, in playing order: one weather system that
 * drifts a little from hole to hole and stays inside the course's range.
 */
export function roundWinds(seed: number, holes: number, range: WindRange, preset: Preset): Wind[] {
  const r = new Rng(seed).fork(4242);
  const lo = range.minMph * preset.windScale;
  const hi = Math.max(lo, range.maxMph * preset.windScale);
  let dir = r.range(0, Math.PI * 2);
  let mph = lo + (hi - lo) * Math.pow(r.next(), 1.3);
  const out: Wind[] = [];
  for (let i = 0; i < holes; i++) {
    if (i > 0) {
      dir += (r.range(-1, 1) * DRIFT_DEG * Math.PI) / 180;
      mph = Math.min(hi, Math.max(lo, mph + r.range(-DRIFT_MPH, DRIFT_MPH)));
    }
    out.push(makeWind(dir, Math.round(mph * 10) / 10));
  }
  return out;
}

/** Per-shot gust: +-8 % of the hole's wind speed. */
export function gust(w: Wind, r: Rng): { vx: number; vy: number; mph: number } {
  const g = r.range(0.92, 1.08);
  return { vx: w.vx * g, vy: w.vy * g, mph: w.mph * g };
}

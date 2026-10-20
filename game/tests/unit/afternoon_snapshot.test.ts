// Afternoon review (2026-10-20): a mulligan after resuming a round took the
// stroke back but kept its penalty (the pre-shot state wasn't in the snapshot).
import { describe, expect, it, vi } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { Round } from '../../src/systems/game/round';
import { SimResult } from '../../src/systems/physics/sim';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';

const mem = vi.hoisted(() => ({ app: { course: null as unknown }, saved: null as unknown }));
vi.mock('../../src/app', () => ({ app: mem.app }));
vi.mock('../../src/save/store', () => ({
  // what IndexedDB would keep (a structured clone; JSON is close enough here)
  saveRoundInProgress: async (s: unknown) => { mem.saved = JSON.parse(JSON.stringify(s)); },
  loadRoundInProgress: async () => mem.saved,
  clearRoundInProgress: async () => { mem.saved = null; },
}));
import { restoreRound, saveSnapshot } from '../../src/save/snapshot';

function fakeSim(from: { x: number; y: number }, x: number, y: number, surf: number): SimResult {
  const n = 20;
  const samples = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    samples[i * 3] = from.x + (x - from.x) * f;
    samples[i * 3 + 1] = from.y + (y - from.y) * f;
  }
  const water = surf === SURF.water;
  return {
    samples, n, end: { x, y, z: 0 }, restSurface: surf, holed: false, inWater: water, waterCross: water ? { ...from } : null,
    landing: { x, y, z: 0, t: 1 }, events: [], duration: 1, hitTree: false,
  };
}

describe('a mulligan after a resume', () => {
  it('takes back the penalty too (the pre-shot state is saved with the round)', async () => {
    const langston = loadCourseFiles('langston');
    mem.app.course = langston;
    const t = langston.terrain;
    let w = { x: 0, y: 0 };
    search: for (let y = 2; y < t.height; y += 3) for (let x = 2; x < t.width; x += 3) if (t.surface(x, y) === SURF.water) { w = { x, y }; break search; }
    const cfg = roundCfg(langston, [1]);
    cfg.settings.mulligans = true;
    const r = new Round(langston, cfg);
    r.startHole(0);
    const p0 = r.plan('dr', r.defaultAim(clubById('dr'), 1), meterFor(1, 0, false), 0, 1);
    r.resolve(p0, fakeSim(r.ball, r.ball.x + 30, r.ball.y + 30, SURF.fairway));
    const before = { strokes: r.tally.strokes, penalties: r.tally.penalties, x: r.ball.x, y: r.ball.y };
    const p1 = r.plan('7i', r.defaultAim(clubById('7i'), 1), meterFor(0.7, 0, false), 0, 1);
    const out = r.resolve(p1, fakeSim(r.ball, w.x, w.y, SURF.water));
    if (out.kind !== 'water' && out.kind !== 'ob') throw new Error(out.kind);
    r.applyRelief(out.options[0], out.options[0].center);
    expect(r.tally.penalties).toBe(1);
    await saveSnapshot(r);
    const back = await restoreRound();
    const r2 = back!.round;
    expect(r2.tally.penalties).toBe(1);
    expect(r2.mulligan()).toBe(true);
    expect([r2.tally.strokes, r2.tally.penalties]).toEqual([before.strokes, before.penalties]);
    expect([r2.ball.x, r2.ball.y]).toEqual([before.x, before.y]);
  });
});

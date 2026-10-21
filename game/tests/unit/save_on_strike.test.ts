// A stroke is saved the moment it is struck (developer, 2026-10-20: "if you refresh while a
// ball is in midair ... you get to take it again"): the saved round is the round after the
// stroke has come to rest, and the round in play is left exactly as it was.
import { describe, expect, it, vi } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { Round } from '../../src/systems/game/round';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';

const mem = vi.hoisted(() => ({ app: { course: null as unknown }, saved: null as unknown }));
vi.mock('../../src/app', () => ({ app: mem.app }));
vi.mock('../../src/save/store', () => ({
  saveRoundInProgress: async (s: unknown) => { mem.saved = JSON.parse(JSON.stringify(s)); },
  loadRoundInProgress: async () => mem.saved,
  clearRoundInProgress: async () => { mem.saved = null; },
}));
import { restoreRound, saveStruck } from '../../src/save/snapshot';

const state = (r: Round) => JSON.stringify({ t: { ...r.tally }, b: r.ball, p: r.prev, n: r.shotNo, h: r.history, s: r.scores, pe: r.pending, rng: r.rng.state, lie: r.lie });

describe('a stroke is locked in when it is struck', () => {
  const c = loadCourseFiles('oswego_lake');
  mem.app.course = c;

  it('a reload mid-flight resumes after the stroke; the round in play is untouched until the ball rests', async () => {
    const r = new Round(c, roundCfg(c, [1]));
    r.startHole(0);
    const p = r.plan('dr', r.defaultAim(clubById('dr'), 1), meterFor(1, 0, false), 0, 1);
    const sim = r.simulate(p);
    const before = state(r);
    await saveStruck(r, p, sim);
    expect(state(r)).toBe(before);
    const back = (await restoreRound())!.round;
    expect(back.tally.strokes).toBe(1);
    expect(back.shotNo).toBe(1);
    expect([back.ball.x, back.ball.y]).toEqual([sim.end.x, sim.end.y]);
    // and resting for real gives the same round
    r.resolve(p, sim);
    expect([r.tally.strokes, r.ball.x, r.ball.y]).toEqual([back.tally.strokes, back.ball.x, back.ball.y]);
  });

  it('a holing stroke saves the finished hole', async () => {
    const r = new Round(c, roundCfg(c, [1, 2]));
    r.startHole(0);
    const p = r.plan('dr', r.defaultAim(clubById('dr'), 1), meterFor(1, 0, false), 0, 1);
    const sim = { ...r.simulate(p), holed: true, end: { x: r.pin.x, y: r.pin.y, z: 0 } }; // an ace
    await saveStruck(r, p, sim);
    expect(r.scores.length).toBe(0);
    const back = await restoreRound();
    expect(back!.betweenHoles).toBe(true);
    expect(back!.round.scores.map((h) => h.strokes)).toEqual([1]);
  });
});

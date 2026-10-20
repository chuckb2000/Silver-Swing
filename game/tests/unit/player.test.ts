// Player improvements approved 2026-10-20 (docs/reports/player_improvements.md
// items 2, 3, 4, 5, 7, 8, 9 and 11).
import { describe, expect, it } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { Round } from '../../src/systems/game/round';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';

describe('replay (item 9)', () => {
  const course = loadCourseFiles('oswego_lake');

  it('plays the last stroke back exactly: the same path, events and end', () => {
    const r = new Round(course, roundCfg(course, [1, 2]));
    r.startHole(0);
    const c = clubById('dr');
    const p = r.plan(c.id, r.defaultAim(c, 1), meterFor(0.95, 4, false), 0, 1);
    const sim = r.simulate(p);
    r.resolve(p, sim);
    const again = r.replay()!;
    expect(again.n).toBe(sim.n);
    expect(again.end).toEqual(sim.end);
    expect(again.events).toEqual(sim.events);
    expect(Array.from(again.samples)).toEqual(Array.from(sim.samples));
  });

  it('a putt replays the same, and the next hole starts with nothing to replay', () => {
    const r = new Round(course, roundCfg(course, [1, 2], 11));
    r.startHole(0);
    r.ball = { x: r.pin.x + 4, y: r.pin.y + 1, teedUp: false };
    r.refreshLie();
    const pu = clubById('pt');
    const p = r.plan(pu.id, r.defaultAim(pu, 1), meterFor(0.4, 0, true), 0, 12);
    const sim = r.simulate(p);
    expect(r.replay()!.end).toEqual(sim.end);
    r.nextHole();
    expect(r.replay()).toBeNull();
  });
});

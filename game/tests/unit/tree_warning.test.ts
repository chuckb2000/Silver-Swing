// The tree warning (developer, 2026-11-14: "sometimes a little difficult to tell when a ball is going
// to go into the trees"): Round.previewFlight is a perfect stroke down the aim line in calm air, its
// arc and where it would first touch a tree. A line with no tree on it must be one a perfect stroke
// never hits a tree on; a line with one must show where the real ball meets it.
import { describe, expect, it } from 'vitest';
import { Round } from '../../src/systems/game/round';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { CLUBS } from '../../src/data/clubs';
import { loadCourseFiles, roundCfg } from './helpers';

describe('the tree warning on the aim line', () => {
  const c = loadCourseFiles('shaughnessy');
  // Shaughnessy's tee shots, 16 degrees either side of the default aim, a degree apart
  const lines: { r: Round; aim: number; hole: number }[] = [];
  for (const hole of [2, 3, 6, 9, 12]) {
    const r = new Round(c, roundCfg(c, [hole]));
    r.startHole(0);
    const club = r.autoClub();
    const a0 = r.defaultAim(club, 1);
    for (let d = -16; d <= 16; d += 1) lines.push({ r, aim: a0 + (d * Math.PI) / 180, hole });
  }

  it('the arc ends at the landing marker, and starts at the ball', () => {
    for (const { r, aim } of lines) {
      const club = r.autoClub();
      const pv = r.previewFlight(club, aim, 1);
      const end = pv.path[pv.path.length - 1];
      const L = r.previewLanding(club, aim, 1);
      expect(Math.hypot(end.x - L.x, end.y - L.y)).toBeLessThan(1.5);
      expect(Math.hypot(pv.path[0].x - r.ball.x, pv.path[0].y - r.ball.y)).toBeLessThan(1);
      expect(Math.max(...pv.path.map((p) => p.h))).toBeGreaterThan(15); // a full shot climbs
    }
  });

  it('some lines are clear and some are not', () => {
    const hits = lines.filter(({ r, aim }) => r.previewFlight(r.autoClub(), aim, 1).hit).length;
    expect(hits).toBeGreaterThan(5);
    expect(hits).toBeLessThan(lines.length - 5);
  });

  it('a clear line: a perfect stroke never touches a tree, whatever the luck', () => {
    let checked = 0;
    for (const { r, aim } of lines) {
      const club = r.autoClub();
      if (r.previewFlight(club, aim, 1).hit) continue;
      const spec = r['flightSpec'](club, aim, r['perfectStrike'](club, 1), 0, { vx: 0, vy: 0 });
      for (let seed = 1; seed <= 4; seed++) {
        const s = simulateShot(c.terrain, c.obstacles, { ...spec }, new Rng(seed));
        expect(s.events.some((e) => e.type === 'canopy' || e.type === 'trunk')).toBe(false);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('a red line: where the real ball first meets the tree is the warning\'s mark, and the arc runs through it', () => {
    let checked = 0;
    for (const { r, aim } of lines) {
      const club = r.autoClub();
      const pv = r.previewFlight(club, aim, 1);
      if (!pv.hit) continue;
      expect(pv.hit.h).toBeGreaterThanOrEqual(0);
      const at = pv.path[pv.hit.k];
      expect(Math.hypot(at.x - pv.hit.x, at.y - pv.hit.y)).toBeLessThan(1);
      // a real perfect stroke that does hit a tree (a canopy is luck) meets the first one at the mark
      const spec = r['flightSpec'](club, aim, r['perfectStrike'](club, 1), 0, { vx: 0, vy: 0 });
      for (let seed = 1; seed <= 6; seed++) {
        const s = simulateShot(c.terrain, c.obstacles, { ...spec }, new Rng(seed));
        const ev = s.events.find((e) => e.type === 'canopy' || e.type === 'trunk');
        // a branch further along can be hit when the first crown lets the ball through, never one before
        if (ev) expect(Math.hypot(ev.x - r.ball.x, ev.y - r.ball.y)).toBeGreaterThanOrEqual(Math.hypot(pv.hit.x - r.ball.x, pv.hit.y - r.ball.y) - 0.5);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('no warning for a putt', () => {
    const r = lines[0].r;
    const putter = CLUBS.find((k) => k.kind === 'putter')!;
    expect(r.previewFlight(putter, 0, 1)).toEqual({ path: [], hit: null });
  });
});

// The auto club allows for the ground (Wildwood course chat, 2026-10-24): Wildwood 3
// drops 17.5 m from tee to green, and the club picked by flat carry (a 6-iron for
// 155 m) flew a perfect shot 25 m past the pin. The club is now picked by where its
// perfect shot lands on the real terrain, so a steep drop takes less club and a climb
// more, with no separate plays-like formula.
import { describe, expect, it } from 'vitest';
import { CLUBS } from '../../src/data/clubs';
import { Round } from '../../src/systems/game/round';
import { loadCourseFiles, registry, roundCfg } from './helpers';

/** A par 3 of a course, its round set up on the tee in calm air, with the ground tilted along the hole. */
function setUp(drop: number) {
  const id = registry()[0].id;
  const course = loadCourseFiles(id);
  const par3 = course.json.holes.find((h) => h.par === 3)!;
  const r = new Round(course, roundCfg(course, [par3.number]));
  r.startHole(0);
  r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
  if (drop !== 0) {
    // tilt the ground about the pin: unchanged there, `drop` metres higher at the tee (the green
    // keeps its own shaped heights, so the pin end can't move)
    const t = course.terrain as unknown as { hz: Float32Array; hCols: number; hRows: number };
    const d = r.distToPin();
    const ux = (r.pin.x - r.ball.x) / d, uy = (r.pin.y - r.ball.y) / d;
    for (let j = 0; j < t.hRows; j++) {
      for (let i = 0; i < t.hCols; i++) {
        const along = (i - r.ball.x) * ux + (j - r.ball.y) * uy;
        t.hz[j * t.hCols + i] += (drop / d) * (d - along);
      }
    }
  }
  return r;
}

const carryOf = (id: string) => CLUBS.find((c) => c.id === id)!.carryM;

describe('auto club on sloping ground', () => {
  it('takes less club for a steep drop and more for a climb', () => {
    const flat = setUp(0).autoClub();
    const down = setUp(17.5).autoClub();
    const up = setUp(-17.5).autoClub();
    expect(carryOf(down.id)).toBeLessThan(carryOf(flat.id));
    expect(carryOf(up.id)).toBeGreaterThan(carryOf(flat.id));
  });

  it('its perfect shot lands near the pin on the tilted hole', () => {
    for (const drop of [17.5, -17.5]) {
      const r = setUp(drop);
      const c = r.autoClub();
      const toPin = Math.atan2(r.pin.y - r.ball.y, r.pin.x - r.ball.x);
      const l = r.previewLanding(c, toPin, 1);
      // within half a club's gap (about 6 m) plus a little for the landing step
      expect(Math.hypot(l.x - r.pin.x, l.y - r.pin.y)).toBeLessThan(8);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { FULL_MAX, LATE_POWER_TAP_MS, PART_MAX, SwingMeter, ZONE_REACH } from '../../src/systems/swing/meter';
import { GOOD_BAND, IN_ZONE_CURVE, missCurve, missWord, perfectHalfWidth, powerFactor, puttStrikeFrom, strikeFrom } from '../../src/systems/swing/outcome';
import { PRESETS } from '../../src/data/difficulty';

const per100 = 1.6; // normal: seconds for 100 % of the bar
const speed = 100 / (per100 * 1000); // % per ms

/** Full swing: power tap at powerPct, third tap with the cursor at tapPct (zone centre = 0). */
function swing(powerPct: number, tapPct: number, latency = 0, kind: 'full' | 'putt' = 'full') {
  const m = new SwingMeter(kind, per100, kind === 'putt' ? PART_MAX : FULL_MAX, latency);
  const t0 = 1000;
  m.tap(t0);
  const t2 = t0 + powerPct / speed;
  m.tap(t2);
  m.tap(t2 + (powerPct - tapPct) / speed);
  return m.result!;
}

const lieFairway = { distMult: 1, windowMult: 1 };

describe('three-tap meter (spec 6.1, playtest rework)', () => {
  it('reads power and the tap-3 offset from timestamps', () => {
    const r = swing(80, 0);
    expect(r.power).toBeCloseTo(0.8, 5);
    expect(r.offset).toBeCloseTo(0, 5);
    expect(r.maxed).toBe(false);
    expect(r.late).toBe(false);
  });

  it('a tap right of the zone centre is positive, left of it negative', () => {
    expect(swing(90, 4).offset).toBeCloseTo(4, 5);
    expect(swing(90, -4).offset).toBeCloseTo(-4, 5);
  });

  it('the cursor is slower than before: 100 % takes 1.6 s on normal', () => {
    const m = new SwingMeter('full', per100);
    m.tap(0);
    expect(m.position(800)).toBeCloseTo(50, 5);
  });

  it('reaching the end of the bar is maximum power, and the meter carries on for tap 3', () => {
    const m = new SwingMeter('full', per100);
    m.tap(0);
    const tEnd = FULL_MAX / speed;
    m.update(tEnd + 5);
    expect(m.phase).toBe('accuracy');
    expect(m.power).toBe(FULL_MAX);
    // back to the zone centre: a perfect strike at 110 %
    m.tap(tEnd + FULL_MAX / speed);
    expect(m.result?.power).toBeCloseTo(1.1, 5);
    expect(m.result?.offset).toBeCloseTo(0, 5);
    expect(m.result?.maxed).toBe(true);
  });

  it('a power tap just after the automatic turn does not count as tap 3', () => {
    const m = new SwingMeter('full', per100);
    m.tap(0);
    const tEnd = FULL_MAX / speed;
    m.update(tEnd + 10);
    m.tap(tEnd + LATE_POWER_TAP_MS - 20);
    expect(m.phase).toBe('accuracy');
  });

  it('no third tap before the left end is the biggest miss to the left', () => {
    const m = new SwingMeter('full', per100);
    m.tap(0);
    m.tap(500);
    m.update(500 + (500 * speed + ZONE_REACH) / speed + 20);
    expect(m.result?.late).toBe(true);
    expect(m.result?.offset).toBe(-ZONE_REACH);
  });

  it('latency calibration shifts taps 2 and 3', () => {
    const late = swing(80, 0, 30); // taps registered 30 ms late are corrected
    expect(late.power).toBeLessThan(0.8);
  });

  it('putts take three taps and stop at 100 %', () => {
    const m = new SwingMeter('putt', per100);
    expect(m.max).toBe(PART_MAX);
    m.tap(0);
    m.tap(500);
    expect(m.phase).toBe('accuracy');
    m.tap(1000);
    expect(m.phase).toBe('done');
    const r = m.result!;
    expect(r.power).toBeCloseTo(500 * speed / 100, 5);
  });
});

describe('strike outcome (spec 6.2)', () => {
  const d = clubById('dr');
  const i7 = clubById('7i');

  it('power is linear up to 100% then +8% at 110%', () => {
    expect(powerFactor(0.7)).toBeCloseTo(0.7);
    expect(powerFactor(1.1)).toBeCloseTo(1.08);
  });

  it('a perfect tap is straight and loses nothing', () => {
    const s = strikeFrom(swing(100, 0), i7, lieFairway, 2.5, false);
    expect(s.curveDeg).toBe(0);
    expect(s.loss).toBe(0);
    expect(s.carry).toBeCloseTo(i7.carryM, 3);
    expect(s.quality).toBe('perfect');
  });

  it('the ball goes the way of the miss: left of centre curves left, right curves right', () => {
    const left = strikeFrom(swing(100, -8), d, lieFairway, 2.5, false);
    const right = strikeFrom(swing(100, 8), d, lieFairway, 2.5, false);
    expect(left.curveDeg).toBeLessThan(0);
    expect(right.curveDeg).toBeGreaterThan(0);
    expect(left.quality).toBe('hook');
    expect(right.quality).toBe('slice');
    // a left-hander's ball goes the same way; only the name changes
    const lefty = strikeFrom(swing(100, 8), d, lieFairway, 2.5, true);
    expect(lefty.curveDeg).toBeGreaterThan(0);
    expect(lefty.quality).toBe('hook');
    expect(missWord(1, false, false)).toBe('fade');
    expect(missWord(-1, false, false)).toBe('draw');
  });

  it('a yellow miss curves noticeably; red misses keep growing; the curve never shrinks', () => {
    const half = perfectHalfWidth(2.5, d, lieFairway, false);
    const yellow = strikeFrom(swing(100, half + 0.3), d, lieFairway, 2.5, false);
    expect(yellow.quality).toBe('good');
    expect(yellow.curveDeg).toBeGreaterThanOrEqual(0.9 * d.curveFactor);
    let prev = 0;
    for (let e = 0; e <= 12; e += 0.1) {
      expect(missCurve(e)).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = missCurve(e);
    }
    expect(missCurve(5)).toBe(5); // red: unchanged from the first playtest
    expect(missCurve(GOOD_BAND)).toBeCloseTo(0.9 + 0.75 * GOOD_BAND);
  });

  it('misses cost 5-15% distance and curve is capped at 25 degrees', () => {
    const small = strikeFrom(swing(100, 3), i7, lieFairway, 2.5, false);
    expect(small.loss).toBeGreaterThanOrEqual(0.05);
    const big = strikeFrom(swing(100, 40), d, lieFairway, 2.5, false);
    expect(big.loss).toBeCloseTo(0.15);
    expect(Math.abs(big.curveDeg)).toBe(25);
  });

  it('overswing halves the perfect zone and doubles the curve', () => {
    expect(perfectHalfWidth(2.5, i7, lieFairway, true)).toBeCloseTo(perfectHalfWidth(2.5, i7, lieFairway, false) / 2);
    const normal = strikeFrom(swing(100, 4), i7, lieFairway, 2.5, false);
    const over = strikeFrom(swing(110, 4), i7, lieFairway, 2.5, false);
    expect(Math.abs(over.curveDeg)).toBeGreaterThan(Math.abs(normal.curveDeg) * 1.9);
    expect(over.overswing).toBe(true);
  });

  it('swing length scales the power: a 1/2 swing at 100 % carries half as far', () => {
    const half = strikeFrom(swing(100, 0), i7, lieFairway, 2.5, false, 0.5);
    expect(half.power).toBeCloseTo(0.5, 5);
    expect(half.carry).toBeCloseTo(i7.carryM * 0.5, 3);
    expect(half.overswing).toBe(false);
  });

  it('driver has a narrower window than a wedge; rough narrows it further', () => {
    const sw = clubById('sw');
    expect(perfectHalfWidth(2.5, d, lieFairway, false)).toBeLessThan(perfectHalfWidth(2.5, sw, lieFairway, false));
    expect(perfectHalfWidth(2.5, i7, { distMult: 0.85, windowMult: 0.7 }, false)).toBeCloseTo(2.5 * 0.7);
  });

  it('a putt off line goes the way of the miss and loses a little distance', () => {
    const pt = clubById('pt');
    const good = puttStrikeFrom(swing(60, 0, 0, 'putt'), 2.5, pt.windowMult, false);
    expect(good.dirDeg).toBe(0);
    expect(good.distMult).toBe(1);
    const right = puttStrikeFrom(swing(60, 9, 0, 'putt'), 2.5, pt.windowMult, false);
    const left = puttStrikeFrom(swing(60, -9, 0, 'putt'), 2.5, pt.windowMult, false);
    expect(right.dirDeg).toBeGreaterThan(0);
    expect(left.dirDeg).toBeLessThan(0);
    expect(right.quality).toBe('push');
    expect(left.quality).toBe('pull');
    expect(right.distMult).toBeLessThan(1);
    expect(Math.abs(puttStrikeFrom(swing(60, 14, 0, 'putt'), 2.5, 1, false).dirDeg)).toBeLessThanOrEqual(6);
  });
});

describe('meter cursor after a tap (developer, 2026-10-19: no jump back)', () => {
  it('with no latency setting the power tap freezes the cursor where it was, not behind it', () => {
    const m = new SwingMeter('full', 1.1);
    m.tap(1000);
    const drawn = m.position(1400); // the last frame drawn before the tap
    m.tap(1405); // the tap, a few ms after that frame
    expect(m.position(1405)).toBeGreaterThanOrEqual(drawn);
    expect(m.position(1405)).toBeCloseTo((1405 - 1000) * m.speed, 6);
  });
});

describe('meter speeds up toward 100 % (developer, 2026-10-19)', () => {
  const pr = PRESETS.normal;
  const make = (kind: 'full' | 'putt' = 'full') => new SwingMeter(kind, pr.secondsPer100, kind === 'putt' ? PART_MAX : FULL_MAX, 0, pr.fastSecondsPer100);

  it('starts at the slow speed and reaches the original speed at 100 %, never faster', () => {
    const m = make();
    expect(m.speedAt(0)).toBeCloseTo(100 / (pr.secondsPer100 * 1000), 9);
    expect(m.speedAt(50)).toBeGreaterThan(m.speedAt(10));
    expect(m.speedAt(100)).toBeCloseTo(100 / (pr.fastSecondsPer100 * 1000), 9);
    expect(m.speedAt(110)).toBeCloseTo(m.speedAt(100), 9);
    for (const k of ['easy', 'normal', 'pro'] as const) {
      expect(PRESETS[k].fastSecondsPer100).toBeLessThan(PRESETS[k].secondsPer100);
    }
    // the original meter: 100 % in 1.2 / 1.0 / 0.8 s
    expect([PRESETS.easy.fastSecondsPer100, PRESETS.normal.fastSecondsPer100, PRESETS.pro.fastSecondsPer100]).toEqual([1.2, 1.0, 0.8]);
  });

  it('100 % comes sooner than at the old constant speed but later than the original meter', () => {
    const m = make();
    const t100 = m.timeTo(100);
    expect(t100).toBeLessThan(pr.secondsPer100 * 1000);
    expect(t100).toBeGreaterThan(pr.fastSecondsPer100 * 1000);
  });

  it('the cursor position follows the speed-up and tap times invert it', () => {
    const m = make();
    m.tap(0);
    for (const p of [5, 30, 60, 95, 100, 105]) expect(m.position(m.timeTo(p))).toBeCloseTo(p, 6);
  });

  it('the cursor comes back at the speed it had at tap 2', () => {
    for (const power of [25, 60, 100]) {
      const m = make();
      m.tap(0);
      const [t2] = m.tapTimes(power, 0);
      m.tap(t2);
      expect(m.backSpeed).toBeCloseTo(m.speedAt(power), 9);
      expect(m.position(t2 + 100)).toBeCloseTo(power - 100 * m.speedAt(power), 6);
    }
  });

  it('a short swing is easier to time than a full one: the green zone lasts longer', () => {
    const m = make();
    expect(1 / m.speedAt(30)).toBeGreaterThan(1.3 / m.speedAt(100));
  });

  it('tapTimes gives the swing asked for', () => {
    for (const [power, err] of [[40, 0], [80, 3], [100, -2], [110, 0]]) {
      const m = make();
      m.tap(1000);
      const [d2, d3] = m.tapTimes(power, err);
      m.tap(1000 + d2);
      m.tap(1000 + d3);
      expect(m.result!.power).toBeCloseTo(power / 100, 5);
      expect(m.result!.offset).toBeCloseTo(err, 5);
    }
  });

  it('reaching the end turns the cursor at full speed', () => {
    const m = make();
    m.tap(0);
    m.update(m.timeTo(FULL_MAX) + 5);
    expect(m.phase).toBe('accuracy');
    expect(m.backSpeed).toBeCloseTo(m.speedAt(100), 9);
  });

  it('putts speed up the same way', () => {
    const m = make('putt');
    expect(m.speedAt(100)).toBeGreaterThan(m.speedAt(0));
  });
});

describe('inside the green zone only the centre is straight (developer, 2026-10-19)', () => {
  const d = clubById('dr');
  const i7 = clubById('7i');

  it('off centre in the green curves a little that way, growing toward the edge', () => {
    const half = perfectHalfWidth(2.5, d, lieFairway, false);
    const c = strikeFrom(swing(100, 0), d, lieFairway, 2.5, false);
    expect(c.curveDeg).toBe(0);
    expect(c.quality).toBe('perfect');
    const r1 = strikeFrom(swing(100, half * 0.5), d, lieFairway, 2.5, false);
    const r2 = strikeFrom(swing(100, half * 0.95), d, lieFairway, 2.5, false);
    const l2 = strikeFrom(swing(100, -half * 0.95), d, lieFairway, 2.5, false);
    expect(r1.curveDeg).toBeGreaterThan(0);
    expect(r2.curveDeg).toBeGreaterThan(r1.curveDeg);
    expect(l2.curveDeg).toBeLessThan(0);
    expect(r2.curveDeg).toBeLessThanOrEqual(IN_ZONE_CURVE * d.curveFactor + 1e-9);
    expect(r2.loss).toBe(0);
    expect(r2.quality).toBe('great');
    // smaller than the smallest yellow miss
    const yellow = strikeFrom(swing(100, half + 0.05), d, lieFairway, 2.5, false);
    expect(yellow.curveDeg).toBeGreaterThan(r2.curveDeg);
  });

  it('the inner part of the zone still counts as perfect', () => {
    const half = perfectHalfWidth(2.5, i7, lieFairway, false);
    expect(strikeFrom(swing(100, half * 0.2), i7, lieFairway, 2.5, false).quality).toBe('perfect');
  });

  it('putts: a slightly off-centre tap starts the ball a touch off line, no distance lost', () => {
    const pt = clubById('pt');
    const half = 2.5 * pt.windowMult;
    const p = puttStrikeFrom(swing(60, half * 0.9, 0, 'putt'), 2.5, pt.windowMult, false);
    expect(p.dirDeg).toBeGreaterThan(0);
    expect(p.dirDeg).toBeLessThan(0.3);
    expect(p.distMult).toBe(1);
  });
});

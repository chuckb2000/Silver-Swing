// The meter counts a tap where the cursor was drawn (developer, 2026-10-22:
// "it is not registering exactly where i click... usually in my favor").

import { describe, expect, it } from 'vitest';
import { DRAWN_WITHIN_MS, SwingMeter } from '../../src/systems/swing/meter';

/** A meter whose screen draws it every `frame` ms from `from` to `to`. */
function drawEvery(m: SwingMeter, from: number, to: number, frame = 16.7) {
  for (let t = from; t <= to; t += frame) m.drawn(t);
}

describe('what you see is what you get', () => {
  it('the power tap counts where the cursor was last drawn, not where it had got to by the tap', () => {
    const m = new SwingMeter('full', 1.6, 110, 0, 1.3);
    m.tap(1000);
    drawEvery(m, 1000, 1700);
    const lastDrawn = 1000 + Math.floor(700 / 16.7) * 16.7;
    const seenPos = m.position(lastDrawn);
    m.tap(1712); // 12 ms after that frame
    expect(m.power).toBeCloseTo(seenPos, 6);
  });

  it('the accuracy tap too, and the stopped cursor stays where it was drawn (no jump)', () => {
    const m = new SwingMeter('full', 1.6, 110, 0, 1.3);
    m.tap(0);
    const [t2, t3] = m.tapTimes(90, 0);
    drawEvery(m, 0, t3 + 40, 16);
    m.tap(t2 + 5);
    const lastBefore3 = Math.floor((t3 + 9) / 16) * 16;
    const shown = m.position(lastBefore3);
    m.tap(t3 + 9);
    expect(m.phase).toBe('done');
    expect(m.result!.offset).toBeCloseTo(shown, 6);
    expect(m.position(t3 + 40)).toBeCloseTo(shown, 6);
  });

  it('the cursor carries on smoothly after the power tap (it turns from where it was seen)', () => {
    const m = new SwingMeter('full', 1.6, 110, 0, 1.3);
    m.tap(0);
    drawEvery(m, 0, 900, 16);
    const seen = Math.floor(900 / 16) * 16;
    const before = m.position(seen);
    m.tap(900);
    expect(m.position(seen)).toBeCloseTo(before, 6); // the turn is at the drawn spot
    expect(m.position(910)).toBeLessThan(before);
  });

  it('with no frame drawn lately (a stalled screen, a scripted tap) the tap time counts', () => {
    const m = new SwingMeter('full', 1.6, 110, 0, 1.3);
    m.tap(0);
    m.drawn(100);
    const ref = new SwingMeter('full', 1.6, 110, 0, 1.3);
    ref.tap(0);
    m.tap(100 + DRAWN_WITHIN_MS + 30);
    ref.tap(100 + DRAWN_WITHIN_MS + 30);
    expect(m.power).toBeCloseTo(ref.power, 9);
  });

  it('a frame drawn before the swing started does not count', () => {
    const m = new SwingMeter('full', 1.6, 110, 0, 1.3);
    m.drawn(995);
    m.tap(1000);
    const ref = new SwingMeter('full', 1.6, 110, 0, 1.3);
    ref.tap(1000);
    m.tap(1030);
    ref.tap(1030);
    expect(m.power).toBeCloseTo(ref.power, 9);
  });
});

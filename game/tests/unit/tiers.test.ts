// Two-tiered greens: the tier term of the analytic green model (Highland Links hole 9).
import { describe, expect, it } from 'vitest';
import { GreenModel, tierOffset } from '../../src/systems/physics/terrain';

const square = [[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]];
const tier = { x: 0, y: 0, nx: 0, ny: -1, w: 4, h: 0.9 }; // upper tier to the south

describe('green tiers', () => {
  it('adds a centred step of height h across the line', () => {
    expect(tierOffset(0, 0, [tier])).toBeCloseTo(0, 9);
    expect(tierOffset(0, -5, [tier])).toBeCloseTo(0.45, 9); // upper tier
    expect(tierOffset(0, 5, [tier])).toBeCloseTo(-0.45, 9); // lower tier
    expect(tierOffset(3, -2, [tier])).toBeCloseTo(0.45, 9); // the step ends w/2 from the line
  });

  it('is part of the green surface the ball rolls on, with the steepest slope 1.5 h / w at the line', () => {
    const g = new GreenModel({ id: 't', hole: 9, poly: square, cx: 0, cy: 0, z0: 10, gx: 0, gy: 0, bumps: [], blend: 3, tiers: [tier] });
    expect(g.shaped(0, -6) - g.shaped(0, 6)).toBeCloseTo(0.9, 6);
    const e = 0.01;
    const slope = (g.shaped(0, -e) - g.shaped(0, e)) / (2 * e);
    expect(slope).toBeCloseTo((1.5 * 0.9) / 4, 3);
  });

  it('leaves greens without tiers unchanged', () => {
    const g = new GreenModel({ id: 'p', hole: 1, poly: square, cx: 0, cy: 0, z0: 10, gx: 0.01, gy: 0, bumps: [], blend: 3 });
    expect(g.shaped(5, 3)).toBeCloseTo(10.05, 9);
  });
});

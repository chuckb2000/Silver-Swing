import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { shrubKey, SHRUB_VARIANTS } from '../../src/ui/shrubs';

const atlas = JSON.parse(readFileSync(resolve(__dirname, '../../public/sprites/shrubs.json'), 'utf8')) as { frames: Record<string, unknown> };

describe('flowering shrubs (trees.json c: 3)', () => {
  it('picks a frame that exists for bushes of every size', () => {
    for (let r = 0.3; r <= 7; r += 0.4) {
      for (let h = 0.5; h <= 8; h += 0.5) {
        for (let i = 0; i < SHRUB_VARIANTS; i++) expect(atlas.frames[shrubKey(i, r, h)], `r=${r} h=${h} i=${i}`).toBeDefined();
      }
    }
  });
  it('matches the Python choice (assets-src/shrubs.py shrub_key)', () => {
    // crown radius 1.5 m, 2 m tall: 6 px wide, 6 px tall
    expect(shrubKey(0, 1.5, 2)).toBe('s_6_6_0');
    expect(shrubKey(9, 2.5, 3)).toBe('s_10_10_1');
    expect(shrubKey(7, 4, 1)).toBe('s_16_10_7'); // ties go to the smaller size in both
  });
  it('colour follows the index in trees.json', () => {
    expect(shrubKey(3, 2, 2).endsWith('_3')).toBe(true);
    expect(shrubKey(11, 2, 2).endsWith('_3')).toBe(true);
  });
});

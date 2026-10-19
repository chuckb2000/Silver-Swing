// Surface 16, out-of-bounds sand (beach and sand cliffs outside the boundary, Highland Links).
import { describe, expect, it } from 'vitest';
import { isOB, isWater, material, SURF, SURFACE_LABEL } from '../../src/systems/physics/surfaces';

describe('out-of-bounds sand', () => {
  it('is out of bounds, not water, and plays like a bunker', () => {
    expect(SURF.obSand).toBe(16);
    expect(isOB(SURF.obSand)).toBe(true);
    expect(isWater(SURF.obSand)).toBe(false);
    expect(material(SURF.obSand)).toBe(material(SURF.bunker));
    expect(SURFACE_LABEL[SURF.obSand]).toBe('out of bounds');
  });

  it('leaves the other ids as they were', () => {
    for (const id of [SURF.ob, SURF.obRoad, SURF.obWater, SURF.obWoods, SURF.obBuilding, SURF.range]) expect(isOB(id)).toBe(true);
    for (const id of [SURF.rough, SURF.fairway, SURF.fringe, SURF.green, SURF.tee, SURF.bunker, SURF.water, SURF.cartpath, SURF.woods, SURF.building]) expect(isOB(id)).toBe(false);
  });
});

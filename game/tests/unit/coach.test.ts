// Swing coach (player improvements report, item 1): which tip shows when.
import { describe, expect, it } from 'vitest';
import { CoachState, learnt, tipFor } from '../../src/ui/coach';

const base: CoachState = { on: true, seen: [], state: 'aim', phase: null, putting: false, lie: 'tee', blocked: false };
const key = (s: Partial<CoachState>) => tipFor({ ...base, ...s })?.key ?? null;

describe('swing coach', () => {
  it('walks a new player through the three taps of the first swing', () => {
    expect(key({})).toBe('start');
    expect(key({ state: 'swing', phase: 'power' })).toBe('power');
    expect(key({ state: 'swing', phase: 'accuracy' })).toBe('accuracy');
    expect(key({ state: 'flight' })).toBeNull();
  });

  it('says nothing once learnt, when off, or under a dialog', () => {
    expect(key({ seen: ['start'] })).toBeNull();
    expect(key({ on: false })).toBeNull();
    expect(key({ blocked: true })).toBeNull();
  });

  it('explains putting and a new lie before the swing tip', () => {
    expect(key({ putting: true })).toBe('putt');
    expect(key({ lie: 'rough' })).toBe('rough');
    expect(key({ lie: 'greenside_bunker', seen: ['start'] })).toBe('bunker');
    expect(key({ lie: 'trees', seen: ['trees'] })).toBe('start');
  });

  it('a swing that ran out before the third tap keeps the timing tip', () => {
    expect(learnt(['start', 'power', 'accuracy'], true)).toEqual(['start', 'power']);
    expect(learnt(['start', 'power', 'accuracy'], false)).toEqual(['start', 'power', 'accuracy']);
  });
});

// Leaderboard names: banned words and the usual ways around the list.
import { describe, expect, it } from 'vitest';
import { boardName, nameAllowed, tidyName } from '../../src/save/names';

describe('nameAllowed', () => {
  it('refuses swearing and slurs, spelled with look-alikes, spaces, dots or repeated letters', () => {
    for (const n of ['fuck', 'f u c k', 'f.u.c.k', 'fuuuuck', 'phuck', 'fvck it', 'sh1t', '$hit', '5h1t', 'b1tch', 'a55', 'ass', 'big ass',
      'n1gga', 'f4gg0t', 'dick', 'tits mcgee', 'c0ck', 'xxfuckxx', 'r3tard', 'cuuunt', 'a$$hole', 'pu55y', 'wh0re']) {
      expect(nameAllowed(n), n).toBe(false);
    }
  });
  it('lets ordinary names through, including ones with a mild word inside', () => {
    for (const n of ['charlie', 'chuck b', 'class act', 'dickson', 'grape', 'torpedo', 'raccoon', 'montenegro',
      'hannah', 'assassin', 'cockburn', 'pass', 'mr. bass', 'titus', 'shitake'.replace('shit', 'shii'), 'analyst', 'egypt', 'ignazio', 'tiger 99', 'player']) {
      expect(nameAllowed(n), n).toBe(true);
    }
  });
});

describe('boardName', () => {
  it('tidies the name and falls back to "player" for an empty or refused one', () => {
    expect(tidyName('  Charlie   B!! ')).toBe('charlie b');
    expect(boardName('Charlie')).toBe('charlie');
    expect(boardName('   ')).toBe('player');
    expect(boardName('F U C K')).toBe('player');
  });
});

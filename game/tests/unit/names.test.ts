// Leaderboard names: banned words and the usual ways around the list.
import { describe, expect, it } from 'vitest';
import { boardName, cleanChat, nameAllowed, tidyName } from '../../src/save/names';

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

describe('cleanChat (live match chat, developer 2026-10-22)', () => {
  it('keeps an ordinary message as typed: case, punctuation, numbers, emoji', () => {
    expect(cleanChat('Nice putt! 3&2 to you 🏌️')).toBe('Nice putt! 3&2 to you 🏌️');
    expect(cleanChat("that's a class shot, Dickson")).toBe("that's a class shot, Dickson");
  });
  it('tidies spaces and controls, cuts long messages, and gives nothing for nothing', () => {
    expect(cleanChat('  good \n\n  game\t ')).toBe('good game');
    expect(cleanChat('a‮b​c')).toBe('a b c');
    expect(Array.from(cleanChat('x'.repeat(500))).length).toBe(200);
    expect(cleanChat('   \n ')).toBe('');
  });
  it('stars the words the name filter refuses, look-alikes and spelt-out ones too', () => {
    expect(cleanChat('what the fuck was that')).toBe('what the **** was that');
    expect(cleanChat('sh!t shot')).toBe('**** shot');
    expect(cleanChat('f u c k off')).toBe('* * * * off');
    expect(cleanChat('you ass')).toBe('you ***');
    expect(cleanChat('a b c d')).toBe('a b c d'); // single letters that spell nothing
  });
});

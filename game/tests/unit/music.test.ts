// The music's playing order (src/audio/playlist.ts) and its files
// (public/music/index.json, written by assets-src/music/build_music.py).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Playlist, shuffled } from '../../src/audio/playlist';

const seq = (seed: number) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

describe('the music', () => {
  it('plays every movement once before any comes again, and never the same one twice running', () => {
    const p = new Playlist(9, seq(3));
    const played = Array.from({ length: 90 }, () => p.next());
    for (let r = 0; r < 10; r++) expect(new Set(played.slice(r * 9, r * 9 + 9)).size).toBe(9);
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
  });

  it('a shuffle never starts with the one just played', () => {
    for (let s = 1; s < 200; s++) expect(shuffled(9, seq(s), 4)[0]).not.toBe(4);
  });

  it('peeks at the next one without moving on (nothing at the end of a round)', () => {
    const p = new Playlist(3, seq(1));
    const a = p.next();
    const ahead = p.peek();
    expect(p.next()).toBe(ahead);
    p.next();
    expect(p.peek()).toBe(-1);
    expect(a).toBeGreaterThanOrEqual(0);
  });

  it('nine movements, each file there and about a megabyte', () => {
    const dir = resolve(__dirname, '../../public/music');
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { tracks: { id: string; file: string; seconds: number; bytes: number }[] };
    expect(index.tracks.map((t) => t.id)).toEqual(['dawn', 'march', 'waltz', 'primetime', 'nocturne', 'coastal', 'birdie', 'hymn', 'finale']);
    for (const t of index.tracks) {
      expect(existsSync(join(dir, t.file)), t.file).toBe(true);
      expect(statSync(join(dir, t.file)).size).toBe(t.bytes);
      expect(t.bytes).toBeLessThan(1.6e6);
      expect(t.seconds).toBeGreaterThan(90);
    }
  });

  it('six Christmas carols, each file there, and no file left over from either set', () => {
    const dir = resolve(__dirname, '../../public/music');
    type Index = { tracks: { id: string; file: string; seconds: number; bytes: number }[] };
    const read = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Index;
    const xmas = read('christmas.json');
    expect(xmas.tracks.map((t) => t.id)).toEqual(['xmas_jingle', 'xmas_deck', 'xmas_silent', 'xmas_wish', 'xmas_joy', 'xmas_wenceslas']);
    for (const t of xmas.tracks) {
      expect(existsSync(join(dir, t.file)), t.file).toBe(true);
      expect(statSync(join(dir, t.file)).size).toBe(t.bytes);
      expect(t.bytes).toBeLessThan(2e6);
      expect(t.seconds).toBeGreaterThan(80);
    }
    const listed = new Set([...read('index.json').tracks, ...xmas.tracks].map((t) => t.file));
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.mp3'))) expect(listed.has(f), f).toBe(true);
  });
});

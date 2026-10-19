// The shared leaderboard's server logic (src/server/scores.ts) against a real
// SQLite database standing in for Cloudflare D1.
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { isEntry, LeaderboardEntry } from '../../src/save/entry';
import { D1Like, D1Statement, handleGet, handlePost, resetSchemaCache } from '../../src/server/scores';

/** Minimal D1 look-alike over node:sqlite. */
function fakeD1(): D1Like {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
    run: async () => { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: (sql: string) => stmt(sql) };
}

const entry = (id: string, gross: number, player = 'charlie', course = 'oswego_lake'): LeaderboardEntry => ({
  id, course, tee: 'Blue', length: '18', difficulty: 'normal', casual: false, player,
  date: `2026-10-18T20:${String(gross % 60).padStart(2, '0')}:00Z`, gross, toPar: gross - 71, back: Math.floor(gross / 2),
  scores: [], totals: { strokes: gross, par: 71, toPar: gross - 71, putts: 30, penalties: 0, fairways: 7, fairwayChances: 13, gir: 10, holes: 18, front: gross - Math.floor(gross / 2), back: Math.floor(gross / 2) },
});

const get = async (db: D1Like | undefined, q: string) => handleGet(db, new URL(`https://x.pages.dev/api/scores?${q}`));

describe('shared leaderboard server', () => {
  let db: D1Like;
  beforeEach(() => { resetSchemaCache(); db = fakeD1(); });

  it('answers a ping once a database is bound, and says so when it is not', async () => {
    expect((await get(db, 'ping=1')).status).toBe(200);
    expect(await (await get(db, 'ping=1')).json()).toEqual({ ok: true });
    expect((await get(undefined, 'ping=1')).status).toBe(503);
  });

  it('stores rounds and returns a course\'s rounds best first', async () => {
    const res = await handlePost(db, JSON.stringify([entry('a', 75), entry('b', 71, 'sam'), entry('c', 80, 'x', 'other')]));
    expect(await res.json()).toMatchObject({ ok: true, added: 3, rejected: 0 });
    const body = (await (await get(db, 'course=oswego_lake')).json()) as { entries: LeaderboardEntry[] };
    expect(body.entries.map((e) => e.id)).toEqual(['b', 'a']);
    expect(body.entries.every(isEntry)).toBe(true);
  });

  it('ignores a round it already has, so a device can resend safely', async () => {
    await handlePost(db, JSON.stringify(entry('a', 75)));
    const again = await (await handlePost(db, JSON.stringify([entry('a', 75), entry('d', 77)]))).json();
    expect(again).toMatchObject({ added: 1 });
  });

  it('rejects malformed rounds and oversized requests', async () => {
    const bad = await (await handlePost(db, JSON.stringify([{ id: 'x' }, entry('ok', 70)]))).json();
    expect(bad).toMatchObject({ added: 1, rejected: 1 });
    expect((await handlePost(db, 'not json')).status).toBe(400);
    expect((await handlePost(db, JSON.stringify(Array.from({ length: 51 }, (_, i) => entry(`n${i}`, 72))))).status).toBe(413);
    expect((await get(db, 'course=')).status).toBe(400);
  });
});

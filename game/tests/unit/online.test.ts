// The shared leaderboard's server logic (src/server/scores.ts) against a real
// SQLite database standing in for Cloudflare D1.
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { isEntry, LeaderboardEntry } from '../../src/save/entry';
import { D1Like, D1Statement, handleEaglesGet, handleEaglesPost, handleGet, handleHandicapsGet, handleHide, resetHandicapCache, handleNames, handlePost, handleRecentGet, handleRecordsGet, resetFeedCache, resetSchemaCache } from '../../src/server/scores';
import { HoleScore } from '../../src/systems/rules/scoring';
import { isPlayerKey, parseKeyCode } from '../../src/save/identity';

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

  it('refuses a banned name or "player", and hides ones already stored', async () => {
    const res = await (await handlePost(db, JSON.stringify([entry('bad', 74, 'Sh1t Head'), entry('anon', 73, 'player')]))).json();
    expect(res).toMatchObject({ added: 0, rejected: 2 });
    // stored by an older version of the server
    for (const [id, who] of [['old1', 'player'], ['old2', 'sh1t head']]) {
      await db.prepare('INSERT INTO rounds (id, course, length, player, gross, back, date, data, received) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, 'oswego_lake', '18', who, 70, 35, '2026-10-18', JSON.stringify(entry(id, 70, who)), 'x').run();
    }
    const got = (await (await handleGet(db, new URL('http://x/api/scores?course=oswego_lake'))).json()) as { entries: { id: string; player: string }[] };
    expect(got.entries).toEqual([]);
  });

  it('rejects malformed rounds and oversized requests', async () => {
    const bad = await (await handlePost(db, JSON.stringify([{ id: 'x' }, entry('ok', 70)]))).json();
    expect(bad).toMatchObject({ added: 1, rejected: 1 });
    expect((await handlePost(db, 'not json')).status).toBe(400);
    expect((await handlePost(db, JSON.stringify(Array.from({ length: 51 }, (_, i) => entry(`n${i}`, 72))))).status).toBe(413);
    expect((await get(db, 'course=')).status).toBe(400);
  });
});

const KEY_A = 'aaaaaaaaaaaaaaaa', KEY_B = 'bbbbbbbbbbbbbbbb';
const holes = (strokes: number[], pars: number[]): HoleScore[] => strokes.map((st, i) => ({ hole: i + 1, par: pars[i], strokes: st, putts: 1, penalties: 0, fairway: null, gir: true }));
const scored = (id: string, player: string, strokes: number[], pars: number[], extra: Partial<LeaderboardEntry> = {}): LeaderboardEntry => {
  const e = entry(id, strokes.reduce((a, b) => a + b, 0), player);
  return { ...e, length: strokes.length === 9 ? 'front' : '18', scores: holes(strokes, pars), ...extra };
};

describe('names belong to one device (developer, 2026-10-19)', () => {
  let db: D1Like;
  beforeEach(() => { resetSchemaCache(); db = fakeD1(); });
  const names = (method: string, q: string, body?: unknown) => handleNames(db, { method, url: new URL(`http://x/api/names?${q}`), body: body ? JSON.stringify(body) : undefined });

  it('the first device to use a name keeps it; another device is refused', async () => {
    expect(await (await handlePost(db, JSON.stringify({ ...entry('a1', 72, 'chuck'), owner: KEY_A }))).json()).toMatchObject({ added: 1, taken: [] });
    expect(await (await handlePost(db, JSON.stringify({ ...entry('b1', 70, 'chuck'), owner: KEY_B }))).json()).toMatchObject({ added: 0, taken: ['b1'] });
    expect(await (await handlePost(db, JSON.stringify({ ...entry('a2', 71, 'Chuck'), owner: KEY_A }))).json()).toMatchObject({ added: 1 });
    // a round with no key (an old copy of the game) can't use a claimed name either
    expect(await (await handlePost(db, JSON.stringify(entry('c1', 69, 'chuck')))).json()).toMatchObject({ added: 0, taken: ['c1'] });
    expect(await (await names('GET', `name=chuck&owner=${KEY_B}`)).json()).toMatchObject({ ok: false, result: 'taken' });
    expect(await (await names('GET', `name=chuck&owner=${KEY_A}`)).json()).toMatchObject({ ok: true });
    expect(await (await names('POST', '', { name: 'sam', owner: KEY_B })).json()).toMatchObject({ ok: true });
    expect(await (await names('POST', '', { name: 'sam', owner: KEY_A })).json()).toMatchObject({ ok: false, result: 'taken' });
    expect(await (await names('POST', '', { name: 'player', owner: KEY_A })).json()).toMatchObject({ ok: false, result: 'invalid' });
  });

  it('never returns a device key', async () => {
    await handlePost(db, JSON.stringify({ ...entry('a1', 72, 'chuck'), owner: KEY_A }));
    const text = await (await get(db, 'course=oswego_lake')).text();
    expect(text).not.toContain(KEY_A);
    expect(text).not.toContain('owner');
  });

  it('a name only old rounds used goes to the first device that claims it', async () => {
    await handlePost(db, JSON.stringify(entry('old', 75, 'pat')));
    expect(await (await names('POST', '', { name: 'pat', owner: KEY_B })).json()).toMatchObject({ ok: true });
    expect(await (await handlePost(db, JSON.stringify({ ...entry('new', 74, 'pat'), owner: KEY_A }))).json()).toMatchObject({ taken: ['new'] });
  });

  it('a device holds at most 8 names', async () => {
    for (let i = 0; i < 8; i++) expect(await (await names('POST', '', { name: `kid ${i}`, owner: KEY_A })).json()).toMatchObject({ ok: true });
    expect(await (await names('POST', '', { name: 'kid 9', owner: KEY_A })).json()).toMatchObject({ result: 'too_many' });
  });
});

describe('recent eagles and most birdies (developer, 2026-10-19)', () => {
  let db: D1Like;
  beforeEach(() => { resetSchemaCache(); db = fakeD1(); });
  const eagle = (id: string, player: string, date: string, extra = {}) => ({
    id: `r-${id}-h3`, round: `r-${id}`, player, course: 'oswego_lake', hole: 3, par: 5, strokes: 3, tee: 'Blue', difficulty: 'normal', date, owner: KEY_A, ...extra,
  });

  it('an eagle is kept the moment it is reported, newest first, and only once', async () => {
    expect(await (await handleEaglesPost(db, JSON.stringify([eagle('1', 'chuck', '2026-10-19T10:00:00Z'), eagle('2', 'chuck', '2026-10-19T12:00:00Z')]))).json()).toMatchObject({ added: 2 });
    expect(await (await handleEaglesPost(db, JSON.stringify(eagle('1', 'chuck', '2026-10-19T10:00:00Z')))).json()).toMatchObject({ added: 0 });
    const got = (await (await handleEaglesGet(db, new URL('http://x/api/eagles'))).json()) as { eagles: { id: string; owner?: string }[] };
    expect(got.eagles.map((e) => e.id)).toEqual(['r-2-h3', 'r-1-h3']);
    expect(got.eagles[0].owner).toBeUndefined();
  });

  it('refuses a birdie dressed as an eagle, "player", and a name another device holds', async () => {
    const res = await (await handleEaglesPost(db, JSON.stringify([
      eagle('b', 'chuck', '2026-10-19T10:00:00Z', { strokes: 4 }),
      eagle('p', 'player', '2026-10-19T10:00:00Z'),
      eagle('t', 'sam', '2026-10-19T10:00:00Z', { owner: KEY_B }),
      eagle('u', 'sam', '2026-10-19T11:00:00Z'),
    ]))).json();
    expect(res).toMatchObject({ added: 1, rejected: 2, taken: ['r-u-h3'] });
  });

  it('a finished round adds its eagles too (same id as the live report), not twice', async () => {
    const pars = [4, 5, 3, 4, 4, 5, 3, 4, 4];
    await handleEaglesPost(db, JSON.stringify({ ...eagle('x', 'chuck', '2026-10-19T10:00:00Z'), id: 'R1-h2', round: 'R1', hole: 2, par: 5, strokes: 3 }));
    await handlePost(db, JSON.stringify({ ...scored('R1', 'chuck', [4, 3, 1, 4, 4, 5, 3, 4, 4], pars), owner: KEY_A }));
    const got = (await (await handleEaglesGet(db, new URL('http://x/api/eagles'))).json()) as { eagles: { id: string; strokes: number }[] };
    expect(got.eagles.map((e) => e.id).sort()).toEqual(['R1-h2', 'R1-h3']); // the eagle on 2 and the ace on 3
  });

  it('most birdies in a round: across courses, ties to whoever did it first, casual rounds left out', async () => {
    const pars = Array(18).fill(4);
    const s = (n: number) => pars.map((p, i) => (i < n ? p - 1 : p));
    await handlePost(db, JSON.stringify([
      { ...scored('A', 'chuck', s(5), pars, { date: '2026-10-19T09:00:00Z' }), owner: KEY_A },
      { ...scored('B', 'sam', s(7), pars, { date: '2026-10-19T10:00:00Z', course: 'franklin' }), owner: KEY_B },
      { ...scored('C', 'chuck', s(5), pars, { date: '2026-10-18T09:00:00Z' }), owner: KEY_A },
      { ...scored('D', 'chuck', s(9), pars, { date: '2026-10-19T11:00:00Z', casual: true }), owner: KEY_A },
    ]));
    const got = (await (await handleRecordsGet(db, new URL('http://x/api/records?kind=birdies'))).json()) as { records: { id: string; birdies: number; course: string }[] };
    expect(got.records.map((r) => [r.id, r.birdies])).toEqual([['B', 7], ['C', 5], ['A', 5]]);
    const one = (await (await handleRecordsGet(db, new URL('http://x/api/records?kind=birdies&course=franklin'))).json()) as { records: { id: string }[] };
    expect(one.records.map((r) => r.id)).toEqual(['B']);
  });

  it('an older database is brought up to date: its rounds get birdie counts and their eagles', async () => {
    // the rounds table as the first version of the server made it
    const raw = fakeD1();
    await raw.prepare(`CREATE TABLE rounds (id TEXT PRIMARY KEY, course TEXT NOT NULL, length TEXT NOT NULL, player TEXT NOT NULL, gross INTEGER NOT NULL, back INTEGER, date TEXT NOT NULL, data TEXT NOT NULL, received TEXT NOT NULL)`).run();
    const pars = Array(18).fill(4);
    const old = scored('OLD', 'chuck', pars.map((p, i) => (i === 0 ? 2 : i < 4 ? 3 : p)), pars);
    await raw.prepare('INSERT INTO rounds (id, course, length, player, gross, back, date, data, received) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(old.id, old.course, old.length, old.player, old.gross, old.back, old.date, JSON.stringify(old), '2026-10-18').run();
    resetSchemaCache();
    await handleGet(raw, new URL('http://x/api/scores?ping=1')); // the first request sets the tables up; old rounds follow on the next
    const rec = (await (await handleRecordsGet(raw, new URL('http://x/api/records?kind=birdies'))).json()) as { records: { id: string; birdies: number }[] };
    expect(rec.records).toEqual([expect.objectContaining({ id: 'OLD', birdies: 4 })]);
    const eg = (await (await handleEaglesGet(raw, new URL('http://x/api/eagles'))).json()) as { eagles: { id: string }[] };
    expect(eg.eagles.map((e) => e.id)).toEqual(['OLD-h1']);
  });
});

describe('stays inside the free plan: 50 database queries per request', () => {
  it('a cold start on an old database, then uploads, each stay under 50 queries', async () => {
    const real = fakeD1();
    let n = 0;
    const counted: D1Like = { prepare: (sql: string) => { const s = real.prepare(sql); const wrap = (st: D1Statement): D1Statement => ({ bind: (...v: unknown[]) => wrap(st.bind(...v)), all: (async () => { n++; return st.all(); }) as D1Statement['all'], run: async () => { n++; return st.run(); } }); return wrap(s); } };
    // an old database with 60 rounds and no new columns
    await real.prepare(`CREATE TABLE rounds (id TEXT PRIMARY KEY, course TEXT NOT NULL, length TEXT NOT NULL, player TEXT NOT NULL, gross INTEGER NOT NULL, back INTEGER, date TEXT NOT NULL, data TEXT NOT NULL, received TEXT NOT NULL)`).run();
    const pars = Array(18).fill(4);
    for (let i = 0; i < 60; i++) {
      const e = scored(`old${i}`, 'chuck', pars.map((p, k) => (k === 0 ? 2 : p)), pars);
      await real.prepare('INSERT INTO rounds (id, course, length, player, gross, back, date, data, received) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(e.id, e.course, e.length, e.player, e.gross, e.back, e.date, JSON.stringify(e), 'x').run();
    }
    for (let req = 0; req < 8; req++) {
      resetSchemaCache(); // every request a cold start (the worst case)
      n = 0;
      const batch = Array.from({ length: 5 }, (_, i) => ({ ...scored(`new${req}-${i}`, 'chuck', pars.map((p, k) => (k < 2 ? p - 2 : p)), pars), owner: KEY_A }));
      const res = await handlePost(counted, JSON.stringify(batch));
      expect(res.status).toBe(200);
      expect(n).toBeLessThanOrEqual(50);
    }
    resetSchemaCache();
    n = 0;
    await handleGet(counted, new URL('http://x/api/scores?ping=1'));
    expect(n).toBeLessThanOrEqual(50);
  });
});

describe('player codes and resent rounds (review 2026-10-20)', () => {
  let db: D1Like;
  beforeEach(() => { resetSchemaCache(); db = fakeD1(); });
  const names = (method: string, q: string, body?: unknown) => handleNames(db, { method, url: new URL(`http://x/api/names?${q}`), body: body ? JSON.stringify(body) : undefined });

  it('lists the names a player code holds, so a typed code can be checked', async () => {
    await names('POST', '', { name: 'chuck', owner: KEY_A });
    await names('POST', '', { name: 'charlie', owner: KEY_A });
    expect(await (await names('GET', `owner=${KEY_A}`)).json()).toEqual({ ok: true, names: ['charlie', 'chuck'] });
    expect(await (await names('GET', `owner=${KEY_B}`)).json()).toEqual({ ok: true, names: [] });
  });

  it('a round the board already has is not reported as taken when it is sent again', async () => {
    await handlePost(db, JSON.stringify({ ...entry('a1', 72, 'chuck'), owner: KEY_A }));
    // the same round from a device without the code (an imported backup)
    expect(await (await handlePost(db, JSON.stringify({ ...entry('a1', 72, 'chuck'), owner: KEY_B }))).json()).toMatchObject({ added: 0, taken: [] });
  });

  it('a mistyped code (l, o, 0 or 1) is not a player code', () => {
    expect(isPlayerKey('abcdefghjkmnpqrs')).toBe(true);
    expect(isPlayerKey('abcdefghjklmnpqr')).toBe(false);
    expect(parseKeyCode('ABCD-EFGH-JKMN-PQRS')).toBe('abcdefghjkmnpqrs');
    expect(parseKeyCode('abcd-efgh-jkmn-pqr0')).toBeNull();
  });
});

describe('hide me from the leaderboards (developer, 2026-10-20)', () => {
  let db: D1Like;
  beforeEach(() => { resetSchemaCache(); resetFeedCache(); db = fakeD1(); });

  it("keeps a hidden player's rounds and eagles off every shared list, and brings them back when shown", async () => {
    const pars = [4, 4, 4, 4, 4, 4, 4, 4, 4];
    const mine = { ...scored('m1', 'charlie', [2, 3, 4, 4, 4, 4, 4, 4, 4], pars), owner: KEY_A, daily: '2026-10-20' };
    const theirs = { ...scored('t1', 'sam', [3, 4, 4, 4, 4, 4, 4, 4, 4], pars), owner: KEY_B, daily: '2026-10-20' };
    await handlePost(db, JSON.stringify([mine, theirs]));
    const ids = async () => {
      resetFeedCache();
      const course = ((await (await get(db, 'course=oswego_lake')).json()) as { entries: LeaderboardEntry[] }).entries.map((e) => e.id);
      const daily = ((await (await get(db, 'daily=2026-10-20')).json()) as { entries: LeaderboardEntry[] }).entries.map((e) => e.id);
      const eagles = ((await (await handleEaglesGet(db, new URL('http://x/api/eagles'))).json()) as { eagles: { player: string }[] }).eagles.map((e) => e.player);
      const records = ((await (await handleRecordsGet(db, new URL('http://x/api/records?kind=birdies'))).json()) as { records: { id: string }[] }).records.map((r) => r.id);
      const recent = ((await (await handleRecentGet(db, new URL('http://x/api/recent'))).json()) as { rounds: { id: string }[] }).rounds.map((r) => r.id);
      const own = ((await (await get(db, `owner=${KEY_A}`)).json()) as { entries: LeaderboardEntry[] }).entries.map((e) => e.id);
      return { course, daily, eagles, records, recent, own };
    };
    const before = await ids();
    expect(before.course).toContain('m1');
    expect(before.eagles).toContain('charlie');
    expect(await (await handleHide(db, JSON.stringify({ owner: KEY_A, hidden: true }))).json()).toEqual({ ok: true, hidden: true });
    const hid = await ids();
    for (const list of [hid.course, hid.daily, hid.records, hid.recent]) { expect(list).not.toContain('m1'); expect(list).toContain('t1'); }
    expect(hid.eagles).not.toContain('charlie');
    expect(hid.own).toEqual(['m1']); // "my golf" still finds them
    await handleHide(db, JSON.stringify({ owner: KEY_A, hidden: false }));
    expect((await ids()).course).toContain('m1');
    expect((await handleHide(db, JSON.stringify({ owner: 'x', hidden: true }))).status).toBe(400);
  });
});

describe('older rounds join their player code (developer, 2026-10-20: 5 rounds on the phone, 9 on the computer)', () => {
  let db: D1Like;
  beforeEach(() => { resetSchemaCache(); db = fakeD1(); });

  it('a round stored without a key takes the key of the device that holds its name when sent again', async () => {
    await handlePost(db, JSON.stringify([entry('old', 74, 'charlie')]));              // before player keys
    await handlePost(db, JSON.stringify([{ ...entry('new', 73, 'charlie'), owner: KEY_A }])); // charlie is now KEY_A's
    const own = async (k: string) => ((await (await get(db, `owner=${k}`)).json()) as { entries: LeaderboardEntry[] }).entries.map((e) => e.id).sort();
    expect(await own(KEY_A)).toEqual(['new']);
    await handlePost(db, JSON.stringify([{ ...entry('old', 74, 'charlie'), owner: KEY_B }])); // not B's name: no change
    expect(await own(KEY_B)).toEqual([]);
    await handlePost(db, JSON.stringify([{ ...entry('old', 74, 'charlie'), owner: KEY_A }]));
    expect(await own(KEY_A)).toEqual(['new', 'old']);
  });
});

describe('handicap rounds (developer, 2026-10-20)', () => {
  let db: D1Like;
  beforeEach(() => { resetSchemaCache(); resetFeedCache(); resetHandicapCache(); db = fakeD1(); });

  it("sends each shown player's Normal, non-casual rounds, cut down", async () => {
    await handlePost(db, JSON.stringify([
      { ...entry('n1', 80, 'charlie'), owner: KEY_A },
      { ...entry('e1', 70, 'charlie'), difficulty: 'easy', owner: KEY_A },
      { ...entry('c1', 70, 'charlie'), casual: true, owner: KEY_A },
      { ...entry('n2', 85, 'sam'), owner: KEY_B },
    ]));
    const got = async () => { resetHandicapCache(); return ((await (await handleHandicapsGet(db)).json()) as { rounds: { id: string; player: string; scores: unknown[]; totals?: unknown }[] }).rounds; };
    const r = await got();
    expect(r.map((x) => x.id).sort()).toEqual(['n1', 'n2']);
    expect(r[0].totals).toBeUndefined();
    await handleHide(db, JSON.stringify({ owner: KEY_B, hidden: true }));
    expect((await got()).map((x) => x.id)).toEqual(['n1']);
  });

  it('puts a player code\'s rounds under one name, its latest (my golf showed a different index)', async () => {
    await handlePost(db, JSON.stringify([
      { ...entry('old', 80, 'charlieb'), date: '2026-10-20T01:00:00.000Z', owner: KEY_A },
      { ...entry('new', 78, 'charlie'), date: '2026-10-21T01:00:00.000Z', owner: KEY_A },
      { ...entry('pre', 82, 'sam'), date: '2026-10-19T01:00:00.000Z' }, // before player codes: by name
    ]));
    resetHandicapCache();
    const r = ((await (await handleHandicapsGet(db)).json()) as { rounds: { id: string; player: string }[] }).rounds;
    const by = Object.fromEntries(r.map((x) => [x.id, x.player]));
    expect(by).toEqual({ new: 'charlie', old: 'charlie', pre: 'sam' });
  });
});

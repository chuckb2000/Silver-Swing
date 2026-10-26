// Scorecard corrections after a course went live (save/cardFixes.ts; design chat, 2026-10-26):
// Chief Egan holes 3 and 6 became par 3 (PR #81).
import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { CARD_FIXES, fixEagle, fixEntry, fixScores, slotHole } from '../../src/save/cardFixes';
import type { LeaderboardEntry } from '../../src/save/entry';
import type { EagleEvent } from '../../src/save/feats';
import { birdiesIn } from '../../src/save/feats';
import { D1Like, D1Statement, handleEaglesGet, handleEaglesPost, handleGet, handlePost, resetSchemaCache } from '../../src/server/scores';
import { HoleScore, totals } from '../../src/systems/rules/scoring';

function fakeD1(): D1Like & { raw: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
    run: async () => { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: (sql: string) => stmt(sql), raw: db };
}

const OLD_PARS = [3, 3, 4, 3, 3, 4, 3, 3, 3];
/** A round at Chief Egan on the old card: `strokes` per slot (9 or 18 twice around). */
function chiefEgan(id: string, strokes: number[], length: '9' | '9x2' = '9'): LeaderboardEntry {
  const scores: HoleScore[] = strokes.map((n, i) => {
    const par = OLD_PARS[i % 9];
    return { hole: i + 1, par, strokes: n, putts: Math.min(n, 2), penalties: 0, fairway: par === 4 ? true : null, gir: n - Math.min(n, 2) <= par - 2 };
  });
  const t = totals(scores);
  return {
    id, course: 'silvies_chief_egan', tee: 'White', length, difficulty: 'normal', casual: false, player: 'charlie',
    date: '2026-10-25T21:00:00Z', gross: t.strokes, toPar: t.toPar, back: t.back, scores, totals: t,
  };
}

describe('card fixes: Chief Egan 3 and 6 are par 3', () => {
  it('lists the two holes', () => {
    expect(CARD_FIXES.filter((f) => f.course === 'silvies_chief_egan').map((f) => [f.hole, f.par])).toEqual([[3, 3], [6, 3]]);
  });

  it('a nine: par, to par, birdies, fairways and greens change; gross does not', () => {
    // a 3 on hole 3 (was a birdie on par 4, now a par), a 2 on hole 6 (was an eagle, now a birdie)
    const e = chiefEgan('r9', [3, 3, 3, 3, 3, 2, 3, 3, 3]);
    expect([e.toPar, birdiesIn(e.scores)]).toEqual([-3, 2]);
    const f = fixEntry(e)!;
    expect(f.gross).toBe(e.gross);
    expect(f.scores.map((s) => s.par)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect([f.toPar, f.totals.toPar, f.totals.par, birdiesIn(f.scores)]).toEqual([-1, -1, 27, 1]);
    expect([f.totals.fairwayChances, f.scores[2].fairway]).toEqual([0, null]);
    expect(f.scores[2].gir).toBe(true); // 3 with 2 putts: on in 1, still a green in regulation
    expect(fixEntry(f)).toBeNull(); // once
  });

  it('eighteen twice around: slots 3, 6, 12 and 15', () => {
    const e = chiefEgan('r18', Array(18).fill(4), '9x2');
    const f = fixEntry(e)!;
    expect(f.scores.map((s, i) => (s.par !== e.scores[i].par ? s.hole : 0)).filter(Boolean)).toEqual([3, 6, 12, 15]);
    expect(f.totals.par).toBe(54);
    expect(f.toPar).toBe(18);
    expect([e.scores[2].gir, f.scores[2].gir]).toEqual([true, false]); // 4 with 2 putts: on in 2 is no longer a GIR
  });

  it('other courses are left alone', () => {
    expect(fixEntry({ ...chiefEgan('x', Array(9).fill(3)), course: 'silvies_craddock' })).toBeNull();
  });

  it('a round in progress: the holes played so far (a saved round keeps slots and its length)', () => {
    const s = chiefEgan('p', [3, 3, 4, 3, 3, 4, 3, 3, 3, 3, 3, 4], '9x2').scores;
    const f = fixScores('silvies_chief_egan', s, slotHole({ length: '9x2' }, Array.from({ length: 18 }, (_, i) => i + 1)))!;
    expect(f.map((x) => x.par)).toEqual(Array(12).fill(3));
  });

  it('eagles: a 2 there is now a birdie (dropped); an ace stays with par 3', () => {
    const ev = (strokes: number, hole = 6): EagleEvent => ({ id: `r-h${hole}`, round: 'r', player: 'charlie', course: 'silvies_chief_egan', hole, par: 4, strokes, tee: 'White', difficulty: 'normal', date: '2026-10-25T21:00:00Z' });
    expect(fixEagle(ev(2))).toBeNull();
    expect(fixEagle(ev(1))).toMatchObject({ par: 3, strokes: 1 });
    expect(fixEagle({ ...ev(1, 5), par: 3 })).toMatchObject({ par: 3 }); // not a fixed hole
  });
});

describe('card fixes on the shared board', () => {
  let db: ReturnType<typeof fakeD1>;
  beforeEach(() => { resetSchemaCache(); db = fakeD1(); });
  const get = (q: string) => handleGet(db, new URL(`https://x.pages.dev/api/scores?${q}`));

  it('rewrites the stored rounds and eagles once (rounds on the old card, a 2 and an ace)', async () => {
    await get('ping=1'); // tables
    const r = chiefEgan('old1', [3, 3, 2, 3, 3, 1, 3, 3, 3]);
    db.raw.prepare('INSERT INTO rounds (id, course, length, player, gross, back, date, data, received, birdies, casual, tee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)')
      .run(r.id, r.course, r.length, r.player, r.gross, r.back, r.date, JSON.stringify(r), r.date, birdiesIn(r.scores), r.tee);
    const ins = db.raw.prepare('INSERT INTO eagles (id, round, player, owner, course, hole, par, strokes, tee, difficulty, date, received) VALUES (?, ?, ?, NULL, ?, ?, 4, ?, ?, ?, ?, ?)');
    ins.run('old1-h3', 'old1', 'charlie', 'silvies_chief_egan', 3, 2, 'White', 'normal', r.date, r.date);
    ins.run('old1-h6', 'old1', 'charlie', 'silvies_chief_egan', 6, 1, 'White', 'normal', r.date, r.date);
    for (let i = 0; i < 3; i++) await get('ping=1'); // migration, backfill, then the card fix
    const row = db.raw.prepare("SELECT data, birdies FROM rounds WHERE id = 'old1'").get() as { data: string; birdies: number };
    const e = JSON.parse(row.data) as LeaderboardEntry;
    expect([e.gross, e.toPar, row.birdies]).toEqual([r.gross, r.gross - 27, 2]);
    const eagles = (await (await handleEaglesGet(db, new URL('https://x.pages.dev/api/eagles'))).json()) as { eagles: EagleEvent[] };
    expect(eagles.eagles.map((x) => [x.hole, x.par, x.strokes])).toEqual([[6, 3, 1]]);
    expect((db.raw.prepare("SELECT v FROM meta WHERE k = 'card_fixes'").get() as { v: string }).v).toMatch(/silvies_chief_egan:3=3/);
  });

  it('a round or eagle sent later on the old card is stored on the new one', async () => {
    const r = chiefEgan('late', [3, 3, 2, 3, 3, 3, 3, 3, 3]);
    await handlePost(db, JSON.stringify({ ...r, owner: 'abcdefgh12' }));
    const row = db.raw.prepare("SELECT data, birdies FROM rounds WHERE id = 'late'").get() as { data: string; birdies: number };
    expect([(JSON.parse(row.data) as LeaderboardEntry).toPar, row.birdies]).toEqual([r.gross - 27, 1]);
    // its 2 on hole 3 is a birdie now: not on the eagles list, sent live or with the round
    const ev: EagleEvent = { id: 'late-h3', round: 'late', player: 'charlie', course: 'silvies_chief_egan', hole: 3, par: 4, strokes: 2, tee: 'White', difficulty: 'normal', date: r.date };
    await handleEaglesPost(db, JSON.stringify({ ...ev, owner: 'abcdefgh12' }));
    expect((db.raw.prepare("SELECT COUNT(*) AS n FROM eagles").get() as { n: number }).n).toBe(0);
  });
});

describe('card fixes on this device', () => {
  it('the local board and eagles are rewritten on load', async () => {
    const store = await import('../../src/save/store');
    await store.replaceBoard([chiefEgan('dev1', [3, 3, 2, 3, 3, 3, 3, 3, 3])]);
    await store.saveEagles([{ id: 'dev1-h3', round: 'dev1', player: 'charlie', course: 'silvies_chief_egan', hole: 3, par: 4, strokes: 2, tee: 'White', difficulty: 'normal', date: '2026-10-25T21:00:00Z', sent: true }]);
    const b = await store.loadBoard();
    expect(b[0].toPar).toBe(b[0].gross - 27);
    expect(await store.loadEagles()).toEqual([]);
  });
});

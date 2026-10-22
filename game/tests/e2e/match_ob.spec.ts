// Out of bounds in a live match (developer, 2026-10-22: "i hit it out of
// bounds, then owen hit it in the fairway, then it said owen and i both hit
// it ob and made us both retee"): the first player's tee shot goes out, he
// takes stroke and distance, the other player's tee shot stays in play, and
// only the first player's stroke counts as out of bounds.

import { expect, Page, test } from '@playwright/test';
import { inPlay, joinMatch, makeMatch, matchOf, player } from './matchHelpers';

declare global { interface Window { __game: any; __autoplay: any } }

const ps = (p: Page) => p.evaluate(() => window.__game.scene.getScene('play').state as string);
const until = async (f: () => Promise<boolean>, what: string, ms = 90_000) => {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) { if (await f()) return; await new Promise((r) => setTimeout(r, 150)); }
  throw new Error(`waited for ${what}`);
};

/** Keep both games moving: skip fly-overs and flights (nothing else). */
async function tick(pages: Page[]) {
  for (const p of pages) {
    await p.evaluate(() => {
      const s = window.__game.scene.getScene('play');
      if (!window.__game.scene.isActive('play')) return;
      if (s.state === 'intro') s.skipIntro();
      else if (s.state === 'flight') s.fastForward();
    });
  }
}

test('a tee shot out of bounds, stroke and distance, then the other player in play: only the first is out', async ({ browser }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  const A = await player(browser, 'A', errors), B = await player(browser, 'B', errors);
  const a = A.page, b = B.page;
  const code = await makeMatch(a, 'charlie');
  await joinMatch(b, code, 'owen');
  await Promise.all([inPlay(a), inPlay(b)]);
  const pages = [a, b];
  const seatOf = async (p: Page) => (await matchOf(p))!.seat as number;
  const bySeat: Record<number, Page> = { [await seatOf(a)]: a, [await seatOf(b)]: b };

  // whoever has the honour: aimed straight out of bounds with the driver, a full swing
  let first = -1;
  await until(async () => {
    await tick(pages);
    const m = await matchOf(a);
    if (m?.turn === null || m?.turn === undefined) return false;
    first = m.turn;
    return (await ps(bySeat[first])) === 'aim';
  }, 'the first tee shot');
  const X = bySeat[first], Y = bySeat[1 - first];
  // an aim whose full, perfect drive ends out of bounds (tried on a copy of the stroke: the round is put back)
  const aimed = await X.evaluate(() => {
    const s = window.__game.scene.getScene('play');
    const r = s.round;
    // each plan draws the next gust (shotSeq): put back after every try, so the real swing gets the same one
    const seq0 = r.shotSeq;
    for (let k = 0; k < 72; k++) {
      const ang = (k * 5 * Math.PI) / 180;
      r.shotSeq = seq0;
      const shot = r.plan(s.club.id, ang, { kind: 'full', power: 1, offset: 0, maxed: false, late: false }, 0, s.scaleArg());
      const out = r.whenSettled(shot, r.simulate(shot), (_x: unknown, o: { kind: string }) => o.kind);
      if (out === 'ob') { r.shotSeq = seq0; s.aim = ang; s.updateLanding?.(); return ang; }
    }
    r.shotSeq = seq0;
    return null;
  });
  console.log(JSON.stringify({ aimed }));
  expect(aimed).not.toBeNull();
  // a full swing: the robot's power (for the distance to the pin) scaled up to exactly 100 %
  await X.evaluate(() => {
    const s = window.__game.scene.getScene('play'), r = s.round;
    const base = Math.max(0.15, Math.min(1, (r.distToPin() * 0.97) / Math.max(1, r.fullCarry(s.club) * s.swingScale)));
    return window.__autoplay.shot(0, 1 / base);
  });
  const settled = (p: Page, seat: number, n: number) => async () => { await tick(pages); const m = await matchOf(p); return !!m && JSON.parse(m.full).p[seat].strokes === n && m.queue === 0; };
  await until(settled(X, first, 1), "the first player's stroke (his game)");
  await until(settled(Y, first, 1), "the first player's stroke (the other game)");
  const s1 = JSON.parse((await matchOf(Y))!.full);
  console.log(JSON.stringify({ first, after1: s1.p[first] }));
  expect(s1.p[first].pending?.kind).toBe('ob');
  // stroke and distance
  await until(async () => { await tick(pages); return (await ps(X)) === 'relief'; }, 'the relief panel');
  await X.evaluate(() => window.__autoplay.step());
  await until(async () => { await tick(pages); const m = await matchOf(Y); return !!m && JSON.parse(m.full).p[first].strokes === 2 && !JSON.parse(m.full).p[first].pending; }, 'the drop');
  // the other player: a tee shot down the middle
  await until(async () => { await tick(pages); return (await ps(Y)) === 'aim' && (await matchOf(Y))!.turn === 1 - first; }, "the other player's turn");
  await Y.evaluate(() => window.__autoplay.shot(0));
  await until(async () => { await tick(pages); const m = await matchOf(X); return !!m && JSON.parse(m.full).p[1 - first].strokes === 1 && m.queue === 0; }, "the other player's stroke");
  const s2 = JSON.parse((await matchOf(X))!.full);
  const yBall = s2.p[1 - first];
  const inBounds = await X.evaluate((p) => window.__game.scene.getScene('play').round.course.boundary.contains(p.x, p.y), { x: yBall.x, y: yBall.y });
  console.log(JSON.stringify({ first, x: s2.p[first], y: yBall, inBounds }));
  expect(inBounds).toBe(true);
  expect(yBall.pending).toBeNull();
  expect(s2.p[first].pending).toBeNull();
  expect(errors).toEqual([]);
});

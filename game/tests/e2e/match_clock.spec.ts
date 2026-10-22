// Live match play: the move clock and extra holes (developer, 2026-10-21), in
// two real browsers against the match Worker under wrangler
// (playwright.match.config.ts). The match's clock is moved on through the
// Worker's development route (scripts/match-dev.sh, MATCH_DEBUG=1), so the
// 2:00 penalty stroke, the 3:30 warning and the 5:00 claim take seconds. With
// a local leaderboard database (MATCH_D1=1) the claimed match is also checked
// on the "recent" list.

import { expect, Page, test } from '@playwright/test';
import { hasText, inPlay, joinMatch, locate, makeMatch, matchOf, player, tapButton } from './matchHelpers';

declare global { interface Window { __game: any; __autoplay: any } }

const SHOTS = 'shots/match';
const WORKER = 'http://localhost:8787';
const GRACE = 15_000, PENALTY = 120_000, WARN = 210_000, CLAIM = 300_000; // types.ts CLOCK

/** Move the match's clock on (the match Worker's development route). */
async function skip(code: string, ms: number) {
  const r = await fetch(`${WORKER}/debug/${code}/skip?ms=${ms}`, { method: 'POST' });
  expect(r.ok).toBe(true);
}

/** Whatever a game waits for, except a shot: the fly-over, a flight, a drop, the next hole. */
const advance = (p: Page, next = true) => p.evaluate((next) => {
  const g = window.__game;
  if (!g.scene.isActive('play')) return 'none';
  const ps = g.scene.getScene('play');
  const hud = g.scene.getScene('hud');
  if (ps.fading || ps.zooming) return 'busy';
  switch (ps.state) {
    case 'intro': ps.skipIntro(); return 'intro';
    case 'flight': ps.fastForward(); return 'flight';
    case 'relief': case 'drop': window.__autoplay.step(); return 'relief';
    case 'between': if (next && hud.modal === 'mhole') { ps.matchNextHole(); return 'next'; } return 'wait';
    default: return ps.state;
  }
}, next);

/** Both games stepped (no shots) until `done`. */
async function until(pages: Page[], done: () => Promise<boolean>, what: string, ms = 120_000, next = true) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    if (await done()) return;
    for (const p of pages) await advance(p, next);
    await pages[0].waitForTimeout(150);
  }
  throw new Error(`never: ${what}`);
}

const hud = (p: Page, label: string) => p.waitForFunction(locate, ['hud', label, null] as [string, string | null, string | null], { polling: 100, timeout: 30_000 });
const stateOf = async (p: Page) => JSON.parse((await matchOf(p))!.full);
/** Names new to the site's leaderboard database (with MATCH_D1=1 it checks them: one name per browser, and it lasts the run). */
const TAG = Date.now().toString(36).slice(-3);
const ANN = `ann-${TAG}`, BEN = `ben-${TAG}`, DANA = `dana-${TAG}`, ELI = `eli-${TAG}`;

const shot = (p: Page) => p.evaluate(() => (window.__game.scene.getScene('play').state === 'aim' ? window.__autoplay.shot(0, 0.12) : false));

test('the move clock: a penalty stroke at 2:00, the warning at 3:30, the claim at 5:00; the result on "recent"', async ({ browser }) => {
  const errors: string[] = [];
  const A = await player(browser, 'a', errors), B = await player(browser, 'b', errors);
  const a = A.page, b = B.page;
  const code = await makeMatch(a, ANN);
  await joinMatch(b, code, BEN);
  await Promise.all([inPlay(a), inPlay(b)]);
  // the first tee: one game to play, the other watching
  await until([a, b], async () => {
    const [x, y] = [await matchOf(a), await matchOf(b)];
    return !!x && !!y && ((x.state === 'aim' && y.state === 'watch') || (x.state === 'watch' && y.state === 'aim'));
  }, 'a shot to play');
  const aFirst = (await matchOf(a))!.state === 'aim';
  const on = aFirst ? a : b, waiter = aFirst ? b : a;
  const onSeat = (await matchOf(on))!.seat!;

  // 2:00 (and the 15 s the clock starts after the move)
  await skip(code, GRACE + PENALTY + 2_000);
  await hud(waiter, 'penalty stroke');
  await on.waitForFunction(() => { const l = window.__game.scene.getScene('hud').matchLink; return l.visible && l.text.includes('penalty stroke possible'); }, null, { timeout: 15_000 });
  await on.screenshot({ path: `${SHOTS}/c1-on-clock-2min.png` });
  await waiter.screenshot({ path: `${SHOTS}/c2-waiter-penalty.png` });
  await tapButton(waiter, 'hud', 'penalty stroke', 30_000, () => hasText(waiter, 'hud', 'add a penalty stroke?'));
  await waiter.screenshot({ path: `${SHOTS}/c3-ask-penalty.png` });
  await tapButton(waiter, 'hud', 'add it', 30_000, async () => (await stateOf(waiter)).p[onSeat].slow === 1);
  await on.waitForFunction((k) => window.__game.scene.getScene('play').match.session.state.p[k].slow === 1, onSeat, { timeout: 15_000 });
  await on.waitForFunction(() => window.__game.scene.getScene('hud').banner.text === 'penalty stroke', null, { timeout: 10_000 });
  await on.screenshot({ path: `${SHOTS}/c4-on-penalty.png` });
  expect(await hasText(on, 'hud', 'shot 2')).toBe(true); // the stroke counts in the shot number
  expect((await matchOf(on))!.state).toBe('aim'); // and the shot being aimed is still there
  // one per shot
  expect(await waiter.evaluate(() => window.__game.scene.getScene('play').clockChoice().penalty)).toBe(false);

  // 3:30: the player on the clock is warned
  await skip(code, WARN - PENALTY);
  await on.waitForFunction(() => window.__game.scene.getScene('hud').banner.text === 'play now', null, { timeout: 15_000 });
  await on.screenshot({ path: `${SHOTS}/c5-on-warning.png` });

  // 5:00: the waiting player may claim the match
  await skip(code, CLAIM - WARN);
  await hud(waiter, 'claim match');
  await on.waitForFunction(() => window.__game.scene.getScene('hud').matchLink.text.includes('can claim the match'), null, { timeout: 15_000 });
  await waiter.screenshot({ path: `${SHOTS}/c6-waiter-claim.png` });
  await on.screenshot({ path: `${SHOTS}/c7-on-claimable.png` });
  await tapButton(waiter, 'hud', 'claim match', 30_000, () => hasText(waiter, 'hud', 'claim the match?'));
  await waiter.screenshot({ path: `${SHOTS}/c8-ask-claim.png` });
  await tapButton(waiter, 'hud', 'claim it', 30_000, async () => (await matchOf(waiter))?.phase === 'finished');
  for (const p of [a, b]) await p.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'mover', null, { timeout: 30_000 });
  expect(await hasText(waiter, 'hud', 'you won by forfeit')).toBe(true);
  expect(await hasText(on, 'hud', 'won by forfeit')).toBe(true);
  expect(await hasText(on, 'hud', "you didn't play on")).toBe(true);
  await waiter.screenshot({ path: `${SHOTS}/c9-waiter-won.png` });
  await on.screenshot({ path: `${SHOTS}/c10-on-lost.png` });

  // the result on the leaderboard's "recent" list (when this site has a leaderboard database)
  const db = await (await fetch('http://localhost:8788/api/scores?ping=1')).json().catch(() => ({ ok: false }));
  if (db.ok) {
    await tapButton(waiter, 'hud', 'title', 30_000, () => waiter.evaluate(() => window.__game.scene.isActive('title')));
    await tapButton(waiter, 'title', 'leaderboard', 30_000, () => waiter.evaluate(() => window.__game.scene.isActive('leaderboard')));
    await tapButton(waiter, 'leaderboard', 'recent');
    const winner = aFirst ? BEN : ANN, loser = aFirst ? ANN : BEN;
    await waiter.waitForFunction((t) => (window as any).__game.scene.getScene('leaderboard').children.list.some((o: any) => (o.list ?? [o]).some((x: any) => typeof x.text === 'string' && x.text.includes(t))), `${winner} def. ${loser} by forfeit`, { timeout: 30_000 })
      .catch(async () => { await waiter.screenshot({ path: `${SHOTS}/c11-recent-missing.png` }); throw new Error('the match is not on the recent list'); });
    await waiter.screenshot({ path: `${SHOTS}/c11-recent.png` });
  } else console.log('no leaderboard database here (MATCH_D1=1 scripts/match-dev.sh): the recent list is not checked');
  expect(errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('extra holes: all square after the round goes to the 19th (here the 10th), and a claim at the tee', async ({ browser }) => {
  const errors: string[] = [];
  const A = await player(browser, 'a', errors), B = await player(browser, 'b', errors);
  const a = A.page, b = B.page;
  const code = await makeMatch(a, DANA);
  await joinMatch(b, code, ELI);
  await Promise.all([inPlay(a), inPlay(b)]);
  const pageOf = async (seat: number) => ((await matchOf(a))!.seat === seat ? a : b);
  // holes 1-8 given up in turn: four each, all square with one to play
  for (let h = 0; h < 8; h++) {
    const giver = await pageOf(h % 2);
    await until([a, b], async () => {
      const m = await matchOf(giver);
      return !!m && m.hole === h && JSON.parse(m.full).ready.every(Boolean) && (m.state === 'aim' || m.state === 'watch');
    }, `hole ${h + 1} under way`);
    await giver.evaluate(() => window.__game.scene.getScene('play').matchConcede('hole'));
    await until([a, b], async () => JSON.parse((await matchOf(a))!.full).results.length === h + 1, `hole ${h + 1} given up`);
  }
  expect(JSON.parse((await matchOf(a))!.full).results.map((r: any) => r.winner)).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
  // the 9th halved: two tiny tee shots, then each gives the other their next stroke
  const halve = async (h: number) => {
    for (let k = 0; k < 2; k++) {
      await until([a, b], async () => {
        const [x, y] = [await matchOf(a), await matchOf(b)];
        return x!.hole === h && JSON.parse(x!.full).p.filter((p: any) => p.strokes > 0).length === k && (x!.state === 'aim' || y!.state === 'aim');
      }, `tee shot ${k + 1} on hole ${h + 1}`);
      const shooter = (await matchOf(a))!.state === 'aim' ? a : b;
      expect(await shot(shooter)).toBe(true);
    }
    for (let k = 0; k < 2; k++) {
      await until([a, b], async () => {
        const [x, y] = [await matchOf(a), await matchOf(b)];
        const s = JSON.parse(x!.full);
        return s.hole === h && s.p.every((p: any) => p.strokes === 1 || p.holed) && !s.p.some((p: any) => p.pending) && ((x!.state === 'aim' && y!.state === 'watch') || (x!.state === 'watch' && y!.state === 'aim'));
      }, `a stroke to give on hole ${h + 1}`);
      const giver = (await matchOf(a))!.state === 'watch' ? a : b;
      await giver.evaluate(() => {
        const ps = window.__game.scene.getScene('play');
        const s = ps.match.session.state;
        const o = ps.me === 0 ? 1 : 0;
        ps.matchSend({ t: 'concede', what: 'stroke', hole: s.hole, strokes: s.p[o].strokes });
      });
      await until([a, b], async () => JSON.parse((await matchOf(a))!.full).p.filter((p: any) => p.holed).length > k || JSON.parse((await matchOf(a))!.full).results.length > h, 'the stroke given', 30_000, false);
    }
  };
  await halve(8);
  await a.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'mhole', null, { timeout: 30_000 });
  const res9 = JSON.parse((await matchOf(a))!.full).results[8];
  expect(res9).toMatchObject({ winner: null, strokes: [2, 2] });
  expect(await hasText(a, 'hud', 'extra holes: first to win one')).toBe(true);
  await a.screenshot({ path: `${SHOTS}/e1-ninth-halved.png` });

  // the claim at the tee: one player goes to the 10th, the other stays on the result
  await a.evaluate(() => window.__game.scene.getScene('play').matchNextHole());
  await a.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'mwait', null, { timeout: 15_000 });
  await skip(code, GRACE + CLAIM + 2_000);
  await hud(a, 'claim match');
  expect(await hasText(a, 'hud', 'for the 10th')).toBe(true);
  await a.screenshot({ path: `${SHOTS}/e2-tee-claim.png` });
  await b.screenshot({ path: `${SHOTS}/e3-tee-claimable.png` });
  await tapButton(a, 'hud', 'claim match', 30_000, () => hasText(a, 'hud', 'claim the match?'));
  await tapButton(a, 'hud', 'keep waiting', 30_000, async () => (await a.evaluate(() => window.__game.scene.getScene('hud').modal)) === 'mwait');

  // the 10th: the round's first hole again
  await b.evaluate(() => window.__game.scene.getScene('play').matchNextHole());
  await until([a, b], async () => (await matchOf(a))!.state === 'intro' || (await matchOf(b))!.state === 'intro', 'the 10th tee', 60_000, false);
  const introPage = (await matchOf(a))!.state === 'intro' ? a : b;
  expect(await hasText(introPage, 'hud', '10th hole')).toBe(true);
  expect(await hasText(introPage, 'hud', 'sudden death')).toBe(true);
  await introPage.screenshot({ path: `${SHOTS}/e4-intro-10th.png` });
  await until([a, b], async () => { const m = await matchOf(a); return !!m && (m.state === 'aim' || m.state === 'watch') && m.hole === 9; }, 'the 10th under way');
  expect(await hasText(a, 'hud', '10th: hole 1')).toBe(true);
  await a.screenshot({ path: `${SHOTS}/e5-bar-10th.png` });
  // the 10th given up: the match is over, won at the 10th
  await a.evaluate(() => window.__game.scene.getScene('play').matchConcede('hole'));
  for (const p of [a, b]) await p.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'mover', null, { timeout: 30_000 });
  const s = JSON.parse((await matchOf(b))!.full);
  expect(s.outcome).toMatchObject({ how: 'extra', margin: 'at the 10th' });
  expect(await hasText(b, 'hud', 'you won at the 10th')).toBe(true);
  await b.screenshot({ path: `${SHOTS}/e6-won-10th.png` });
  await b.evaluate(() => window.__game.scene.getScene('hud').toggleCard());
  await b.waitForTimeout(400);
  expect(await hasText(b, 'hud', 'extra holes')).toBe(true);
  await b.screenshot({ path: `${SHOTS}/e7-card.png` });
  expect(errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

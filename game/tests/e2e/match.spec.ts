// Live match play end to end (playwright.match.config.ts): two players in two
// browsers make and join a match through the screens, play holes with the
// robot golfer, lose the line, reload, give a putt, concede, and offer a
// rematch. Both games must end with the same match, and no page errors.

import { Browser, expect, Page, test } from '@playwright/test';
import { fillDialog, playState, tapButton } from './matchHelpers';

declare global { interface Window { __game: any; __autoplay: any; __golf: any } }

const SHOTS = 'shots/match'; // not under test-results/ (Playwright empties that on every run)

/** A player's browser, with a switch that cuts its line to the match server (WebSocket and HTTP). */
async function player(browser: Browser, tag: string, errors: string[]) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const net = { down: false };
  await page.routeWebSocket(/\/api\/match\//, (ws) => { if (net.down) ws.close({ code: 1006 }); else ws.connectToServer(); });
  await page.route(/\/api\/match\//, (r) => (net.down ? r.abort('internetdisconnected') : r.continue()));
  return { ctx, page, net };
}

/** The match as a game holds it (null outside the play scene). */
const matchOf = (p: Page) => p.evaluate(() => {
  const g = window.__game;
  if (!g.scene.isActive('play')) return null;
  const ps = g.scene.getScene('play');
  const s = ps.match?.session;
  if (!s) return null;
  return { state: ps.state, seat: ps.match.seat, seq: s.seq, queue: s.queue.length, turn: s.turn, hole: s.state.hole, phase: s.state.phase, status: ps.match.status, modal: g.scene.getScene('hud').modal, full: JSON.stringify(s.state) };
});

/** One step of whatever this game is waiting for: a stroke, a drop, the next hole. */
async function step(p: Page): Promise<string> {
  return p.evaluate(() => {
    const g = window.__game;
    if (!g.scene.isActive('play')) return 'none';
    const ps = g.scene.getScene('play');
    const hud = g.scene.getScene('hud');
    switch (ps.state) {
      case 'intro': ps.skipIntro(); return 'intro';
      case 'aim': window.__autoplay.shot((Math.random() - 0.5) * 2.5); return 'shot';
      case 'flight': ps.fastForward(); return 'flight';
      case 'relief': case 'drop': window.__autoplay.step(); return 'relief';
      case 'between': if (hud.modal === 'mhole') { ps.matchNextHole(); return 'next'; } return 'wait';
      default: return ps.state;
    }
  });
}

test('two players make, join and play a match, through a lost line, a reload and a concession', async ({ browser }) => {
  const errors: string[] = [];
  const A = await player(browser, 'A', errors), B = await player(browser, 'B', errors);
  const a = A.page, b = B.page;
  // charlie makes a match (front nine at Oswego Lake)
  await a.goto('/?autoplay');
  await a.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
  await tapButton(a, 'title', 'play a friend', 30_000, () => a.evaluate(() => window.__game.scene.isActive('match')));
  await tapButton(a, 'match', 'start a match', 30_000, async () => (await a.locator('input').count()) > 0);
  await fillDialog(a, 'charlie');
  await a.waitForFunction(() => window.__game.scene.isActive('courses'), null, { timeout: 30_000 });
  await a.evaluate(() => window.__game.scene.getScene('courses').choose('oswego_lake'));
  await a.waitForFunction(() => window.__game.scene.isActive('setup'), null, { timeout: 90_000 });
  const frontOn = () => a.evaluate(() => {
    const find = (l: any[]): any => { for (const o of l) { if (o.label?.text === 'front 9') return o; if (o.list) { const f = find(o.list); if (f) return f; } } return null; };
    return find(window.__game.scene.getScene('setup').children.list)?.opts?.color === 'orange';
  });
  await tapButton(a, 'setup', 'front 9', 30_000, frontOn);
  await tapButton(a, 'setup', 'invite a friend', 30_000, () => a.evaluate(() => window.__game.scene.isActive('match')));
  await a.waitForFunction(() => { const m = window.__game.scene.getScene('match'); return m.sys.isActive() && m.m.mode === 'invite' && m.live?.caughtUp; }, null, { timeout: 60_000 });
  const code: string = await a.evaluate(() => window.__game.scene.getScene('match').m.code);
  expect(code).toMatch(/^[a-km-np-z2-9]{6}$/);
  await a.screenshot({ path: `${SHOTS}/1-invite.png` });
  // kevin opens the link, enters his name, joins
  await b.goto(`/?match=${code}&autoplay`);
  await b.waitForFunction(() => window.__game?.scene.isActive('match') && window.__game.scene.getScene('match').live?.caughtUp, null, { timeout: 90_000 });
  expect(await b.evaluate(() => window.location.search)).not.toContain('match='); // the link is used once
  await b.screenshot({ path: `${SHOTS}/2-join.png` });
  await tapButton(b, 'match', 'enter your name', 30_000, async () => (await b.locator('input').count()) > 0);
  await fillDialog(b, 'kevin');
  await tapButton(b, 'match', 'join match', 30_000, () => b.evaluate(() => window.__game.scene.isActive('play') || window.__game.scene.getScene('match').note === 'joining...'));
  await Promise.all([a, b].map((p) => p.waitForFunction(() => window.__game.scene.isActive('play') && window.__game.scene.getScene('play').match?.session, null, { timeout: 90_000 })));
  expect((await matchOf(a))!.seat).toBe(0);
  expect((await matchOf(b))!.seat).toBe(1);

  let watched = false, offlineDone = false, reloadDone = false, gave = false, conceded = false;
  const t0 = Date.now();
  for (let guard = 0; guard < 4000; guard++) {
    expect(Date.now() - t0).toBeLessThan(540_000);
    const [ma, mb] = [await matchOf(a), await matchOf(b)];
    if (ma?.phase === 'finished' && mb?.phase === 'finished' && ma.state === 'over' && mb.state === 'over') break;
    // a look at the other player's turn
    if (!watched && (ma?.state === 'watch' || mb?.state === 'watch')) {
      await (ma?.state === 'watch' ? a : b).screenshot({ path: `${SHOTS}/3-watch.png` });
      watched = true;
    }
    // kevin's line drops for a few seconds while charlie is to play, on the first hole
    if (!offlineDone && ma && mb && ma.hole <= 1 && ma.turn === 0 && ma.state === 'aim' && mb.queue === 0 && ['watch', 'idle'].includes(mb.state)) {
      B.net.down = true;
      await b.evaluate(() => window.__game.scene.getScene('play').match.client.ws?.close()); // the line drops
      await step(a); // charlie plays while kevin is away
      await a.waitForFunction(() => window.__game.scene.getScene('play').state !== 'commit', null, { timeout: 30_000 });
      await b.waitForTimeout(4000);
      expect((await matchOf(b))!.status).not.toBe('online');
      B.net.down = false;
      await b.waitForFunction(() => window.__game.scene.getScene('play').match.status === 'online', null, { timeout: 30_000 });
      offlineDone = true;
      continue;
    }
    // charlie's page reloads at the start of the second hole and comes back to the match through its link
    if (!reloadDone && offlineDone && ma && ma.hole >= 1 && ma.phase === 'playing') {
      await a.reload();
      await a.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
      await a.goto(`/?match=${code}&autoplay`);
      await a.waitForFunction(() => window.__game.scene.isActive('play') && window.__game.scene.getScene('play').match?.session, null, { timeout: 90_000 });
      reloadDone = true;
      continue;
    }
    // a putt given ("that's good") once a ball sits on the green
    if (!gave && reloadDone) {
      for (const p of [a, b]) {
        if (await p.evaluate(() => window.__game.scene.getScene('play').canGivePutt?.())) {
          await tapButton(p, 'hud', 'give putt', 5_000).catch(() => p.evaluate(() => window.__game.scene.getScene('play').matchConcede('stroke')));
          gave = true;
          break;
        }
      }
    }
    // on the third hole kevin gives up the match from the menu
    if (!conceded && reloadDone && mb && mb.hole >= 2 && mb.phase === 'playing' && ['aim', 'watch'].includes(mb.state)) {
      await tapButton(b, 'hud', 'menu');
      await tapButton(b, 'hud', 'give up match');
      await tapButton(b, 'hud', 'concede');
      conceded = true;
      continue;
    }
    await step(a);
    await step(b);
    await a.waitForTimeout(60);
  }
  expect(offlineDone && reloadDone && conceded).toBe(true);
  await a.waitForTimeout(1000);
  await a.screenshot({ path: `${SHOTS}/4-over-a.png` });
  await b.screenshot({ path: `${SHOTS}/4-over-b.png` });
  const [fa, fb] = [await matchOf(a), await matchOf(b)];
  expect(fa!.full).toBe(fb!.full); // the same match on both
  const final = JSON.parse(fa!.full);
  expect(final.outcome).toMatchObject({ winner: 0, how: 'conceded' });
  expect(final.results.length).toBeGreaterThanOrEqual(2);
  // a rematch: charlie offers it, kevin's panel shows it
  await tapButton(a, 'hud', 'rematch');
  await a.waitForFunction(() => { const m = window.__game.scene.getScene('match'); return m.sys.isActive() && m.m.mode === 'invite'; }, null, { timeout: 60_000 });
  const rematch: string = await a.evaluate(() => window.__game.scene.getScene('match').m.code);
  await b.waitForFunction(() => JSON.parse(JSON.stringify(window.__game.scene.getScene('play').match.session.state.rematch ?? null))?.code, null, { timeout: 30_000 });
  await tapButton(b, 'hud', 'play the rematch');
  await b.waitForFunction((c) => { const m = window.__game.scene.getScene('match'); return m.sys.isActive() && m.m.code === c; }, rematch, { timeout: 60_000 });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ code, rematch, results: final.results.map((r: any) => `${r.strokes.join('-')}:${r.winner}`), secs: Math.round((Date.now() - t0) / 1000) }));
});

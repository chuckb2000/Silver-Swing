// Live match play: the flows the first test (match.spec.ts) doesn't reach, in
// two real browsers against the match Worker under wrangler
// (playwright.match.config.ts). A ball in the water and its drop; a putt given
// on the giver's own turn and the stroke right behind it; a page reloaded while
// its stroke was on the way; the match opened in a second tab and taken back;
// the pause menu over the waiting panel; a match server older than the game;
// and the screens on a phone held upright.

import { expect, Page, test } from '@playwright/test';
import { inPlay, joinMatch, makeMatch, matchOf, player, step, tapButton, watchPage } from './matchHelpers';

declare global { interface Window { __game: any; __autoplay: any; __log: any[] } }

const SHOTS = 'shots/match'; // not under test-results/ (Playwright empties that on every run)

/** Every event the page's match takes in, kept on the page (for checking what happened). */
const recordLog = (p: Page) => p.evaluate(() => {
  const ms = window.__game.scene.getScene('play').match?.session;
  if (!ms || ms.__recorded) return;
  ms.__recorded = true;
  window.__log = window.__log ?? [];
  const orig = ms.apply.bind(ms);
  ms.apply = (e: any) => { window.__log.push({ t: e.t, by: e.by, seq: e.seq, hole: e.hole, penalty: e.penalty, label: e.label, what: e.what }); return orig(e); };
});
const logOf = (p: Page) => p.evaluate(() => window.__log ?? []);

/** A stroke at the nearest water within reach of the club in hand (the tee shot), at full accuracy. */
const shootAtWater = (p: Page) => p.evaluate(() => {
  const ps = window.__game.scene.getScene('play');
  if (ps.state !== 'aim' || ps.fading || ps.zooming) return false; // a tap during a cut is ignored (as for a player)
  const r = ps.round;
  const reach = r.fullCarry(ps.club) * ps.swingScale;
  for (let d = 50; d <= Math.min(220, reach); d += 4) {
    for (let a = 0; a < 360; a += 3) {
      const x = r.ball.x + Math.cos((a * Math.PI) / 180) * d, y = r.ball.y + Math.sin((a * Math.PI) / 180) * d;
      if (!r.course.water.some((w: any) => w.poly.contains(x, y))) continue;
      ps.aim = Math.atan2(y - r.ball.y, x - r.ball.x);
      ps.tap(performance.now());
      const m = ps.meter;
      if (ps.state !== 'swing' || !m) return false;
      const [d2, d3] = m.tapTimes(Math.max(15, Math.min(100, (d / reach) * 100)), 0);
      ps.tap(m.startedAt + d2);
      ps.tap(m.startedAt + d3);
      return true;
    }
  }
  return false;
});

/** The states a page passes through (sampled every 25 ms) until charlie's strokes on hole `hole` pass `n` (or 20 s). */
const statesUntilStroke = (p: Page, n: number, hole: number) => p.evaluate(([n, hole]) => new Promise<string[]>((res) => {
  const seen: string[] = [];
  const t0 = performance.now();
  const tick = () => {
    const g = window.__game;
    const ps = g.scene.isActive('play') ? g.scene.getScene('play') : null;
    const st = ps ? ps.state : g.scene.isActive('match') ? 'match-screen' : 'other';
    if (seen[seen.length - 1] !== st) seen.push(st);
    if (st === 'flight') ps.fastForward(); // a tap, as a player would (flights are slow on the test machine)
    const s = ps?.match?.session;
    const moved = s && ((s.state.hole === hole && s.state.p[0].strokes > n) || s.state.hole > hole);
    if (moved || performance.now() - t0 > 20_000) res([...seen, moved ? 'STROKE' : 'TIMEOUT']); else setTimeout(tick, 25);
  };
  tick();
}), [n, hole]);

test('match flows: a drop, a putt given on your turn, a reload mid-stroke, a second tab, the pause menu, an old server', async ({ browser }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  const A = await player(browser, 'A', errors), B = await player(browser, 'B', errors);
  let a = A.page;
  const b = B.page;
  const code = await makeMatch(a, 'charlie');
  await joinMatch(b, code, 'kevin');
  await Promise.all([inPlay(a), inPlay(b)]);
  await recordLog(a); await recordLog(b);

  const done = { water: false, give: false, cross: false, reload: false, tab: false, pause: false };
  const t0 = Date.now();
  for (let guard = 0; guard < 6000; guard++) {
    expect(Date.now() - t0, JSON.stringify(done)).toBeLessThan(720_000);
    const [ma, mb] = [await matchOf(a), await matchOf(b)];
    if (!ma || !mb) { await a.waitForTimeout(100); continue; }
    if (Object.values(done).every(Boolean)) break;
    if (ma.phase === 'finished') break;

    // 1. a tee shot into the water (any hole with water in reach), then its drop
    if (!done.water) {
      for (const [p, m] of [[a, ma], [b, mb]] as const) {
        if (m.state === 'aim' && m.seat !== null && m.strokes[m.seat] === 0 && (await shootAtWater(p))) break;
      }
      const splashed = (await logOf(b)).some((e: any) => e.t === 'relief' && e.penalty >= 1);
      if (splashed) {
        done.water = true;
        await b.screenshot({ path: `${SHOTS}/5-other-dropped.png` });
      }
    }

    // 2a. a putt given with the button on the other player's turn (asked first if it hands them the hole)
    if (!done.give && done.water) {
      for (const [p, m] of [[a, ma], [b, mb]] as const) {
        if (m.state !== 'watch' || !(await p.evaluate(() => window.__game.scene.getScene('play').canGivePutt()))) continue;
        const asks = await p.evaluate(() => window.__game.scene.getScene('play').givePuttOutcome() === 'wins');
        const opp = m.seat === 0 ? 1 : 0;
        const holesDone = JSON.parse(m.full).results.length;
        await tapButton(p, 'hud', 'give putt');
        if (asks) {
          await p.screenshot({ path: `${SHOTS}/9-give-ask.png` });
          await tapButton(p, 'hud', 'give it');
        }
        await p.waitForFunction(([o, n]) => { const s = window.__game.scene.getScene('play').match.session; return s.state.p[o].holed || s.state.results.length > n; }, [opp, holesDone], { timeout: 20_000 });
        done.give = true;
        break;
      }
    }

    // 2b. a player's concession and their own stroke crossing on the way to the server (only reachable by a
    // race now that the button waits for the other player's turn): the stroke waits behind it, nothing hangs
    if (!done.cross && done.water) {
      for (const p of [a, b]) {
        const sent = await p.evaluate(() => {
          const ps = window.__game.scene.getScene('play');
          const s = ps.match?.session;
          if (!s || ps.state !== 'aim' || !s.idle || ps.fading || ps.zooming) return false;
          const o = ps.me === 0 ? 1 : 0;
          const r = s.rounds[o];
          if (!r || s.state.p[o].holed || s.state.p[o].pending || s.state.p[o].strokes === 0 || !r.onHoleGreen()) return false;
          ps.matchSend({ t: 'concede', what: 'stroke', hole: s.state.hole, strokes: s.state.p[o].strokes });
          return window.__autoplay.shot(0);
        });
        if (sent) { done.cross = true; break; }
      }
    }

    // 3. charlie's page reloads while his stroke is on its way (his line is down: it waits in the outbox)
    if (!done.reload && done.give && done.cross && ma.state === 'aim' && ma.turn === 0) {
      const before = ma.strokes[0];
      // the scene taking taps (not in a cut between views), as a player would wait for it
      await a.waitForFunction(() => { const ps = window.__game.scene.getScene('play'); return ps.state === 'aim' && !ps.fading && !ps.zooming; }, null, { timeout: 15_000 });
      A.net.down = true;
      await a.evaluate(() => window.__game.scene.getScene('play').match.client.ws?.close());
      expect(await a.evaluate(() => window.__autoplay.shot(0))).toBe(true);
      await a.waitForFunction(() => window.__game.scene.getScene('play').state === 'commit', null, { timeout: 15_000 });
      await a.waitForTimeout(1000);
      await a.reload();
      await a.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
      A.net.down = false;
      await a.goto(`/?match=${code}&autoplay`);
      const states = await statesUntilStroke(a, before, ma.hole);
      await recordLog(a);
      // never offered the shot again: it waited for the stroke ("sending...", or the stroke coming), then played it
      expect(states[states.length - 1], states.join(' > ')).toBe('STROKE');
      expect(states, states.join(' > ')).not.toContain('aim');
      const after = await matchOf(a);
      expect(after!.hole > ma.hole || after!.strokes[0] === before + 1 || after!.strokes[0] === before + 2).toBe(true); // + a penalty if it went in the water
      done.reload = true;
      continue;
    }

    // 4. charlie opens the match in a second tab: the first tab steps aside, then takes it back
    if (!done.tab && done.reload && ['aim', 'watch'].includes(ma.state)) {
      const a2 = await A.ctx.newPage();
      await watchPage(a2, 'A2', errors, A.net);
      await a2.goto(`/?match=${code}&autoplay`);
      await inPlay(a2);
      await a.waitForFunction(() => window.__game.scene.getScene('play').match.status === 'elsewhere', null, { timeout: 30_000 });
      await a.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'mlink', null, { timeout: 10_000 });
      await a.screenshot({ path: `${SHOTS}/6-elsewhere.png` });
      await tapButton(a, 'hud', 'play here', 10_000, () => a.evaluate(() => window.__game.scene.getScene('play').match.status === 'online'));
      await a2.waitForFunction(() => window.__game.scene.getScene('play').match.status === 'elsewhere', null, { timeout: 30_000 });
      await a.waitForFunction(() => window.__game.scene.getScene('hud').modal !== 'mlink', null, { timeout: 10_000 });
      await a2.close();
      done.tab = true;
      continue;
    }

    // 5. the pause menu over the waiting panel: it comes back on "resume"
    if (!done.pause && done.tab && (ma.modal === 'mwait' || mb.modal === 'mwait')) {
      const p = ma.modal === 'mwait' ? a : b;
      await p.keyboard.press('Escape');
      await p.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'pause', null, { timeout: 5_000 });
      await p.screenshot({ path: `${SHOTS}/7-pause-over-wait.png` });
      await tapButton(p, 'hud', 'resume');
      await p.waitForFunction(() => ['mwait', null, 'mhole'].includes(window.__game.scene.getScene('hud').modal) && window.__game.scene.getScene('hud').modal !== 'pause', null, { timeout: 5_000 });
      done.pause = true;
      continue;
    }

    await step(a);
    await step(b);
    await a.waitForTimeout(50);
  }
  expect(done).toEqual({ water: true, give: true, cross: true, reload: true, tab: true, pause: true });

  // 6. kevin's game meets a match server older than it: told what to do, and it stops trying
  B.net.version = true;
  await b.evaluate(() => window.__game.scene.getScene('play').match.client.ws?.close());
  await b.waitForFunction(() => window.__game.scene.getScene('play').match.status === 'version', null, { timeout: 30_000 });
  await b.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'mlink', null, { timeout: 10_000 });
  await b.screenshot({ path: `${SHOTS}/8-version.png` });
  B.net.version = false;
  await tapButton(b, 'hud', 'reload');
  await b.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });

  // the two games agree on the match (kevin back in through his list of matches)
  await b.goto(`/?match=${code}&autoplay`);
  await inPlay(b);
  // kevin's tab goes to the background; charlie gives up the match: kevin's tab title says so, until he looks
  const setVisible = (p: Page, v: 'hidden' | 'visible') => p.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    document.dispatchEvent(new Event('visibilitychange'));
  }, v);
  const title = await b.title();
  await setVisible(b, 'hidden');
  await a.evaluate(() => window.__game.scene.getScene('play').matchConcede('match'));
  await b.waitForFunction(() => document.title.startsWith('●'), null, { timeout: 30_000 });
  expect(await b.title()).toContain('charlie conceded the match');
  await setVisible(b, 'visible');
  expect(await b.title()).toBe(title);
  await Promise.all([a, b].map((p) => p.waitForFunction(() => window.__game.scene.getScene('play').match?.session?.state.phase === 'finished' && window.__game.scene.getScene('play').match.session.idle, null, { timeout: 60_000 })));
  const [fa, fb] = [await matchOf(a), await matchOf(b)];
  expect(fa!.full).toBe(fb!.full);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ code, results: JSON.parse(fa!.full).results.map((r: any) => `${r.strokes.join('-')}:${r.winner}`), secs: Math.round((Date.now() - t0) / 1000) }));
});

test('match screens on a phone held upright', async ({ browser }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  const A = await player(browser, 'A', errors, { width: 390, height: 844 });
  const B = await player(browser, 'B', errors);
  const a = A.page, b = B.page;
  const code = await makeMatch(a, 'charlotte-anne', `${SHOTS}/p1-invite.png`);
  await joinMatch(b, code, 'kevin-alexander');
  await Promise.all([inPlay(a), inPlay(b)]);
  const shots = { watch: false, aim: false, hole: false, wait: false, card: false };
  const t0 = Date.now();
  for (let guard = 0; guard < 4000 && !Object.values(shots).every(Boolean); guard++) {
    expect(Date.now() - t0, JSON.stringify(shots)).toBeLessThan(480_000);
    const m = await matchOf(a);
    if (m?.state === 'watch' && !shots.watch) { await a.waitForTimeout(1500); await a.screenshot({ path: `${SHOTS}/p2-watch.png` }); shots.watch = true; }
    if (m?.state === 'aim' && !shots.aim && m.strokes[0] > 0) { await a.waitForTimeout(1500); await a.screenshot({ path: `${SHOTS}/p3-aim.png` }); shots.aim = true; }
    if (m?.modal === 'mhole' && !shots.hole) {
      await a.screenshot({ path: `${SHOTS}/p4-hole.png` });
      shots.hole = true;
      await tapButton(a, 'hud', 'card');
      await a.waitForTimeout(500);
      await a.screenshot({ path: `${SHOTS}/p5-card.png` });
      shots.card = true;
      await a.mouse.click(10, 10); // tap anywhere to close
    }
    if (m?.modal === 'mwait' && !shots.wait) {
      await a.screenshot({ path: `${SHOTS}/p6-wait.png` });
      // kept only if the panel was still up when the picture was taken (the friend may reach the tee meanwhile)
      shots.wait = (await matchOf(a))?.modal === 'mwait';
    }
    if (m?.modal === 'mhole' && shots.card) await a.evaluate(() => window.__game.scene.getScene('play').matchNextHole());
    else await step(a);
    await step(b);
    await a.waitForTimeout(60);
  }
  expect(shots).toEqual({ watch: true, aim: true, hole: true, wait: true, card: true });
  // the pause menu in a match, on the phone
  await a.keyboard.press('Escape');
  await a.waitForTimeout(400);
  await a.screenshot({ path: `${SHOTS}/p7-pause.png` });
  expect(errors).toEqual([]);
});

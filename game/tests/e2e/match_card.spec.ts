// A finished match on "your matches" opens its card, not the course
// (developer, 2026-10-22: "when you click on your past match that's been
// completed it like reopens the course... if a match has been completed it
// should just open the card").

import { expect, test } from '@playwright/test';
import { inPlay, joinMatch, makeMatch, player, tapButton } from './matchHelpers';

declare global { interface Window { __game: any } }

const SHOTS = 'shots/match';

test("a finished match's card, from the list of matches", async ({ browser }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  const A = await player(browser, 'A', errors);
  const B = await player(browser, 'B', errors);
  const a = A.page, b = B.page;
  const code = await makeMatch(a, 'charlie');
  await joinMatch(b, code, 'kevin');
  await Promise.all([inPlay(a), inPlay(b)]);
  // both at the first tee (one to play, one watching), then charlie gives up the match
  const atTee = (p: typeof a) => p.waitForFunction(() => ['aim', 'watch'].includes(window.__game.scene.getScene('play').state), null, { timeout: 120_000 });
  await Promise.all([atTee(a), atTee(b)]);
  await a.waitForFunction(() => {
    const ps = window.__game.scene.getScene('play');
    if (ps.match?.session?.state.phase === 'finished') return true;
    if (!ps.awaitCid) ps.matchConcede('match'); // again if the first didn't take (the line still opening)
    return false;
  }, null, { timeout: 60_000, polling: 2000 });
  await b.waitForFunction(() => window.__game.scene.getScene('play').match?.session?.state.phase === 'finished', null, { timeout: 60_000 });
  // kevin, later: his list of matches
  await b.goto('/');
  await b.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
  await tapButton(b, 'title', 'play a friend', 30_000, () => b.evaluate(() => window.__game.scene.isActive('match')));
  const label = await b.waitForFunction(() => {
    const find = (l: any[]): string | null => { for (const o of l) { if (o.label?.text?.startsWith('vs charlie')) return o.label.text; if (o.list) { const f = find(o.list); if (f) return f; } } return null; };
    const t = find(window.__game.scene.getScene('match').children.list);
    return t && !t.endsWith('...') ? t : null;
  }, null, { timeout: 30_000 });
  const text = (await label.jsonValue()) as string;
  await tapButton(b, 'match', text, 30_000, () => b.evaluate(() => !!window.__game.scene.getScene('match').cardLayer));
  await b.screenshot({ path: `${SHOTS}/card-of-a-finished-match.png` });
  // the card, on the list of matches: the match isn't opened (no line to it, no course to load, no play scene)
  expect(await b.evaluate(() => {
    const m = window.__game.scene.getScene('match');
    return { list: m.sys.isActive() && m.m.mode === 'home', line: m.live !== null, play: window.__game.scene.isActive('play') };
  })).toEqual({ list: true, line: false, play: false });
  await tapButton(b, 'match', 'close', 30_000, () => b.evaluate(() => !window.__game.scene.getScene('match').cardLayer));
  expect(errors).toEqual([]);
});

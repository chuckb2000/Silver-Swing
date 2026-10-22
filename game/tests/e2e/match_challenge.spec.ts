// "Open to a challenge" end to end (developer, 2026-10-22): charlie says he's
// looking for a match at Oswego Lake; kevin, on the title screen, gets a note
// (nothing greyed out, his menu where it was) and charlie in the box beside
// the menu, taps him, sets the match up and offers it; charlie gets a note of
// the offer and "1 offer for you" on his button, taps it, accepts, and both
// are on the first tee. Against the match Worker (with its
// lobby) and the site's functions under wrangler (scripts/match-dev.sh).

import { expect, Page, test } from '@playwright/test';
import { fillDialog, hasText, inPlay, locate, player, tapButton } from './matchHelpers';

declare global { interface Window { __game: any; __lobby: any } }

const SHOTS = 'shots/match';

/** A note is up, and nothing is dimmed or blocked: the middle of the screen is still the game. */
async function noteUp(p: Page, text: string) {
  await p.waitForFunction((t) => Array.from(document.querySelectorAll('[data-toast] div')).some((d) => d.textContent === t), text, { timeout: 30_000 });
  expect(await p.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.tagName)).toBe('CANVAS');
}

const dialogSays = (p: Page, text: string) => p.waitForFunction((t) => Array.from(document.querySelectorAll('div')).some((d) => d.textContent === t), text, { timeout: 30_000 });

/** Every button on the title, label -> where it is (the menu mustn't move when someone posts). */
const menuAt = (p: Page) => p.evaluate(() => {
  const out: Record<string, [number, number]> = {};
  const find = (l: any[]) => { for (const o of l) { if (o.label && o.bw) { const m = o.getWorldTransformMatrix(); out[o.label.text] = [m.tx, m.ty]; } if (o.list) find(o.list); } };
  find(window.__game.scene.getScene('title').children.list);
  return out;
});

async function atTitle(p: Page) {
  await p.goto('/?autoplay');
  await p.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
  await p.waitForFunction(() => window.__lobby?.ready === true, null, { timeout: 60_000 });
}

test('open to a challenge: a post, a note, an offer, accepted, both on the first tee', async ({ browser }) => {
  test.setTimeout(500_000);
  const errors: string[] = [];
  const A = await player(browser, 'A', errors);
  const B = await player(browser, 'B', errors);
  const a = A.page, b = B.page;
  await Promise.all([atTitle(a), atTitle(b)]);
  const kevinMenu = await menuAt(b);

  // charlie: open to a challenge, at oswego lake (his name first: the others see it)
  await tapButton(a, 'title', 'open to a challenge', 30_000, async () => (await a.locator('input').count()) > 0);
  await fillDialog(a, 'charlie');
  await a.waitForSelector('select', { timeout: 30_000 });
  await a.selectOption('select', 'oswego_lake');
  await a.screenshot({ path: `${SHOTS}/challenge-1-post.png` });
  await a.getByRole('button', { name: 'post', exact: true }).click();
  await a.waitForFunction(() => window.__lobby.mine !== null, null, { timeout: 30_000 });
  await a.waitForFunction(() => {
    const find = (l: any[]): boolean => l.some((o) => (o.label?.text ?? '').startsWith('looking: ') || (o.list && find(o.list)));
    return find(window.__game.scene.getScene('title').children.list);
  }, null, { timeout: 30_000 });
  await a.screenshot({ path: `${SHOTS}/challenge-2-looking.png` });

  // kevin: a note at the top of his title screen; his menu hasn't moved, and charlie is in the box beside it
  await noteUp(b, 'charlie is looking for a match');
  await b.waitForFunction(() => window.__game.scene.getScene('title').lobbyBox !== null, null, { timeout: 30_000 });
  await b.screenshot({ path: `${SHOTS}/challenge-3-note.png` });
  expect(await hasText(b, 'title', 'looking for a match')).toBe(true);
  expect(await menuAt(b)).toEqual(kevinMenu);
  const row = (await b.evaluate(locate, ['title', null, 'charlie'] as [string, string | null, string | null]))!;
  await b.mouse.click(row.x, row.y, { delay: 60 });
  await dialogSays(b, 'charlie is looking for a match');
  await b.getByRole('button', { name: 'play', exact: true }).click();
  await fillDialog(b, 'kevin'); // his name for the match
  // straight to the new-match screen on charlie's course, offered to him
  await b.waitForFunction(() => window.__game.scene.isActive('setup'), null, { timeout: 120_000 });
  expect(await b.evaluate(() => window.__golf.course.json.id)).toBe('oswego_lake');
  const frontOn = () => b.evaluate(() => {
    const find = (l: any[]): any => { for (const o of l) { if (o.label?.text === 'front 9') return o; if (o.list) { const f = find(o.list); if (f) return f; } } return null; };
    return find(window.__game.scene.getScene('setup').children.list)?.opts?.color === 'orange';
  });
  await tapButton(b, 'setup', 'front 9', 30_000, frontOn);
  await b.screenshot({ path: `${SHOTS}/challenge-4-setup.png` });
  await tapButton(b, 'setup', 'offer to charlie', 30_000, () => b.evaluate(() => window.__game.scene.isActive('match')));
  await b.waitForFunction(() => window.__lobby.sent.length === 1, null, { timeout: 30_000 });
  await b.waitForFunction(() => { const m = window.__game.scene.getScene('match'); return m.sys.isActive() && m.m.mode === 'invite' && m.m.challenge?.to === 'charlie'; }, null, { timeout: 30_000 });
  await b.screenshot({ path: `${SHOTS}/challenge-5-waiting.png` });

  // charlie: a note of the offer, and his button says so; he taps it, accepts, and joins kevin's match
  await noteUp(a, 'kevin offers you a match');
  await a.waitForFunction(() => {
    const find = (l: any[]): boolean => l.some((o) => o.label?.text === '1 offer for you' || (o.list && find(o.list)));
    return find(window.__game.scene.getScene('title').children.list);
  }, null, { timeout: 30_000 });
  await a.screenshot({ path: `${SHOTS}/challenge-6-offer.png` });
  // the note may have gone by now (it stays 12 s): the offer waits on his button
  await tapButton(a, 'title', '1 offer for you', 30_000, async () => (await a.getByRole('button', { name: 'accept', exact: true }).count()) > 0);
  await a.getByRole('button', { name: 'accept', exact: true }).click();
  await Promise.all([inPlay(a), inPlay(b)]);
  const players = await a.evaluate(() => window.__game.scene.getScene('play').match.session.state.players.map((p: any) => p?.name));
  expect(players).toEqual(['kevin', 'charlie']);
  // the post is gone for everyone
  await b.waitForFunction(() => window.__lobby.openPosts().length === 0, null, { timeout: 30_000 });
  expect(await a.evaluate(() => window.__lobby.mine)).toBeNull();
  await a.screenshot({ path: `${SHOTS}/challenge-7-tee.png` });
  expect(errors).toEqual([]);
});

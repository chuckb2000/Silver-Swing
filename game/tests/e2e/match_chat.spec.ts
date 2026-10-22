// Live match play: chat (developer, 2026-10-22: typed messages only), in two
// real browsers against the match Worker under wrangler
// (playwright.match.config.ts). A message typed in the panel reaches the other
// player as a note under the match bar, with an unread count on the chat
// button; it is filtered like a name; the other panel shows replies as they
// come; a reload keeps the history and what has been read; and the panel
// fits a phone held upright.

import { expect, Page, test } from '@playwright/test';
import { inPlay, joinMatch, makeMatch, player, tapButton } from './matchHelpers';

declare global { interface Window { __game: any } }

const SHOTS = 'shots/match';
const TAG = Date.now().toString(36).slice(-3);

/** The HUD's chat state on a page: unread count, the note's text (null: hidden), the panel open. */
const chatOf = (p: Page) => p.evaluate(() => {
  const hud = window.__game.scene.getScene('hud');
  const live = window.__game.scene.getScene('play').match;
  return {
    ready: !!live?.chatReady,
    unread: live?.chatUnread ?? 0,
    badge: hud.chatBadge?.visible ? hud.chatBadgeTxt.text : null,
    note: hud.chatNote?.visible ? hud.chatNoteTxt.text : null,
    open: !!document.querySelector('[data-chat]'),
    lines: Array.from(document.querySelectorAll('[data-chat-list] > div')).map((d) => d.textContent ?? ''),
  };
});

async function say(p: Page, text: string) {
  await p.locator('[data-chat] input').fill(text);
  await p.keyboard.press('Enter');
}

test('chat: a message reaches the other player (filtered), replies show as they come, a reload keeps the history', async ({ browser }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  const A = await player(browser, 'A', errors), B = await player(browser, 'B', errors);
  const a = A.page;
  let b = B.page;
  const code = await makeMatch(a, `cat-${TAG}`);
  await joinMatch(b, code, `dog-${TAG}`);
  await Promise.all([inPlay(a), inPlay(b)]);
  await a.waitForFunction(() => window.__game.scene.getScene('play').match?.chatReady, null, { timeout: 30_000 });

  // A opens the chat with its button and types
  await tapButton(a, 'hud', 'chat', 30_000, async () => (await chatOf(a)).open);
  expect((await chatOf(a)).lines.join(' ')).toContain('no messages yet');
  await say(a, 'nice drive 🏌️  what the fuck');
  await a.waitForFunction(() => Array.from(document.querySelectorAll('[data-chat-list] > div')).some((d) => (d.textContent ?? '').includes('what the ****') && !(d.textContent ?? '').includes('sending')), null, { timeout: 20_000 });
  await a.screenshot({ path: `${SHOTS}/chat-1-panel.png` });

  // B: a note under the match bar and a count on the button (emoji left out of the pixel font's note)
  await b.waitForFunction(() => window.__game.scene.getScene('hud').chatNote?.visible, null, { timeout: 20_000 });
  const nb = await chatOf(b);
  expect(nb.note).toContain('what the ****');
  expect(nb.note).not.toContain('fuck');
  expect(nb.unread).toBe(1);
  expect(nb.badge).toBe('1');
  await b.screenshot({ path: `${SHOTS}/chat-2-note.png` });

  // B opens it with T: the message is there in full (emoji too), and it is read
  await b.keyboard.press('t');
  await b.waitForFunction(() => !!document.querySelector('[data-chat]'), null, { timeout: 10_000 });
  const ob = await chatOf(b);
  expect(ob.lines.some((l) => l.includes('nice drive 🏌️ what the ****'))).toBe(true);
  expect(ob.unread).toBe(0);
  // B replies; A's open panel shows it as it comes, with no note (the panel is open)
  await say(b, 'thanks! your putt');
  await a.waitForFunction(() => Array.from(document.querySelectorAll('[data-chat-list] > div')).some((d) => (d.textContent ?? '').includes('thanks! your putt')), null, { timeout: 20_000 });
  const oa = await chatOf(a);
  expect(oa.note).toBe(null);
  expect(oa.unread).toBe(0);
  await b.screenshot({ path: `${SHOTS}/chat-3-reply.png` });

  // keys typed in the panel stay there (space would otherwise swing)
  const before = await a.evaluate(() => window.__game.scene.getScene('play').state);
  await a.locator('[data-chat] input').fill('');
  await a.keyboard.type('a b ');
  expect(await a.evaluate(() => window.__game.scene.getScene('play').state)).toBe(before);
  await a.keyboard.press('Escape');
  await a.waitForFunction(() => !document.querySelector('[data-chat]'), null, { timeout: 10_000 });

  // B closes the panel and reloads: the history is still there, and nothing shows as unread
  await b.keyboard.press('Escape');
  await b.goto(`/?match=${code}&autoplay`); // (the game takes the match out of the address once in it)
  await inPlay(b);
  await b.waitForFunction(() => window.__game.scene.getScene('play').match?.chatReady && window.__game.scene.getScene('play').match.chat.length === 2, null, { timeout: 60_000 });
  const rb = await chatOf(b);
  expect(rb.unread).toBe(0);
  expect(rb.badge).toBe(null);
  expect(rb.note).toBe(null);

  // a message while B's page is away: counted when B comes back, one note
  await b.close();
  await tapButton(a, 'hud', 'chat', 30_000, async () => (await chatOf(a)).open);
  await say(a, 'your turn!');
  await a.waitForFunction(() => Array.from(document.querySelectorAll('[data-chat-list] > div')).some((d) => (d.textContent ?? '').includes('your turn!') && !(d.textContent ?? '').includes('sending')), null, { timeout: 20_000 });
  b = await B.ctx.newPage();
  await b.goto(`/?match=${code}&autoplay`);
  await inPlay(b);
  await b.waitForFunction(() => window.__game.scene.getScene('play').match?.chatUnread === 1, null, { timeout: 60_000 });
  expect((await chatOf(b)).badge).toBe('1');
  expect(errors).toEqual([]);
});

test('chat on a phone held upright', async ({ browser }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  const phone = { width: 390, height: 844 };
  const A = await player(browser, 'A', errors, phone), B = await player(browser, 'B', errors, phone);
  const a = A.page, b = B.page;
  const code = await makeMatch(a, `emu-${TAG}`);
  await joinMatch(b, code, `fox-${TAG}`);
  await Promise.all([inPlay(a), inPlay(b)]);
  await a.waitForFunction(() => window.__game.scene.getScene('play').match?.chatReady, null, { timeout: 30_000 });
  await tapButton(a, 'hud', 'chat', 30_000, async () => (await chatOf(a)).open);
  await say(a, 'a long one to see how it wraps on a narrow screen: that was a great up and down from the bunker');
  await b.waitForFunction(() => window.__game.scene.getScene('hud').chatNote?.visible, null, { timeout: 20_000 });
  await b.screenshot({ path: `${SHOTS}/chat-4-phone-note.png` });
  await a.screenshot({ path: `${SHOTS}/chat-5-phone-panel.png` });
  // the panel inside the screen
  const box = await a.locator('[data-chat]').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(phone.width);
  expect(errors).toEqual([]);
});

test('chat keeps quiet while a player is hitting: the note waits until the shot is over', async ({ browser }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  const A = await player(browser, 'A', errors), B = await player(browser, 'B', errors);
  const a = A.page, b = B.page;
  const code = await makeMatch(a, `gnu-${TAG}`);
  await joinMatch(b, code, `hen-${TAG}`);
  await Promise.all([inPlay(a), inPlay(b)]);
  // past the fly-over: one of them aims (the honour)
  const stateOf = (p: Page) => p.evaluate(() => window.__game.scene.getScene('play').state as string);
  let hitter: Page | null = null;
  for (let i = 0; i < 400 && !hitter; i++) {
    for (const p of [a, b]) {
      await p.evaluate(() => { const ps = window.__game.scene.getScene('play'); if (ps.state === 'intro') ps.skipIntro(); });
      if ((await stateOf(p)) === 'aim') hitter = p;
    }
    await a.waitForTimeout(150);
  }
  expect(hitter).not.toBe(null);
  const other = hitter === a ? b : a;
  await other.waitForFunction(() => window.__game.scene.getScene('play').match?.chatReady, null, { timeout: 30_000 });
  await tapButton(other, 'hud', 'chat', 30_000, async () => (await chatOf(other)).open);
  await say(other, 'quiet please');
  await hitter!.waitForFunction(() => window.__game.scene.getScene('play').match?.chatUnread === 1, null, { timeout: 20_000 });
  await hitter!.waitForTimeout(1500);
  const during = await chatOf(hitter!);
  expect(during.note).toBe(null);   // no note,
  expect(during.badge).toBe(null);  // no count
  expect(await hitter!.evaluate(() => window.__game.scene.getScene('hud').chatBtn.opts.color)).toBe('grey');
  await hitter!.screenshot({ path: `${SHOTS}/chat-6-quiet-while-hitting.png` });
  // the shot: the note waits through the swing and the flight, and shows once the ball has stopped
  expect(await hitter!.evaluate(() => window.__autoplay.shot(0, 0.12))).toBe(true);
  for (let i = 0; i < 400; i++) {
    const st = await stateOf(hitter!);
    if (st === 'flight') await hitter!.evaluate(() => window.__game.scene.getScene('play').fastForward());
    const c = await chatOf(hitter!);
    if (c.note) break;
    if (['aim', 'swing', 'commit', 'flight', 'settle'].includes(st)) expect(c.note).toBe(null);
    await hitter!.waitForTimeout(100);
  }
  const after = await chatOf(hitter!);
  expect(after.note).toContain('quiet please');
  expect(after.badge).toBe('1');
  expect(await stateOf(hitter!)).not.toBe('aim');
  expect(errors).toEqual([]);
});

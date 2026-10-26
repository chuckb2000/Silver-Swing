// Missed clicks (developer, 2026-10-22: "the game is occasionally missing clicks"):
// - a button let go a few pixels off its edge still counts (a finger or a mouse that slid a
//   little); let go well away from it, it doesn't (the way to change your mind);
// - a swing tapped while the camera is still moving to the shot (a cut or a zoom) starts when the
//   camera gets there, instead of being dropped.

import { expect, Page, test } from '@playwright/test';
import { tapButton } from './matchHelpers';

declare global { interface Window { __game: any } }

/** A Button's box on the page (CSS px), and how many CSS px one game pixel is there. */
const buttonBox = (p: Page, scene: string, label: string) => p.waitForFunction(([scene, label]) => {
  const g = window.__game, s = g?.scene.getScene(scene);
  if (!s || !s.sys.isActive()) return null;
  const find = (l: any[]): any => {
    for (const o of l) {
      if (o.label && o.label.text === label && o.visible && o.enabled !== false) return o;
      if (o.list) { const f = find(o.list); if (f) return f; }
    }
    return null;
  };
  const b = find(s.children.list);
  if (!b) return null;
  const c = g.canvas.getBoundingClientRect();
  const k = s.cameras.main.zoom * (c.width / g.canvas.width);
  const m = b.getWorldTransformMatrix();
  return { x: c.left + m.tx * k, y: c.top + m.ty * k, w: b.bw * k, h: b.bh * k, k };
}, [scene, label] as [string, string], { timeout: 30_000 }).then(async (h) => (await h.jsonValue()) as { x: number; y: number; w: number; h: number; k: number });

/** Wait until the game has drawn a few frames since now (new objects take input from the next frame). */
async function settle(p: Page, frames = 3) {
  const f0 = await p.evaluate(() => window.__game.loop.frame);
  await p.waitForFunction((f) => window.__game.loop.frame >= f, f0 + frames, { polling: 20 });
}

const active = (p: Page, key: string) => p.evaluate((k) => window.__game.scene.isActive(k), key);

test('a button let go just off its edge still counts; let go well away, it does not', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
  await settle(page, 5);

  // press "leaderboard", slide well off it, let go: nothing happens
  let b = await buttonBox(page, 'title', 'leaderboard');
  await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
  await settle(page);
  await page.mouse.down();
  await settle(page);
  await page.mouse.move(b.x + b.w + 30 * b.k, b.y + b.h / 2, { steps: 4 });
  await settle(page);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  expect(await active(page, 'title')).toBe(true);
  expect(await active(page, 'leaderboard')).toBe(false);

  // press it again, slide to 3 game pixels below its bottom edge, let go there: it counts
  b = await buttonBox(page, 'title', 'leaderboard');
  await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
  await settle(page);
  await page.mouse.down();
  await settle(page);
  await page.mouse.move(b.x + b.w / 2, b.y + b.h + 3 * b.k, { steps: 3 });
  await settle(page);
  await page.mouse.up();
  await page.waitForFunction(() => window.__game.scene.isActive('leaderboard'), null, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('a swing tapped while the camera is still moving to the shot starts when the camera gets there', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
  const aiming = () => page.evaluate(() => {
    const g = window.__game;
    if (!g.scene.isActive('play')) return false;
    const ps = g.scene.getScene('play');
    return ps.state === 'aim' && !ps.fading && !ps.zooming;
  });
  await tapButton(page, 'title', 'practice', 60_000, aiming);
  await page.waitForFunction(() => {
    const ps = window.__game.scene.getScene('play');
    return ps.state === 'aim' && !ps.fading && !ps.zooming;
  }, null, { timeout: 60_000 });
  const b = await buttonBox(page, 'hud', 'swing');
  await settle(page);

  // count the meter's starts (a slow test machine can see a swing come and go between two looks)
  await page.evaluate(() => {
    const ps = window.__game.scene.getScene('play'), w = window as any;
    const start = ps.startMeter.bind(ps);
    w.__meters = 0;
    ps.startMeter = (ts: number) => { w.__meters++; return start(ts); };
  });
  const playState = () => page.evaluate(() => {
    const ps = window.__game.scene.getScene('play');
    return { state: ps.state, fading: ps.fading, zooming: ps.zooming, queued: ps.queuedTap, modal: ps.hud.modalOpen(), meters: (window as any).__meters };
  });
  // a slow camera cut (as between practice stations, held long enough to tap in it)
  await page.evaluate(() => window.__game.scene.getScene('play').cut(() => {}, 1500, 1500));
  expect(await page.evaluate(() => window.__game.scene.getScene('play').fading)).toBe(true);
  // the swing button, pressed during the cut: kept, not lost
  await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
  await page.waitForFunction(() => window.__game.scene.getScene('play').queuedTap === true, null, { timeout: 10_000 });
  expect(await page.evaluate(() => window.__game.scene.getScene('play').state)).toBe('aim');
  // the cut ends: the meter starts
  await page.waitForFunction(() => (window as any).__meters === 1, null, { timeout: 20_000 })
    .catch(async (e) => { throw new Error(`the meter didn't start after the cut: ${JSON.stringify(await playState())} (${e})`); });
  expect(await page.evaluate(() => window.__game.scene.getScene('play').queuedTap)).toBe(false);

  // the same with the space bar, during a zoom (back to aiming first: the swing may have gone on its own)
  await page.evaluate(() => window.__game.scene.getScene('play').cancelSwing());
  await page.waitForFunction(() => {
    const ps = window.__game.scene.getScene('play');
    return ps.state === 'aim' && !ps.fading && !ps.zooming;
  }, null, { timeout: 60_000 });
  await page.evaluate(() => { window.__game.scene.getScene('play').zooming = true; });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.scene.getScene('play').queuedTap === true, null, { timeout: 10_000 });
  expect(await page.evaluate(() => window.__game.scene.getScene('play').state)).toBe('aim');
  await page.evaluate(() => { const ps = window.__game.scene.getScene('play'); ps.zooming = false; ps.transitionDone(); });
  expect(await page.evaluate(() => window.__game.scene.getScene('play').state)).toBe('swing');

  // a tap queued for a shot that has gone (a menu opened over it) is dropped, not played later
  await page.evaluate(() => window.__game.scene.getScene('play').cancelSwing());
  await page.evaluate(() => { const ps = window.__game.scene.getScene('play'); ps.zooming = true; ps.tap(performance.now()); ps.state = 'idle'; ps.zooming = false; ps.transitionDone(); ps.state = 'aim'; });
  expect(await page.evaluate(() => window.__game.scene.getScene('play').state)).toBe('aim');
  expect(errors).toEqual([]);
});

test('after the first tap, a press on a button beside the swing button (swing length) or on the course is the next swing tap', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
  const aiming = () => page.evaluate(() => {
    const g = window.__game;
    if (!g.scene.isActive('play')) return false;
    const ps = g.scene.getScene('play');
    return ps.state === 'aim' && !ps.fading && !ps.zooming;
  });
  await tapButton(page, 'title', 'practice', 60_000, aiming);
  await page.waitForFunction(() => {
    const ps = window.__game.scene.getScene('play');
    return ps.state === 'aim' && !ps.fading && !ps.zooming;
  }, null, { timeout: 60_000 });
  const swing = await buttonBox(page, 'hud', 'swing');
  const scale = await buttonBox(page, 'hud', 'full');
  await settle(page);
  const scale0 = await page.evaluate(() => window.__game.scene.getScene('play').swingScale);
  await page.mouse.click(swing.x + swing.w / 2, swing.y + swing.h / 2);
  await page.waitForFunction(() => window.__game.scene.getScene('play').meter?.phase === 'power', null, { timeout: 10_000 });
  await settle(page, 4);
  await page.waitForTimeout(300);
  // tap 2 lands on the swing-length button next to the swing button: power is set, the length stays
  await page.mouse.click(scale.x + scale.w / 2, scale.y + scale.h / 2);
  await page.waitForFunction(() => window.__game.scene.getScene('play').meter?.phase !== 'power', null, { timeout: 5_000 });
  expect(await page.evaluate(() => window.__game.scene.getScene('play').meter?.phase)).toBe('accuracy');
  // set by the press, not by the cursor turning at the end of the bar by itself
  expect(await page.evaluate(() => { const m = window.__game.scene.getScene('play').meter; return !m.maxed && m.powerPos < 95; })).toBe(true);
  expect(await page.evaluate(() => window.__game.scene.getScene('play').swingScale)).toBe(scale0);
  // tap 3 well away from it, on the course: the stroke goes
  await page.mouse.click(swing.x - 200, swing.y - 150);
  await page.waitForFunction(() => window.__game.scene.getScene('play').state !== 'swing', null, { timeout: 10_000 });
  // the menu button still opens the menu mid-swing (and stops the swing)
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'aim' && !window.__game.scene.getScene('play').fading, null, { timeout: 60_000 });
  const menu = await buttonBox(page, 'hud', 'menu');
  await settle(page);
  await page.mouse.click(swing.x + swing.w / 2, swing.y + swing.h / 2);
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'swing', null, { timeout: 10_000 });
  await settle(page, 4);
  await page.mouse.click(menu.x + menu.w / 2, menu.y + menu.h / 2);
  await page.waitForFunction(() => window.__game.scene.getScene('play').hud.modalOpen(), null, { timeout: 10_000 });
  expect(await page.evaluate(() => window.__game.scene.getScene('play').state)).toBe('aim');
  expect(errors).toEqual([]);
});

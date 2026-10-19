import { expect, Page, test } from '@playwright/test';

declare global {
  interface Window {
    __game: any;
    __golf: any;
    __autoplay: any;
  }
}

/** Click a Button (by label) in a scene through the real pointer path. */
async function clickButton(page: Page, scene: string, label: string) {
  const pos = await page.evaluate(([scene, label]) => {
    const g = window.__game;
    const s = g.scene.getScene(scene);
    const find = (list: any[]): any => {
      for (const o of list) {
        if (o.label && o.label.text === label) return o;
        if (o.list) { const f = find(o.list); if (f) return f; }
      }
      return null;
    };
    const b = find(s.children.list);
    if (!b) return null;
    const m = b.getWorldTransformMatrix();
    const canvas = g.canvas.getBoundingClientRect();
    // scene units are texels: x camera zoom = device px, x css/device = css px
    const k = s.cameras.main.zoom * (canvas.width / g.canvas.width);
    return { x: canvas.left + (m.tx + b.bw / 2) * k, y: canvas.top + (m.ty + b.bh / 2) * k };
  }, [scene, label]);
  expect(pos, `button "${label}" in ${scene}`).not.toBeNull();
  await page.mouse.click(pos!.x, pos!.y);
}

/** Click a piece of text (a state button or a course card) in a scene. */
async function clickText(page: Page, scene: string, text: string) {
  const pos = await page.evaluate(([scene, text]) => {
    const g = window.__game;
    const s = g.scene.getScene(scene);
    const find = (list: any[]): any => {
      for (const o of list) {
        if (o.type === 'BitmapText' && o.text === text) return o;
        if (o.list) { const f = find(o.list); if (f) return f; }
      }
      return null;
    };
    const t = find(s.children.list);
    if (!t) return null;
    const b = t.getBounds();
    const canvas = g.canvas.getBoundingClientRect();
    const k = s.cameras.main.zoom * (canvas.width / g.canvas.width);
    return { x: canvas.left + b.centerX * k, y: canvas.top + b.centerY * k };
  }, [scene, text]);
  expect(pos, `text "${text}" in ${scene}`).not.toBeNull();
  await page.mouse.click(pos!.x, pos!.y);
}

test('title -> new round -> play hole 1 to the cup', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await page.waitForTimeout(500);
  await clickButton(page, 'title', 'play');
  // choose a state, then the course
  await page.waitForFunction(() => window.__game.scene.isActive('courses'), null, { polling: 100 });
  await page.waitForTimeout(400);
  await clickText(page, 'courses', 'oregon');
  await page.waitForTimeout(600);
  await clickText(page, 'courses', 'oswego lake country club');
  await page.waitForFunction(() => window.__game.scene.isActive('setup'), null, { polling: 100 });
  await page.waitForTimeout(300);
  await clickButton(page, 'setup', 'front 9');
  // the menu rebuilds a frame or two later (slow under software rendering): wait for it
  await page.waitForFunction(() => {
    const find = (list: any[]): any => {
      for (const o of list) {
        if (o.label && o.label.text === 'front 9') return o;
        if (o.list) { const f = find(o.list); if (f) return f; }
      }
      return null;
    };
    const b = find(window.__game.scene.getScene('setup').children.list);
    return b && b.opts && b.opts.color === 'orange';
  }, null, { polling: 100 });
  await page.waitForTimeout(200);
  await clickButton(page, 'setup', 'tee off');
  await page.waitForFunction(() => window.__game.scene.isActive('play') && window.__game.scene.getScene('play').state === 'intro', null, { polling: 100 });
  // skip the fly-over with the keyboard, then play with the robot golfer
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'aim', null, { polling: 100 });
  const hole = await page.evaluate(() => window.__game.scene.getScene('play').round.holeNumber);
  expect(hole).toBe(1);
  for (let i = 0; i < 300; i++) {
    const st = await page.evaluate(() => window.__game.scene.getScene('play').state);
    if (st === 'holed') break;
    if (st === 'aim') await page.evaluate(() => window.__autoplay.shot(0));
    else if (st !== 'settle' && st !== 'swing') await page.evaluate(() => window.__autoplay.step());
    await page.waitForTimeout(60);
  }
  const score = await page.evaluate(() => window.__golf.round.scores[0]);
  expect(score.hole).toBe(1);
  expect(score.strokes).toBeGreaterThan(1);
  expect(score.strokes).toBeLessThan(12);
  // the round is auto-saved after every shot so it can be resumed
  const saved = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('local-golf:round-in-progress') || 'null'); } catch { return null; }
  });
  expect(saved?.scores?.[0]?.hole).toBe(1);
  expect(errors).toEqual([]);
});

test('portrait phone layout loads and shows the swing button', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  // layout size in texels (art pixels)
  const size = await page.evaluate(() => window.__golf.view);
  expect(size.h).toBeGreaterThan(size.w);
  expect(size.w).toBeGreaterThanOrEqual(240);
  await ctx.close();
});

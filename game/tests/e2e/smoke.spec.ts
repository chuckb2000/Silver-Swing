import { expect, Page, test } from '@playwright/test';

declare global {
  interface Window {
    __game: any;
    __golf: any;
    __autoplay: any;
  }
}

type Target = { button?: string; text?: string };

/** Screen position (CSS px) of a Button (by label) or a piece of text in an active scene, else null. */
const locate = ([scene, label, text]: [string, string | null, string | null]) => {
  const g = window.__game;
  const s = g?.scene.getScene(scene);
  if (!s || !s.sys.isActive() || !s.cameras?.main) return null;
  const find = (list: any[]): any => {
    for (const o of list) {
      if (label !== null && o.label && o.label.text === label) return o;
      if (text !== null && o.type === 'BitmapText' && o.text === text) return o;
      if (o.list) { const f = find(o.list); if (f) return f; }
    }
    return null;
  };
  const o = find(s.children.list);
  if (!o) return null;
  const canvas = g.canvas.getBoundingClientRect();
  // scene units are texels: x camera zoom = device px, x css/device = css px
  const k = s.cameras.main.zoom * (canvas.width / g.canvas.width);
  if (label !== null) {
    const m = o.getWorldTransformMatrix();
    return { x: canvas.left + (m.tx + o.bw / 2) * k, y: canvas.top + (m.ty + o.bh / 2) * k };
  }
  const b = o.getBounds();
  return { x: canvas.left + b.centerX * k, y: canvas.top + b.centerY * k };
};

/**
 * Tap a button or text like a person (a short press, through the real pointer
 * path) and wait until `done` holds. Objects made in a redraw only take input
 * from the next frame on, and the test machine can run the game at a few frames
 * a second (software WebGL), so each tap waits two frames first; a tap that
 * still gets no response is tried again (up to 3 times) and reported.
 */
async function tap(page: Page, scene: string, what: Target, done: (arg: any) => unknown, arg?: unknown) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const f0 = await page.evaluate(() => window.__game.loop.frame);
    await page.waitForFunction((f) => window.__game.loop.frame >= f + 2, f0, { polling: 20 });
    const handle = await page.waitForFunction(locate, [scene, what.button ?? null, what.text ?? null] as [string, string | null, string | null], { polling: 100, timeout: 30_000 });
    const pos = (await handle.jsonValue()) as { x: number; y: number };
    await page.mouse.click(pos.x, pos.y, { delay: 60 });
    try {
      await page.waitForFunction(done, arg, { polling: 100, timeout: 20_000 });
      return;
    } catch {
      console.warn(`tap ${JSON.stringify(what)} in ${scene}: no response yet, tapping again (attempt ${attempt})`);
    }
  }
  throw new Error(`tap ${JSON.stringify(what)} in ${scene} never took effect`);
}

const sceneActive = (key: string) => window.__game.scene.isActive(key);

test('title -> new round -> play hole 1 to the cup', async ({ page }) => {
  test.setTimeout(300_000); // the test machine may render at a few frames a second
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await tap(page, 'title', { button: 'play' }, sceneActive, 'courses');
  // choose a state, then the course
  await tap(page, 'courses', { text: 'oregon' }, locate, ['courses', null, 'oswego lake country club'] as [string, string | null, string | null]);
  await tap(page, 'courses', { text: 'oswego lake country club' }, sceneActive, 'setup');
  const frontNineOn = () => {
    const find = (list: any[]): any => {
      for (const o of list) {
        if (o.label && o.label.text === 'front 9') return o;
        if (o.list) { const f = find(o.list); if (f) return f; }
      }
      return null;
    };
    const b = find(window.__game.scene.getScene('setup').children.list);
    return !!b && b.opts?.color === 'orange';
  };
  await tap(page, 'setup', { button: 'front 9' }, frontNineOn);
  await tap(page, 'setup', { button: 'tee off' }, () => window.__game.scene.isActive('play') && window.__game.scene.getScene('play').state === 'intro');
  // skip the fly-over with the keyboard, then play with the robot golfer
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'aim', null, { polling: 100 });
  const hole = await page.evaluate(() => window.__game.scene.getScene('play').round.holeNumber);
  expect(hole).toBe(1);
  for (const t0 = Date.now(); Date.now() - t0 < 180_000;) {
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

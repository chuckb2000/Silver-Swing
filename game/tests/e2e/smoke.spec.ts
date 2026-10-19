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

test('title -> new round -> play hole 1 to the cup', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await page.waitForTimeout(500);
  await clickButton(page, 'title', 'play');
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

test('course data is exact when the browser adds noise to canvas reads (Safari 26, Brave)', async ({ page }) => {
  // Safari's anti-fingerprinting changes canvas readbacks slightly; course data
  // read that way turned fairway into rough and rough into out of bounds
  await page.addInitScript(() => {
    const orig = CanvasRenderingContext2D.prototype.getImageData;
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    CanvasRenderingContext2D.prototype.getImageData = function (this: CanvasRenderingContext2D, ...a: Parameters<typeof orig>) {
      const img = orig.apply(this, a);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) if (rnd() < 0.05) d[i] = Math.max(0, d[i] - 1);
      return img;
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__golf?.course, null, { timeout: 60_000 });
  const r = await page.evaluate(() => {
    const c = window.__golf.course;
    const t = c.terrain;
    const ob = new Set<number>(c.json.surface.obIds);
    const known = new Set<number>(Object.values(c.json.surface.ids));
    let inside = 0, obInside = 0, unknown = 0;
    for (let y = 0.25; y < t.height; y += 1) for (let x = 0.25; x < t.width; x += 1) {
      const s = t.surface(x, y);
      if (!known.has(s)) unknown++;
      if (!c.boundary.contains(x, y) || s === 15) continue; // 15: the practice range
      inside++;
      if (ob.has(s)) obInside++;
    }
    return { inside, obInside, unknown };
  });
  expect(r.inside).toBeGreaterThan(100_000);
  expect(r.unknown).toBe(0);
  expect(r.obInside).toBeLessThan(10); // only a few pixels along the boundary line itself
});

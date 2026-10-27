import { expect, Page, test } from '@playwright/test';

// The daily par 3s / 4s / 5s (developer, 2026-10-27): from the title, the
// first hole on its course, then the next hole on another course through the
// loading screen, and a reload mid-round going on with the right course.

declare global {
  interface Window { __game: any; __golf: any; __autoplay: any }
}

/** Screen position (CSS px) of a button in an active scene whose label passes `re`. */
const buttonAt = ([scene, re]: [string, string]) => {
  const g = window.__game;
  const s = g?.scene.getScene(scene);
  if (!s || !s.sys.isActive() || !s.cameras?.main) return null;
  const rx = new RegExp(re);
  const find = (list: any[]): any => {
    for (const o of list) {
      if (o.label && rx.test(o.label.text)) return o;
      if (o.list) { const f = find(o.list); if (f) return f; }
    }
    return null;
  };
  const o = find(s.children.list);
  if (!o) return null;
  const canvas = g.canvas.getBoundingClientRect();
  const k = s.cameras.main.zoom * (canvas.width / g.canvas.width);
  const m = o.getWorldTransformMatrix();
  return { x: canvas.left + (m.tx + o.bw / 2) * k, y: canvas.top + (m.ty + o.bh / 2) * k, label: o.label.text };
};

async function press(page: Page, scene: string, re: string, done: () => unknown) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const f0 = await page.evaluate(() => window.__game.loop.frame);
    await page.waitForFunction((f) => window.__game.loop.frame >= f + 2, f0, { polling: 20 });
    const h = await page.waitForFunction(buttonAt, [scene, re] as [string, string], { polling: 100, timeout: 30_000 });
    const pos = (await h.jsonValue()) as { x: number; y: number };
    await page.mouse.click(pos.x, pos.y, { delay: 60 });
    try { await page.waitForFunction(done, null, { polling: 100, timeout: 30_000 }); return; } catch { /* again */ }
  }
  throw new Error(`${scene} /${re}/ never took effect`);
}

async function playHole(page: Page) {
  // the fly-over at a hole's start; a resumed hole goes straight to the shot
  await page.waitForFunction(() => window.__game.scene.isActive('play') && ['intro', 'aim'].includes(window.__game.scene.getScene('play').state), null, { timeout: 120_000 });
  if (await page.evaluate(() => window.__game.scene.getScene('play').state === 'intro')) await page.keyboard.press('Space');
  for (const t0 = Date.now(); Date.now() - t0 < 240_000;) {
    const st = await page.evaluate(() => window.__game.scene.getScene('play').state);
    if (st === 'holed') return;
    if (st === 'aim') await page.evaluate(() => window.__autoplay.shot(0));
    else if (st === 'relief' || st === 'drop' || (st !== 'settle' && st !== 'swing')) await page.evaluate(() => window.__autoplay.step());
    await page.waitForTimeout(60);
  }
  throw new Error('hole not finished');
}

test('daily par round: two holes on two courses, and a reload goes on', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?autoplay');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  const label = ((await (await page.waitForFunction(buttonAt, ['title', '^daily: par [345]s$'] as [string, string], { timeout: 30_000 })).jsonValue()) as { label: string }).label;
  await page.screenshot({ path: 'test-results/tour-title.png' });
  await press(page, 'title', '^daily: par [345]s$', () => !!document.querySelector('input[placeholder="your name"]'));
  await page.fill('input[placeholder="your name"]', 'robot');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.scene.isActive('play'), null, { timeout: 120_000 });
  const plan = await page.evaluate(() => window.__golf.round.cfg.tour.map((t: any) => t.course));
  expect(plan).toHaveLength(9);
  expect(new Set(plan).size).toBe(9);
  expect(await page.evaluate(() => window.__golf.course.json.id)).toBe(plan[0]);
  expect(label).toBe(`daily: ${await page.evaluate(() => window.__golf.round.cfg.courseId.replace('par', 'par '))}`);
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'intro', null, { timeout: 120_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/tour-intro-1.png' });
  await playHole(page);
  await page.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'holed', null, { polling: 100 });
  // next hole: another course, through the loading screen
  await press(page, 'hud', '^next hole$', () => window.__game.scene.isActive('tourload') || window.__golf.course?.json.id !== window.__golf.round.cfg.tour[0].course);
  await page.waitForFunction((id) => window.__game.scene.isActive('play') && window.__golf.course?.json.id === id && window.__game.scene.getScene('play').state === 'intro', plan[1], { timeout: 180_000 });
  expect(await page.evaluate(() => window.__golf.round.holeNumber)).toBe(2);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/tour-intro-2.png' });
  // a reload on hole 2: "continue round" opens it on its course
  await page.reload();
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await press(page, 'title', '^continue round \\(hole 2\\)$', () => window.__game.scene.isActive('play'));
  await page.waitForFunction((id) => window.__golf.course?.json.id === id && window.__golf.round.holeNumber === 2, plan[1], { timeout: 120_000 });
  await playHole(page);
  await page.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'holed', null, { polling: 100 });
  // the card lists where each hole is
  await page.keyboard.press('Tab').catch(() => null);
  expect(await page.evaluate(() => window.__golf.round.scores.map((s: any) => s.hole))).toEqual([1, 2]);
  expect(await page.evaluate(() => window.__golf.round.cfg.tour.slice(0, 2).every((t: any) => t.yd > 0))).toBe(true);
  await page.screenshot({ path: 'test-results/tour-holed-2.png' });
  expect(errors).toEqual([]);
});

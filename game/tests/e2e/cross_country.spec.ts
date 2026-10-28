import { expect, Page, test } from '@playwright/test';

// Cross-country (bonus mode, developer 2026-10-27): from "my golf", the rules
// and "play", a leg chosen on the map and played, the next leg's planner, and
// a reload that goes back to the planner.

declare global {
  interface Window { __game: any; __golf: any; __autoplay: any }
}

const buttonAt = ([scene, re]: [string, string]) => {
  const g = window.__game;
  const s = g?.scene.getScene(scene);
  if (!s || !s.sys.isActive() || !s.cameras?.main) return null;
  const rx = new RegExp(re);
  const find = (list: any[]): any => {
    for (const o of list) {
      if (o.label && rx.test(o.label.text) && o.visible !== false) return o;
      if (o.list) { const f = find(o.list); if (f) return f; }
    }
    return null;
  };
  const o = find(s.children.list);
  if (!o) return null;
  const canvas = g.canvas.getBoundingClientRect();
  const k = s.cameras.main.zoom * (canvas.width / g.canvas.width);
  const m = o.getWorldTransformMatrix();
  return { x: canvas.left + (m.tx + o.bw / 2) * k, y: canvas.top + (m.ty + o.bh / 2) * k };
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

/** Tap a tee or green marker on the planner (world metres -> CSS px). */
async function tapMarker(page: Page, kind: 'tees' | 'greens', hole: number) {
  const pos = await page.evaluate(([k, h]) => {
    const g = window.__game, s = g.scene.getScene('xcplan');
    const p = s.map[k as string][(h as number) - 1];
    const q = s.toScreen(p.x, p.y);
    const canvas = g.canvas.getBoundingClientRect();
    const z = s.cameras.main.zoom * (canvas.width / g.canvas.width);
    return { x: canvas.left + q.x * z, y: canvas.top + q.y * z };
  }, [kind, hole]);
  await page.mouse.click(pos.x, pos.y, { delay: 60 });
  await page.waitForTimeout(300);
}

async function playLeg(page: Page) {
  await page.waitForFunction(() => window.__game.scene.isActive('play') && ['intro', 'aim'].includes(window.__game.scene.getScene('play').state), null, { timeout: 120_000 });
  if (await page.evaluate(() => window.__game.scene.getScene('play').state === 'intro')) await page.keyboard.press('Space');
  for (const t0 = Date.now(); Date.now() - t0 < 240_000;) {
    const st = await page.evaluate(() => window.__game.scene.getScene('play').state);
    if (st === 'holed') return;
    if (st === 'aim') await page.evaluate(() => window.__autoplay.shot(0));
    else if (st !== 'settle' && st !== 'swing') await page.evaluate(() => window.__autoplay.step());
    await page.waitForTimeout(60);
  }
  throw new Error('leg not finished');
}

test('cross-country: rules, a leg on the map, the next leg, a reload', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?autoplay');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await page.evaluate(() => { window.__golf.settings.playerName = 'robot'; });
  await press(page, 'title', '^my golf$', () => window.__game.scene.isActive('mygolf'));
  await press(page, 'mygolf', '^bonus mode$', () => window.__game.scene.isActive('bonus'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/xc-bonus.png' });
  // the leaderboard's two tabs
  await press(page, 'bonus', '^all courses$', () => true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/xc-bonus-all.png' });
  await press(page, 'bonus', '^play$', () => window.__game.scene.isActive('xcplan'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/xc-plan.png' });
  // zoom: the + button, the wheel over tee 1, a drag that moves the map and picks nothing
  const scale = () => page.evaluate(() => window.__game.scene.getScene('xcplan').view.s);
  const s0 = await scale();
  await press(page, 'xcplan', '^\\+$', () => true);
  await page.waitForTimeout(200);
  const s1 = await scale();
  expect(s1).toBeGreaterThan(s0);
  const tee1 = await page.evaluate(() => {
    const g = window.__game, s = g.scene.getScene('xcplan');
    const q = s.toScreen(s.map.tees[0].x, s.map.tees[0].y);
    const canvas = g.canvas.getBoundingClientRect();
    const z = s.cameras.main.zoom * (canvas.width / g.canvas.width);
    return { x: canvas.left + q.x * z, y: canvas.top + q.y * z };
  });
  await page.mouse.move(tee1.x, tee1.y);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(300);
  expect(await scale()).toBeGreaterThan(s1);
  const at = () => page.evaluate(() => { const v = window.__game.scene.getScene('xcplan').view; return `${v.ox},${v.oy}`; });
  const before = await at();
  await page.mouse.move(tee1.x, tee1.y + 30);
  await page.mouse.down();
  await page.mouse.move(tee1.x + 40, tee1.y + 70, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect(await at()).not.toBe(before);
  expect(await page.evaluate(() => window.__game.scene.getScene('xcplan').tee)).toBe(null);
  await tapMarker(page, 'tees', 1);
  expect(await page.evaluate(() => window.__game.scene.getScene('xcplan').tee)).toBe(1);
  await page.screenshot({ path: 'test-results/xc-plan-zoom.png' });
  for (let i = 0; i < 8; i++) await page.keyboard.press('-');
  await page.waitForTimeout(200);
  expect(await scale()).toBeCloseTo(s0, 5);
  // the shortest leg from tee 1 to another hole's green
  const plan = await page.evaluate(() => {
    const s = window.__game.scene.getScene('xcplan');
    // choose through the scene's own rules: the first tee that can start, then its shortest other green
    s.selectTee(1);
    const ok = s.choices.filter((c: any) => c.ok && c.green !== 1).sort((a: any, b: any) => a.yd - b.yd);
    s.tee = null; s.choices = []; s.redraw();
    return { tee: 1, green: ok[0].green };
  });
  await tapMarker(page, 'tees', plan.tee);
  expect(await page.evaluate(() => window.__game.scene.getScene('xcplan').tee)).toBe(plan.tee);
  await tapMarker(page, 'greens', plan.green);
  expect(await page.evaluate(() => window.__game.scene.getScene('xcplan').green)).toBe(plan.green);
  await page.screenshot({ path: 'test-results/xc-plan-leg.png' });
  await press(page, 'xcplan', '^play this leg$', () => window.__game.scene.isActive('play'));
  expect(await page.evaluate(() => window.__golf.round.leg)).toEqual([plan.tee, plan.green]);
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'intro', null, { timeout: 60_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/xc-intro.png' });
  await playLeg(page);
  await page.waitForFunction(() => window.__game.scene.getScene('hud').modal === 'holed', null, { polling: 100 });
  await page.screenshot({ path: 'test-results/xc-holed.png' });
  await press(page, 'hud', '^next leg$', () => window.__game.scene.isActive('xcplan'));
  expect(await page.evaluate(() => window.__golf.round.holeIndex)).toBe(1);
  // the card on the planner: legs and strokes, no par
  await press(page, 'xcplan', '^card$', () => !!window.__game.scene.getScene('xcplan').layer);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/xc-card.png' });
  // a reload between legs: "continue round" goes back to the planner
  await page.reload();
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await press(page, 'title', '^continue round', () => window.__game.scene.isActive('xcplan'));
  expect(await page.evaluate(() => window.__golf.round.cfg.xc.legs)).toEqual([[plan.tee, plan.green]]);
  expect(errors).toEqual([]);
});

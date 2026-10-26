// The leaderboard's stats tab (developer, 2026-10-26): the hole-outs list from this device,
// and a tap on one plays it again on its course (ReplayScene), then back to the list.

import { expect, test } from '@playwright/test';
import { locate, tapButton } from './matchHelpers';

declare global { interface Window { __game: any; __golf: any } }

test('stats tab: a hole-out from this device plays again on its course', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title') && window.__golf?.course, null, { timeout: 90_000 });
  // a holed approach of about 90 m on hole 1 of the course loaded now, as this device would keep it
  await page.evaluate(() => {
    const app = window.__golf;
    const c = app.course;
    const h = c.json.holes[0];
    const [px, py] = h.pin;
    const t = h.tees[c.json.defaultTee];
    const L = Math.hypot(t.x - px, t.y - py);
    const ux = (t.x - px) / L, uy = (t.y - py) / L;
    const from = { x: px + ux * 90, y: py + uy * 90 };
    const n = 481; // 4 s at 120 Hz
    const kept: number[] = [];
    for (let i = 0; i < n; i += 2) kept.push(i);
    const buf = new ArrayBuffer(kept.length * 12);
    const dv = new DataView(buf);
    kept.forEach((i, k) => {
      const f = i / (n - 1);
      const fly = Math.min(1, f / 0.7);
      const x = from.x + (px - from.x) * (f < 0.7 ? fly * 0.9 : 0.9 + ((f - 0.7) / 0.3) * 0.1);
      const y = from.y + (py - from.y) * (f < 0.7 ? fly * 0.9 : 0.9 + ((f - 0.7) / 0.3) * 0.1);
      const z = c.terrain.z(x, y) + (f < 0.7 ? 25 * Math.sin(Math.PI * fly) : 0);
      dv.setFloat32(k * 12, x, true); dv.setFloat32(k * 12 + 4, y, true); dv.setFloat32(k * 12 + 8, z, true);
    });
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const z0 = c.terrain.z(px, py);
    const path = JSON.stringify({
      v: 1, n, s: btoa(bin), end: { x: px, y: py, z: z0 }, rest: 3, holed: true, water: false, cross: null,
      landing: { x: from.x + (px - from.x) * 0.9, y: from.y + (py - from.y) * 0.9, z: z0, t: 2.8 },
      ev: [{ t: 2.8, type: 'land', x: px, y: py, z: z0, surf: 3 }, { t: 3.99, type: 'holed', x: px, y: py, z: z0 }], dur: 4, tree: false,
    });
    localStorage.setItem('local-golf:holeouts', JSON.stringify([{
      id: 'e2e-h1', round: 'e2e', player: 'sam', course: c.json.id, hole: 1, par: h.par, n: 2, club: 'pitching wedge', dist: 90,
      lie: 'fairway', tee: c.json.defaultTee, difficulty: 'normal', date: new Date().toISOString(), path, sent: true,
    }]));
  });
  await tapButton(page, 'title', 'leaderboard', 30_000, () => page.evaluate(() => window.__game.scene.isActive('leaderboard')));
  await tapButton(page, 'leaderboard', 'stats', 30_000);
  await tapButton(page, 'leaderboard', 'this device', 10_000).catch(() => { /* no shared board in the preview */ });
  await tapButton(page, 'leaderboard', 'hole-outs', 30_000);
  const at = await page.waitForFunction(locate, ['leaderboard', null, '98 yd'] as [string, string | null, string | null], { timeout: 20_000 });
  const pos = (await at.jsonValue()) as { x: number; y: number };
  for (let attempt = 0; attempt < 3 && !(await page.evaluate(() => window.__game.scene.isActive('replay'))); attempt++) {
    await page.mouse.move(pos.x, pos.y);
    await page.waitForTimeout(250);
    await page.mouse.click(pos.x, pos.y);
    await page.waitForTimeout(2000);
  }
  expect(await page.evaluate(() => window.__game.scene.isActive('replay'))).toBe(true);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/replay-flight.png' });
  // it plays to the cup, then the end again in slow motion
  await page.waitForFunction(() => (window.__game.scene.getScene('replay') as any).pass === 2, null, { timeout: 30_000 });
  await page.screenshot({ path: 'test-results/replay-slow.png' });
  await tapButton(page, 'replayHud', 'close', 30_000, () => page.evaluate(() => window.__game.scene.isActive('leaderboard')));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/stats-holeouts.png' });
  expect(errors).toEqual([]);
});

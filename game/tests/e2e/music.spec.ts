// The music (developer, 2026-10-22): it starts with the first tap, plays in the
// menus, pauses when sound is muted in settings and comes back when it isn't.

import { expect, test } from '@playwright/test';

declare global { interface Window { __game: any; __music: any } }

test('music starts on the first tap, and "sound: muted" pauses it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 90_000 });
  expect(await page.evaluate(() => window.__music.started)).toBe(false);
  await page.mouse.click(5, 5);
  await page.waitForFunction(() => window.__music.playing === true, null, { timeout: 30_000 });
  const first = await page.evaluate(() => window.__music.track);
  expect(['dawn', 'march', 'waltz', 'primetime', 'nocturne', 'coastal', 'birdie', 'hymn', 'finale']).toContain(first);
  // muted in settings: the music stops; sound on again: it carries on
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('title');
    s.scene.start('settings', { from: 'title' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('settings'), null, { timeout: 30_000 });
  const tap = async (label: string) => {
    const pos = await page.evaluate((l) => {
      const g = window.__game, s = g.scene.getScene('settings');
      const find = (list: any[]): any => { for (const o of list) { if (o.label?.text === l) return o; if (o.list) { const f = find(o.list); if (f) return f; } } return null; };
      const b = find(s.children.list);
      const c = g.canvas.getBoundingClientRect(), k = s.cameras.main.zoom * (c.width / g.canvas.width), m = b.getWorldTransformMatrix();
      return { x: c.left + (m.tx + b.bw / 2) * k, y: c.top + (m.ty + b.bh / 2) * k };
    }, label);
    await page.mouse.click(pos.x, pos.y, { delay: 50 });
  };
  await page.waitForTimeout(500);
  await tap('muted');
  await page.waitForFunction(() => window.__music.playing === false, null, { timeout: 10_000 });
  await page.waitForTimeout(500); // the settings screen draws itself again after a change
  await tap('on');
  await page.waitForFunction(() => window.__music.playing === true, null, { timeout: 10_000 });
  expect(errors).toEqual([]);
});

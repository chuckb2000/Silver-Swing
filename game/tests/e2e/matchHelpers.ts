// Helpers for driving the game in the live match tests (tests/e2e/match.spec.ts).
import { Page } from '@playwright/test';

/** Screen position (CSS px) of a Button by label, or of a text, in an active scene; null if not there. */
export const locate = ([scene, label, text]: [string, string | null, string | null]) => {
  const g = (window as any).__game;
  const s = g?.scene.getScene(scene);
  if (!s || !s.sys.isActive() || !s.cameras?.main) return null;
  const find = (list: any[]): any => {
    for (const o of list) {
      if (!o.visible && o.visible !== undefined) continue;
      if (label !== null && o.label && o.label.text === label && o.enabled !== false) return o;
      if (text !== null && o.type === 'BitmapText' && typeof o.text === 'string' && o.text.includes(text)) return o;
      if (o.list) { const f = find(o.list); if (f) return f; }
    }
    return null;
  };
  const o = find(s.children.list);
  if (!o) return null;
  const canvas = g.canvas.getBoundingClientRect();
  const k = s.cameras.main.zoom * (canvas.width / g.canvas.width);
  if (label !== null) {
    const m = o.getWorldTransformMatrix();
    return { x: canvas.left + (m.tx + o.bw / 2) * k, y: canvas.top + (m.ty + o.bh / 2) * k };
  }
  const b = o.getBounds();
  return { x: canvas.left + b.centerX * k, y: canvas.top + b.centerY * k };
};

/**
 * Tap a Button by label like a person; with `done`, wait for it to take effect and tap again if it
 * didn't (objects made in a redraw only take input from the next frame; the test machine is slow).
 */
export async function tapButton(page: Page, scene: string, label: string, timeout = 30_000, done?: () => Promise<boolean>) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const h = await page.waitForFunction(locate, [scene, label, null] as [string, string | null, string | null], { polling: 100, timeout });
    const pos = (await h.jsonValue()) as { x: number; y: number };
    const f0 = await page.evaluate(() => (window as any).__game.loop.frame);
    await page.waitForFunction((f) => (window as any).__game.loop.frame >= f + 2, f0, { polling: 20 });
    await page.mouse.click(pos.x, pos.y, { delay: 60 });
    if (!done) return;
    for (const t0 = Date.now(); Date.now() - t0 < 8000;) {
      if (await done()) return;
      await page.waitForTimeout(100);
    }
    console.warn(`tap "${label}" in ${scene}: no effect yet (attempt ${attempt})`);
  }
  throw new Error(`tap "${label}" in ${scene} never took effect`);
}

export async function hasText(page: Page, scene: string, text: string): Promise<boolean> {
  return !!(await page.evaluate(locate, [scene, null, text] as [string, string | null, string | null]));
}

export async function fillDialog(page: Page, value: string, button = 'ok') {
  const input = page.locator('input').last();
  await input.waitFor({ timeout: 15_000 });
  await input.fill(value);
  await page.getByRole('button', { name: button, exact: true }).last().click();
}

export const sceneActive = (page: Page, key: string) => page.evaluate((k) => (window as any).__game.scene.isActive(k), key);
export const playState = (page: Page) => page.evaluate(() => { const g = (window as any).__game; return g.scene.isActive('play') ? g.scene.getScene('play').state : null; });

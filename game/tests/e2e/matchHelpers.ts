// Helpers for driving the game in the live match tests (tests/e2e/match.spec.ts).
import { Browser, BrowserContext, Page } from '@playwright/test';

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

// ------------------------------------------------------------ setting up

/** A player's browser, with a switch that cuts its line to the match server (WebSocket and HTTP). */
export async function player(browser: Browser, tag: string, errors: string[], viewport = { width: 960, height: 540 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const net = { down: false, version: false };
  await watchPage(page, tag, errors, net);
  return { ctx, page, net };
}

/** Errors on a page go to `errors`; its match traffic goes through `net` (down: refused; version: told to update). */
export async function watchPage(page: Page, tag: string, errors: string[], net: { down: boolean; version: boolean }) {
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await page.routeWebSocket(/\/api\/match\//, (ws) => {
    if (net.version) {
      ws.send(JSON.stringify({ type: 'error', code: 'version', message: 'the match server is older than this game (the match Worker needs deploying)' }));
      ws.close({ code: 4012 });
      return;
    }
    if (net.down) ws.close({ code: 1006 }); else ws.connectToServer();
  });
  await page.route(/\/api\/match\//, (r) => (net.down ? r.abort('internetdisconnected') : r.continue()));
}

/** Make a match from the title screen (front nine at Oswego Lake); returns its code. */
export async function makeMatch(a: Page, name: string, shots?: string): Promise<string> {
  await a.goto('/?autoplay');
  await a.waitForFunction(() => (window as any).__game?.scene.isActive('title'), null, { timeout: 90_000 });
  await tapButton(a, 'title', 'play a friend', 30_000, () => a.evaluate(() => (window as any).__game.scene.isActive('match')));
  await tapButton(a, 'match', 'start a match', 30_000, async () => (await a.locator('input').count()) > 0);
  await fillDialog(a, name);
  await a.waitForFunction(() => (window as any).__game.scene.isActive('courses'), null, { timeout: 30_000 });
  await a.evaluate(() => (window as any).__game.scene.getScene('courses').choose('oswego_lake'));
  await a.waitForFunction(() => (window as any).__game.scene.isActive('setup'), null, { timeout: 90_000 });
  const frontOn = () => a.evaluate(() => {
    const find = (l: any[]): any => { for (const o of l) { if (o.label?.text === 'front 9') return o; if (o.list) { const f = find(o.list); if (f) return f; } } return null; };
    return find((window as any).__game.scene.getScene('setup').children.list)?.opts?.color === 'orange';
  });
  await tapButton(a, 'setup', 'front 9', 30_000, frontOn);
  await tapButton(a, 'setup', 'invite a friend', 30_000, () => a.evaluate(() => (window as any).__game.scene.isActive('match')));
  await a.waitForFunction(() => { const m = (window as any).__game.scene.getScene('match'); return m.sys.isActive() && m.m.mode === 'invite' && m.live?.caughtUp; }, null, { timeout: 60_000 });
  if (shots) await a.screenshot({ path: shots });
  return a.evaluate(() => (window as any).__game.scene.getScene('match').m.code);
}

/** Open a match's link, enter a name and join; both players then wait for the play scene. */
export async function joinMatch(b: Page, code: string, name: string) {
  await b.goto(`/?match=${code}&autoplay`);
  await b.waitForFunction(() => (window as any).__game?.scene.isActive('match') && (window as any).__game.scene.getScene('match').live?.caughtUp, null, { timeout: 90_000 });
  await tapButton(b, 'match', 'enter your name', 30_000, async () => (await b.locator('input').count()) > 0);
  await fillDialog(b, name);
  await tapButton(b, 'match', 'join match', 30_000, () => b.evaluate(() => (window as any).__game.scene.isActive('play') || (window as any).__game.scene.getScene('match').note === 'joining...'));
}

export const inPlay = (p: Page) => p.waitForFunction(() => (window as any).__game.scene.isActive('play') && (window as any).__game.scene.getScene('play').match?.session, null, { timeout: 90_000 });

/** The match as a game holds it (null outside the play scene). */
export const matchOf = (p: Page) => p.evaluate(() => {
  const g = (window as any).__game;
  if (!g.scene.isActive('play')) return null;
  const ps = g.scene.getScene('play');
  const s = ps.match?.session;
  if (!s) return null;
  return {
    state: ps.state as string, seat: ps.match.seat as number | null, seq: s.seq as number, queue: s.queue.length as number, turn: s.turn as number | null,
    hole: s.state.hole as number, phase: s.state.phase as string, status: ps.match.status as string, modal: g.scene.getScene('hud').modal as string | null,
    strokes: s.state.p.map((x: any) => x.strokes) as number[], full: JSON.stringify(s.state),
  };
});

/** One step of whatever this game is waiting for: a stroke, a drop, the next hole. */
export async function step(p: Page): Promise<string> {
  return p.evaluate(() => {
    const g = (window as any).__game;
    if (!g.scene.isActive('play')) return 'none';
    const ps = g.scene.getScene('play');
    const hud = g.scene.getScene('hud');
    switch (ps.state) {
      case 'intro': ps.skipIntro(); return 'intro';
      case 'aim': (window as any).__autoplay.shot((Math.random() - 0.5) * 2.5); return 'shot';
      case 'flight': ps.fastForward(); return 'flight';
      case 'relief': case 'drop': (window as any).__autoplay.step(); return 'relief';
      case 'between': if (hud.modal === 'mhole') { ps.matchNextHole(); return 'next'; } return 'wait';
      default: return ps.state;
    }
  });
}

export type { BrowserContext };

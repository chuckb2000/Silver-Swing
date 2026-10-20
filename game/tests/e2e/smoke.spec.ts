import { expect, Page, test } from '@playwright/test';

declare global {
  interface Window {
    __game: any;
    __golf: any;
    __autoplay: any;
  }
}

type Target = { button?: string; text?: string; icon?: string };

/** Screen position (CSS px) of a Button (by label) or a piece of text in an active scene, else null. */
const locate = ([scene, label, text, icon]: [string, string | null, string | null, (string | null)?]) => {
  const g = window.__game;
  const s = g?.scene.getScene(scene);
  if (!s || !s.sys.isActive() || !s.cameras?.main) return null;
  const find = (list: any[]): any => {
    for (const o of list) {
      if (label !== null && o.label && o.label.text === label) return o;
      if (icon && o.opts?.icon === icon) return o;
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
  if (label !== null || icon) {
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
    const handle = await page.waitForFunction(locate, [scene, what.button ?? null, what.text ?? null, what.icon ?? null] as [string, string | null, string | null, string | null], { polling: 100, timeout: 30_000 });
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

/** The course screen's state page shows `name`, or has a next-page arrow. */
const courseOrNext = (name: string) => {
  const s = window.__game.scene.getScene('courses');
  const has = (list: any[]): boolean => list.some((o) => (o.type === 'BitmapText' && o.text === name) || o.opts?.icon === 'arrow_right' || (o.list && has(o.list)));
  return s.sys.isActive() && has(s.children.list);
};

/** Open a state on the course screen and page through it to a course (states list
 * their courses alphabetically, a few to a page), then tap the course. */
async function pickCourse(page: Page, state: string, name: string) {
  await tap(page, 'courses', { text: state }, courseOrNext, name);
  // the footer's "page/pages" counter
  const counter = () => {
    const find = (list: any[]): string | null => {
      for (const o of list) {
        if (o.type === 'BitmapText' && /^\d+\/\d+$/.test(o.text)) return o.text;
        const f = o.list ? find(o.list) : null;
        if (f) return f;
      }
      return null;
    };
    return find(window.__game.scene.getScene('courses').children.list);
  };
  for (let i = 0; i < 6; i++) {
    if (await page.evaluate(locate, ['courses', null, name, null] as [string, string | null, string | null, string | null])) break;
    const before = await page.evaluate(counter);
    await tap(page, 'courses', { icon: 'arrow_right' }, new Function('before', `return (${counter.toString()})() !== before;`) as (b: unknown) => boolean, before);
  }
  await tap(page, 'courses', { text: name }, sceneActive, 'setup');
}

test('title -> new round -> play hole 1 to the cup', async ({ page }) => {
  test.setTimeout(300_000); // the test machine may render at a few frames a second
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?autoplay');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await tap(page, 'title', { button: 'play' }, sceneActive, 'courses');
  // choose a state, then the course
  await pickCourse(page, 'oregon', 'oswego lake country club');
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
  // a player with no name is asked for one before teeing off ("player" doesn't go on the boards)
  await tap(page, 'setup', { button: 'tee off' }, () => !!document.querySelector('input[placeholder="your name"]'));
  await page.fill('input[placeholder="your name"]', 'player');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /name of your own/.test(document.body.innerText));
  await page.fill('input[placeholder="your name"]', 'robot');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.scene.isActive('play') && window.__game.scene.getScene('play').state === 'intro', null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__golf.round.cfg.playerName)).toBe('robot');
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
  await page.goto('/?autoplay');
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
  await page.goto('/?autoplay');
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

test('the menu button quits a round for good', async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => { if (!localStorage.getItem('local-golf:settings')) localStorage.setItem('local-golf:settings', JSON.stringify({ playerName: 'robot' })); });
  await page.goto('/?autoplay');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await tap(page, 'title', { button: 'play' }, sceneActive, 'courses');
  await pickCourse(page, 'oregon', 'oswego lake country club');
  await tap(page, 'setup', { button: 'tee off' }, () => window.__game.scene.isActive('play') && window.__game.scene.getScene('play').state === 'intro');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'aim', null, { polling: 100 });
  // one shot, so there is a round in progress to continue
  await page.evaluate(() => window.__autoplay.shot(0));
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'aim', null, { polling: 100, timeout: 120_000 });
  expect(await page.evaluate(() => localStorage.getItem('local-golf:round-in-progress'))).not.toBeNull();
  await tap(page, 'hud', { button: 'menu' }, locate, ['hud', 'save & exit', null] as [string, string | null, string | null]);
  // settings during a round: presentation only, the round's hand, difficulty and rules are locked
  await tap(page, 'hud', { button: 'settings' }, locate, ['settings', 'back', null] as [string, string | null, string | null]);
  expect(await page.evaluate(locate, ['settings', null, 'hand'] as [string, string | null, string | null])).toBeNull();
  expect(await page.evaluate(locate, ['settings', null, 'difficulty'] as [string, string | null, string | null])).toBeNull();
  expect(await page.evaluate(locate, ['settings', 'local e-5', null] as [string, string | null, string | null])).toBeNull();
  expect(await page.evaluate(locate, ['settings', null, 'volume'] as [string, string | null, string | null])).not.toBeNull();
  await tap(page, 'settings', { button: 'back' }, locate, ['hud', 'menu', null] as [string, string | null, string | null]);
  await tap(page, 'hud', { button: 'menu' }, locate, ['hud', 'save & exit', null] as [string, string | null, string | null]);
  await tap(page, 'hud', { button: 'quit round' }, locate, ['hud', 'keep playing', null] as [string, string | null, string | null]);
  await tap(page, 'hud', { button: 'quit round' }, sceneActive, 'title');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => localStorage.getItem('local-golf:round-in-progress'))).toBeNull();
  expect(await page.evaluate(locate, ['title', 'play', null] as [string, string | null, string | null])).not.toBeNull(); // not "continue round"
  // a second round in the same tab, on another course: the HUD used to write to the first round's
  // destroyed text and freeze (developer: "freezes when I load a course for the first time")
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await tap(page, 'title', { button: 'play' }, sceneActive, 'courses');
  await page.evaluate(() => (window.__game.scene.getScene('courses') as any).choose('highland_links'));
  await page.waitForFunction(() => window.__game.scene.isActive('setup'), null, { timeout: 120_000 });
  await tap(page, 'setup', { button: 'tee off' }, () => window.__game.scene.isActive('play') && window.__game.scene.getScene('play').state === 'intro');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'aim', null, { polling: 100 });
  await page.evaluate(() => window.__autoplay.shot(0));
  await page.waitForFunction(() => ['aim', 'holed', 'relief', 'drop'].includes(window.__game.scene.getScene('play').state), null, { polling: 100, timeout: 120_000 });
  const f0 = await page.evaluate(() => window.__game.loop.frame);
  await page.waitForFunction((f) => window.__game.loop.frame > f + 5, f0, { timeout: 30_000 }); // still running
  expect(await page.evaluate(() => window.__golf.round.cfg.courseId)).toBe('highland_links');
  expect(errors).toEqual([]);
});

test('practice ground: three range balls, then putts until one drops (player improvements, item 5)', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?autoplay');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await tap(page, 'title', { button: 'practice' }, () => window.__game.scene.isActive('play') && window.__game.scene.getScene('play').state === 'aim');
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => ((p) => p.state === 'aim' && !p.fading && !p.zooming)(window.__game.scene.getScene('play')), null, { timeout: 60_000 });
    expect(await page.evaluate(() => window.__autoplay.shot(0))).toBe(true);
    await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'loading', null, { timeout: 60_000, polling: 50 });
  }
  await page.waitForFunction(() => ((p) => p.state === 'aim' && !p.fading && !p.zooming)(window.__game.scene.getScene('play')), null, { timeout: 60_000 });
  const carries = await page.evaluate(() => [...window.__game.scene.getScene('play').practice.log.carries.values()].flat().length);
  expect(carries).toBe(3);
  // the putting green, 5 ft putts
  await page.evaluate(() => window.__game.scene.getScene('play').practiceStep(0, true));
  await page.waitForFunction(() => { const p = window.__game.scene.getScene('play'); return p.state === 'aim' && !p.fading && p.round.holeNumber === 6; }, null, { timeout: 60_000 });
  await page.evaluate(() => window.__game.scene.getScene('play').practiceCycleDrill()); // 15 -> 30
  await page.waitForFunction(() => ((p) => p.state === 'aim' && !p.fading && !p.zooming)(window.__game.scene.getScene('play')), null, { timeout: 60_000 });
  await page.evaluate(() => window.__game.scene.getScene('play').practiceCycleDrill()); // 30 -> 5
  for (let i = 0; i < 6; i++) {
    await page.waitForFunction(() => ((p) => p.state === 'aim' && !p.fading && !p.zooming)(window.__game.scene.getScene('play')), null, { timeout: 60_000 });
    if (await page.evaluate(() => window.__game.scene.getScene('play').practice.log.drill.holed > 0)) break;
    await page.evaluate(() => window.__autoplay.shot(0));
    await page.waitForFunction(() => window.__game.scene.getScene('play').state === 'loading', null, { timeout: 60_000, polling: 50 });
  }
  await page.waitForFunction(() => ((p) => p.state === 'aim' && !p.fading && !p.zooming)(window.__game.scene.getScene('play')), null, { timeout: 60_000 });
  const drill = await page.evaluate(() => window.__game.scene.getScene('play').practice.log.drill);
  expect(drill.ft).toBe(5);
  expect(drill.holed).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('a round shares as a 1080 x 1350 picture (player improvements, item 2)', async ({ page }) => {
  await page.goto('/?autoplay');
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  const scores = Array.from({ length: 9 }, (_, i) => ({ hole: i + 1, par: 4, strokes: i === 2 ? 3 : 4, putts: 2, penalties: 0, fairway: true, gir: true }));
  const res = await page.evaluate((scores) => window.__autoplay.sharePicture({
    id: 't1', course: 'oswego_lake', tee: 'Blue', length: 'front', difficulty: 'normal', casual: false, player: 'robot', date: '2026-10-20T12:00:00Z',
    gross: 35, toPar: -1, back: null, scores, totals: { strokes: 35, par: 36, toPar: -1, putts: 18, penalties: 0, fairways: 9, fairwayChances: 9, gir: 9, holes: 9, front: 35, back: null },
  }, '#1 of 3 among friends'), scores);
  expect(res).not.toBeNull();
  expect(res!.bytes).toBeGreaterThan(10_000);
  const size = await page.evaluate((url) => new Promise<[number, number]>((r) => { const im = new Image(); im.onload = () => r([im.width, im.height]); im.src = url; }), res!.url);
  expect(size).toEqual([1080, 1350]);
});

test('the offline copy: a played course and the game open with no connection (player improvements, item 3)', async ({ page, context }) => {
  await page.goto('/?sw');
  await page.waitForFunction(() => navigator.serviceWorker?.ready.then(() => true), null, { timeout: 30_000 });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 });
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  const fetchCourse = () => page.evaluate(async () => { const r = await fetch('courses/practice/course.json'); return r.ok ? ((await r.json()) as { id: string }).id : null; });
  expect(await fetchCourse()).toBe('practice');
  await context.setOffline(true);
  expect(await fetchCourse()).toBe('practice');
  await page.reload();
  await page.waitForFunction(() => window.__game?.scene.isActive('title'), null, { timeout: 60_000 });
  await context.setOffline(false);
});

// The leaderboard's daily view (developer, 2026-10-22: "view people's
// scorecards when you click on their score on the daily and recents page"):
// a tap on a score shows that round's card; on "this week", a tap on a player
// lists their daily rounds to choose one. (The "recent" list fetches the
// round from the shared board: covered by the server's unit tests and run on
// the site.) The rounds are put on this device's board, for today's daily.

import { expect, Page, test } from '@playwright/test';
import { locate, tapButton } from './matchHelpers';

declare global { interface Window { __game: any; __golf: any } }

/** The text on the leaderboard that contains `s` (null if none). */
const textOn = (p: Page, s: string) => p.evaluate((s) => {
  const find = (l: any[]): string | null => {
    for (const o of l) {
      if (o.type === 'BitmapText' && typeof o.text === 'string' && o.text.includes(s)) return o.text;
      if (o.list) { const f = find(o.list); if (f) return f; }
    }
    return null;
  };
  return find(window.__game.scene.getScene('leaderboard').children.list);
}, s);

/**
 * Click a text on the leaderboard like a person: the pointer moves there first, and the click is tried again
 * if `done` doesn't follow (an object made in a rebuild only takes input from the game's next frame, and
 * frames are slow on the test machine).
 */
async function clickText(p: Page, s: string, done: () => Promise<boolean>) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const at = await p.waitForFunction(locate, ['leaderboard', null, s] as [string, string | null, string | null], { timeout: 20_000 });
    const pos = (await at.jsonValue()) as { x: number; y: number };
    await p.mouse.move(pos.x, pos.y);
    await p.waitForTimeout(250);
    await p.mouse.click(pos.x, pos.y);
    for (let t = 0; t < 40; t++) { if (await done()) return; await p.waitForTimeout(500); }
  }
  throw new Error(`clicking "${s}" never took effect`);
}

const dialogSays = (p: Page, text: string) => p.evaluate((text) => Array.from(document.querySelectorAll('div')).some((d) => d.textContent === text), text);
const leaderboardSays = (p: Page, text: string) => p.evaluate((text) => {
  const find = (l: any[]): boolean => l.some((o) => (o.type === 'BitmapText' && o.text === text) || (o.list && find(o.list)));
  return find(window.__game.scene.getScene('leaderboard').children.list);
}, text);

test('daily board: a tap on a score shows its card; on this week, a player\'s rounds to choose from', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.scene.isActive('title') && window.__golf?.courses?.length, null, { timeout: 90_000 });
  await tapButton(page, 'title', 'leaderboard', 30_000, () => page.evaluate(() => window.__game.scene.isActive('leaderboard')));
  await tapButton(page, 'leaderboard', 'daily', 30_000, async () => (await textOn(page, ' tees  ·  normal')) !== null);
  // today's daily, as the board names it: "<course>  ·  front 9  ·  blue tees  ·  normal"
  const sub = (await textOn(page, ' tees  ·  normal'))!;
  await page.evaluate((sub) => {
    const [courseName, lengthText, teeText] = sub.split('  ·  ');
    const c = window.__golf.courses.find((x: any) => x.name.toLowerCase() === courseName);
    const length = ({ 'front 9': 'front', 'back 9': 'back', '9 holes': '9', '18 holes': '18' } as Record<string, string>)[lengthText];
    const tee = c.teeSets.find((t: string) => `${t.toLowerCase()} tees` === teeText);
    const first = length === 'back' ? 9 : 0;
    const n = length === '18' ? 18 : 9;
    const pars: number[] = (c.pars ?? Array(18).fill(4)).slice(first, first + n);
    const d = new Date();
    const p2 = (k: number) => String(k).padStart(2, '0');
    const day = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    const round = (id: string, player: string, over: number[]) => {
      const scores = pars.map((par, i) => ({ hole: first + i + 1, par, strokes: par + (over[i] ?? 0), putts: 2, penalties: 0, fairway: par > 3 ? true : null, gir: true }));
      const strokes = scores.reduce((a, s) => a + s.strokes, 0), par = pars.reduce((a, b) => a + b, 0);
      return {
        id, course: c.id, tee, length, difficulty: 'normal', casual: false, player, date: new Date().toISOString(), gross: strokes, toPar: strokes - par, back: null, scores,
        totals: { strokes, par, toPar: strokes - par, putts: 2 * n, penalties: 0, fairways: 5, fairwayChances: 7, gir: n, holes: n, front: strokes, back: 0 }, daily: day,
      };
    };
    localStorage.setItem('local-golf:leaderboard', JSON.stringify([round('d-sam', 'sam', [0, -1, 0, 1]), round('d-kim', 'kim', [1, 1, 0, 0, 1])]));
  }, sub);
  await tapButton(page, 'leaderboard', 'today', 30_000, async () => (await textOn(page, 'sam')) !== null);
  expect(await textOn(page, 'tap a round to see its card')).not.toBeNull();
  // sam's score: sam's card
  await clickText(page, 'sam', () => dialogSays(page, "sam's scorecard"));
  await page.waitForFunction(() => !!document.querySelector('img[alt="scorecard picture"]'), null, { timeout: 30_000 });
  await page.screenshot({ path: 'shots/boards-daily-card.png' });
  await page.getByRole('button', { name: 'close' }).click();
  // this week: kim's rounds to choose from, then the card
  await tapButton(page, 'leaderboard', 'this week', 30_000, async () => (await textOn(page, "tap a player to see their week's cards")) !== null);
  await clickText(page, 'kim', () => leaderboardSays(page, "kim's daily rounds this week"));
  await page.screenshot({ path: 'shots/boards-week-choose.png' });
  await clickText(page, '(+3)', () => dialogSays(page, "kim's scorecard"));
  await page.screenshot({ path: 'shots/boards-week-card.png' });
  expect(errors).toEqual([]);
});

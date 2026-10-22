// Leaderboard: one board per course x tee set x round length, filterable by
// difficulty, casual rounds on their own tab. "friends" is the shared online
// board (when the site has one), "this device" the local one, which can be
// exported / imported as text. Two more lists across every course (developer,
// 2026-10-19): the recent eagles (kept the moment the ball drops) and the
// most birdies in a round.

import { app } from '../app';
import { Difficulty } from '../data/difficulty';
import { backupText, LeaderboardEntry, loadBoard, RoundLength } from '../save/store';
import { BirdieRow, fetchBirdieRecords, fetchHandicapRounds, fetchBoard, fetchDaily, fetchDailyWeek, fetchEagles, fetchRecent, fetchRound, flushUploads, nameConflicts, onlineAvailable } from '../save/online';
import { FeedRow, matchFeedText, timeAgo } from '../save/feed';
import { shareRound } from '../ui/shareCard';
import { addDays, dailyPlan, dayStandings, weekStandings, weekStart } from '../systems/game/daily';
import { DAILY_PICKS, DAILY_ROSTER } from '../data/dailyRoster';
import { handicapBoard, HcpRound, hcpCourses, indexLabel } from '../systems/game/handicap';
import { birdiesIn, EagleEvent, featName } from '../save/feats';
import { loadEagles } from '../save/store';
import { lengthLabel, lengthsFor, shapeById } from './flow';
import { shapeOfCourse } from '../systems/game/lengths';
import { askImport, showBackup } from '../ui/backup';
import { compareRounds, toPar } from '../systems/rules/scoring';
import { teeFor } from '../data/registry';
import { Button, COLORS, dimmer, Panel, txt } from '../ui/widgets';
import { MenuScene } from './menu';
import { DEFAULT_NAME } from '../save/names';

let len: RoundLength = '18';
let courseId = '';
let teeSel = ''; // '' = the tee last played on this course
let source: 'friends' | 'device' | null = null; // null: friends when the site has a shared board
let diff: Difficulty | 'all' = 'all';
let casual = false;
let page = 0;
let view: 'scores' | 'daily' | 'recent' | 'eagles' | 'birdies' | 'handicaps' = 'scores';
let dailyWhen: 'today' | 'week' = 'today';

/** The calendar day (yyyy-mm-dd) of an ISO time in the player's own time zone (an evening round isn't "tomorrow"). */
function localDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** A row of the daily and recent lists (`tap`: a round's card). */
interface TableRow { v: string[]; hi?: number[]; span?: boolean; tap?: () => void }

export class LeaderboardScene extends MenuScene {
  constructor() {
    super('leaderboard');
  }

  init(data: { courseId?: string; view?: typeof view }) {
    if (data?.courseId) { courseId = data.courseId; teeSel = ''; page = 0; view = 'scores'; }
    if (data?.view) { view = data.view; dailyWhen = 'today'; page = 0; }
  }

  async build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(360, W - 8), ph = H - 8;
    const x0 = Math.round((W - pw) / 2), y0 = 4;
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    this.root.add(txt(this, x0 + pw / 2, y0 + 5, 'leaderboard', { origin: [0.5, 0], scale: 2 }));
    {
      const items: [typeof view, string][] = [['scores', 'scores'], ['daily', 'daily'], ['recent', 'recent'], ['eagles', 'eagles'], ['birdies', 'birdies'], ['handicaps', 'handicap']];
      const bw = Math.floor((pw - 16 - 2 * (items.length - 1)) / items.length);
      if (bw < 46) items[5][1] = 'hcp'; // a narrow phone
      items.forEach(([k, lab], i) => this.root.add(new Button(this, x0 + 8 + i * (bw + 2), y0 + 22, bw, 14, lab, () => { view = k; page = 0; this.rebuild(); }, { color: view === k ? 'orange' : 'grey' })));
    }
    if (view === 'daily') { await this.buildDaily(x0, y0, pw, ph); return; }
    if (view === 'recent') { await this.buildRecent(x0, y0, pw, ph); return; }
    if (view !== 'scores') { await this.buildFeats(x0, y0, pw, ph); return; }
    // course: the current one unless another was picked here
    const courses = app.courses;
    if (!courses.some((c) => c.id === courseId)) courseId = app.course?.json.id ?? courses[0]?.id ?? '';
    const ci = Math.max(0, courses.findIndex((c) => c.id === courseId));
    const info = courses[ci];
    const tees = info.teeSets;
    if (!tees.includes(teeSel)) teeSel = teeFor(info, app.settings.tees);
    this.root.add(txt(this, x0 + pw / 2, y0 + 41, `${info.name}  ·  ${teeSel.toLowerCase()} tees`, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 120 }));
    if (courses.length > 1) {
      this.root.add(new Button(this, x0 + pw - 54, y0 + 38, 48, 14, 'change', () => this.scene.start('courses', { purpose: 'board', courseId: info.id }), { color: 'grey' }));
    }
    const shape = shapeOfCourse(info);
    const lens = lengthsFor(shape);
    if (!lens.includes(len)) len = lens[0];
    const g = this.gen;
    // the way out first, so a slow network never leaves the screen without one
    this.root.add(new Button(this, x0 + 6, y0 + ph - 20, 44, 15, 'back', () => this.back(), { color: 'grey' }));
    const online = await onlineAvailable();
    if (!this.isCurrentBuild(g)) return;
    const src = source ?? (online ? 'friends' : 'device');
    let y = y0 + 55;
    const tab = (items: [string, string][], cur: string, set: (v: string) => void) => {
      // more than five: two rows (a club of nines has six round lengths)
      const per = items.length > 5 ? Math.ceil(items.length / 2) : items.length;
      const bw = Math.floor((pw - 16 - (per - 1) * 2) / per);
      items.forEach(([k, lab], i) => {
        if (i > 0 && i % per === 0) y += 17;
        this.root.add(new Button(this, x0 + 8 + (i % per) * (bw + 2), y, bw, 14, lab, () => { set(k); page = 0; this.rebuild(); }, { color: cur === k ? 'orange' : 'grey' }));
      });
      y += 17;
    };
    if (online) tab([['friends', 'friends'], ['device', 'this device']], src, (v) => { source = v as 'friends' | 'device'; });
    tab([...lens.map((k): [string, string] => [k, lengthLabel(k, shape)]), ['casual', 'casual']], casual ? 'casual' : len, (v) => {
      if (v === 'casual') casual = !casual; else { len = v as RoundLength; casual = false; }
    });
    if (tees.length > 1) tab(tees.map((t): [string, string] => [t, `${t.toLowerCase()} tees`]), teeSel, (v) => { teeSel = v; });
    tab([['all', 'all'], ['easy', 'easy'], ['normal', 'normal'], ['pro', 'pro']], diff, (v) => { diff = v as typeof diff; });
    const local = await loadBoard();
    let all = local;
    let note = '';
    if (src === 'friends') {
      await flushUploads(); // a round just finished goes up before the board is read
      if (!this.isCurrentBuild(g)) return;
      const shared = await fetchBoard(info.id);
      if (shared) all = shared;
      else note = "can't reach the shared leaderboard - showing this device";
    }
    if (!this.isCurrentBuild(g)) return;
    // rounds played before a name was set stay on this device's board (the shared board never has them)
    const rows = all.filter((e) => (all === local || e.player !== DEFAULT_NAME) && e.course === info.id && (tees.length < 2 || e.tee === teeSel) && e.length === len && e.casual === casual && (diff === 'all' || e.difficulty === diff));
    rows.sort(compareRounds);
    if (!note && src === 'friends' && nameConflicts.size) note = `another player has the name ${[...nameConflicts][0]} - some of your rounds weren't added`;
    if (note) { this.root.add(txt(this, x0 + pw / 2, y, note, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: pw - 16 })); y += 11; }
    const lineH = 11;
    const listTop = y + 2;
    const maxRows = Math.max(1, Math.floor((y0 + ph - 34 - listTop) / lineH) - 1);
    const pages = Math.max(1, Math.ceil(rows.length / maxRows));
    page = Math.min(page, pages - 1);
    const cols = [x0 + 10, x0 + 30, x0 + 110, x0 + 150, x0 + 186, pw > 300 ? x0 + 240 : -1];
    const head = ['#', 'player', 'gross', 'to par', 'level', 'date'];
    head.forEach((h, i) => { if (cols[i] >= 0) this.root.add(txt(this, cols[i], listTop, h, { color: COLORS.dim })); });
    if (!rows.length) this.root.add(txt(this, x0 + pw / 2, listTop + 24, 'no rounds yet - go play!', { origin: [0.5, 0], color: COLORS.dim }));
    else this.root.add(txt(this, x0 + pw / 2, y0 + ph - 32, 'tap a round to share its card', { origin: [0.5, 0], color: COLORS.dim }));
    const best = new Map<string, LeaderboardEntry>();
    for (const e of rows) if (!best.has(e.player)) best.set(e.player, e);
    rows.slice(page * maxRows, (page + 1) * maxRows).forEach((e, k) => {
      const yy = listTop + (k + 1) * lineH;
      const i = page * maxRows + k;
      const pb = best.get(e.player) === e;
      const vals = [String(i + 1), e.player === DEFAULT_NAME ? '(no name)' : e.player.slice(0, 12), String(e.gross), toPar(e.toPar), e.difficulty, localDay(e.date)];
      vals.forEach((v, j) => { if (cols[j] >= 0) this.root.add(txt(this, cols[j], yy, v, { color: j === 1 && pb ? COLORS.yellow : COLORS.white })); });
      // tap a round to share its card (player improvements, item 2)
      const zone = this.add.zone(x0 + 6, yy - 1, pw - 12, lineH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => { void shareRound(this, e, `#${i + 1} of ${rows.length} ${src === 'friends' ? 'among friends' : 'on this device'}`); });
      this.root.add(zone);
    });
    const by = y0 + ph - 20;
    if (pages > 1) {
      this.root.add(new Button(this, x0 + 54, by, 18, 15, '', () => { page = Math.max(0, page - 1); this.rebuild(); }, { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, x0 + 84, by + 3, `${page + 1}/${pages}`, { origin: [0.5, 0] }));
      this.root.add(new Button(this, x0 + 96, by, 18, 15, '', () => { page = Math.min(pages - 1, page + 1); this.rebuild(); }, { icon: 'arrow_right', color: 'grey' }));
    }
    this.root.add(new Button(this, x0 + pw - 114, by, 52, 15, 'export', () => void showBackup(backupText(local), local.length), { color: 'grey' }));
    this.root.add(new Button(this, x0 + pw - 58, by, 52, 15, 'import', async () => {
      const n = await askImport();
      if (n === null || !this.scene.isActive()) return;
      if (n > 0) await flushUploads();
      this.rebuild();
      this.root.add(txt(this, x0 + pw / 2, by - 12, n ? `imported ${n} ${n === 1 ? 'round' : 'rounds'}` : 'nothing new to import', { origin: [0.5, 0], color: COLORS.yellow }));
    }, { color: 'grey' }));
  }

  /**
   * A list with a header row and pages (the daily and recent views). A row with `span` has two values: the
   * first column's, and a line across the rest (a match on the recent list), cut to fit. A row with `tap`
   * opens something (a round's card: developer, 2026-10-22, "like you can on the leaderboard").
   */
  private table(x0: number, y0: number, pw: number, ph: number, y: number, head: string[], cols: number[], rows: TableRow[], empty: string, hint = 'tap a round to see its card') {
    const lineH = 11;
    const listTop = y + 2;
    const maxRows = Math.max(1, Math.floor((y0 + ph - 36 - listTop) / lineH) - 1);
    const pages = Math.max(1, Math.ceil(rows.length / maxRows));
    page = Math.min(page, pages - 1);
    head.forEach((h, i) => { if (cols[i] >= 0) this.root.add(txt(this, cols[i], listTop, h, { color: COLORS.dim })); });
    if (!rows.length) this.root.add(txt(this, x0 + pw / 2, listTop + 24, empty, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }));
    else if (rows.some((r) => r.tap)) this.root.add(txt(this, x0 + pw / 2, y0 + ph - 32, hint, { origin: [0.5, 0], color: COLORS.dim }));
    rows.slice(page * maxRows, (page + 1) * maxRows).forEach((r, k) => {
      const yy = listTop + (k + 1) * lineH;
      if (r.tap) {
        const zone = this.add.zone(x0 + 6, yy - 1, pw - 12, lineH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        zone.on('pointerup', r.tap);
        this.root.add(zone);
      }
      if (r.span) {
        this.root.add(txt(this, cols[0], yy, r.v[0]));
        const t = txt(this, cols[1], yy, r.v[1], { color: COLORS.white });
        const room = x0 + pw - 8 - cols[1];
        // too long: the course goes first (after the last " · "), then letters off the end
        let line = r.v[1];
        while (t.width > room && line.length > 8) {
          const cut = line.lastIndexOf('  ·  ');
          line = cut > 0 ? line.slice(0, cut) : line.slice(0, -1);
          t.setText(line);
        }
        this.root.add(t);
        return;
      }
      r.v.forEach((v, j) => { if (cols[j] >= 0) this.root.add(txt(this, cols[j], yy, v, { color: r.hi?.includes(j) ? COLORS.yellow : COLORS.white })); });
    });
    const by = y0 + ph - 20;
    if (pages > 1) {
      this.root.add(new Button(this, x0 + 54, by, 18, 15, '', () => { page = Math.max(0, page - 1); this.rebuild(); }, { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, x0 + 84, by + 3, `${page + 1}/${pages}`, { origin: [0.5, 0] }));
      this.root.add(new Button(this, x0 + 96, by, 18, 15, '', () => { page = Math.min(pages - 1, page + 1); this.rebuild(); }, { icon: 'arrow_right', color: 'grey' }));
    }
  }

  /** The daily round's boards: today, and this week (best five of seven, to par). */
  private async buildDaily(x0: number, y0: number, pw: number, ph: number) {
    const g = this.gen;
    this.root.add(new Button(this, x0 + 6, y0 + ph - 20, 44, 15, 'back', () => this.back(), { color: 'grey' }));
    const online = await onlineAvailable();
    if (!this.isCurrentBuild(g)) return;
    const src = source ?? (online ? 'friends' : 'device');
    let y = y0 + 40;
    const tab = (items: [string, string][], cur: string, set: (v: string) => void) => {
      const bw = Math.floor((pw - 16 - (items.length - 1) * 2) / items.length);
      items.forEach(([k, lab], i) => this.root.add(new Button(this, x0 + 8 + i * (bw + 2), y, bw, 14, lab, () => { set(k); page = 0; this.rebuild(); }, { color: cur === k ? 'orange' : 'grey' })));
      y += 17;
    };
    if (online) tab([['friends', 'friends'], ['device', 'this device']], src, (v) => { source = v as 'friends' | 'device'; });
    tab([['today', 'today'], ['week', 'this week']], dailyWhen, (v) => { dailyWhen = v as 'today' | 'week'; });
    const day = localDay(new Date().toISOString());
    const plan = dailyPlan(day, app.courses, DAILY_ROSTER, DAILY_PICKS);
    const info = plan ? app.courses.find((c) => c.id === plan.courseId) : undefined;
    const first = weekStart(day);
    let list: LeaderboardEntry[] | null = null;
    let note = '';
    if (src === 'friends') {
      await flushUploads();
      list = dailyWhen === 'today' ? await fetchDaily(day) : await fetchDailyWeek(first);
      if (!list) note = "can't reach the shared board - showing this device";
    }
    if (!list) list = (await loadBoard()).filter((e) => e.daily && e.player !== DEFAULT_NAME);
    if (!this.isCurrentBuild(g)) return;
    if (note) { this.root.add(txt(this, x0 + pw / 2, y, note, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: pw - 16 })); y += 11; }
    const wide = pw > 300;
    if (dailyWhen === 'today') {
      const sub = info && plan ? `${info.name.toLowerCase()}  ·  ${lengthLabel(plan.length, shapeById(plan.courseId))}  ·  ${plan.tee.toLowerCase()} tees  ·  normal` : '';
      this.root.add(txt(this, x0 + pw / 2, y, sub, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }));
      y += 11;
      const standings = dayStandings(list, day, plan);
      const rows: TableRow[] = standings.map((e, i) => ({
        v: [String(i + 1), e.player.slice(0, 12), String(e.gross), toPar(e.toPar), timeAgo(e.date)],
        tap: () => { void shareRound(this, e, `#${i + 1} of ${standings.length} in today's daily`); },
      }));
      this.table(x0, y0, pw, ph, y, ['#', 'player', 'gross', 'to par', wide ? 'when' : ''], [x0 + 10, x0 + 30, x0 + 110, x0 + 150, wide ? x0 + 200 : -1], rows,
        'nobody has played today\'s round yet - be the first');
      if (!rows.length && plan && info) {
        // the empty board says "be the first": the way to do it (through the title, which asks about a round in progress and a name)
        this.root.add(new Button(this, Math.round(x0 + pw / 2 - 60), y + 2 + 24 + 28, 120, 16, "play today's round", () => this.scene.start('title', { daily: true })));
      }
    } else {
      this.root.add(txt(this, x0 + pw / 2, y, `week of ${first.slice(5)}: best five daily rounds, to par`, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }));
      y += 11;
      const weekList = list.filter((e) => e.daily! >= first && e.daily! <= addDays(first, 6));
      const rows: TableRow[] = weekStandings(weekList, 5, (d) => dailyPlan(d, app.courses, DAILY_ROSTER, DAILY_PICKS)).map((r, i) => ({
        v: [String(i + 1), r.player.slice(0, 12), `${r.days}/7`, toPar(r.toPar)],
        // a player's week: their rounds to choose from
        tap: () => this.chooseRound(r.rounds, `${r.player}'s daily rounds this week`, (e) => `daily ${localDay(e.date).slice(5)}`),
      }));
      this.table(x0, y0, pw, ph, y, ['#', 'player', 'days', 'to par'], [x0 + 10, x0 + 30, x0 + 110, x0 + 150], rows, 'no daily rounds this week yet', "tap a player to see their week's cards");
    }
  }

  /** Friends' activity: the latest rounds on the shared board, and matches played ("kevin def. charlie 3&2"). */
  private async buildRecent(x0: number, y0: number, pw: number, ph: number) {
    const g = this.gen;
    this.root.add(new Button(this, x0 + 6, y0 + ph - 20, 44, 15, 'back', () => this.back(), { color: 'grey' }));
    await flushUploads();
    const feed = await fetchRecent(50);
    if (!this.isCurrentBuild(g)) return;
    let y = y0 + 40;
    const courseName = (id: string) => app.courses.find((c) => c.id === id)?.name.replace(/ (golf|country) club$| golf (course|links)$/i, '') ?? id;
    if (!feed) {
      this.root.add(txt(this, x0 + pw / 2, y + 30, "friends' rounds show here on the hosted game (the shared board can't be reached)", { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 24 }));
      return;
    }
    this.root.add(txt(this, x0 + pw / 2, y, 'the latest rounds and matches on the shared board', { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }));
    y += 11;
    const wide = pw > 300;
    const courseChars = wide ? 16 : 10;
    const badge = (r: FeedRow) => (r.record ? 'record!' : r.pb ? 'best' : r.daily ? 'daily' : r.casual ? 'casual' : '');
    const rounds = feed.rounds.map((r) => ({
      at: r.received,
      row: {
        v: [timeAgo(r.received), r.player.slice(0, 10), courseName(r.course).toLowerCase().slice(0, courseChars), `${r.gross} (${toPar(r.toPar)})${r.holes === 18 ? '' : ` ${r.holes}`}`, badge(r)],
        hi: r.record || r.pb ? [4] : [],
        tap: () => { void this.openFeedRound(r); },
      } as TableRow,
    }));
    // a match across the player, course and score columns: "kevin def. charlie 3&2 · oswego lake"
    const matches = feed.matches.map((m) => ({
      at: m.received,
      row: { v: [timeAgo(m.received), `${matchFeedText({ ...m, winner: m.winner.slice(0, 10), loser: m.loser.slice(0, 10) })}  ·  ${courseName(m.course).toLowerCase()}`], span: true } as TableRow,
    }));
    const table = [...rounds, ...matches].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, 50).map((x) => x.row);
    this.table(x0, y0, pw, ph, y, ['when', 'player', 'course', 'score', ''],
      [x0 + 8, x0 + 66, x0 + 128, wide ? x0 + 236 : x0 + 196, wide ? x0 + 296 : -1], table, 'no rounds yet - go play!');
  }

  /** A round on the recent list: its card, fetched from the shared board (the list itself carries only the score). */
  private async openFeedRound(r: FeedRow) {
    const g = this.gen;
    const note = txt(this, app.view.w / 2, app.view.h - 30, 'getting the card...', { origin: [0.5, 0], color: COLORS.yellow });
    this.root.add(note);
    const e = await fetchRound(r.id);
    if (!this.isCurrentBuild(g)) return;
    note.destroy();
    if (!e) {
      const t = txt(this, app.view.w / 2, app.view.h - 30, "that card can't be had (offline, or the player is hidden)", { origin: [0.5, 0], color: COLORS.yellow });
      this.root.add(t);
      this.time.delayedCall(2500, () => t.destroy());
      return;
    }
    void shareRound(this, e, r.record ? 'a new record' : r.pb ? 'a personal best' : '');
  }

  /** A short list of rounds to choose one from (a player's week of dailies); tapping one shows its card. */
  private chooseRound(rounds: LeaderboardEntry[], title: string, label: (e: LeaderboardEntry) => string) {
    const W = app.view.w, H = app.view.h;
    const layer = this.add.container(0, 0).setDepth(50);
    const close = () => layer.destroy();
    const dim = dimmer(this, 0.6);
    dim.on('pointerdown', close);
    const list = [...rounds].sort((a, b) => (a.daily ?? a.date).localeCompare(b.daily ?? b.date));
    const pw = Math.min(260, W - 16), ph = 34 + list.length * 18 + 22;
    const x0 = Math.round((W - pw) / 2), y0 = Math.round((H - ph) / 2);
    layer.add([dim, new Panel(this, x0, y0, pw, ph, 0.95), txt(this, x0 + pw / 2, y0 + 6, title, { origin: [0.5, 0], maxWidth: pw - 12 })]);
    const courseName = (id: string) => app.courses.find((c) => c.id === id)?.name.replace(/ (golf|country) club$| golf (course|links)$/i, '') ?? id;
    list.forEach((e, i) => {
      const day = new Date(`${e.daily ?? localDay(e.date)}T12:00:00`);
      const when = Number.isNaN(day.getTime()) ? '' : ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day.getDay()];
      const text = `${when}  ${courseName(e.course).toLowerCase().slice(0, 16)}  ${e.gross} (${toPar(e.toPar)})`;
      layer.add(new Button(this, x0 + 8, y0 + 26 + i * 18, pw - 16, 15, text, () => { close(); void shareRound(this, e, label(e)); }, { color: 'grey' }));
    });
    layer.add(new Button(this, x0 + pw / 2 - 26, y0 + ph - 20, 52, 15, 'close', close, { color: 'grey' }));
    this.root.add(layer);
  }

  /** The recent eagles and the most birdies in a round, across every course. */
  private async buildFeats(x0: number, y0: number, pw: number, ph: number) {
    const g = this.gen;
    this.root.add(new Button(this, x0 + 6, y0 + ph - 20, 44, 15, 'back', () => this.back(), { color: 'grey' }));
    const online = await onlineAvailable();
    if (!this.isCurrentBuild(g)) return;
    const src = source ?? (online ? 'friends' : 'device');
    let y = y0 + 40;
    if (online) {
      const bw = Math.floor((pw - 16 - 2) / 2);
      ([['friends', 'friends'], ['device', 'this device']] as const).forEach(([k, lab], i) => this.root.add(new Button(this, x0 + 8 + i * (bw + 2), y, bw, 14, lab, () => { source = k; page = 0; this.rebuild(); }, { color: src === k ? 'orange' : 'grey' })));
      y += 17;
    }
    const courseName = (id: string) => app.courses.find((c) => c.id === id)?.name.replace(/ (golf|country) club$| golf (course|links)$/i, '') ?? id;
    let note = '';
    let empty = ''; // under the column headers, like the other boards
    const lineH = 11;
    type Row = string[];
    let head: string[], cols: number[], rows: Row[];
    const wide = pw > 300;
    if (view === 'eagles') {
      let list: EagleEvent[] | null = null;
      if (src === 'friends') { await flushUploads(); list = await fetchEagles(50); if (!list) note = "can't reach the shared list - showing this device"; }
      if (!list) list = (await loadEagles()).filter((e) => e.player !== DEFAULT_NAME).sort((a, b) => (a.date < b.date ? 1 : -1));
      head = ['date', 'player', 'course', 'hole', ''];
      // columns from the panel's width: on a narrow phone the course name gives way
      const featX = pw - 66, holeX = featX - 26, courseChars = Math.max(0, Math.floor((holeX - 128 - 6) / 6));
      cols = [x0 + 10, x0 + 52, courseChars >= 6 ? x0 + 128 : -1, x0 + holeX, x0 + featX];
      rows = list.map((e) => [localDay(e.date).slice(5), e.player.slice(0, 12), courseName(e.course).slice(0, courseChars), String(e.hole), featName(e.strokes, e.par)]);
      if (!rows.length) empty = 'no eagles yet - the first one goes here';
    } else if (view === 'handicaps') {
      // each player's index from their Normal rounds (systems/game/handicap.ts); lowest first
      let list: HcpRound[] | null = null;
      if (src === 'friends') { await flushUploads(); list = await fetchHandicapRounds(); if (!list) note = "can't reach the shared board - showing this device"; }
      if (!list) list = (await loadBoard()).filter((e) => e.player !== DEFAULT_NAME);
      const board = handicapBoard(list, hcpCourses(app.courses));
      head = ['#', 'player', 'index', 'counted', 'week'];
      cols = [x0 + 10, x0 + 30, x0 + 110, x0 + 150, pw > 260 ? x0 + 205 : -1];
      rows = board.map((r, i) => {
        const d = r.weekAgo ? Math.round((r.h.index - r.weekAgo.index) * 10) / 10 : null;
        const week = d === null ? 'new' : d === 0 ? '-' : d < 0 ? `down ${(-d).toFixed(1)}` : `up ${d.toFixed(1)}`;
        return [String(i + 1), r.player.slice(0, 12), indexLabel(r.h), `${r.h.counted} of ${r.h.of}`, week];
      });
      if (!rows.length) empty = 'no handicaps yet - 27 holes at normal difficulty put you on this board';
      else this.root.add(txt(this, x0 + pw / 2, y0 + ph - 32, 'on the board after 27 holes  ·  normal rounds only', { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }));
    } else {
      let list: BirdieRow[] | null = null;
      if (src === 'friends') { list = await fetchBirdieRecords(50); if (!list) note = "can't reach the shared board - showing this device"; }
      if (!list) {
        list = (await loadBoard())
          .filter((e) => !e.casual && e.player !== DEFAULT_NAME)
          .map((e) => ({ id: e.id, player: e.player, course: e.course, birdies: birdiesIn(e.scores), length: e.length, tee: e.tee, date: e.date }))
          .filter((r) => r.birdies > 0)
          .sort((a, b) => b.birdies - a.birdies || (a.date < b.date ? -1 : 1));
      }
      head = ['#', 'player', 'birdies', 'course', 'date'];
      cols = [x0 + 10, x0 + 30, x0 + 110, x0 + 150, wide ? x0 + 300 : -1];
      rows = list.map((r, i) => [String(i + 1), r.player.slice(0, 12), String(r.birdies), courseName(r.course).slice(0, wide ? 24 : 18), localDay(r.date)]);
      if (!rows.length) empty = 'no birdies yet - go make some!';
      else this.root.add(txt(this, x0 + pw / 2, y0 + ph - 32, 'birdies or better in one round, any course (casual rounds left out)', { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }));
    }
    if (!this.isCurrentBuild(g)) return;
    if (note) { this.root.add(txt(this, x0 + pw / 2, y, note, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: pw - 16 })); y += 11; }
    const listTop = y + 2;
    const maxRows = Math.max(1, Math.floor((y0 + ph - 36 - listTop) / lineH) - 1);
    const pages = Math.max(1, Math.ceil(rows.length / maxRows));
    page = Math.min(page, pages - 1);
    head.forEach((h, i) => { if (cols[i] >= 0) this.root.add(txt(this, cols[i], listTop, h, { color: COLORS.dim })); });
    if (empty) this.root.add(txt(this, x0 + pw / 2, listTop + 24, empty, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }));
    rows.slice(page * maxRows, (page + 1) * maxRows).forEach((r, k) => {
      const yy = listTop + (k + 1) * lineH;
      r.forEach((v, j) => { if (cols[j] >= 0) this.root.add(txt(this, cols[j], yy, v, { color: j === 4 && view === 'eagles' ? COLORS.yellow : COLORS.white })); });
    });
    const by = y0 + ph - 20;
    if (pages > 1) {
      this.root.add(new Button(this, x0 + 54, by, 18, 15, '', () => { page = Math.max(0, page - 1); this.rebuild(); }, { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, x0 + 84, by + 3, `${page + 1}/${pages}`, { origin: [0.5, 0] }));
      this.root.add(new Button(this, x0 + 96, by, 18, 15, '', () => { page = Math.min(pages - 1, page + 1); this.rebuild(); }, { icon: 'arrow_right', color: 'grey' }));
    }
  }
}

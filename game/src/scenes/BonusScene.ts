// Bonus mode (developer, 2026-10-27): cross-country golf, reached from "my golf"
// and kept off every other board and list. The rules in a few lines, the course
// to play, its best cross-country rounds (lowest strokes), and "play".

import { app } from '../app';
import { LeaderboardEntry, loadBoard } from '../save/store';
import { fetchXcBoard, flushUploads, onlineAvailable } from '../save/online';
import { compareRounds } from '../systems/rules/scoring';
import { XC_MAX_YD, XC_MIN_YD } from '../systems/game/crossCountry';
import { shareRound } from '../ui/shareCard';
import { Button, COLORS, fitHeading, onTap, Panel, setTxt, txt } from '../ui/widgets';
import { DEFAULT_NAME } from '../save/names';
import { shortName } from '../save/milestones';
import { MenuScene } from './menu';
import { confirmDiscard, startXc, useCourse, withName } from './flow';
import { LoadSuperseded } from '../data/courses';

/** The course last chosen here (else the current one). */
let courseSel = '';
/** The leaderboard tab: this course's rounds, or every course's best. */
let tab: 'course' | 'all' = 'course';

export const XC_RULES = [
  'play every tee and every green on the course once, in any order.',
  `from each tee, pick a green: ${XC_MIN_YD} to ${XC_MAX_YD} yards away, or the hole's own green.`,
  'only greens that still let you finish the round are offered.',
  'out of bounds is only the edge of the course: the range and inside stakes are in play.',
  'other greens are off limits (take relief). fewest strokes wins.',
];

export class BonusScene extends MenuScene {
  private busy = false;

  constructor() {
    super('bonus');
  }

  init(data?: { courseId?: string }) {
    if (data?.courseId) courseSel = data.courseId;
    this.busy = false;
  }

  protected back() {
    if (!this.busy) this.scene.start('mygolf');
  }

  async build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(420, W - 8), ph = H - 8;
    const x0 = Math.round((W - pw) / 2), y0 = 4;
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.92));
    this.root.add(fitHeading(txt(this, x0 + pw / 2, y0 + 5, 'cross-country golf', { origin: [0.5, 0] }), pw - 16));
    this.root.add(txt(this, x0 + pw / 2, y0 + 24, 'bonus mode', { origin: [0.5, 0], color: COLORS.dim }));
    let y = y0 + 38;
    for (const line of XC_RULES) {
      const t = txt(this, x0 + 12, y, `·  ${line}`, { color: COLORS.white, maxWidth: pw - 24 });
      this.root.add(t);
      y += Math.round(t.height) + 2;
    }
    y += 4;
    if (!app.courses.some((c) => c.id === courseSel)) courseSel = app.course?.json.id ?? app.courses[0]?.id ?? '';
    const info = app.courses.find((c) => c.id === courseSel);
    if (!info) return;
    const cl = txt(this, x0 + 12, y + 3, `${info.name.toLowerCase()}  ·  ${info.holes} legs`, { color: COLORS.yellow, maxWidth: pw - 140 });
    this.root.add(cl);
    this.root.add(new Button(this, x0 + pw - 124, y, 54, 15, 'course', () => this.scene.start('courses', { purpose: 'xc', from: 'bonus', courseId: courseSel }), { color: 'grey' }));
    this.root.add(new Button(this, x0 + pw - 66, y, 54, 15, 'play', () => this.play(), { color: 'orange' }));
    y += Math.max(22, Math.round(cl.height) + 10); // a long name wraps on a phone
    this.root.add(new Button(this, x0 + 6, y0 + ph - 20, 44, 15, 'back', () => this.back(), { color: 'grey' }));
    await this.leaderboard(x0, y, pw, y0 + ph - 24, info.name);
  }

  /**
   * The cross-country leaderboard (developer, 2026-10-27): "this course" ranks every round here by
   * strokes; "all courses" gives each course's best. Friends' when the site has a shared board, else
   * this device's. The player's own rows are green; one off the bottom is added as a last line.
   */
  private async leaderboard(x0: number, y: number, pw: number, bottom: number, courseName: string) {
    const g = this.gen;
    this.root.add(txt(this, x0 + 12, y, 'leaderboard', { color: COLORS.yellow, scale: 1 }));
    const source = txt(this, x0 + pw - 12, y, '', { origin: [1, 0], color: COLORS.dim });
    this.root.add(source);
    y += 12;
    const tw = Math.min(78, Math.floor((pw - 30) / 2));
    ([['course', 'this course'], ['all', 'all courses']] as const).forEach(([k, label], i) =>
      this.root.add(new Button(this, x0 + 12 + i * (tw + 4), y, tw, 14, label, () => { if (tab !== k) { tab = k; this.rebuild(); } }, { color: tab === k ? 'orange' : 'grey' })));
    y += 19;
    const all = tab === 'all';
    // columns: the narrow phone panel keeps them inside (about 5 px a letter)
    const right = x0 + pw - 12;
    const cols = all
      ? { a: x0 + 12, b: x0 + 12 + Math.floor((pw - 24 - 34) * 0.55), n: right }
      : { a: x0 + 12, b: x0 + 26, n: right - 34, d: right };
    const head = (x: number, s: string, o: [number, number] = [0, 0]) => this.root.add(txt(this, x, y, s, { origin: o, color: COLORS.dim }));
    if (all) { head(cols.a, 'course'); head(cols.b, 'best'); head(cols.n, 'strokes', [1, 0]); }
    else { head(cols.a, '#'); head(cols.b, 'player'); head(cols.n, 'strokes', [1, 0]); head(cols.d!, 'date', [1, 0]); }
    y += 10;
    this.root.add(this.add.rectangle(x0 + 12, y, pw - 24, 1, COLORS.dim, 0.4).setOrigin(0, 0));
    y += 3;
    const wait = txt(this, x0 + pw / 2, y + 8, 'loading...', { origin: [0.5, 0], color: COLORS.dim });
    this.root.add(wait);

    const online = await onlineAvailable();
    let list: LeaderboardEntry[] | null = null;
    if (online) { await flushUploads(); list = await fetchXcBoard(all ? undefined : courseSel); }
    const local = list ? null : await loadBoard();
    if (!this.isCurrentBuild(g)) return;
    wait.destroy();
    const shared = !!list;
    setTxt(source, shared ? 'friends' : 'this device');
    const rounds = (list ?? local!).filter((e) => e.length === 'xc' && !e.casual && (shared || e.player !== DEFAULT_NAME) && (all || e.course === courseSel)).sort(compareRounds);
    const me = app.settings.playerName;
    const room = Math.max(1, Math.floor((bottom - y) / 11));
    // a cell: x, text, origin, and the width it may take (a long name is cut with a dot)
    const row = (yy: number, cells: [number, string, [number, number]?, number?][], color: number, tap: () => void) => {
      for (const [x, v, o, max] of cells) {
        const t = txt(this, x, yy, v, { origin: o ?? [0, 0], color });
        for (let n = v.length - 1; max && t.width > max && n > 1; n--) setTxt(t, `${v.slice(0, n)}.`);
        this.root.add(t);
      }
      const zone = this.add.zone(x0 + 6, yy - 1, pw - 12, 11).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      onTap(zone, tap);
      this.root.add(zone);
    };
    const share = (e: LeaderboardEntry, title: string) => () => { void shareRound(this, e, title); };
    const nameOf = (id: string) => app.courses.find((c) => c.id === id)?.name ?? id;

    if (all) {
      // each course's best round, the most played courses first
      const by = new Map<string, LeaderboardEntry[]>();
      for (const e of rounds) by.set(e.course, [...(by.get(e.course) ?? []), e]);
      const best = [...by.values()].sort((a, b) => b.length - a.length || nameOf(a[0].course).localeCompare(nameOf(b[0].course))).map((l) => l[0]);
      if (!best.length) { this.empty(x0, y, pw, 'no cross-country rounds yet: be the first'); return; }
      best.slice(0, room).forEach((e, i) => {
        const cn = shortName(nameOf(e.course)).toLowerCase();
        row(y + i * 11, [[cols.a, cn, undefined, cols.b - cols.a - 6], [cols.b, e.player, undefined, cols.n - cols.b - 26], [cols.n, String(e.gross), [1, 0]]],
          e.player === me ? COLORS.green : COLORS.white, share(e, `cross-country record at ${cn}`));
      });
      return;
    }
    if (!rounds.length) { this.empty(x0, y, pw, `no rounds here yet: be the first at ${shortName(courseName).toLowerCase()}`); return; }
    const where = shortName(courseName).toLowerCase();
    const line = (e: LeaderboardEntry, rank: number, yy: number) => {
      const d = new Date(e.date);
      const when = Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`;
      row(yy, [[cols.a, String(rank)], [cols.b, e.player, undefined, cols.n - cols.b - 26], [cols.n, String(e.gross), [1, 0]], [cols.d!, when, [1, 0]]],
        rank === 1 ? COLORS.yellow : e.player === me ? COLORS.green : COLORS.white, share(e, `#${rank} cross-country at ${where}`));
    };
    const mine = rounds.findIndex((e) => e.player === me);
    const shown = mine >= room ? room - 1 : room; // keep a line for the player's best when it's further down
    rounds.slice(0, shown).forEach((e, i) => line(e, i + 1, y + i * 11));
    if (mine >= shown && shown < room) line(rounds[mine], mine + 1, y + shown * 11);
  }

  private empty(x0: number, y: number, pw: number, msg: string) {
    this.root.add(txt(this, x0 + pw / 2, y + 8, msg, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 24 }));
  }

  /** Load the course if needed (asking about a round in progress and a name first), then the planner. */
  private play() {
    if (this.busy) return;
    void confirmDiscard(this, this.root, () => withName(this, () => {
      this.busy = true;
      const W = app.view.w, H = app.view.h;
      // its own layer over the screen: a resize draws the screen again underneath and the cover stays
      const dim = this.add.rectangle(0, 0, W, H, 0x081018, 0.7).setOrigin(0, 0).setInteractive();
      const msg = txt(this, W / 2, H / 2 - 4, 'loading course...', { origin: [0.5, 0], scale: 2, color: COLORS.yellow });
      const cover = this.add.container(0, 0, [dim, msg]).setDepth(500);
      const place = () => {
        dim.setSize(app.view.w, app.view.h);
        (dim.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setSize(app.view.w, app.view.h);
        msg.setPosition(Math.round(app.view.w / 2), Math.round(app.view.h / 2 - 4));
      };
      this.scale.on('resize', place);
      this.events.once('shutdown', () => { this.scale.off('resize', place); this.busy = false; if (cover.active) cover.destroy(); });
      void (async () => {
        try {
          await useCourse(this, courseSel, (f) => { if (msg.active) setTxt(msg, `loading course ${Math.round(f * 100)}%`); });
        } catch (e) {
          if (e instanceof LoadSuperseded) return;
          console.error(e);
          window.location.reload();
          return;
        }
        this.scene.stop('bg');
        startXc(this);
      })();
    }));
  }
}

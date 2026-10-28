// Bonus mode (developer, 2026-10-27): cross-country golf, reached from "my golf"
// and kept off every other board and list. The rules in a few lines, the course
// to play, its best cross-country rounds (lowest strokes), and "play".

import { app } from '../app';
import { LeaderboardEntry, loadBoard } from '../save/store';
import { fetchBoard, flushUploads, onlineAvailable } from '../save/online';
import { compareRounds } from '../systems/rules/scoring';
import { XC_MAX_YD, XC_MIN_YD } from '../systems/game/crossCountry';
import { shareRound } from '../ui/shareCard';
import { Button, COLORS, onTap, Panel, setTxt, txt } from '../ui/widgets';
import { DEFAULT_NAME } from '../save/names';
import { shortName } from '../save/milestones';
import { MenuScene } from './menu';
import { confirmDiscard, startXc, useCourse, withName } from './flow';
import { LoadSuperseded } from '../data/courses';

/** The course last chosen here (else the current one). */
let courseSel = '';

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
    this.root.add(txt(this, x0 + pw / 2, y0 + 5, 'cross-country golf', { origin: [0.5, 0], scale: 2, maxWidth: pw - 16 }));
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
    // the course's best cross-country rounds: friends' when the site has a shared board, else this device's
    const g = this.gen;
    const head = txt(this, x0 + 12, y, 'best rounds here', { color: COLORS.dim });
    this.root.add(head);
    y += 12;
    const online = await onlineAvailable();
    let list: LeaderboardEntry[] | null = null;
    if (online) { await flushUploads(); list = await fetchBoard(courseSel); }
    const local = await loadBoard();
    if (!this.isCurrentBuild(g)) return;
    const shared = !!list;
    const rows = (list ?? local).filter((e) => e.course === courseSel && e.length === 'xc' && !e.casual && (shared || e.player !== DEFAULT_NAME)).sort(compareRounds);
    setTxt(head, `best rounds here${shared ? ' (friends)' : ' (this device)'}`);
    if (!rows.length) { this.root.add(txt(this, x0 + pw / 2, y + 10, 'nobody has played it here yet', { origin: [0.5, 0], color: COLORS.dim })); return; }
    const room = Math.max(1, Math.floor((y0 + ph - 26 - y) / 11));
    rows.slice(0, room).forEach((e, i) => {
      const yy = y + i * 11;
      const d = new Date(e.date);
      const when = Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`;
      [[x0 + 12, String(i + 1)], [x0 + 30, e.player.slice(0, 14)], [x0 + 130, `${e.gross} strokes`], [x0 + 200, when]].forEach(([x, v]) =>
        this.root.add(txt(this, x as number, yy, v as string, { color: i === 0 ? COLORS.yellow : COLORS.white })));
      const zone = this.add.zone(x0 + 6, yy - 1, pw - 12, 11).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      onTap(zone, () => { void shareRound(this, e, `#${i + 1} cross-country at ${shortName(info.name).toLowerCase()}`); });
      this.root.add(zone);
    });
  }

  /** Load the course if needed (asking about a round in progress and a name first), then the planner. */
  private play() {
    if (this.busy) return;
    void confirmDiscard(this, this.root, () => withName(this, () => {
      this.busy = true;
      const W = app.view.w, H = app.view.h;
      const dim = this.add.rectangle(0, 0, W, H, 0x081018, 0.7).setOrigin(0, 0).setInteractive();
      const msg = txt(this, W / 2, H / 2 - 4, 'loading course...', { origin: [0.5, 0], scale: 2, color: COLORS.yellow });
      this.root.add([dim, msg]);
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

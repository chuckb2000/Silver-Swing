// Title menu over a rotating set of course views (sprites/title/<id>.png,
// rendered from each course's own art by assets-src/course_cards.py): each
// drifts slowly, then cross-fades to the next. The trophy logo sits beside
// the game name. Falls back to the course fly-over (BgScene) without them.

import Phaser from 'phaser';
import { app, GAME_NAME } from '../app';
import { coursesByState } from '../data/registry';
import { initAudio, setVolume } from '../audio/sfx';
import { peekSnapshot } from '../save/snapshot';
import { Button, COLORS, Panel, setTxt, txt } from '../ui/widgets';
import { confirmDiscard, editName, hasName, resumeRound, snapshotHole, startPractice, startRound, useCourse, withName } from './flow';
import { DailyPlan, dailyPlan, localDay } from '../systems/game/daily';
import { DAILY_PICKS, DAILY_ROSTER } from '../data/dailyRoster';
import { shortName } from '../save/milestones';
import { update, whenUpdateReady } from '../save/offline';
import { LoadSuperseded } from '../data/courses';
import { STALL_MS } from './CourseSelectScene';
import { ensureBg, MenuScene } from './menu';

const SHOW_MS = 9000;   // each course on screen
const FADE_MS = 1400;   // cross-fade
const SHADE = 0.32;     // darkened a little so the menu reads

let order: string[] | null = null; // course views, shuffled once per visit to the site
let at = 0;

interface Shown { img: Phaser.GameObjects.Image; t: number; fromX: number; fromY: number; toX: number; toY: number }

export class TitleScene extends MenuScene {
  private shown: Shown[] = [];
  private shade: Phaser.GameObjects.Rectangle | null = null;
  private resuming = false;
  /** Opened to start today's daily round (the leaderboard's "play today's round"). */
  private dailyNow = false;

  constructor() {
    super('title');
  }

  init(data?: { daily?: boolean }) {
    this.dailyNow = !!data?.daily;
  }

  create() {
    this.flyover = false;
    this.shown = [];
    this.resuming = false;
    this.shade = this.add.rectangle(0, 0, 10, 10, 0x081018, SHADE).setOrigin(0, 0).setDepth(-1);
    this.layoutShade();
    this.scale.on('resize', this.layoutShade, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.layoutShade, this); this.shade = null; this.shown = []; });
    void this.startMaps();
    whenUpdateReady(() => { if (this.sys.isActive()) this.rebuild(); });
    setVolume(app.settings.volume, app.settings.muted);
    this.input.once('pointerdown', () => { void initAudio(); });
    super.create();
  }

  protected back() {
    // ESC on the title does nothing (it used to restart the scene, also in the middle of loading a round's course)
  }

  private layoutShade() {
    this.shade?.setPosition(0, 0).setSize(app.view.w, app.view.h);
  }

  /** Load the course views (once) and start the rotation; without any, the fly-over. */
  private async startMaps() {
    if (!order) {
      try {
        const res = await fetch('sprites/title/index.json');
        const j = (await res.json()) as { maps?: string[] };
        order = (j.maps ?? []).filter((id) => app.courses.some((c) => c.id === id));
      } catch {
        order = [];
      }
      for (let i = order.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [order[i], order[k]] = [order[k], order[i]];
      }
    }
    if (!this.sys.isActive()) return;
    const want = order.filter((id) => !this.textures.exists(`tmap_${id}`));
    if (want.length) {
      await new Promise<void>((resolve) => {
        for (const id of want) this.load.image(`tmap_${id}`, `sprites/title/${id}.png`);
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
        this.load.start();
      });
    }
    if (!this.sys.isActive()) return;
    order = order.filter((id) => this.textures.exists(`tmap_${id}`));
    if (!order.length) { ensureBg(this); return; }
    if (this.scene.isActive('bg')) this.scene.stop('bg');
    this.next();
  }

  /** Bring in the next course view; it drifts from one corner of itself toward the other. */
  private next() {
    if (!order || !order.length) return;
    const id = order[at++ % order.length];
    const W = app.view.w, H = app.view.h;
    const img = this.add.image(0, 0, `tmap_${id}`).setOrigin(0, 0).setDepth(-2);
    const k = img.height < H || img.width < W ? 2 : 1; // a tall phone screen: twice the size
    img.setScale(k).setAlpha(this.shown.length ? 0 : 1);
    const spareX = Math.max(0, img.width * k - W), spareY = Math.max(0, img.height * k - H);
    const left = Math.random() < 0.5, up = Math.random() < 0.5;
    const s: Shown = {
      img, t: 0,
      fromX: left ? 0 : -spareX, toX: left ? -spareX : 0,
      fromY: up ? 0 : -spareY, toY: up ? -spareY * 0.6 : -spareY * 0.4,
    };
    img.setPosition(Math.round(s.fromX), Math.round(s.fromY));
    this.shown.push(s);
  }

  update(_t: number, dt: number) {
    const d = Math.min(dt, 100);
    const last = this.shown.length - 1;
    this.shown.forEach((s, i) => {
      s.t += d;
      const f = Math.min(1, s.t / (SHOW_MS + 2 * FADE_MS));
      s.img.setPosition(Math.round(s.fromX + (s.toX - s.fromX) * f), Math.round(s.fromY + (s.toY - s.fromY) * f)); // whole texels
      if (i > 0) s.img.setAlpha(Math.min(1, s.t / FADE_MS));
      if (i === last && s.t >= SHOW_MS) this.next();
    });
    // the old view goes once the new one is fully in
    while (this.shown.length > 1 && this.shown[1].t >= FADE_MS) this.shown.shift()!.img.destroy();
  }

  /**
   * A course may have to load first (a resumed round, the daily round): a
   * dimmed screen with the progress, and a reload button if it stalls.
   */
  private async withLoading(work: (progress: (f: number) => void) => Promise<boolean>) {
    if (this.resuming) return;
    this.resuming = true;
    const W = app.view.w, H = app.view.h, cx = Math.round(W / 2);
    const dim = this.add.rectangle(0, 0, W, H, 0x081018, 0.7).setOrigin(0, 0).setInteractive();
    const msg = txt(this, cx, H / 2 - 4, 'loading course...', { origin: [0.5, 0], scale: 2, color: COLORS.yellow });
    this.root.add([dim, msg]);
    let ok = false;
    let last = Date.now();
    let offered = false;
    const watch = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (offered || Date.now() - last < STALL_MS || !msg.active) return;
        offered = true; // stalled: offer what a player did by hand, a reload that opens the round
        this.root.add(txt(this, cx, H / 2 + 14, 'this is taking a while - the connection may have stalled', { origin: [0.5, 0], color: COLORS.dim, maxWidth: W - 16 }));
        this.root.add(new Button(this, cx - 40, H / 2 + 28, 80, 16, 'reload', () => window.location.reload()));
      },
    });
    try {
      ok = await work((f) => { last = Date.now(); if (msg.active) setTxt(msg, `loading course ${Math.round(f * 100)}%`); });
    } catch (e) {
      if (e instanceof LoadSuperseded) return;
      console.error(e);
    }
    watch.remove();
    this.resuming = false;
    if (!app.course) { window.location.reload(); return; } // the load failed half way: start again on the last good course
    if (!ok) this.rebuild();
    else this.scene.stop('bg');
  }

  /**
   * Today's daily round: a round in progress is only thrown away once the
   * player says so, and a player with no name is asked for one first, as on
   * the new-round screen (afternoon review, 2026-10-20).
   */
  private playDaily(plan: DailyPlan) {
    void confirmDiscard(this, this.root, () => withName(this, () => void this.withLoading(async (progress) => {
      await useCourse(this, plan.courseId, progress);
      startRound(this, plan.length, plan);
      return true;
    })));
  }

  async build() {
    const W = app.view.w, H = app.view.h;
    const cx = Math.round(W / 2);
    let top = Math.max(8, Math.round(H * 0.14));
    // the trophy logo beside the game name (4x on a wide screen), or above it on a tall narrow one
    const name = GAME_NAME.toLowerCase();
    const trophy = this.textures.exists('trophy') ? this.textures.get('trophy').getSourceImage() as HTMLImageElement : null;
    const one = txt(this, cx, top, name, { origin: [0.5, 0], scale: 4 });
    const tgap = 8;
    let placed = false;
    let dy = 0;
    if (trophy && one.width + trophy.width + tgap <= W - 16) {
      const left = Math.round(cx - (one.width + trophy.width + tgap) / 2);
      this.root.add(this.add.image(left, Math.max(2, top - 16), 'trophy').setOrigin(0, 0));
      one.setX(left + trophy.width + tgap + Math.round(one.width / 2));
      this.root.add(one);
      placed = true;
    } else if (trophy && H >= 330) {
      this.root.add(this.add.image(cx - Math.round(trophy.width / 2), 4, 'trophy').setOrigin(0, 0));
      top = Math.max(top, trophy.height + 14);
      one.setY(top);
    }
    if (placed) { /* beside the trophy */ }
    else if (one.width <= W - 16) this.root.add(one);
    else {
      one.destroy();
      const words = name.split(' ');
      // two lines: everything below moves down by the second line
      const l1 = txt(this, cx, top, words.slice(0, 2).join(' '), { origin: [0.5, 0], scale: 3 });
      const l2 = txt(this, cx, top + 30, words.slice(2).join(' '), { origin: [0.5, 0], scale: 3 });
      dy = 30;
      if (l1.width > W - 16) { l1.setScale(2); l2.setScale(2); l2.y = top + 20; dy = 20; }
      this.root.add([l1, l2]);
    }
    const n = app.courses.length;
    const states = coursesByState(app.courses).length;
    const sub = n === 1 ? app.courses[0].name : `${n} courses${states > 1 ? ` in ${states} states` : ''}`;
    const small = W < 330; // a phone: the course count at 1x, and everything under it moves up by the line it saves
    this.root.add(txt(this, cx, top + 46 + dy, sub, { origin: [0.5, 0], scale: small ? 1 : 2, color: COLORS.yellow }));
    if (small) dy -= 9;
    this.root.add(txt(this, cx, top + 66 + dy, 'real courses, rebuilt from map and lidar data', { origin: [0.5, 0], color: COLORS.dim }));
    const snap = await peekSnapshot();
    if (!this.sys.isActive()) return;
    const bw = 124, bh = 17, gap = 21;
    let y = top + 84 + dy;
    let bottom = y;
    const add = (label: string, cb: () => void, grey = false, textColor?: number) => {
      // wide enough for its label (a long daily course name ran out of the button)
      const probe = txt(this, 0, 0, label);
      const w = Math.min(W - 8, Math.max(bw, Math.ceil(probe.width) + 12));
      probe.destroy();
      this.root.add(new Button(this, Math.round(cx - w / 2), y, w, bh, label, cb, { color: grey ? 'grey' : 'orange', textColor }));
      bottom = y + bh;
      y += gap;
    };
    // the rest two to a row (the list no longer fits a 270-texel-high screen one under another)
    const sw = 80, sgap = 4;
    let col = 0;
    const add2 = (label: string, cb: () => void) => {
      this.root.add(new Button(this, cx - sw - sgap / 2 + col * (sw + sgap), y, sw, bh - 1, label, cb, { color: 'grey' }));
      bottom = y + bh - 1;
      col ^= 1;
      if (!col) y += gap - 2;
    };
    if (snap) {
      const { hole: holeNo, done } = snapshotHole(snap); // done: every hole played, only the summary is left
      add(done ? 'finish last round' : `continue round (hole ${holeNo})`, () => void this.withLoading((progress) => resumeRound(this, progress)));
    }
    add(snap ? 'new round' : 'play', () => this.scene.start('courses', { purpose: 'play', from: 'title' }), !!snap);
    // the daily round: today's course, nine holes, the same wind and pins for everyone
    const plan = dailyPlan(localDay(), app.courses, DAILY_ROSTER, DAILY_PICKS);
    const dc = plan && app.courses.find((c) => c.id === plan.courseId);
    if (plan && dc) add(`daily: ${shortName(dc.name)}`, () => this.playDaily(plan), !!snap);
    if (this.dailyNow) { this.dailyNow = false; if (plan && dc) this.playDaily(plan); }
    // no name yet: rounds stay on this device, so say so where every visit starts (developer, 2026-10-20)
    if (!hasName() && !app.settings.hideFromBoards) add('set your name for the leaderboard', () => editName(this, () => this.rebuild()), true, COLORS.yellow);
    add2('my golf', () => this.scene.start('mygolf'));
    add2('practice', () => void this.withLoading((progress) => startPractice(this, progress)));
    add2('leaderboard', () => this.scene.start('leaderboard'));
    add2('settings', () => this.scene.start('settings', { from: 'title' }));
    // a long menu (a round to continue, the daily, the name) on a short screen: everything moves up to clear the footer
    const over = bottom - (H - 19);
    if (over > 0) {
      const lift = Math.min(over, Math.max(0, top - 20));
      for (const o of this.root.list as unknown as { y: number }[]) o.y -= lift;
    }
    if (update.ready) {
      // a new version of the game has arrived (offline copy): one tap to start it
      this.root.add(new Button(this, W - 112, 4, 108, 15, 'update - tap to reload', () => update.apply()));
    }
    this.root.add(new Panel(this, 4, H - 16, W - 8, 12, 0.55));
    this.root.add(txt(this, cx, H - 15, 'map data © openstreetmap contributors · credits in settings', { origin: [0.5, 0], color: COLORS.dim }));
  }
}

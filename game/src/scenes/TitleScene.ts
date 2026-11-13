// Title menu over a rotating set of course views (sprites/title/<id>.png,
// rendered from each course's own art by assets-src/course_cards.py): each
// drifts slowly, then cross-fades to the next. The trophy logo sits beside
// the game name. Falls back to the course fly-over (BgScene) without them.

import Phaser from 'phaser';
import { app, GAME_NAME } from '../app';
import { courseCountText } from '../data/registry';
import { initAudio, setVolume } from '../audio/sfx';
import { peekSnapshot } from '../save/snapshot';
import { Button, COLORS, onTap, Panel, setTxt, txt } from '../ui/widgets';
import { confirmDiscard, editName, hasName, resumeRound, snapshotHole, startPractice, startRound, startTour, useCourse, useCourseQuietly, withName } from './flow';
import { TourPlan, tourName, tourPlan } from '../systems/game/tour';
import { DailyPlan, dailyPlan, localDay } from '../systems/game/daily';
import { DAILY_PICKS, DAILY_ROSTER } from '../data/dailyRoster';
import { shortName } from '../save/milestones';
import { update, whenUpdateReady } from '../save/offline';
import { LoadSuperseded } from '../data/courses';
import { STALL_MS } from './CourseSelectScene';
import { ensureBg, MenuScene } from './menu';
import { liveMatchesAvailable, myMatches } from '../match/live';
import { lobby, startLobby } from '../match/challenge';
import { allPostsDialog, courseLabel, installChallengePopups, myPostDialog, openToChallenge, postDialog } from '../ui/challengeUi';
import { minutesLeft } from '../systems/match/lobby';

const SHOW_MS = 9000;   // each course on screen
const FADE_MS = 1400;   // cross-fade
const SHADE = 0.32;     // darkened a little so the menu reads

let order: string[] | null = null; // course views, shuffled once per visit to the site
/** Live matches on this site (null: not asked yet). */
let matchesUp: boolean | null = null;
let at = 0;

/** A row of the title's menu: its top and bottom, and how far right it reaches. */
interface Row { top: number; bottom: number; right: number }

interface Shown { img: Phaser.GameObjects.Image; t: number; fromX: number; fromY: number; toX: number; toY: number }

/**
 * The title's footer, in turn every few seconds: the map credit (OpenStreetMap's licence asks for
 * it; the full credits are in settings) and tips. Each has a shorter form for a narrow phone.
 */
const FOOTER: [string, string][] = [
  ['map data © openstreetmap contributors · credits in settings', 'map data © openstreetmap contributors'],
  ['played under two names? settings > merge names puts your rounds under one', 'two names? settings > merge names'],
  ["another device? settings > player code > use another, with this device's code", 'another device? use this player code there'],
  ['stats, your course passport and milestones are in my golf', 'stats and milestones: my golf'],
];
const FOOTER_MS = 6000;

/** A line cut to `w` pixels, ending '..' where it was cut. */
function fit(t: Phaser.GameObjects.BitmapText, w: number, s: string): Phaser.GameObjects.BitmapText {
  if (t.width <= w) return t;
  let n = s.length;
  while (n > 1 && t.width > w) setTxt(t, `${s.slice(0, --n).trimEnd()}..`);
  return t;
}
/** where the footer is in its turn (carries on when the title is shown again; the credit comes first on a fresh start) */
let footerAt = 0;

export class TitleScene extends MenuScene {
  private shown: Shown[] = [];
  private shade: Phaser.GameObjects.Rectangle | null = null;
  private resuming = false;
  /** the day the daily buttons were drawn for, and when that was last checked */
  private builtDay = '';
  private dayCheck = 0;
  /** Opened to start today's daily round (the leaderboard's "play today's round"). */
  private dailyNow = false;
  /** Opened to start today's par 3s / 4s / 5s (the leaderboard's "play today's round" there). */
  private tourNow = false;

  constructor() {
    super('title');
  }

  init(data?: { daily?: boolean; tour?: boolean }) {
    this.dailyNow = !!data?.daily;
    this.tourNow = !!data?.tour;
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
    // one clock for the footer whatever the menu's builds (a build's own timer outlived it: tips were skipped)
    this.footer = null;
    this.time.addEvent({ delay: FOOTER_MS, loop: true, callback: () => { footerAt++; this.showFooter(); } });
    // who is looking for a match (open to a challenge): the menu shows it, and changes with it
    const off = lobby.onChange(() => this.lobbyChanged());
    this.events.once('shutdown', off);
    this.time.addEvent({ delay: 20_000, loop: true, callback: () => this.lobbyChanged() }); // the minutes left
    super.create();
  }

  /**
   * The lobby never moves the menu (developer, 2026-10-22: buttons coming and going whenever someone
   * wants a match throws people off): "open to a challenge" changes its own label in place, and the
   * others looking for a match are listed in a box to the side (below the menu on a narrow screen).
   */
  private chButton: Button | null = null;
  private lobbyBox: Phaser.GameObjects.Container | null = null;
  /** The menu's rows (set by each build: where the box may go), and what the box shows, as a key: redrawn only when that changes. */
  private menuRows: { rows: Row[]; top: number; floor: number } | null = null;
  private drawnLobby = '';

  private othersLooking() {
    return lobby.ready ? lobby.openPosts().filter((p) => p.id !== lobby.mine).sort((a, b) => b.at - a.at) : [];
  }

  private lobbyKey(): string {
    const t = lobby.lobbyNow();
    return this.othersLooking().map((p) => `${p.id}:${minutesLeft(p, t)}`).join('|');
  }

  private lobbyChanged() {
    if (!this.sys.isActive() || matchesUp !== true) return;
    this.setChallengeButton();
    if (this.lobbyKey() !== this.drawnLobby) this.drawLobbyBox();
  }

  /**
   * Where the box goes: beside the menu, clear of every row (the wide "play a friend" row may leave room
   * only beside the rows under it), else under the menu; the first place with room for `need`, else the
   * roomiest with at least `least`. Null: no room anywhere.
   */
  private lobbyPlace(need: number, least: number): { x: number; y: number; w: number; h: number } | null {
    const m = this.menuRows!;
    const W = app.view.w, cx = Math.round(W / 2);
    const places: { x: number; y: number; w: number; h: number }[] = [];
    const last = Math.max(m.top, ...m.rows.map((r) => r.bottom));
    for (const w of [124, 108, 92]) {
      const x = W - 6 - w;
      if (x < cx + 24) continue;
      const blocks = m.rows.filter((r) => r.right + 8 > x).sort((a, b) => a.top - b.top);
      let y = m.top;
      for (const b of blocks) {
        if (b.top - 4 > y) places.push({ x, y, w, h: b.top - 4 - y });
        y = Math.max(y, b.bottom + 4);
      }
      if (m.floor > y && y < last) places.push({ x, y, w, h: m.floor - y }); // (wholly under the menu: centred, below)
    }
    const under = last + 8;
    const uw = Math.min(W - 12, 200);
    places.push({ x: Math.round(cx - uw / 2), y: under, w: uw, h: m.floor - under });
    const fits = places.find((p) => p.h >= need);
    if (fits) return fits;
    const best = places.reduce((a, b) => (b.h > a.h ? b : a));
    return best.h >= least ? best : null;
  }

  /** No room for the box: a small tag in the top corner (tap: everyone looking). */
  private lobbyTag(n: number) {
    const W = app.view.w;
    const label = `${n} looking for a match`;
    const t = txt(this, 0, 0, label, { color: COLORS.yellow });
    const w = Math.ceil(t.width) + 10, h = 12;
    const x = W - 6 - w, y = update.ready ? 22 : 4;
    const box = this.add.container(x, y);
    t.setPosition(5, 2);
    const z = this.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    onTap(z, () => allPostsDialog(this.game));
    box.add([new Panel(this, 0, 0, w, h, 0.75), t, z]);
    this.root.add(box);
    this.lobbyBox = box;
  }

  /** "open to a challenge", or this player's own post with its minutes left. */
  private setChallengeButton() {
    const b = this.chButton;
    if (!b || !b.active) return;
    // (still open by the lobby's clock: a quiet lobby closes a post only when something next reaches it)
    const mine = lobby.mine ? lobby.openPosts().find((p) => p.id === lobby.mine) : undefined;
    const n = mine ? lobby.offers.length : 0;
    // offers to answer: they wait here once their note has gone (a tap: accept or not now, each)
    b.setLabel(!mine ? 'open to a challenge' : n ? `${n} offer${n > 1 ? 's' : ''} for you` : `looking: ${minutesLeft(mine, lobby.lobbyNow())} min`);
    b.setColor(mine ? 'orange' : 'grey');
  }

  /** The box of others looking for a match: a row each (a tap: play them, or not now), "+ N more" for the rest. */
  private drawLobbyBox() {
    this.lobbyBox?.destroy(true);
    this.lobbyBox = null;
    const posts = this.othersLooking();
    this.drawnLobby = this.lobbyKey();
    if (!this.menuRows || !posts.length) return;
    const pad = 4, headH = 12, rowH = 21, moreH = 12;
    const a = this.lobbyPlace(pad * 2 + headH + posts.length * rowH, pad * 2 + headH + moreH);
    if (!a) { this.lobbyTag(posts.length); return; }
    const fitRows = Math.floor((a.h - pad * 2 - headH) / rowH);
    const shown = posts.length <= fitRows ? posts.length : Math.max(0, Math.floor((a.h - pad * 2 - headH - moreH) / rowH));
    const more = posts.length - shown;
    const h = pad * 2 + headH + shown * rowH + (more ? moreH : 0);
    const box = this.add.container(a.x, a.y);
    box.add(new Panel(this, 0, 0, a.w, h, 0.75));
    const t = lobby.lobbyNow();
    const iw = a.w - pad * 2 - 4;
    box.add(fit(txt(this, pad + 2, pad, 'looking for a match', { color: COLORS.dim }), iw, 'looking for a match'));
    const row = (y: number, rh: number, go: () => void) => {
      const hi = this.add.rectangle(pad, y, a.w - pad * 2, rh, 0xffffff, 0).setOrigin(0, 0);
      const z = this.add.zone(0, y - 1, a.w, rh + 2).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => hi.setFillStyle(0xffffff, 0.1));
      z.on('pointerout', () => hi.setFillStyle(0xffffff, 0));
      onTap(z, go);
      box.add([hi, z]);
    };
    let y = pad + headH;
    for (const p of posts.slice(0, shown)) {
      row(y, rowH - 1, () => postDialog(this.game, p));
      const mins = txt(this, a.w - pad - 2, y + 1, `${minutesLeft(p, t)} min`, { origin: [1, 0], color: COLORS.dim });
      box.add([fit(txt(this, pad + 2, y + 1, p.by, { color: COLORS.yellow }), iw - mins.width - 6, p.by), mins]);
      const course = courseLabel(p.course);
      box.add(fit(txt(this, pad + 2, y + 10, course), iw, course));
      y += rowH;
    }
    if (more) {
      row(y, moreH - 1, () => allPostsDialog(this.game));
      const line = shown ? `+ ${more} more` : `${more} looking - tap to see`;
      box.add(fit(txt(this, pad + 2, y + 1, line), iw, line));
    }
    this.root.add(box);
    this.lobbyBox = box;
  }

  /** The footer's text object of the menu on screen (null between builds). */
  private footer: Phaser.GameObjects.BitmapText | null = null;

  /** The footer's line in turn, its short form when the long one doesn't fit. */
  private showFooter() {
    const foot = this.footer;
    if (!foot || !foot.scene) return; // (destroyed with its build)
    const [long, short] = FOOTER[footerAt % FOOTER.length];
    setTxt(foot, long);
    if (foot.width > app.view.w - 14) setTxt(foot, short);
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
    // a new day while the title is open: the daily buttons are today's
    this.dayCheck += dt;
    if (this.dayCheck > 20_000) {
      this.dayCheck = 0;
      if (this.builtDay && localDay() !== this.builtDay && !this.resuming) this.rebuild();
      this.setChallengeButton(); // its minutes left, and gone when its time is up
    }
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
    let W = app.view.w, H = app.view.h, cx = Math.round(W / 2);
    // its own layer over the menu: a window resized or a phone turned while it loads draws the menu
    // again underneath (in the menu's own layer the cover was wiped and the menu was live mid-load)
    const cover = this.add.container(0, 0).setDepth(500);
    const dim = this.add.rectangle(0, 0, W, H, 0x081018, 0.7).setOrigin(0, 0).setInteractive();
    const msg = txt(this, cx, H / 2 - 4, 'loading course...', { origin: [0.5, 0], scale: 2, color: COLORS.yellow });
    cover.add([dim, msg]);
    const extras: { x: number; y: number }[] = [];
    const place = () => {
      const dx = Math.round(app.view.w / 2) - cx, dy = Math.round(app.view.h / 2) - Math.round(H / 2);
      W = app.view.w; H = app.view.h; cx = Math.round(W / 2);
      dim.setSize(W, H);
      (dim.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setSize(W, H);
      msg.setPosition(cx, Math.round(H / 2 - 4));
      for (const o of extras) { o.x += dx; o.y += dy; }
    };
    this.scale.on('resize', place);
    const uncover = () => { this.scale.off('resize', place); if (cover.active) cover.destroy(); };
    this.events.once('shutdown', uncover);
    let ok = false;
    let last = Date.now();
    let offered = false;
    const watch = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (offered || Date.now() - last < STALL_MS || !msg.active) return;
        offered = true; // stalled: offer what a player did by hand, a reload that opens the round
        const t = txt(this, cx, H / 2 + 14, 'this is taking a while - the connection may have stalled', { origin: [0.5, 0], color: COLORS.dim, maxWidth: W - 16 });
        const b = new Button(this, cx - 40, H / 2 + 28, 80, 16, 'reload', () => window.location.reload());
        cover.add([t, b]);
        extras.push(t, b);
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
    if (!ok) { this.events.off('shutdown', uncover); uncover(); this.rebuild(); }
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

  /** Today's par 3s / 4s / 5s: like the daily round, on the first hole's course. */
  private playTour(plan: TourPlan) {
    void confirmDiscard(this, this.root, () => withName(this, () => void this.withLoading(async (progress) => {
      await useCourseQuietly(this, plan.holes[0].course, progress);
      startTour(this, plan);
      return true;
    })));
  }

  async build() {
    const g = this.gen;
    // the last build's lobby parts are gone with it (root emptied): nothing draws into them meanwhile
    this.chButton = null;
    this.lobbyBox?.destroy(true);
    this.lobbyBox = null;
    this.menuRows = null;
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
    const sub = courseCountText(app.courses);
    let small = W < 330; // a phone: the course count at 1x, and everything under it moves up by the line it saves
    const count = txt(this, cx, top + 46 + dy, sub, { origin: [0.5, 0], scale: small ? 1 : 2, color: COLORS.yellow });
    if (!small && count.width > W - 16) { count.setScale(1); small = true; } // "... and europe" on a narrow screen
    this.root.add(count);
    if (small) dy -= 9;
    this.root.add(txt(this, cx, top + 66 + dy, 'real courses, rebuilt from map and lidar data', { origin: [0.5, 0], color: COLORS.dim }));
    const snap = await peekSnapshot();
    // built again meanwhile (a phone turning, an update): that build draws the menu, not this one (two menus,
    // and two footers turning at once, skipped every other tip)
    if (!this.isCurrentBuild(g)) return;
    const bw = 124, bh = 17, gap = 21;
    let y = top + 84 + dy;
    const menuTop = y;
    let bottom = y;
    const rows: Row[] = []; // where the menu is (the lobby's box goes beside it)
    const add = (label: string, cb: () => void, grey = false, textColor?: number) => {
      // wide enough for its label (a long daily course name ran out of the button)
      const probe = txt(this, 0, 0, label);
      const w = Math.min(W - 8, Math.max(bw, Math.ceil(probe.width) + 12));
      probe.destroy();
      this.root.add(new Button(this, Math.round(cx - w / 2), y, w, bh, label, cb, { color: grey ? 'grey' : 'orange', textColor }));
      rows.push({ top: y, bottom: y + bh, right: Math.round(cx - w / 2) + w });
      bottom = y + bh;
      y += gap;
    };
    // the rest two to a row (the list no longer fits a 270-texel-high screen one under another)
    const sw = 80, sgap = 4;
    let col = 0;
    const add2 = (label: string, cb: () => void) => {
      this.root.add(new Button(this, cx - sw - sgap / 2 + col * (sw + sgap), y, sw, bh - 1, label, cb, { color: 'grey' }));
      if (!col) rows.push({ top: y, bottom: y + bh - 1, right: cx + sw + sgap / 2 });
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
    // the day's par 3s, 4s or 5s: nine holes of one par from all the courses (developer, 2026-10-27)
    const tp = tourPlan(localDay(), app.courses, DAILY_ROSTER);
    const dailies: [string, () => void][] = [];
    // (a title left open past midnight: the button is for the day it was drawn on, so it is drawn again
    // for today rather than starting yesterday's round)
    this.builtDay = localDay();
    const stale = () => { if (localDay() === this.builtDay) return false; this.rebuild(); return true; };
    if (plan && dc) dailies.push([`daily: ${shortName(dc.name)}`, () => { if (!stale()) this.playDaily(plan); }]);
    if (tp) dailies.push([`daily: ${tourName(tp.courseId)}`, () => { if (!stale()) this.playTour(tp); }]);
    // the two dailies side by side (developer, 2026-10-27), one under the other on a screen too narrow for both
    const dgap = 4;
    const dws = dailies.map(([label]) => {
      const probe = txt(this, 0, 0, label);
      const w = Math.max(bw, Math.ceil(probe.width) + 12);
      probe.destroy();
      return w;
    });
    const rowW = dws.reduce((a, b) => a + b, 0) + dgap * (dws.length - 1);
    if (dailies.length === 2 && rowW <= W - 8) {
      let x = Math.round(cx - rowW / 2);
      dailies.forEach(([label, go], i) => {
        this.root.add(new Button(this, x, y, dws[i], bh, label, go, { color: snap ? 'grey' : 'orange' }));
        x += dws[i] + dgap;
      });
      rows.push({ top: y, bottom: y + bh, right: Math.round(cx - rowW / 2) + rowW });
      bottom = y + bh;
      y += gap;
    } else {
      for (const [label, go] of dailies) add(label, go, !!snap);
    }
    if (this.dailyNow) { this.dailyNow = false; if (plan && dc) this.playDaily(plan); }
    if (this.tourNow) { this.tourNow = false; if (tp) this.playTour(tp); }
    // live match play against a friend, where the site has it (the match Worker bound): matches on this device first
    if (matchesUp === true) {
      void startLobby();
      installChallengePopups(this.game);
      const open = myMatches().filter((m) => !m.done).length;
      const friend = open ? `your matches (${open})` : 'play a friend';
      // next to it: open to a challenge (developer, 2026-10-22), or this player's own post (its label changes in place)
      const chGo = () => (lobby.mine ? myPostDialog(this, () => this.lobbyChanged()) : openToChallenge(this, () => this.lobbyChanged()));
      const pw2 = 124, gap2 = 4;
      if (W >= pw2 * 2 + gap2 + 8) {
        this.root.add(new Button(this, Math.round(cx - pw2 - gap2 / 2), y, pw2, bh, friend, () => this.scene.start('match', { mode: 'home' }), { color: open ? 'orange' : 'grey' }));
        this.chButton = new Button(this, Math.round(cx + gap2 / 2), y, pw2, bh, 'open to a challenge', chGo, { color: 'grey' });
        this.root.add(this.chButton);
        rows.push({ top: y, bottom: y + bh, right: Math.round(cx + gap2 / 2) + pw2 });
        bottom = y + bh;
        y += gap;
      } else {
        add(friend, () => this.scene.start('match', { mode: 'home' }), !open);
        add('open to a challenge', chGo, true);
        this.chButton = this.root.list[this.root.list.length - 1] as Button;
      }
      this.setChallengeButton();
    } else if (matchesUp === null) {
      matchesUp = false;
      void liveMatchesAvailable().then((ok) => { matchesUp = ok; if (ok && this.sys.isActive()) this.rebuild(); });
    }
    // no name yet: rounds stay on this device, so say so where every visit starts (developer, 2026-10-20)
    if (!hasName() && !app.settings.hideFromBoards) add('set your name for the leaderboard', () => editName(this, () => this.rebuild()), true, COLORS.yellow);
    add2('my golf', () => this.scene.start('mygolf'));
    add2('practice', () => void this.withLoading((progress) => startPractice(this, progress)));
    add2('leaderboard', () => this.scene.start('leaderboard'));
    add2('settings', () => this.scene.start('settings', { from: 'title' }));
    // a long menu (a round to continue, the daily, the name) on a short screen: everything moves up to clear the footer
    const over = bottom - (H - 19);
    let lift = 0;
    if (over > 0) {
      lift = Math.min(over, Math.max(0, top - 20));
      // still too long (big pixels on a laptop, with a round to continue, a name to set and a match
      // button): the menu comes first, so everything goes up until its last row is on the screen, and
      // whatever of the heading that pushes off the top is left out rather than cut in half
      const more = Math.min(over - lift, Math.max(0, menuTop - lift - 2));
      lift += more;
      for (const o of this.root.list as unknown as { y: number; setVisible?: (v: boolean) => unknown }[]) {
        o.y -= lift;
        if (more > 0 && o.y < 0) o.setVisible?.(false);
      }
    }
    if (matchesUp === true) {
      // the box of others looking for a match: beside the menu where there's room, else under it (lobbyPlace)
      this.menuRows = { rows: rows.map((r) => ({ ...r, top: r.top - lift, bottom: r.bottom - lift })), top: menuTop - lift, floor: H - 21 };
      this.drawLobbyBox();
    }
    if (update.ready) {
      // a new version of the game has arrived (offline copy): one tap to start it
      this.root.add(new Button(this, W - 112, 4, 108, 15, 'update - tap to reload', () => update.apply()));
    }
    this.root.add(new Panel(this, 4, H - 16, W - 8, 12, 0.55));
    // the footer: the map credit, and tips in turn (developer, 2026-10-21: how to merge scores under two names)
    this.footer = txt(this, cx, H - 15, '', { origin: [0.5, 0], color: COLORS.dim });
    this.root.add(this.footer);
    this.showFooter();
  }
}

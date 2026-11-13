// Choosing a course: first a state (one button per state that has courses),
// then that state's courses as cards - a close crop of the course's own art
// around a signature green (sprites/cards/<id>.png, assets-src/course_cards.py)
// with the course's logo (sprites/logos/<id>.png, assets-src/logos.py).
// Several courses at one place (index.json `group`, e.g. East Potomac Blue /
// White / Red) show as one card for the place; it opens the place's courses.
// Used before a new round (purpose 'play': loads the course, then the
// new-round screen) and by the leaderboard (purpose 'board': just picks).

import Phaser from 'phaser';
import { app } from '../app';
import { courseEntries, coursesByState, CourseInfo, nameInGroup, stateOf, PROVINCES } from '../data/registry';
import { Button, COLORS, fitHeading, onTap, Panel, setTxt, txt } from '../ui/widgets';
import { useCourse } from './flow';
import { LoadSuperseded } from '../data/courses';

/** No progress for this long while a course loads: offer a reload (which then opens the course). */
export const STALL_MS = 20_000;
/** Width of one green in a card strip (assets-src/course_cards.py CARD_W), and how long each shows. */
const CARD_FRAME_W = 208;
const FLIP_MS = 15_000; // each card changes every 30 s, neighbours 15 s apart (developer, 2026-10-20: 3 s was too quick)
export const OPEN_COURSE_KEY = 'golf:open-course';

/** Reload the page and open this course straight away (what a player did by hand when a load hung). */
function reloadInto(id: string) {
  try { sessionStorage.setItem(OPEN_COURSE_KEY, id); } catch { /* storage blocked: the title screen then */ }
  window.location.reload();
}
import { ensureBg, MenuScene } from './menu';

type Purpose = 'play' | 'board' | 'match' | 'xc';
/** A card: a course, or a place with several courses. */
interface Tile { art: string; logos: string[]; name: string; sub: string; on: boolean; tap: () => void }
/** pick: load `courseId` at once and go on (a challenge on a set course: no choosing) */
interface Data { purpose?: Purpose; from?: string; courseId?: string; pick?: boolean }

let view: 'states' | 'courses' | 'group' = 'states';
let stateSel = '';
let groupSel = '';
let page = 0;
const tried = new Set<string>(); // card / logo textures already requested (missing files aren't retried)

export class CourseSelectScene extends MenuScene {
  private purpose: Purpose = 'play';
  private from = 'title';
  private current = '';
  private busy = false;
  private stalled = false;
  private loadFrac = 0;
  private loadTxt: Phaser.GameObjects.BitmapText | null = null;
  private loadError = '';

  private showLoad() {
    if (this.loadTxt?.active) setTxt(this.loadTxt, `${Math.round(this.loadFrac * 100)}%`);
  }
  /** Fills for card art and logos still loading (run when they arrive; reset on every build). */
  private waiting: (() => void)[] = [];
  /** The cards' greens take turns (sprites/cards/<id>.png is a strip of CARD_FRAME_W frames). */
  private flips: (() => void)[] = [];
  private flipTick = 0;
  private flipTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('courses');
  }

  /** a course to load at once (Data.pick) */
  private autoPick: string | null = null;

  create(data?: unknown) {
    super.create(data);
    const id = this.autoPick;
    this.autoPick = null;
    if (id && app.courses.some((c) => c.id === id)) void this.choose(id);
  }

  init(data: Data) {
    this.autoPick = data.pick && data.courseId ? data.courseId : null;
    this.purpose = data.purpose ?? 'play';
    this.from = data.from ?? (this.purpose === 'board' ? 'leaderboard' : 'title');
    this.current = data.courseId ?? app.course?.json.id ?? '';
    const cur = app.courses.find((c) => c.id === this.current);
    // open on the current course's state, at the state buttons
    stateSel = cur ? stateOf(cur) : '';
    groupSel = cur?.group ?? '';
    view = 'states';
    page = 0;
    this.busy = false;
    this.loadError = '';
  }

  protected back() {
    if (this.busy) return;
    // a failed load left no course: start the page again on the last course that loaded
    if (!app.course) { window.location.reload(); return; }
    if (view === 'group') { view = 'courses'; page = 0; this.rebuild(); return; }
    if (view === 'courses') { view = 'states'; page = 0; this.rebuild(); return; }
    if (this.from === 'leaderboard') this.scene.start('leaderboard', { courseId: this.current });
    else this.scene.start(this.from);
  }

  build() {
    this.waiting = [];
    this.flips = [];
    this.flipTimer?.remove();
    this.flipTimer = this.time.addEvent({ delay: FLIP_MS, loop: true, callback: () => { this.flipTick++; for (const f of this.flips) f(); } });
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(470, W - 8), ph = H - 8;
    const x0 = Math.round((W - pw) / 2), y0 = 4;
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    const groups = coursesByState(app.courses);
    if (view !== 'states' && !groups.some((g) => g.code === stateSel)) view = 'states';
    const state = groups.find((g) => g.code === stateSel);
    const group = view === 'group' && state ? courseEntries(state.courses).find((e) => e.kind === 'group' && e.id === groupSel) : undefined;
    if (view === 'group' && (!group || group.kind !== 'group')) view = 'courses';
    if (view === 'states') this.buildStates(groups, x0, y0, pw, ph);
    else if (view === 'courses') this.buildCourses(state!, x0, y0, pw, ph);
    else if (group && group.kind === 'group') this.buildGroup(group, x0, y0, pw, ph);
    if (this.loadError && !this.busy) {
      this.root.add(txt(this, W / 2, y0 + ph - 34, this.loadError, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: pw - 16 }));
    }
    if (this.busy) {
      this.root.add(this.add.rectangle(x0, y0, pw, ph, 0x081018, 0.7).setOrigin(0, 0));
      this.root.add(txt(this, W / 2, H / 2 - 14, 'loading course...', { origin: [0.5, 0], scale: 2, color: COLORS.yellow }));
      // how far it has got, and a way out if it stops moving (developer: first loads froze)
      this.loadTxt = txt(this, W / 2, H / 2 + 6, '', { origin: [0.5, 0] });
      this.root.add(this.loadTxt);
      this.showLoad();
      if (this.stalled) {
        this.root.add(txt(this, W / 2, H / 2 + 20, 'this is taking a while - the connection may have stalled', { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }));
        this.root.add(new Button(this, W / 2 - 40, H / 2 + 34, 80, 16, 'reload', () => reloadInto(this.current)));
      }
    }
  }

  // ---------------------------------------------------------------- states
  private buildStates(groups: ReturnType<typeof coursesByState>, x0: number, y0: number, pw: number, ph: number) {
    const head = txt(this, x0 + pw / 2, y0 + 6, `${this.purpose === 'board' ? 'leaderboard: ' : ''}choose a ${groups.some((g) => PROVINCES.has(g.code)) ? 'state or province' : 'state'}`, { origin: [0.5, 0], scale: 2 });
    if (head.width > pw - 8) head.setScale(1).setY(y0 + 10); // a narrow phone
    this.root.add(head);
    const gap = 6;
    const cols = pw >= 380 ? 4 : pw >= 280 ? 3 : 2;
    const bw = Math.floor((pw - 16 - (cols - 1) * gap) / cols);
    const bh = 40;
    const top = y0 + 32;
    const perPage = cols * Math.max(1, Math.floor((ph - 32 - 30) / (bh + gap)));
    const pages = Math.max(1, Math.ceil(groups.length / perPage));
    page = Math.min(page, pages - 1);
    groups.slice(page * perPage, (page + 1) * perPage).forEach((g, k) => {
      const bx = x0 + 8 + (k % cols) * (bw + gap), by = top + Math.floor(k / cols) * (bh + gap);
      const on = g.code === stateSel;
      this.root.add(new Button(this, bx, by, bw, bh, '', () => { stateSel = g.code; view = 'courses'; page = 0; this.rebuild(); }, { color: on ? 'orange' : 'grey' }));
      // full name when it fits, else the postal code
      const name = txt(this, bx + bw / 2, by + 8, g.name, { origin: [0.5, 0] });
      if (name.width > bw - 8) setTxt(name, g.code);
      this.root.add(name);
      this.root.add(txt(this, bx + bw / 2, by + 21, `${g.courses.length} ${g.courses.length === 1 ? 'course' : 'courses'}`, { origin: [0.5, 0], color: on ? COLORS.white : COLORS.dim }));
    });
    this.footer(x0, y0, pw, ph, pages);
  }

  // --------------------------------------------------------------- courses
  private buildCourses(g: ReturnType<typeof coursesByState>[number], x0: number, y0: number, pw: number, ph: number) {
    this.root.add(txt(this, x0 + pw / 2, y0 + 6, g.name, { origin: [0.5, 0], scale: 2 }));
    const tiles: Tile[] = courseEntries(g.courses).map((e) => {
      if (e.kind === 'course') return this.courseTile(e.course, `${e.course.location.split(',')[0].trim()} · ${e.course.holes} holes · par ${e.course.par}`);
      const first = e.courses[0];
      return {
        art: first.id, logos: [e.id, ...e.courses.map((c) => c.id)], name: e.name,
        sub: `${first.location.split(',')[0].trim()} · ${e.courses.length} courses`,
        on: e.courses.some((c) => c.id === this.current),
        tap: () => { groupSel = e.id; view = 'group'; page = 0; this.rebuild(); },
      };
    });
    this.grid(tiles, x0, y0, pw, ph);
  }

  /** The courses of one place (East Potomac: Blue, White, Red). */
  private buildGroup(g: { id: string; name: string; courses: CourseInfo[] }, x0: number, y0: number, pw: number, ph: number) {
    this.root.add(fitHeading(txt(this, x0 + pw / 2, y0 + 6, g.name, { origin: [0.5, 0] }), pw - 16));
    this.grid(g.courses.map((c) => ({ ...this.courseTile(c, `${c.holes} holes · par ${c.par} · ${c.totalYd} yd`), name: nameInGroup(c.name, g.name, c.keepName) })), x0, y0, pw, ph);
  }

  private courseTile(c: CourseInfo, sub: string): Tile {
    return { art: c.id, logos: c.group ? [c.id, c.group] : [c.id], name: c.name, sub, on: c.id === this.current, tap: () => void this.choose(c.id) };
  }

  private grid(tiles: Tile[], x0: number, y0: number, pw: number, ph: number) {
    this.requestArt(tiles);
    const gap = 8;
    const cols = pw >= 400 ? 3 : 2;
    const cw = Math.min(208, Math.floor((pw - 16 - (cols - 1) * gap) / cols));
    // at least two rows when the panel allows (a wide 270-texel screen showed one row of three)
    const ch = Math.max(72, Math.min(128, Math.round(cw * 0.66), Math.floor((ph - 60 - gap) / 2)));
    const top = y0 + 30;
    const rows = Math.max(1, Math.floor((ph - 30 - 30 + gap) / (ch + gap)));
    const perPage = cols * rows;
    const pages = Math.max(1, Math.ceil(tiles.length / perPage));
    page = Math.min(page, pages - 1);
    const shown = tiles.slice(page * perPage, (page + 1) * perPage);
    const used = Math.min(cols, shown.length);
    const left = x0 + Math.round((pw - (used * cw + (used - 1) * gap)) / 2); // centre a short row
    shown.forEach((t, k) => this.card(t, left + (k % cols) * (cw + gap), top + Math.floor(k / cols) * (ch + gap), cw, ch));
    this.footer(x0, y0, pw, ph, pages);
  }

  private card(t: Tile, x: number, y: number, w: number, h: number) {
    const g = this.add.graphics();
    g.fillStyle(0x0b1116, 1).fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(t.on ? COLORS.orange : 0x394049, 1).fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(0x1d2a22, 1).fillRect(x, y, w, h);
    this.root.add(g);
    // the card art goes in its own layer, filled now or when it has loaded: the
    // card is never rebuilt under the player's finger (a tap would be lost)
    const ck = `card_${t.art}`;
    const art = this.add.container(0, 0);
    this.root.add(art);
    const slot = this.flips.length; // cards change at different moments
    const fillArt = () => {
      if (!art.active || !this.textures.exists(ck)) return;
      const src = this.textures.get(ck).getSourceImage() as HTMLImageElement;
      // a strip of greens, one frame at a time (an older single picture is one frame)
      const n = src.width >= CARD_FRAME_W * 1.5 ? Math.max(1, Math.round(src.width / CARD_FRAME_W)) : 1;
      const fw = n > 1 ? CARD_FRAME_W : src.width;
      const k = n > 1 ? Math.floor((this.flipTick + (slot % 2)) / 2) % n : 0; // every 2 ticks, neighbours in turn
      // the middle of the frame (the green sits there), one art pixel per texel
      const cx = k * fw + Math.max(0, Math.round((fw - w) / 2)), cy = Math.max(0, Math.round((src.height - h) / 2) - 6);
      art.removeAll(true);
      art.add(this.add.image(x - cx, y - cy, ck).setOrigin(0, 0).setCrop(cx, cy, Math.min(w, fw), Math.min(h, src.height)));
    };
    this.flips.push(fillArt);
    if (this.textures.exists(ck)) fillArt(); else this.waiting.push(fillArt);
    // name strip
    const strip = 22;
    this.root.add(this.add.rectangle(x, y + h - strip, w, strip, 0x0b1116, 0.78).setOrigin(0, 0));
    // one line: the full name if it fits, else without "country club" / "golf course", else cut short
    const name = txt(this, x + 4, y + h - strip + 2, t.name);
    const fit = (s: string) => { setTxt(name, s); return name.width <= w - 8; };
    if (!fit(t.name)) {
      const short = t.name.replace(/\s+(country|golf|links)?\s*club$/i, '').replace(/\s+golf\s+(course|links)$/i, '');
      if (!fit(short)) {
        let s = short;
        while (s.length > 3 && !fit(`${s}...`)) s = s.slice(0, -1).trimEnd();
        fit(`${s}...`);
      }
    }
    this.root.add(name);
    // one line, inside the strip (University Place ran onto a second line, out of the card):
    // the whole line, else without the town, else cut short
    const sub = txt(this, x + 4, y + h - strip + 12, t.sub, { color: COLORS.dim });
    const fitSub = (s: string) => { setTxt(sub, s); return sub.width <= w - 8; };
    if (!fitSub(t.sub)) {
      const parts = t.sub.split(' · ');
      if (parts.length < 2 || !fitSub(parts.slice(1).join(' · '))) {
        let s = parts.length < 2 ? t.sub : parts.slice(1).join(' · ');
        while (s.length > 3 && !fitSub(`${s}...`)) s = s.slice(0, -1).trimEnd();
        fitSub(`${s}...`);
      }
    }
    this.root.add(sub);
    // logo (the first of t.logos that exists, e.g. the course's own, else its place's), or a lettered badge
    const logo = this.add.container(0, 0);
    this.root.add(logo);
    const fillLogo = () => {
      if (!logo.active) return;
      logo.removeAll(true);
      const k = t.logos.map((id) => `logo_${id}`).find((key) => this.textures.exists(key));
      if (k) logo.add(this.add.image(x + 3, y + 3, k).setOrigin(0, 0));
      else this.badge(logo, t.name, x + 3, y + 3);
    };
    fillLogo();
    if (!this.textures.exists(`logo_${t.logos[0]}`)) this.waiting.push(fillLogo);
    // the whole card is the button
    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    onTap(zone, t.tap);
    this.root.add(zone);
  }

  /** A lettered badge for a course without a logo yet. */
  private badge(into: Phaser.GameObjects.Container, name: string, x: number, y: number) {
    const initials = name.split(/\s+/).filter((w) => /^[a-z]/i.test(w) && !/^(of|the|and|at)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('');
    const g = this.add.graphics();
    g.fillStyle(0x0d1620, 0.85).fillCircle(x + 12, y + 12, 12);
    g.fillStyle(COLORS.white, 1).fillCircle(x + 12, y + 12, 10);
    g.fillStyle(0x2f6f4a, 1).fillCircle(x + 12, y + 12, 9);
    into.add(g);
    into.add(txt(this, x + 12, y + 8, initials, { origin: [0.5, 0] }));
  }

  /** Load the cards and logos of these tiles (once), then put them into the cards on screen. */
  private requestArt(tiles: Tile[]) {
    let n = 0;
    const want: [string, string][] = [];
    for (const t of tiles) {
      want.push([`card_${t.art}`, `sprites/cards/${t.art}.png`]);
      for (const id of t.logos) want.push([`logo_${id}`, `sprites/logos/${id}.png`]);
    }
    for (const [key, file] of want) {
      if (tried.has(key) || this.textures.exists(key)) continue;
      tried.add(key);
      this.load.image(key, file);
      n++;
    }
    if (!n) return;
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (!this.sys.isActive()) return;
      const fills = this.waiting;
      this.waiting = [];
      for (const f of fills) f();
    });
    this.load.start();
  }

  private footer(x0: number, y0: number, pw: number, ph: number, pages: number) {
    const by = y0 + ph - 20;
    this.root.add(new Button(this, x0 + 6, by, 60, 15, view === 'courses' ? 'states' : 'back', () => this.back(), { color: 'grey' }));
    if (pages > 1) {
      const cx = x0 + pw / 2;
      this.root.add(new Button(this, cx - 40, by, 18, 15, '', () => { page = Math.max(0, page - 1); this.rebuild(); }, { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, cx, by + 3, `${page + 1}/${pages}`, { origin: [0.5, 0] }));
      this.root.add(new Button(this, cx + 22, by, 18, 15, '', () => { page = Math.min(pages - 1, page + 1); this.rebuild(); }, { icon: 'arrow_right', color: 'grey' }));
    }
  }

  private async choose(id: string) {
    if (this.busy) return;
    this.loadError = '';
    if (this.purpose === 'board') { this.scene.start('leaderboard', { courseId: id }); return; }
    if (this.purpose === 'xc') { this.scene.start('bonus', { courseId: id }); return; } // bonus mode loads it when played
    this.current = id;
    if (app.course?.json.id === id) { this.scene.start('setup', { match: this.purpose === 'match' }); return; }
    this.busy = true;
    this.stalled = false;
    this.loadFrac = 0;
    this.rebuild();
    let last = Date.now();
    const watch = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (!this.stalled && Date.now() - last > STALL_MS) { this.stalled = true; this.rebuild(); }
      },
    });
    try {
      await useCourse(this, id, (f) => { last = Date.now(); this.loadFrac = f; this.showLoad(); });
    } catch (e) {
      watch.remove();
      if (e instanceof LoadSuperseded) return;
      console.error(e);
      this.busy = false;
      this.loadError = `couldn't load the course: ${(e as Error).message}`.slice(0, 120);
      if (this.sys.isActive()) this.rebuild();
      return;
    }
    watch.remove();
    this.busy = false;
    if (!this.sys.isActive()) return;
    ensureBg(this);
    this.scene.start('setup', { match: this.purpose === 'match' });
  }
}

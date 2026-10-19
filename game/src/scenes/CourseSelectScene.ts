// Choosing a course: first a state (one button per state that has courses),
// then that state's courses as cards - a close crop of the course's own art
// around a signature green (sprites/cards/<id>.png, assets-src/course_cards.py)
// with the course's logo (sprites/logos/<id>.png, assets-src/logos.py).
// Used before a new round (purpose 'play': loads the course, then the
// new-round screen) and by the leaderboard (purpose 'board': just picks).

import Phaser from 'phaser';
import { app } from '../app';
import { coursesByState, CourseInfo, stateOf } from '../data/registry';
import { Button, COLORS, Panel, setTxt, txt } from '../ui/widgets';
import { useCourse } from './flow';
import { ensureBg, MenuScene } from './menu';

type Purpose = 'play' | 'board';
interface Data { purpose?: Purpose; from?: string; courseId?: string }

let view: 'states' | 'courses' = 'states';
let stateSel = '';
let page = 0;
const tried = new Set<string>(); // card / logo textures already requested (missing files aren't retried)

export class CourseSelectScene extends MenuScene {
  private purpose: Purpose = 'play';
  private from = 'title';
  private current = '';
  private busy = false;

  constructor() {
    super('courses');
  }

  init(data: Data) {
    this.purpose = data.purpose ?? 'play';
    this.from = data.from ?? (this.purpose === 'board' ? 'leaderboard' : 'title');
    this.current = data.courseId ?? app.course?.json.id ?? '';
    const cur = app.courses.find((c) => c.id === this.current);
    // open on the current course's state, at the state buttons
    stateSel = cur ? stateOf(cur) : '';
    view = 'states';
    page = 0;
    this.busy = false;
  }

  protected back() {
    if (this.busy) return;
    if (view === 'courses') { view = 'states'; page = 0; this.rebuild(); return; }
    if (this.from === 'leaderboard') this.scene.start('leaderboard', { courseId: this.current });
    else this.scene.start(this.from);
  }

  build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(470, W - 8), ph = H - 8;
    const x0 = Math.round((W - pw) / 2), y0 = 4;
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    const groups = coursesByState(app.courses);
    if (view === 'courses' && !groups.some((g) => g.code === stateSel)) view = 'states';
    if (view === 'states') this.buildStates(groups, x0, y0, pw, ph);
    else this.buildCourses(groups.find((g) => g.code === stateSel)!, x0, y0, pw, ph);
    if (this.busy) {
      this.root.add(this.add.rectangle(x0, y0, pw, ph, 0x081018, 0.7).setOrigin(0, 0));
      this.root.add(txt(this, W / 2, H / 2 - 4, 'loading course...', { origin: [0.5, 0], scale: 2, color: COLORS.yellow }));
    }
  }

  // ---------------------------------------------------------------- states
  private buildStates(groups: ReturnType<typeof coursesByState>, x0: number, y0: number, pw: number, ph: number) {
    this.root.add(txt(this, x0 + pw / 2, y0 + 6, this.purpose === 'board' ? 'leaderboard: choose a state' : 'choose a state', { origin: [0.5, 0], scale: 2 }));
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
    this.requestArt(g.courses);
    const gap = 8;
    const cols = pw >= 400 ? 3 : 2;
    const cw = Math.min(208, Math.floor((pw - 16 - (cols - 1) * gap) / cols));
    const ch = Math.min(128, Math.round(cw * 0.66));
    const top = y0 + 30;
    const rows = Math.max(1, Math.floor((ph - 30 - 30 + gap) / (ch + gap)));
    const perPage = cols * rows;
    const pages = Math.max(1, Math.ceil(g.courses.length / perPage));
    page = Math.min(page, pages - 1);
    const shown = g.courses.slice(page * perPage, (page + 1) * perPage);
    const used = Math.min(cols, shown.length);
    const left = x0 + Math.round((pw - (used * cw + (used - 1) * gap)) / 2); // centre a short row
    shown.forEach((c, k) => this.card(c, left + (k % cols) * (cw + gap), top + Math.floor(k / cols) * (ch + gap), cw, ch));
    this.footer(x0, y0, pw, ph, pages);
  }

  private card(c: CourseInfo, x: number, y: number, w: number, h: number) {
    const g = this.add.graphics();
    const on = c.id === this.current;
    g.fillStyle(0x0b1116, 1).fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(on ? COLORS.orange : 0x394049, 1).fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(0x1d2a22, 1).fillRect(x, y, w, h);
    this.root.add(g);
    const ck = `card_${c.id}`;
    if (this.textures.exists(ck)) {
      const src = this.textures.get(ck).getSourceImage() as HTMLImageElement;
      // the middle of the card art (the green sits there), one art pixel per texel
      const cx = Math.max(0, Math.round((src.width - w) / 2)), cy = Math.max(0, Math.round((src.height - h) / 2) - 6);
      this.root.add(this.add.image(x - cx, y - cy, ck).setOrigin(0, 0).setCrop(cx, cy, Math.min(w, src.width), Math.min(h, src.height)));
    }
    // name strip
    const strip = 22;
    this.root.add(this.add.rectangle(x, y + h - strip, w, strip, 0x0b1116, 0.78).setOrigin(0, 0));
    // one line: the full name if it fits, else without "country club" / "golf course", else cut short
    const name = txt(this, x + 4, y + h - strip + 2, c.name);
    const fit = (t: string) => { setTxt(name, t); return name.width <= w - 8; };
    if (!fit(c.name)) {
      const short = c.name.replace(/\s+(country|golf|links)?\s*club$/i, '').replace(/\s+golf\s+(course|links)$/i, '');
      if (!fit(short)) {
        let t = short;
        while (t.length > 3 && !fit(`${t}...`)) t = t.slice(0, -1).trimEnd();
        fit(`${t}...`);
      }
    }
    this.root.add(name);
    const town = c.location.split(',')[0].trim();
    this.root.add(txt(this, x + 4, y + h - strip + 12, `${town} · ${c.holes} holes · par ${c.par}`, { color: COLORS.dim, maxWidth: w - 8 }));
    // logo (or a lettered badge) in the top-left corner
    const lk = `logo_${c.id}`;
    if (this.textures.exists(lk)) this.root.add(this.add.image(x + 3, y + 3, lk).setOrigin(0, 0));
    else this.badge(c, x + 3, y + 3);
    // the whole card is the button
    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => void this.choose(c.id));
    this.root.add(zone);
  }

  /** A lettered badge for a course without a logo yet. */
  private badge(c: CourseInfo, x: number, y: number) {
    const initials = c.name.split(/\s+/).filter((w) => /^[a-z]/i.test(w) && !/^(of|the|and|at)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('');
    const g = this.add.graphics();
    g.fillStyle(0x0d1620, 0.85).fillCircle(x + 12, y + 12, 12);
    g.fillStyle(COLORS.white, 1).fillCircle(x + 12, y + 12, 10);
    g.fillStyle(0x2f6f4a, 1).fillCircle(x + 12, y + 12, 9);
    this.root.add(g);
    this.root.add(txt(this, x + 12, y + 8, initials, { origin: [0.5, 0] }));
  }

  /** Load the cards and logos of these courses (once), then redraw. */
  private requestArt(courses: CourseInfo[]) {
    let n = 0;
    for (const c of courses) {
      for (const [key, file] of [[`card_${c.id}`, `sprites/cards/${c.id}.png`], [`logo_${c.id}`, `sprites/logos/${c.id}.png`]]) {
        if (tried.has(key) || this.textures.exists(key)) continue;
        tried.add(key);
        this.load.image(key, file);
        n++;
      }
    }
    if (!n) return;
    this.load.once(Phaser.Loader.Events.COMPLETE, () => { if (this.sys.isActive()) this.rebuild(); });
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
    if (this.purpose === 'board') { this.scene.start('leaderboard', { courseId: id }); return; }
    this.current = id;
    if (app.course?.json.id === id) { this.scene.start('setup'); return; }
    this.busy = true;
    this.rebuild();
    try {
      await useCourse(this, id);
    } catch (e) {
      console.error(e);
      this.busy = false;
      if (this.sys.isActive()) this.rebuild();
      return;
    }
    this.busy = false;
    if (!this.sys.isActive()) return;
    ensureBg(this);
    this.scene.start('setup');
  }
}

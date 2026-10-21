// "My golf" (player improvements, items 7 and 11): a player's stats over
// time, the course passport (every course card, stamped once played, with the
// best score) and the milestones earned. Built from this device's rounds and,
// with a player code, the code's rounds on the shared board.

import { app } from '../app';
import { STATES } from '../data/registry';
import type { LeaderboardEntry } from '../save/entry';
import { milestonesOf, shortName } from '../save/milestones';
import { milestoneCourses, myRounds } from '../save/mine';
import { DEFAULT_NAME } from '../save/names';
import { playerStats } from '../save/stats';
import { handicapOf, hcpCourses, indexLabel } from '../systems/game/handicap';
import { toPar } from '../systems/rules/scoring';
import { ensureImages } from '../ui/shareCard';
import { Button, COLORS, Panel, txt } from '../ui/widgets';
import { lengthLabel } from './flow';
import { MenuScene } from './menu';

let tab: 'stats' | 'passport' | 'milestones' = 'stats';
let page = 0;

export class MyGolfScene extends MenuScene {
  private rounds: LeaderboardEntry[] | null = null;
  private fromServer = false;

  constructor() {
    super('mygolf');
  }

  init() {
    this.rounds = null;
    page = 0;
  }

  async build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(470, W - 8), ph = H - 8;
    const x0 = Math.round((W - pw) / 2), y0 = 4;
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    const who = app.settings.playerName === DEFAULT_NAME ? 'this device' : app.settings.playerName;
    this.root.add(txt(this, x0 + pw / 2, y0 + 5, `my golf  ·  ${who}`, { origin: [0.5, 0], scale: 2, maxWidth: pw - 16 }));
    const items: [typeof tab, string][] = [['stats', 'stats'], ['passport', 'passport'], ['milestones', 'milestones']];
    const bw = Math.floor((pw - 16 - 4) / 3);
    items.forEach(([k, lab], i) => this.root.add(new Button(this, x0 + 8 + i * (bw + 2), y0 + 24, bw, 14, lab, () => { tab = k; page = 0; this.rebuild(); }, { color: tab === k ? 'orange' : 'grey' })));
    this.root.add(new Button(this, x0 + 6, y0 + ph - 20, 44, 15, 'back', () => this.back(), { color: 'grey' }));
    const g = this.gen;
    if (!this.rounds) {
      this.root.add(txt(this, x0 + pw / 2, y0 + 70, 'adding up your rounds...', { origin: [0.5, 0], color: COLORS.dim }));
      const r = await myRounds();
      if (!this.sys.isActive()) return;
      this.rounds = r.rounds;
      this.fromServer = r.fromServer;
      this.rebuild();
      return;
    }
    if (!this.isCurrentBuild(g)) return;
    const y = y0 + 44;
    if (tab === 'stats') this.buildStats(x0, y, pw, y0 + ph - 24 - y);
    else if (tab === 'passport') await this.buildPassport(x0, y, pw, y0 + ph - 24 - y);
    else this.buildMilestones(x0, y, pw, y0 + ph - 24 - y);
    if (this.fromServer) this.root.add(txt(this, x0 + pw - 8, y0 + ph - 16, 'with your player code\'s rounds from other devices', { origin: [1, 0], color: COLORS.dim, maxWidth: pw - 70 }));
  }

  private courseName(id: string): string {
    const c = app.courses.find((x) => x.id === id);
    return c ? shortName(c.name) : id;
  }

  private buildStats(x0: number, y: number, pw: number, h: number) {
    const bottom = y + h;
    const st = playerStats(this.rounds!);
    if (!st.rounds) {
      this.root.add(txt(this, x0 + pw / 2, y + 30, 'no finished rounds yet - your stats show here after your first', { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 24 }));
      return;
    }
    const pct = (v: number | null) => (v === null ? '-' : `${Math.round(v)}%`);
    const one = (v: number | null) => (v === null ? '-' : v.toFixed(1));
    // the handicap (Normal rounds; provisional with a star until 54 holes)
    const hcp = handicapOf(this.rounds!, hcpCourses(app.courses));
    const boxes: [string, string][] = [
      ['handicap', hcp ? indexLabel(hcp) : '-'],
      ['rounds', String(st.rounds)], ['fairways', pct(st.fairwayPct)], ['greens in reg.', pct(st.girPct)],
      ['putts / 18', one(st.puttsPer18)], ['penalties / 18', one(st.penaltiesPer18)],
    ];
    const bw = Math.floor((pw - 16 - 4 * (boxes.length - 1)) / boxes.length);
    boxes.forEach(([lab, v], i) => {
      const bx = x0 + 8 + i * (bw + 4);
      this.root.add(new Panel(this, bx, y, bw, 30, 0.6));
      this.root.add(txt(this, bx + bw / 2, y + 3, v, { origin: [0.5, 0], scale: 2, color: COLORS.yellow }));
      this.root.add(txt(this, bx + bw / 2, y + 21, lab, { origin: [0.5, 0], color: COLORS.dim }));
    });
    y += 36;
    // the last rounds, to par per 18 holes: a bar per round (under par up, over par down)
    const rec = st.recent;
    const gx = x0 + 8, gw = pw - 16, gh = 34;
    this.root.add(txt(this, gx, y, `last ${rec.length} ${rec.length === 1 ? 'round' : 'rounds'}, to par (per 18 holes)`, { color: COLORS.dim }));
    y += 11;
    const gr = this.add.graphics();
    gr.fillStyle(0xffffff, 0.05).fillRect(gx, y, gw, gh);
    const mid = y + gh / 2;
    gr.fillStyle(0xffffff, 0.25).fillRect(gx, Math.round(mid), gw, 1);
    const maxAbs = Math.max(4, ...rec.map((r) => Math.abs(r.toPar18)));
    const step = Math.min(24, Math.floor(gw / Math.max(1, rec.length)));
    rec.forEach((r, i) => {
      const hgt = Math.max(1, Math.round((Math.abs(r.toPar18) / maxAbs) * (gh / 2 - 2)));
      const bx = gx + 4 + i * step;
      gr.fillStyle(r.toPar18 <= 0 ? COLORS.yellow : COLORS.blue, 0.9);
      if (r.toPar18 <= 0) gr.fillRect(bx, Math.round(mid) - hgt, step - 4, hgt); else gr.fillRect(bx, Math.round(mid) + 1, step - 4, hgt);
    });
    this.root.add(gr);
    const last = rec[rec.length - 1];
    if (last) this.root.add(txt(this, gx + gw - 2, y + 2, `last: ${toPar(Math.round(last.toPar18))}`, { origin: [1, 0], color: COLORS.dim }));
    y += gh + 6;
    // per course: rounds, averages, best
    const cols = [x0 + 8, x0 + 150, x0 + 190, x0 + 236, x0 + 282];
    ['course', 'rounds', 'avg 18', 'avg 9', 'best'].forEach((t, i) => this.root.add(txt(this, cols[i], y, t, { color: COLORS.dim })));
    const n = Math.max(1, Math.floor((bottom - (y + 11)) / 11));
    st.courses.slice(0, n).forEach((c, i) => {
      const yy = y + 11 * (i + 1);
      const best = c.best ? `${c.best.gross} (${toPar(c.best.toPar)}) ${c.best.length === '18' || c.best.length === '9x2' ? '' : lengthLabel(c.best.length)}` : '-';
      [this.courseName(c.course).slice(0, 22), String(c.rounds), c.avg18 === null ? '-' : c.avg18.toFixed(1), c.avg9 === null ? '-' : c.avg9.toFixed(1), best]
        .forEach((v, j) => this.root.add(txt(this, cols[j], yy, v, { color: j === 4 ? COLORS.yellow : COLORS.white })));
    });
  }

  /** Every course card, stamped with the best score once played. */
  private async buildPassport(x0: number, y: number, pw: number, h: number) {
    const best = new Map<string, LeaderboardEntry>();
    for (const e of this.rounds!) {
      if (e.casual) continue;
      const b = best.get(e.course);
      if (!b || e.toPar / e.scores.length < b.toPar / b.scores.length) best.set(e.course, e);
    }
    const courses = app.courses.slice().sort((a, b) => a.name.localeCompare(b.name));
    const played = courses.filter((c) => best.has(c.id)).length;
    this.root.add(txt(this, x0 + pw / 2, y, `${played} of ${courses.length} courses played`, { origin: [0.5, 0], color: COLORS.dim }));
    y += 12;
    const cw = 104, ch = 52, gap = 6, lab = 12;
    const per = Math.max(1, Math.floor((pw - 16 + gap) / (cw + gap)));
    const rowsN = Math.max(1, Math.floor((h - 12 + gap) / (ch + lab + gap)));
    const perPage = per * rowsN;
    const pages = Math.max(1, Math.ceil(courses.length / perPage));
    page = Math.min(page, pages - 1);
    const shown = courses.slice(page * perPage, (page + 1) * perPage);
    const left = x0 + Math.round((pw - (per * cw + (per - 1) * gap)) / 2);
    const g = this.gen;
    const fills: (() => void)[] = [];
    shown.forEach((c, i) => {
      const cx = left + (i % per) * (cw + gap), cy = y + Math.floor(i / per) * (ch + lab + gap);
      const frame = this.add.graphics();
      frame.fillStyle(best.has(c.id) ? COLORS.orange : 0x394049, 1).fillRect(cx - 1, cy - 1, cw + 2, ch + 2);
      frame.fillStyle(0x1d2a22, 1).fillRect(cx, cy, cw, ch);
      this.root.add(frame);
      const art = this.add.container(0, 0);
      this.root.add(art);
      fills.push(() => {
        const k = `card_${c.id}`;
        if (!art.active || !this.textures.exists(k)) return;
        const src = this.textures.get(k).getSourceImage() as HTMLImageElement;
        const sx = Math.max(0, Math.round((src.width - cw) / 2)), sy = Math.max(0, Math.round((src.height - ch) / 2) - 6);
        const im = this.add.image(cx - sx, cy - sy, k).setOrigin(0, 0).setCrop(sx, sy, Math.min(cw, src.width), Math.min(ch, src.height));
        if (!best.has(c.id)) im.setAlpha(0.35);
        art.add(im);
      });
      this.root.add(txt(this, cx, cy + ch + 2, shortName(c.name).slice(0, 17), { color: best.has(c.id) ? COLORS.white : COLORS.dim }));
      const b = best.get(c.id);
      if (b) {
        // the stamp: a ring with the best score
        const st = this.add.graphics();
        const sx = cx + cw - 17, sy = cy + ch - 17;
        st.fillStyle(0x0b1116, 0.75).fillCircle(sx, sy, 14);
        st.lineStyle(1, COLORS.yellow, 1).strokeCircle(sx, sy, 14).strokeCircle(sx, sy, 12);
        this.root.add(st);
        this.root.add(txt(this, sx, sy - 9, String(b.gross), { origin: [0.5, 0], color: COLORS.yellow }));
        this.root.add(txt(this, sx, sy + 1, toPar(b.toPar), { origin: [0.5, 0], color: COLORS.dim }));
      } else {
        this.root.add(txt(this, cx + cw / 2, cy + ch / 2 - 4, 'not yet', { origin: [0.5, 0], color: COLORS.dim }));
      }
    });
    if (pages > 1) {
      const by = app.view.h - 24;
      this.root.add(new Button(this, x0 + 54, by, 18, 15, '', () => { page = Math.max(0, page - 1); this.rebuild(); }, { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, x0 + 84, by + 3, `${page + 1}/${pages}`, { origin: [0.5, 0] }));
      this.root.add(new Button(this, x0 + 96, by, 18, 15, '', () => { page = Math.min(pages - 1, page + 1); this.rebuild(); }, { icon: 'arrow_right', color: 'grey' }));
    }
    const fillAll = () => { if (this.isCurrentBuild(g)) for (const f of fills) f(); };
    fillAll();
    await ensureImages(this, shown.map((c): [string, string] => [`card_${c.id}`, `sprites/cards/${c.id}.png`]));
    fillAll();
  }

  private buildMilestones(x0: number, y: number, pw: number, h: number) {
    const all = milestonesOf(this.rounds!, milestoneCourses(), STATES).filter((m) => !m.key.startsWith('course:'));
    if (!all.length) {
      this.root.add(txt(this, x0 + pw / 2, y + 30, 'no milestones yet: a first birdie, breaking 90 at a course, every course in a state...', { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 24 }));
      return;
    }
    const list = all.slice().reverse(); // newest first
    const lineH = 11;
    const perPage = Math.max(1, Math.floor((h - 4) / lineH));
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    page = Math.min(page, pages - 1);
    list.slice(page * perPage, (page + 1) * perPage).forEach((m, i) => {
      const yy = y + i * lineH;
      this.root.add(txt(this, x0 + 10, yy, m.date.slice(0, 10), { color: COLORS.dim }));
      this.root.add(txt(this, x0 + 80, yy, m.text, { color: m.minor ? COLORS.white : COLORS.yellow, maxWidth: pw - 90 }));
    });
    if (pages > 1) {
      const by = app.view.h - 24;
      this.root.add(new Button(this, x0 + 54, by, 18, 15, '', () => { page = Math.max(0, page - 1); this.rebuild(); }, { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, x0 + 84, by + 3, `${page + 1}/${pages}`, { origin: [0.5, 0] }));
      this.root.add(new Button(this, x0 + 96, by, 18, 15, '', () => { page = Math.min(pages - 1, page + 1); this.rebuild(); }, { icon: 'arrow_right', color: 'grey' }));
    }
  }
}


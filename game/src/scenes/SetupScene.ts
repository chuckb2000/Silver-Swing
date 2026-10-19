// New round: course, tees, round length, difficulty, player name.

import { app } from '../app';
import { Difficulty } from '../data/difficulty';
import { saveSettings } from '../save/store';
import { Button, COLORS, Panel, txt } from '../ui/widgets';
import { lengthLabel, lengthsFor, RoundLength, startRound, useCourse } from './flow';
import { ensureBg, MenuScene } from './menu';

let length: RoundLength = '18';
let switching = false;

export class SetupScene extends MenuScene {
  constructor() {
    super('setup');
  }

  build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(300, W - 12);
    const ph = Math.min(H - 12, 196);
    const x0 = Math.round((W - pw) / 2), y0 = Math.round((H - ph) / 2);
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    this.root.add(txt(this, x0 + pw / 2, y0 + 6, 'new round', { origin: [0.5, 0], scale: 2 }));
    const c = app.course!.json;
    const tee = c.teeSets.find((t) => t.name === c.defaultTee)!;
    let y = y0 + 30;
    const lx = x0 + 8, vx = x0 + 78;
    const row = (label: string) => { this.root.add(txt(this, lx, y + 3, label, { color: COLORS.dim })); };
    row('course');
    const courses = app.courses;
    if (courses.length > 1) {
      // < course name >  (switching loads the other course)
      const i = Math.max(0, courses.findIndex((k) => k.id === c.id));
      const go = (d: number) => void this.switchTo(courses[(i + d + courses.length) % courses.length].id);
      this.root.add(new Button(this, vx, y, 16, 15, '', () => go(-1), { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, vx + 20, y + 3, switching ? 'loading course...' : c.name, { maxWidth: pw - 86 - 40, color: switching ? COLORS.dim : COLORS.white }));
      this.root.add(new Button(this, x0 + pw - 24, y, 16, 15, '', () => go(1), { icon: 'arrow_right', color: 'grey' }));
    } else {
      this.root.add(txt(this, vx, y + 3, c.name));
    }
    y += 16;
    row('tees');
    this.root.add(txt(this, vx, y + 3, `${tee.name.toLowerCase()}  ·  ${tee.totalYd} yd  ·  ${tee.rating} / ${tee.slope}`, { color: 0x8ec5ff }));
    y += 18;
    row('round');
    const options = lengthsFor(c.holes.length);
    if (!options.includes(length)) length = options[0];
    const lens: [RoundLength, string][] = options.map((k) => [k, lengthLabel(k)]);
    const bw = Math.floor((pw - 86) / 3);
    lens.forEach(([k, lab], i) => {
      this.root.add(new Button(this, vx + i * (bw + 2), y, bw, 15, lab, () => { length = k; this.rebuild(); }, { color: length === k ? 'orange' : 'grey' }));
    });
    y += 19;
    row('difficulty');
    (['easy', 'normal', 'pro'] as Difficulty[]).forEach((d, i) => {
      this.root.add(new Button(this, vx + i * (bw + 2), y, bw, 15, d, () => { app.settings.difficulty = d; void saveSettings(app.settings); this.rebuild(); }, { color: app.settings.difficulty === d ? 'orange' : 'grey' }));
    });
    y += 19;
    row('hand');
    (['right', 'left'] as const).forEach((h, i) => {
      const on = (h === 'left') === app.settings.lefty;
      this.root.add(new Button(this, vx + i * (bw + 2), y, bw, 15, h, () => { app.settings.lefty = h === 'left'; void saveSettings(app.settings); this.rebuild(); }, { color: on ? 'orange' : 'grey' }));
    });
    y += 19;
    row('player');
    this.root.add(new Button(this, vx, y, bw * 2 + 2, 15, app.settings.playerName || 'player', () => this.editName(), { color: 'grey' }));
    y += 21;
    const desc = {
      easy: 'slower meter, wide sweet spot, lighter wind',
      normal: 'standard meter and wind',
      pro: 'faster meter, tight sweet spot, no landing preview',
    }[app.settings.difficulty];
    this.root.add(txt(this, x0 + pw / 2, y, desc, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 12 }));
    const by = y0 + ph - 22;
    this.root.add(new Button(this, x0 + 8, by, 56, 16, 'back', () => this.back(), { color: 'grey' }));
    this.root.add(new Button(this, x0 + pw - 98, by, 90, 16, 'tee off', () => { if (switching) return; this.scene.stop('bg'); startRound(this, length); }));
  }

  private async switchTo(id: string) {
    if (switching) return;
    switching = true;
    this.rebuild();
    try {
      await useCourse(this, id);
    } catch (e) {
      console.error(e);
    } finally {
      switching = false;
    }
    if (!this.sys.isActive()) return;
    ensureBg(this);
    this.rebuild();
  }

  private editName() {
    const canvas = this.game.canvas;
    const r = canvas.getBoundingClientRect();
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 16;
    input.value = app.settings.playerName;
    Object.assign(input.style, {
      position: 'fixed', left: `${r.left + r.width / 2 - 110}px`, top: `${r.top + r.height / 2 - 20}px`, width: '220px',
      font: '20px monospace', padding: '8px', border: '3px solid #e8681e', background: '#121a20', color: '#f6f6f2', zIndex: '10', borderRadius: '4px',
    } as CSSStyleDeclaration);
    document.body.appendChild(input);
    input.focus();
    input.select();
    const done = () => {
      const v = input.value.trim().toLowerCase().replace(/[^a-z0-9 .'-]/g, '').slice(0, 16);
      if (v) app.settings.playerName = v;
      void saveSettings(app.settings);
      input.remove();
      this.rebuild();
    };
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') done(); if (e.key === 'Escape') { input.remove(); } });
    input.addEventListener('blur', done, { once: true });
  }
}

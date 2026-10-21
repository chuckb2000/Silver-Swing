// New round: course, tees, round length, difficulty, player name.

import { app } from '../app';
import { Difficulty } from '../data/difficulty';
import { ratingText, teeFor } from '../data/registry';
import { saveSettings } from '../save/store';
import { Button, COLORS, Panel, setTxt, txt } from '../ui/widgets';
import { shortName } from '../save/milestones';
import { confirmDiscard, editName, hasName, lengthLabel, lengthsFor, RoundLength, startRound, withName } from './flow';
import { MenuScene } from './menu';
import { myRounds } from '../save/mine';
import { handicapOf, hcpCourses, indexLabel } from '../systems/game/handicap';

let length: RoundLength = '18';
/** The player's rounds for the handicap line, kept for a minute (the screen rebuilds on every tap). */
let mine: { at: number; rounds: Promise<{ rounds: import('../save/entry').LeaderboardEntry[] }> } | null = null;

export class SetupScene extends MenuScene {
  constructor() {
    super('setup');
  }

  build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(300, W - 12);
    const ph = Math.min(H - 12, 208);
    const x0 = Math.round((W - pw) / 2), y0 = Math.round((H - ph) / 2);
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    this.root.add(txt(this, x0 + pw / 2, y0 + 6, 'new round', { origin: [0.5, 0], scale: 2 }));
    if (!app.course) { this.scene.start('courses', { purpose: 'play', from: 'title' }); return; } // a course load failed
    const c = app.course.json;
    const teeName = teeFor(c, app.settings.tees);
    const tee = c.teeSets.find((t) => t.name === teeName) ?? c.teeSets[0];
    let y = y0 + 30;
    const lx = x0 + 8, vx = x0 + 78;
    const row = (label: string) => { this.root.add(txt(this, lx, y + 3, label, { color: COLORS.dim })); };
    row('course');
    // the course was chosen on the course screen; 'change' goes back there
    const name = txt(this, vx, y + 3, c.name);
    if (name.width > pw - 86 - 56) setTxt(name, shortName(c.name)); // a phone: "oswego lake" (the full name wrapped onto the tees row)
    if (name.width > pw - 86 - 56) name.setMaxWidth(pw - 86 - 56);
    this.root.add(name);
    this.root.add(new Button(this, x0 + pw - 54, y, 46, 15, 'change', () => this.scene.start('courses', { purpose: 'play', from: 'setup' }), { color: 'grey' }));
    y += 16;
    const bw = Math.floor((pw - 86) / 3);
    row('tees');
    if (c.teeSets.length > 1) {
      // one button per tee set (remembered per course), the yardage and rating under them
      c.teeSets.slice(0, 3).forEach((t, i) => {
        this.root.add(new Button(this, vx + i * (bw + 2), y, bw, 15, t.name.toLowerCase(), () => {
          app.settings.tees = { ...app.settings.tees, [c.id]: t.name };
          void saveSettings(app.settings);
          this.rebuild();
        }, { color: t.name === tee.name ? 'orange' : 'grey' }));
      });
      y += 17;
      this.root.add(txt(this, vx, y, `${tee.totalYd} yd  ·  ${ratingText(tee)}`, { color: 0x8ec5ff }));
      y += 13;
    } else {
      this.root.add(txt(this, vx, y + 3, `${tee.name.toLowerCase()}  ·  ${tee.totalYd} yd  ·  ${ratingText(tee)}`, { color: 0x8ec5ff }));
      y += 18;
    }
    row('round');
    const options = lengthsFor(c.holes.length);
    if (!options.includes(length)) length = options[0];
    const lens: [RoundLength, string][] = options.map((k) => [k, lengthLabel(k)]);
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
    // the name: orange until there is one (rounds as "player" stay off the shared boards)
    const named = hasName();
    this.root.add(txt(this, lx, y + 3, named ? 'player' : 'your name', { color: named ? COLORS.dim : COLORS.yellow }));
    this.root.add(new Button(this, vx, y, bw * 2 + 2, 15, named ? app.settings.playerName : 'tap to enter it', () => editName(this, () => this.rebuild()), { color: named ? 'grey' : 'orange' }));
    if (!named && pw - 86 - (bw * 2 + 2) >= 52) this.root.add(txt(this, vx + bw * 2 + 6, y + 3, 'for the boards', { color: COLORS.dim, maxWidth: pw - 86 - bw * 2 - 4 }));
    y += 21;
    const desc = {
      easy: 'slower meter, wide sweet spot, lighter wind',
      normal: 'standard meter and wind',
      pro: 'faster meter, tight sweet spot, no landing preview',
    }[app.settings.difficulty];
    this.root.add(txt(this, x0 + pw / 2, y, desc, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 12 }));
    // the player's handicap (Normal rounds only), filled in once the rounds are counted; no strokes: nobody plays net (developer)
    const hcpTxt = txt(this, x0 + pw / 2, y + 12, '', { origin: [0.5, 0], color: 0x8ec5ff, maxWidth: pw - 12 });
    this.root.add(hcpTxt);
    const g = this.gen;
    if (!mine || Date.now() - mine.at > 60_000) mine = { at: Date.now(), rounds: myRounds() };
    void mine.rounds.then(({ rounds }) => {
      if (!this.isCurrentBuild(g) || !hcpTxt.active) return;
      const h = handicapOf(rounds, hcpCourses(app.courses));
      if (!h) setTxt(hcpTxt, app.settings.difficulty === 'normal' ? 'handicap: after 18 holes at normal' : '');
      else setTxt(hcpTxt, `handicap ${indexLabel(h)}${app.settings.difficulty === 'normal' ? '' : '  ·  only normal rounds count'}`);
    });
    const by = y0 + ph - 22;
    this.root.add(new Button(this, x0 + 8, by, 56, 16, 'back', () => this.back(), { color: 'grey' }));
    this.root.add(new Button(this, x0 + pw - 98, by, 90, 16, 'tee off', () => this.teeOff()));
  }

  /**
   * Tee off: a round in progress is only thrown away once the player says so;
   * a player with no name yet is asked for one first (they may skip it).
   */
  private teeOff() {
    void confirmDiscard(this, this.root, () => withName(this, () => { this.scene.stop('bg'); startRound(this, length); }));
  }
}

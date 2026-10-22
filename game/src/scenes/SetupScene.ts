// New round: course, tees, round length, difficulty, player name.

import { app } from '../app';
import { Difficulty } from '../data/difficulty';
import { ratingText, teeFor } from '../data/registry';
import { saveSettings } from '../save/store';
import { Button, COLORS, Panel, setTxt, txt } from '../ui/widgets';
import { shortName } from '../save/milestones';
import { confirmDiscard, editName, hasName, lengthLabel, lengthsFor, RoundLength, startRound, withName } from './flow';
import { createLiveMatch, newMatchConfig } from '../match/live';
import { planFor, shapeOfCourse } from '../systems/game/lengths';
import { askName } from '../ui/nameInput';
import { MenuScene } from './menu';
import { myRounds } from '../save/mine';
import { handicapOf, hcpCourses, indexLabel, ownHcpRounds } from '../systems/game/handicap';
import { DEFAULT_NAME } from '../save/names';

let length: RoundLength = '18';
/** The player's rounds for the handicap line, kept for a minute (the screen rebuilds on every tap). */
let mine: { at: number; rounds: Promise<{ rounds: import('../save/entry').LeaderboardEntry[] }> } | null = null;

export class SetupScene extends MenuScene {
  /** Setting up a live match (match play against a friend) instead of a round. */
  private matchMode = false;
  private matchNote = '';
  private making = false;

  constructor() {
    super('setup');
  }

  init(data?: { match?: boolean }) {
    this.matchMode = !!data?.match;
    this.matchNote = '';
    this.making = false;
  }

  protected back() {
    this.scene.start(this.matchMode ? 'match' : 'title', this.matchMode ? { mode: 'home' } : undefined);
  }

  build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(300, W - 12);
    const ph = Math.min(H - 12, 208);
    const x0 = Math.round((W - pw) / 2), y0 = Math.round((H - ph) / 2);
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    this.root.add(txt(this, x0 + pw / 2, y0 + 6, this.matchMode ? 'new match' : 'new round', { origin: [0.5, 0], scale: 2 }));
    const purpose = this.matchMode ? 'match' : 'play';
    if (!app.course) { this.scene.start('courses', { purpose, from: 'title' }); return; } // a course load failed
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
    this.root.add(new Button(this, x0 + pw - 54, y, 46, 15, 'change', () => this.scene.start('courses', { purpose, from: this.matchMode ? 'match' : 'setup' }), { color: 'grey' }));
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
    const shape = shapeOfCourse(c);
    const options = lengthsFor(shape);
    if (!options.includes(length)) length = options[0];
    const lens: [RoundLength, string][] = options.map((k) => [k, lengthLabel(k, shape)]);
    // three to a row (a club of nines: its three pairs, then each nine alone)
    lens.forEach(([k, lab], i) => {
      if (i > 0 && i % 3 === 0) y += 17;
      this.root.add(new Button(this, vx + (i % 3) * (bw + 2), y, bw, 15, lab, () => { length = k; this.rebuild(); }, { color: length === k ? 'orange' : 'grey' }));
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
    this.root.add(txt(this, x0 + pw / 2, y, this.matchMode ? `${desc} - for both of you` : desc, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 12 }));
    const by = y0 + ph - 22;
    this.root.add(new Button(this, x0 + 8, by, 56, 16, 'back', () => this.back(), { color: 'grey' }));
    if (this.matchMode) {
      // match play against a friend: the match is made on the server, then the invitation screen
      if (this.matchNote) this.root.add(txt(this, x0 + pw / 2, y + 12, this.matchNote, { origin: [0.5, 0], color: COLORS.red, maxWidth: pw - 12 }));
      this.root.add(new Button(this, x0 + pw - 108, by, 100, 16, this.making ? 'making...' : 'invite a friend', () => void this.makeMatch()));
      return;
    }
    // the player's handicap (Normal rounds only), filled in once the rounds are counted; no strokes: nobody plays net (developer)
    const hcpTxt = txt(this, x0 + pw / 2, y + 12, '', { origin: [0.5, 0], color: 0x8ec5ff, maxWidth: pw - 12 });
    this.root.add(hcpTxt);
    const g = this.gen;
    if (!mine || Date.now() - mine.at > 60_000) mine = { at: Date.now(), rounds: myRounds() };
    void mine.rounds.then(({ rounds }) => {
      if (!this.isCurrentBuild(g) || !hcpTxt.active) return;
      const h = handicapOf(ownHcpRounds(rounds, app.settings.playerName, DEFAULT_NAME), hcpCourses(app.courses));
      if (!h) setTxt(hcpTxt, app.settings.difficulty === 'normal' ? 'handicap: after 18 holes at normal' : '');
      else setTxt(hcpTxt, `handicap ${indexLabel(h)}${app.settings.difficulty === 'normal' ? '' : '  ·  only normal rounds count'}`);
    });
    this.root.add(new Button(this, x0 + pw - 98, by, 90, 16, 'tee off', () => this.teeOff()));
  }

  /** Make the match (a name is needed: the friend sees it), then show its code. */
  private async makeMatch() {
    if (this.making) return;
    if (!hasName()) {
      askName(this, '', (name) => {
        if (!name) return;
        app.settings.playerName = name;
        void saveSettings(app.settings);
        if (this.sys.isActive()) void this.makeMatch();
      }, 'your name for the match', { why: 'your friend sees it on their screen' });
      return;
    }
    this.making = true;
    this.matchNote = '';
    this.rebuild();
    const c = app.course!.json;
    const plan = planFor(length, shapeOfCourse(c));
    const cfg = await newMatchConfig(teeFor(c, app.settings.tees), { holes: plan.slots, courseHoles: plan.courseHoles, length }, app.settings.difficulty);
    const r = await createLiveMatch(cfg, { name: app.settings.playerName, lefty: app.settings.lefty });
    if (!this.sys.isActive()) return;
    this.making = false;
    if (!r.ok) { this.matchNote = `couldn't make the match: ${r.message}`; this.rebuild(); return; }
    this.scene.start('match', { mode: 'invite', code: r.code });
  }

  /**
   * Tee off: a round in progress is only thrown away once the player says so;
   * a player with no name yet is asked for one first (they may skip it).
   */
  private teeOff() {
    void confirmDiscard(this, this.root, () => withName(this, () => { this.scene.stop('bg'); startRound(this, length); }));
  }
}

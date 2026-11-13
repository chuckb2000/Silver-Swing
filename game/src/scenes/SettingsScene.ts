// Settings: handedness, difficulty, sound, view size, casual rules, player code.
// Units (yards), input latency and the OB rule are no longer settings (developer, 2026-10-20).

import { app } from '../app';
import { setVolume, sfx } from '../audio/sfx';
import { saveSettings, Settings } from '../save/store';
import { Button, COLORS, Panel, setTxt, txt } from '../ui/widgets';
import { freeUpSpace, keptCourses } from '../save/offline';
import { applyScale, uiCamera } from '../scale';
import { MenuScene } from './menu';
import { keyCode } from '../save/identity';
import { askCode } from '../ui/codeInput';
import { askMerge } from '../ui/mergeNames';
import { DEFAULT_NAME } from '../save/names';
import { nameConflicts, syncHidden } from '../save/online';

export class SettingsScene extends MenuScene {
  private from: 'title' | 'hud' = 'title';
  /** the page of rows showing, on a screen too short for all of them */
  private page = 0;

  constructor() {
    super('settings');
  }

  init(data: { from?: 'title' | 'hud' }) {
    this.from = data?.from ?? 'title';
    this.page = 0;
  }

  create() {
    if (this.from === 'hud') {
      // over a paused round: no background fly-over, build() adds the dimmer
      uiCamera(this.cameras.main);
      this.root = this.add.container(0, 0);
      void this.build();
      this.input.keyboard?.on('keydown-ESC', () => this.back());
      const onResize = () => { uiCamera(this.cameras.main); this.rebuild(); };
      this.scale.on('resize', onResize);
      this.events.once('shutdown', () => this.scale.off('resize', onResize));
      return;
    }
    super.create();
  }

  protected back() {
    void saveSettings(app.settings);
    if (this.from === 'hud') {
      this.scene.stop();
      this.scene.resume('play');
      this.scene.resume('hud');
      return;
    }
    this.scene.start('title');
  }

  build() {
    const s = app.settings;
    const W = app.view.w, H = app.view.h;
    const inRound = this.from === 'hud';
    const pw = Math.min(320, W - 8), ph = Math.min(H - 8, inRound ? 176 : 262);
    const x0 = Math.round((W - pw) / 2), y0 = Math.round((H - ph) / 2);
    if (this.from === 'hud') {
      const dim = this.add.rectangle(0, 0, W, H, 0x05080b, 0.7).setOrigin(0, 0).setInteractive();
      this.root.add(dim);
    }
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.92));
    this.root.add(txt(this, x0 + pw / 2, y0 + 5, 'settings', { origin: [0.5, 0], scale: 2 }));
    let y = y0 + 26;
    const lx = x0 + 8, vx = x0 + 104;
    const bw = Math.floor((pw - 112) / 3);
    const save = () => { void saveSettings(s).then(() => syncHidden()); setVolume(s.volume, s.muted); this.rebuild(); };
    const choice = <K extends keyof Settings>(label: string, key: K, opts: [Settings[K], string][], note = '') => {
      this.root.add(txt(this, lx, y + 3, label, { color: COLORS.dim }));
      opts.forEach(([v, lab], i) => this.root.add(new Button(this, vx + i * (bw + 2), y, bw, 14, lab, () => { s[key] = v; save(); }, { color: s[key] === v ? 'orange' : 'grey' })));
      if (note) this.root.add(txt(this, vx + opts.length * (bw + 2), y + 3, note, { color: COLORS.dim }));
      y += 17;
    };
    const stepper = (label: string, value: string, dec: () => void, inc: () => void) => {
      this.root.add(txt(this, lx, y + 3, label, { color: COLORS.dim }));
      this.root.add(new Button(this, vx, y, 16, 14, '', () => { dec(); save(); }, { icon: 'arrow_left', color: 'grey' }));
      this.root.add(txt(this, vx + 16 + bw / 2 + 6, y + 3, value, { origin: [0.5, 0] }));
      this.root.add(new Button(this, vx + bw + 28, y, 16, 14, '', () => { inc(); save(); }, { icon: 'arrow_right', color: 'grey' }));
      y += 17;
    };
    // every row is drawn by its own function, so a screen too short for them all shows them a page at a
    // time ("pixel size: bigger" on a laptop, a phone on its side: the last rows were under the buttons)
    const rows: (() => void)[] = [];
    if (!inRound) {
      rows.push(() => choice('hand', 'lefty', [[false, 'right'], [true, 'left']]));
      rows.push(() => choice('difficulty', 'difficulty', [['easy', 'easy'], ['normal', 'normal'], ['pro', 'pro']]));
    }
    rows.push(() => stepper('volume', `${Math.round(s.volume * 100)}%`, () => { s.volume = Math.max(0, Math.round((s.volume - 0.1) * 10) / 10); }, () => { s.volume = Math.min(1, Math.round((s.volume + 0.1) * 10) / 10); sfx('click'); }));
    rows.push(() => choice('sound', 'muted', [[false, 'on'], [true, 'muted']]));
    rows.push(() => stepper('pixel size', ['bigger', 'auto', 'smaller'][s.viewScale + 1], () => { s.viewScale = Math.max(-1, s.viewScale - 1); applyScale(this.game); }, () => { s.viewScale = Math.min(1, s.viewScale + 1); applyScale(this.game); }));
    if (inRound) {
      // hand, difficulty and the rules were fixed when the round started (Round.cfg.settings)
      rows.push(() => {
        y += 4;
        this.root.add(txt(this, x0 + pw / 2, y, 'hand, difficulty and rules are set', { origin: [0.5, 0], color: COLORS.dim }));
        this.root.add(txt(this, x0 + pw / 2, y + 11, 'for this round. change them from the title screen.', { origin: [0.5, 0], color: COLORS.dim }));
        y += 22;
      });
    } else {
      // off every shared leaderboard (friends, daily, eagles, records, activity); this device's own board keeps them
      rows.push(() => choice('leaderboards', 'hideFromBoards', [[false, 'show me'], [true, 'hide me']]));
      // someone looking for a match ("open to a challenge"): a popup, or only the line on the title screen
      rows.push(() => choice('challenges', 'challengePopups', [[true, 'show a note'], [false, 'title only']]));
      rows.push(() => {
      this.root.add(txt(this, lx, y + 3, 'casual rules', { color: COLORS.dim }));
      ([['gimmes', 'gimmes'], ['maxDoublePar', 'max 2x par'], ['mulligans', 'mulligan']] as [keyof Settings, string][]).forEach(([k, lab], i) => {
        this.root.add(new Button(this, vx + i * (bw + 2), y, bw, 14, lab, () => { (s[k] as boolean) = !s[k]; save(); }, { color: s[k] ? 'orange' : 'grey' }));
      });
      y += 17;
      });
      rows.push(() => {
      // the device's private player code: copied to another device, the player's names work there too
      this.root.add(txt(this, lx, y + 3, 'player code', { color: COLORS.dim }));
      this.root.add(txt(this, vx, y + 3, keyCode(s.playerKey)));
      this.root.add(new Button(this, x0 + pw - 70, y, 62, 14, 'use another', () => {
        askCode(this, (k) => {
          if (k && k !== s.playerKey) { s.playerKey = k; nameConflicts.clear(); save(); }
        });
      }, { color: 'grey' }));
      y += 17;
      });
      rows.push(() => {
      // played under two names (one device or two): all the rounds under one (developer, 2026-10-21)
      this.root.add(txt(this, lx, y + 3, 'name', { color: COLORS.dim }));
      this.root.add(txt(this, vx, y + 3, s.playerName && s.playerName !== DEFAULT_NAME ? s.playerName.slice(0, 16) : '-'));
      this.root.add(new Button(this, x0 + pw - 70, y, 62, 14, 'merge names', () => {
        askMerge(this, (changed) => { if (changed) this.rebuild(); });
      }, { color: 'grey' }));
      y += 17;
      });
      // courses kept on this device by the offline copy (player improvements, item 3)
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) rows.push(() => {
        const g = this.gen;
        const row = y;
        this.root.add(txt(this, lx, row + 3, 'kept courses', { color: COLORS.dim }));
        const val = txt(this, vx, row + 3, '...');
        this.root.add(val);
        void keptCourses().then((k) => {
          if (!this.isCurrentBuild(g)) return;
          setTxt(val, `${k.courses}${k.bytes !== null ? `  ·  ${Math.round(k.bytes / 1e6)} mb` : ''}`);
        });
        this.root.add(new Button(this, x0 + pw - 70, row, 62, 14, 'free up space', async () => {
          await freeUpSpace();
          this.rebuild();
        }, { color: 'grey' }));
        y += 17;
      });
    }
    // as many rows as fit above the buttons; the rest on further pages
    const per = Math.max(3, Math.floor((y0 + ph - 22 - y) / 17));
    const pages = Math.ceil(rows.length / per);
    if (this.page >= pages) this.page = 0;
    rows.slice(this.page * per, (this.page + 1) * per).forEach((draw) => draw());
    // (a line of explanation where there is room for it under the rows)
    if (!inRound && y + 13 <= y0 + ph - 22) this.root.add(txt(this, x0 + pw / 2, y + 2, 'casual rounds go on their own leaderboard tab', { origin: [0.5, 0], color: COLORS.dim }));
    if (pages > 1) {
      const label = this.page + 1 < pages ? `more (${this.page + 1}/${pages})` : `first page (${pages}/${pages})`;
      this.root.add(new Button(this, Math.round(x0 + pw / 2 - 45), y0 + ph - 20, 90, 15, label, () => { this.page = (this.page + 1) % pages; this.rebuild(); }));
    }
    this.root.add(new Button(this, x0 + 8, y0 + ph - 20, 56, 15, 'back', () => this.back(), { color: 'grey' }));
    // the credits live here (developer, 2026-10-20), not on the title screen
    if (!inRound) this.root.add(new Button(this, x0 + pw - 64, y0 + ph - 20, 56, 15, 'credits', () => { void saveSettings(s); this.scene.start('credits'); }, { color: 'grey' }));
  }
}

// Round summary: full scorecard, stats, leaderboard placing.

import { app } from '../app';
import { sfx } from '../audio/sfx';
import { LeaderboardEntry, loadBoard, renameEntry, saveSettings } from '../save/store';
import { DEFAULT_NAME } from '../save/names';
import { askName } from '../ui/nameInput';
import { compareRounds, toPar } from '../systems/rules/scoring';
import { Button, COLORS, txt } from '../ui/widgets';
import { scorecard } from './HudScene';
import { fetchBoard, flushUploads } from '../save/online';
import { lengthLabel } from './flow';
import { MenuScene } from './menu';

export class SummaryScene extends MenuScene {
  private entry!: LeaderboardEntry;

  constructor() {
    super('summary');
  }

  init(data: { entry: LeaderboardEntry }) {
    this.entry = data.entry;
  }

  async build() {
    const W = app.view.w, H = app.view.h;
    const e = this.entry;
    const r = app.round!;
    this.root.add(txt(this, W / 2, 4, `round complete  ·  ${e.gross} (${toPar(e.toPar)})`, { origin: [0.5, 0], scale: 2, color: COLORS.yellow }));
    if (W >= 400) this.root.add(this.add.image(6, 4, 'ui', 'portrait').setOrigin(0, 0));
    this.root.add(scorecard(this, r, W, H - 30));
    // placing among friends when the site has a shared board (this round may not have arrived yet), else on this device
    const shared = await fetchBoard(e.course);
    if (!this.sys.isActive()) return;
    const pool = shared ? (shared.some((b) => b.id === e.id) ? shared : [...shared, e]) : await loadBoard();
    const where = shared ? 'among friends' : 'on this device';
    const board = pool.filter((b) => b.course === e.course && b.tee === e.tee && b.length === e.length && b.casual === e.casual);
    board.sort(compareRounds);
    const rank = board.findIndex((b) => b.id === e.id) + 1;
    const mine = board.filter((b) => b.player === e.player);
    const best = mine.length ? mine.slice().sort(compareRounds)[0] : null;
    const pb = best && best.id === e.id && mine.length > 1;
    if (pb) sfx('great');
    const note = `${e.casual ? 'casual round  ·  ' : ''}#${rank} of ${board.length} ${where} (${lengthLabel(e.length)})${pb ? '  ·  new personal best!' : ''}`;
    this.root.add(txt(this, W / 2, H - 38, note, { origin: [0.5, 0], color: pb ? COLORS.yellow : COLORS.dim }));
    // the name on the leaderboard: easy to miss at the start, so it can be set here before the round is sent
    const unnamed = e.player === DEFAULT_NAME;
    const nw = 104;
    const nx = W >= 400 ? W - nw - 6 : Math.round(W / 2 - nw / 2), ny = W >= 400 ? 4 : H - 56;
    this.root.add(new Button(this, nx, ny, nw, 16, unnamed ? 'enter your name' : `name: ${e.player}`, () => this.rename(), { color: unnamed ? 'orange' : 'grey' }));
    // leaving the summary sends the round to the shared leaderboard
    const leave = (to: string) => { void flushUploads(); this.scene.start(to); };
    const bw = 84;
    this.root.add(new Button(this, W / 2 - bw * 1.5 - 4, H - 24, bw, 16, 'title', () => leave('title'), { color: 'grey' }));
    this.root.add(new Button(this, W / 2 - bw / 2, H - 24, bw, 16, 'leaderboard', () => leave('leaderboard'), { color: 'grey' }));
    this.root.add(new Button(this, W / 2 + bw / 2 + 4, H - 24, bw, 16, 'play again', () => leave('setup')));
  }

  private rename() {
    askName(this, this.entry.player, async (name) => {
      if (!name || name === this.entry.player) return;
      await renameEntry(this.entry.id, name);
      this.entry = { ...this.entry, player: name };
      app.settings.playerName = name; // and for the next rounds
      void saveSettings(app.settings);
      if (this.sys.isActive()) this.rebuild();
    });
  }
}

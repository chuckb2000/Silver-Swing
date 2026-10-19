// Round summary: full scorecard, stats, leaderboard placing.

import { app } from '../app';
import { sfx } from '../audio/sfx';
import { LeaderboardEntry, loadBoard } from '../save/store';
import { compareRounds, toPar } from '../systems/rules/scoring';
import { Button, COLORS, txt } from '../ui/widgets';
import { scorecard } from './HudScene';
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
    const board = (await loadBoard()).filter((b) => b.course === e.course && b.tee === e.tee && b.length === e.length && b.casual === e.casual);
    board.sort(compareRounds);
    const rank = board.findIndex((b) => b.id === e.id) + 1;
    const mine = board.filter((b) => b.player === e.player);
    const best = mine.length ? mine.slice().sort(compareRounds)[0] : null;
    const pb = best && best.id === e.id && mine.length > 1;
    if (pb) sfx('great');
    const note = `${e.casual ? 'casual round  ·  ' : ''}#${rank} of ${board.length} on the ${e.length === '18' ? '18-hole' : e.length + ' nine'} board${pb ? '  ·  new personal best!' : ''}`;
    this.root.add(txt(this, W / 2, H - 38, note, { origin: [0.5, 0], color: pb ? COLORS.yellow : COLORS.dim }));
    const bw = 84;
    this.root.add(new Button(this, W / 2 - bw * 1.5 - 4, H - 24, bw, 16, 'title', () => this.scene.start('title'), { color: 'grey' }));
    this.root.add(new Button(this, W / 2 - bw / 2, H - 24, bw, 16, 'leaderboard', () => this.scene.start('leaderboard'), { color: 'grey' }));
    this.root.add(new Button(this, W / 2 + bw / 2 + 4, H - 24, bw, 16, 'play again', () => this.scene.start('setup')));
  }
}

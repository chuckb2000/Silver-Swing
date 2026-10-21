// Round summary: full scorecard, stats, leaderboard placing.

import { app } from '../app';
import { sfx } from '../audio/sfx';
import { LeaderboardEntry, loadBoard, renameEagles, renameEntry, saveSettings } from '../save/store';
import { DEFAULT_NAME } from '../save/names';
import { askName } from '../ui/nameInput';
import { compareRounds, toPar } from '../systems/rules/scoring';
import { Button, COLORS, txt } from '../ui/widgets';
import { scorecard } from './HudScene';
import { claimName, fetchBoard, fetchDaily, flushUploads } from '../save/online';
import { earnedBy, milestonesOf } from '../save/milestones';
import { milestoneCourses } from '../save/mine';
import { STATES } from '../data/registry';
import { dailyPlan, dayStandings } from '../systems/game/daily';
import { DAILY_ROSTER } from '../data/dailyRoster';
import { shareRound } from '../ui/shareCard';
import { lengthLabel } from './flow';
import { MenuScene } from './menu';

export class SummaryScene extends MenuScene {
  private entry!: LeaderboardEntry;
  private rankLine = '';

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
    const card = scorecard(this, r, W, H - 30);
    this.root.add(card);
    // milestones this round earned (first birdie, broke 90 at ..., every oregon course played)
    const local = await loadBoard();
    if (!this.sys.isActive()) return;
    const mine = local.filter((b) => b.player === e.player);
    const earned = earnedBy(e.id, milestonesOf(mine, milestoneCourses(), STATES));
    if (earned.length) {
      sfx('great');
      const line = earned.slice(0, 3).map((m) => m.text).join('  ·  ');
      this.root.add(txt(this, W / 2, 24, `milestone: ${line}`, { origin: [0.5, 0], color: COLORS.green, maxWidth: W - (W >= 400 ? 130 : 12) }));
    }
    // placing among friends when the site has a shared board (this round may not have arrived yet), else on this device
    const shared = e.daily ? await fetchDaily(e.daily) : await fetchBoard(e.course);
    if (!this.sys.isActive()) return;
    const pool = shared ? (shared.some((b) => b.id === e.id) ? shared : [...shared, e]) : local;
    const where = e.daily ? (shared ? "in today's daily round" : "in today's daily round on this device") : shared ? 'among friends' : 'on this device';
    // rounds with no name don't go on the boards (developer: nobody as "player"); this one is counted to show where it would be
    const board = e.daily
      ? dayStandings(pool.filter((b) => b.player !== DEFAULT_NAME || b.id === e.id), e.daily, dailyPlan(e.daily, app.courses, DAILY_ROSTER))
      : pool.filter((b) => b.course === e.course && b.tee === e.tee && b.length === e.length && b.casual === e.casual && (b.player !== DEFAULT_NAME || b.id === e.id));
    if (!e.daily) board.sort(compareRounds);
    const rank = board.findIndex((b) => b.id === e.id) + 1;
    const onBoard = board.filter((b) => b.player === e.player);
    const best = onBoard.length ? onBoard.slice().sort(compareRounds)[0] : null;
    const pb = !e.daily && best && best.id === e.id && onBoard.length > 1;
    if (pb) sfx('great');
    // a name another device holds: the round can't go on the shared board under it (say so, rather than a rank it won't get)
    const taken = shared && e.player !== DEFAULT_NAME && (await claimName(e.player)) === 'taken';
    if (!this.sys.isActive()) return;
    const hidden = app.settings.hideFromBoards;
    const note = hidden
      ? 'you are hidden from the shared leaderboards (settings) - this round stays on your own boards'
      : e.player === DEFAULT_NAME
      ? `enter your name to put this round on the leaderboard (it would be #${rank} of ${board.length} ${where})`
      : taken
        ? `another device has the name ${e.player}: tap the name to change it, or to enter that device's player code`
        : rank === 0
          ? 'a second go at the daily round: it goes on the course board, not the daily one'
          : `${e.casual ? 'casual round  ·  ' : ''}#${rank} of ${board.length} ${where} (${lengthLabel(e.length)})${pb ? '  ·  new personal best!' : ''}`;
    this.rankLine = !hidden && rank > 0 && e.player !== DEFAULT_NAME && !taken ? `#${rank} of ${board.length} ${where}` : '';
    const noteTxt = txt(this, W / 2, H - 38, note, { origin: [0.5, 0], color: taken ? COLORS.red : pb ? COLORS.yellow : COLORS.dim, maxWidth: W - 12 });
    if (noteTxt.height > 12) noteTxt.y = H - 30 - noteTxt.height; // wrapped on a narrow screen: keep it above the buttons
    this.root.add(noteTxt);
    // the name on the leaderboard: easy to miss at the start, so it can be set here before the round is sent.
    // Right over the note that explains it (afternoon review: at the top right it covered the end of the
    // title on a desktop, and on a phone it sat on a two-line note)
    const unnamed = e.player === DEFAULT_NAME || taken;
    const label = e.player === DEFAULT_NAME ? 'enter your name' : `name: ${e.player}`;
    const probe = txt(this, 0, 0, label);
    const nw = Math.min(W - 12, Math.max(104, Math.ceil(probe.width) + 12));
    probe.destroy();
    const ny = Math.round(noteTxt.y) - 20;
    this.root.add(new Button(this, Math.round(W / 2 - nw / 2), ny, nw, 16, label, () => this.rename(), { color: unnamed ? 'orange' : 'grey' }));
    // a short screen: the card moves up (not past the title) to clear the name button
    const over = (card.getData('bottom') as number) + 3 - ny;
    if (over > 0) card.y -= Math.min(over, Math.max(0, (card.getData('top') as number) - (earned.length ? 36 : 24)));
    // leaving the summary sends the round to the shared leaderboard
    const leave = (to: string) => { void flushUploads(); this.scene.start(to, to === 'leaderboard' ? (e.daily ? { view: 'daily' } : { courseId: e.course }) : undefined); };
    const bw = Math.min(84, Math.floor((W - 20) / 4)); // four buttons fit a narrow phone
    const bx = (i: number) => Math.round(W / 2 - 2 * bw - 6 + i * (bw + 4));
    this.root.add(new Button(this, bx(0), H - 24, bw, 16, 'title', () => leave('title'), { color: 'grey' }));
    this.root.add(new Button(this, bx(1), H - 24, bw, 16, bw < 70 ? 'board' : 'leaderboard', () => leave('leaderboard'), { color: 'grey' }));
    // a picture of the card for the group chat (player improvements, item 2)
    const share = new Button(this, bx(2), H - 24, bw, 16, 'share', async () => {
      share.setEnabled(false);
      const res = await shareRound(this, this.entry, this.rankLine);
      if (!share.active) return;
      share.setEnabled(true);
      if (res === 'saved') share.setLabel('saved');
      else if (res === 'copied') share.setLabel('copied');
      else if (res === 'failed') share.setLabel('failed');
    }, { color: 'grey' });
    this.root.add(share);
    this.root.add(new Button(this, bx(3), H - 24, bw, 16, e.daily ? 'my golf' : 'play again', () => leave(e.daily ? 'mygolf' : 'setup')));
  }

  private rename() {
    askName(this, this.entry.player, async (name) => {
      if (!name) return;
      if (name === this.entry.player) { if (this.sys.isActive()) this.rebuild(); return; } // the same name, now this device's (player code)
      await renameEntry(this.entry.id, name);
      await renameEagles(this.entry.id, name);
      this.entry = { ...this.entry, player: name };
      app.settings.playerName = name; // and for the next rounds
      void saveSettings(app.settings);
      if (this.sys.isActive()) this.rebuild();
    });
  }
}

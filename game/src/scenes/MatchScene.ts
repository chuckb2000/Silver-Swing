// Live match play's screens before the first tee (design:
// docs/reports/multiplayer_live_match.md): "play a friend" (start a match,
// join with a code, this device's matches), the invitation (the code and a
// link to send, waiting for the friend) and the invitation as the friend sees
// it (whose match, which course, join). Once both are in, the play scene.

import Phaser from 'phaser';
import { app } from '../app';
import { shortName } from '../save/milestones';
import { DEFAULT_NAME } from '../save/names';
import { saveSettings } from '../save/store';
import { dialogInput, dialogText, openDialog } from '../ui/domDialog';
import { askName } from '../ui/nameInput';
import { Button, COLORS, Panel, setTxt, txt } from '../ui/widgets';
import { courseVersion, forgetMatch, LiveMatch, matchInfo, MatchInfo, matchLink, myMatches, parseMatchCode } from '../match/live';
import { lengthOf } from '../systems/game/lengths';
import { lengthLabel, useCourse } from './flow';
import { ensureBg, MenuScene } from './menu';

type Mode =
  | { mode: 'home' }
  | { mode: 'invite'; code: string }
  | { mode: 'join'; code: string }
  | { mode: 'continue'; code: string };

/** Start the play scene on a match that is caught up. */
export function playMatch(scene: Phaser.Scene, live: LiveMatch) {
  app.match = live;
  app.round = live.session!.activeRound();
  scene.scene.stop('bg');
  scene.scene.start('play', { match: true });
}

/** "oswego lake · 18 holes · blue tees · normal" */
function matchLine(i: { courseId: string; holes: number[]; tee: string; difficulty: string }): string {
  const c = app.courses.find((k) => k.id === i.courseId);
  const len = lengthLabel(lengthOf(i.holes, c?.holes ?? 18));
  return `${c ? shortName(c.name) : i.courseId}  ·  ${len}  ·  ${i.tee.toLowerCase()} tees  ·  ${i.difficulty}`;
}

export class MatchScene extends MenuScene {
  private m: Mode = { mode: 'home' };
  private live: LiveMatch | null = null;
  private unlisten: (() => void) | null = null;
  private note = '';
  private busy = false;
  private info: MatchInfo | null = null;
  private infos = new Map<string, MatchInfo | null>();

  constructor() {
    super('match');
  }

  init(data?: Mode) {
    this.m = data && 'mode' in data ? data : { mode: 'home' };
    this.note = '';
    this.busy = false;
    this.info = null;
    this.live = null;
  }

  create(data?: unknown) {
    super.create(data);
    this.events.once('shutdown', () => {
      this.unlisten?.();
      this.unlisten = null;
      // a match that was opened here and not taken into play: hang up
      if (this.live && app.match !== this.live) this.live.stop();
      this.live = null;
    });
    if (this.m.mode !== 'home') void this.open(this.m.code);
  }

  protected back() {
    if (this.m.mode !== 'home') { this.scene.start('match', { mode: 'home' }); return; }
    this.scene.start('title');
  }

  /** Look the match up, load its course and connect (invite, join and continue all start here). */
  private async open(code: string) {
    this.busy = true;
    this.note = 'looking up the match...';
    this.rebuild();
    const info = await matchInfo(code);
    if (!this.sys.isActive()) return;
    this.info = info;
    if (!info) { this.busy = false; this.note = "can't reach the server - check the connection and try again"; this.rebuild(); return; }
    if (!info.exists) { this.busy = false; forgetMatch(code); this.note = `no match with the code ${code} (it may have ended)`; this.rebuild(); return; }
    if (info.protocol !== 1) { this.busy = false; this.note = 'this match was made by another version of the game - reload to update'; this.rebuild(); return; }
    if (!app.courses.some((c) => c.id === info.courseId)) { this.busy = false; this.note = "this game doesn't have that course yet - reload to update"; this.rebuild(); return; }
    this.note = 'loading the course...';
    this.rebuild();
    try {
      await useCourse(this, info.courseId, (f) => { this.note = `loading the course ${Math.round(f * 100)}%`; this.showNote(); });
    } catch (e) {
      console.error(e);
      if (!this.sys.isActive()) return;
      this.busy = false;
      this.note = "couldn't load the course - try again";
      this.rebuild();
      return;
    }
    if (!this.sys.isActive()) return;
    ensureBg(this); // the course fly-over behind the menu again (it stops while a course loads)
    const mine = await courseVersion(info.courseId);
    if (info.courseVersion !== 'dev' && mine !== 'dev' && mine !== info.courseVersion) {
      // a course rebuilt since the match was made: both should be on the same version (DECISIONS / report: versions)
      this.note = 'the course was updated since this match was made - you and your friend should both reload';
    } else this.note = 'connecting...';
    this.rebuild();
    const live = new LiveMatch(code);
    this.live = live;
    this.unlisten = live.listen(() => this.onLive());
    live.start();
  }

  /** The match line changed: joined, caught up, the friend arrived... */
  private onLive() {
    const live = this.live;
    if (!live || !this.sys.isActive()) return;
    if (live.status === 'gone') { this.busy = false; this.note = 'this match no longer exists'; forgetMatch(live.code); this.rebuild(); return; }
    if (!live.caughtUp || !live.session) { this.rebuild(); return; }
    // before the first tee nothing needs playing back: the friend joining, being ready
    try { while (live.session.applyNext()) { /* shown at once */ } } catch (e) { console.error(e); live.rebuild(); return; }
    const s = live.session.state;
    if (this.note === 'connecting...') this.note = '';
    if (live.seat === null) {
      // not a player yet: the friend opening the invitation
      if (this.m.mode === 'join' || this.m.mode === 'continue') {
        if (s.players[1]) { this.busy = false; this.note = 'this match already has two players'; this.rebuild(); return; }
        this.busy = false;
        this.rebuild(); // shows "join"
      }
      return;
    }
    live.remember();
    if (s.phase === 'waiting') { this.busy = false; this.m = { mode: 'invite', code: live.code }; this.rebuild(); return; }
    // both players are in: to the first tee (or back to where the match is)
    this.unlisten?.();
    this.unlisten = null;
    playMatch(this, live);
  }

  private showNote() {
    const t = this.root?.getByName('note') as Phaser.GameObjects.BitmapText | null;
    if (t?.active) setTxt(t, this.note);
  }

  build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(320, W - 12), ph = Math.min(H - 12, 214);
    const x0 = Math.round((W - pw) / 2), y0 = Math.round((H - ph) / 2);
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.9));
    const cx = x0 + pw / 2;
    const by = y0 + ph - 22;
    const title = this.m.mode === 'invite' ? 'match made' : this.m.mode === 'home' ? 'play a friend' : 'match play';
    this.root.add(txt(this, cx, y0 + 6, title, { origin: [0.5, 0], scale: 2 }));
    this.root.add(new Button(this, x0 + 8, by, 56, 16, 'back', () => this.back(), { color: 'grey' }));
    const note = txt(this, cx, by - 16, this.note, { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 16 }).setName('note');
    this.root.add(note);
    if (this.m.mode === 'home') this.buildHome(x0, y0 + 30, pw);
    else if (this.m.mode === 'invite') this.buildInvite(x0, y0 + 30, pw, by);
    else this.buildJoin(x0, y0 + 30, pw, by);
  }

  private buildHome(x0: number, y: number, pw: number) {
    const cx = x0 + pw / 2;
    this.root.add(txt(this, cx, y, 'match play against a friend, each on their own device: you take turns, hole by hole', { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 20 }));
    y += 26;
    const bw = Math.floor((pw - 24) / 2);
    this.root.add(new Button(this, x0 + 8, y, bw, 17, 'start a match', () => this.startNew()));
    this.root.add(new Button(this, x0 + 16 + bw, y, bw, 17, 'join with a code', () => this.askForCode(), { color: 'grey' }));
    y += 26;
    const list = myMatches();
    if (!list.length) return;
    this.root.add(txt(this, x0 + 10, y, 'your matches', { color: COLORS.yellow }));
    y += 12;
    for (const m of list.slice(0, 4)) {
      const c = app.courses.find((k) => k.id === m.courseId);
      const info = this.infos.get(m.code);
      const status = info === undefined ? '...' : !info || !info.exists ? 'ended' : info.status;
      const label = `${m.vs ? `vs ${m.vs}` : 'waiting for a friend'}  ·  ${c ? shortName(c.name) : m.courseId}  ·  ${status}`;
      this.root.add(new Button(this, x0 + 8, y, pw - 40, 15, label, () => this.scene.start('match', { mode: 'continue', code: m.code }), { color: m.done ? 'grey' : 'orange' }));
      this.root.add(new Button(this, x0 + pw - 28, y, 20, 15, 'x', () => { forgetMatch(m.code); this.rebuild(); }, { color: 'grey' }));
      y += 18;
      if (info === undefined) {
        this.infos.set(m.code, null);
        void matchInfo(m.code).then((i) => { this.infos.set(m.code, i); if (this.sys.isActive()) this.rebuild(); });
      }
    }
  }

  private startNew() {
    const go = () => this.scene.start('courses', { purpose: 'match', from: 'match' });
    if (app.settings.playerName && app.settings.playerName !== DEFAULT_NAME) { go(); return; }
    askName(this, '', (name) => {
      if (!name) return;
      app.settings.playerName = name;
      void saveSettings(app.settings);
      if (this.sys.isActive()) go();
    }, 'your name for the match', { why: 'your friend sees it on their screen' });
  }

  private askForCode() {
    const dlg = openDialog(this, 260, () => undefined);
    const input = dialogInput(64, 'abc234 or the link');
    input.style.fontSize = '18px';
    const msg = dialogText('', '#ff7a6a', 13);
    dlg.box.append(dialogText('the match code from your friend', '#f6f6f2', 14), input, msg);
    const [ok, cancel] = dlg.buttons(['join', 'cancel']);
    try { input.focus(); } catch { /* iOS */ }
    const submit = () => {
      const code = parseMatchCode(input.value);
      if (!code) { msg.textContent = 'that is not a match code (6 letters and numbers)'; input.select(); return; }
      dlg.close();
      this.scene.start('match', { mode: 'join', code });
    };
    ok.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    cancel.addEventListener('click', () => dlg.close());
  }

  private buildInvite(x0: number, y: number, pw: number, by: number) {
    const cx = x0 + pw / 2;
    const code = this.m.mode === 'invite' ? this.m.code : '';
    const s = this.live?.session?.state;
    if (s) this.root.add(txt(this, cx, y, matchLine(s.cfg), { origin: [0.5, 0], color: 0x8ec5ff, maxWidth: pw - 16 }));
    y += 16;
    this.root.add(txt(this, cx, y, 'send this code (or the link) to your friend', { origin: [0.5, 0], color: COLORS.dim }));
    y += 13;
    this.root.add(txt(this, cx, y, code, { origin: [0.5, 0], scale: 3, color: COLORS.yellow }));
    y += 32;
    const bw = Math.floor((pw - 24) / 2);
    const share = new Button(this, x0 + 8, y, bw, 16, 'share the link', async () => {
      const url = matchLink(code);
      try {
        if (navigator.share && navigator.maxTouchPoints > 0) { await navigator.share({ title: 'a match of golf', text: `play me at silver swings golf: code ${code}`, url }); return; }
        await navigator.clipboard.writeText(url);
        if (share.active) share.setLabel('link copied');
      } catch { if (share.active) share.setLabel('copy failed'); }
    });
    this.root.add(share);
    const copy = new Button(this, x0 + 16 + bw, y, bw, 16, 'copy the code', async () => {
      try { await navigator.clipboard.writeText(code); if (copy.active) copy.setLabel('copied'); } catch { if (copy.active) copy.setLabel('copy failed'); }
    }, { color: 'grey' });
    this.root.add(copy);
    y += 24;
    const waiting = this.live?.caughtUp ? 'waiting for your friend to join...' : this.note || 'connecting...';
    this.root.add(txt(this, cx, y, waiting, { origin: [0.5, 0], color: COLORS.white }));
    void by;
  }

  private buildJoin(x0: number, y: number, pw: number, by: number) {
    const cx = x0 + pw / 2;
    const i = this.info;
    const live = this.live;
    const s = live?.session?.state;
    if (!i || !i.exists) return;
    this.root.add(txt(this, cx, y, `${i.players[0] ?? 'a friend'} ${i.phase === 'waiting' ? 'invites you to a match' : 'vs ' + (i.players[1] ?? '?')}`, { origin: [0.5, 0], scale: 2, maxWidth: pw - 16 }));
    y += 24;
    this.root.add(txt(this, cx, y, matchLine(i), { origin: [0.5, 0], color: 0x8ec5ff, maxWidth: pw - 16 }));
    y += 14;
    this.root.add(txt(this, cx, y, 'match play: the lower score wins each hole; you take turns, farthest from the hole first', { origin: [0.5, 0], color: COLORS.dim, maxWidth: pw - 20 }));
    y += 26;
    // a player already (continuing): onLive takes it on; a newcomer joins here
    if (!live || !live.caughtUp || live.seat !== null || !s || s.players[1]) return;
    const named = !!app.settings.playerName && app.settings.playerName !== DEFAULT_NAME;
    this.root.add(txt(this, x0 + 10, y + 3, 'you play as', { color: COLORS.dim }));
    this.root.add(new Button(this, x0 + 80, y, 120, 15, named ? app.settings.playerName : 'enter your name', () => this.editName(), { color: named ? 'grey' : 'orange' }));
    y += 19;
    this.root.add(txt(this, x0 + 10, y + 3, 'hand', { color: COLORS.dim }));
    (['right', 'left'] as const).forEach((h, k) => {
      const on = (h === 'left') === app.settings.lefty;
      this.root.add(new Button(this, x0 + 80 + k * 62, y, 58, 15, h, () => { app.settings.lefty = h === 'left'; void saveSettings(app.settings); this.rebuild(); }, { color: on ? 'orange' : 'grey' }));
    });
    this.root.add(new Button(this, x0 + pw - 98, by, 90, 16, 'join match', () => void this.join(), { color: named ? 'orange' : 'grey' }));
  }

  private editName() {
    askName(this, app.settings.playerName, (name) => {
      if (name) { app.settings.playerName = name; void saveSettings(app.settings); }
      if (this.sys.isActive()) this.rebuild();
    }, 'your name for the match', { why: 'your friend sees it on their screen' });
  }

  private async join() {
    const live = this.live;
    if (!live || this.busy) return;
    if (!app.settings.playerName || app.settings.playerName === DEFAULT_NAME) { this.editName(); return; }
    this.busy = true;
    this.note = 'joining...';
    this.rebuild();
    const r = await live.client.send({ t: 'join', player: { name: app.settings.playerName, lefty: app.settings.lefty } });
    if (!this.sys.isActive()) return;
    this.busy = false;
    if (!r.ok) { this.note = r.message || r.code; this.rebuild(); return; }
    // the server's "seat" message and the joined event follow: onLive goes to the tee
  }
}

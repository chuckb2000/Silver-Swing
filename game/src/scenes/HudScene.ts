// HUD overlay for the Play scene: panels, buttons, swing meter, mini-map,
// banners and the modal dialogs (scorecard, relief, overview, pause).

import { isListedEagle, nameRound } from '../save/eagleReport';
import { DEFAULT_NAME } from '../save/names';
import { askName } from '../ui/nameInput';
import Phaser from 'phaser';
import { clearSnapshot } from '../save/snapshot';
import { app, fmtDist, PX_PER_M, unitLabel, YD } from '../app';
import { sfx } from '../audio/sfx';
import { FULL_MAX, PART_MAX, ZONE_REACH } from '../systems/swing/meter';
import { GOOD_BAND, missWord, perfectHalfWidth, PuttStrike, Strike } from '../systems/swing/outcome';
import { lieModsFor } from '../systems/rules/lie';
import { ReliefArea } from '../systems/rules/relief';
import { HoleScore, scoreName, toPar, totals } from '../systems/rules/scoring';
import { SimEvent } from '../systems/physics/sim';
import { SURFACE_LABEL } from '../systems/physics/surfaces';
import { Button, COLORS, dimmer, Panel, setTxt, txt } from '../ui/widgets';
import { uiCamera } from '../scale';
import type { PlayScene } from './PlayScene';
import { finishRound } from './flow';
import { courseHoleFor } from '../systems/game/round';
import { cardBlocks, holeName, lengthOf, shapeOfCourse } from '../systems/game/lengths';
import { strokeLabel } from '../systems/game/strokes';
import type { LeaderboardEntry } from '../save/entry';
import { DRILL_BALLS, PUTTING_GREENS, RangeShot } from '../systems/game/practice';
import type { Club } from '../data/clubs';
import type { SimResult } from '../systems/physics/sim';
import { clockText, holeLive, holeNo, holesLeft, isExtra, ordinal, other, statusText } from '../systems/match/rules';
import { CLOCK } from '../systems/match/types';
import type { ChatMsg, HoleResult, Seat } from '../systems/match/types';
import { matchCard } from '../ui/matchCard';
import { confirmBox } from '../ui/confirm';
import { openChat } from '../ui/chatPanel';
import { ClockView, createLiveMatch, forgetMatch, LiveMatch, newMatchConfig } from '../match/live';

/** The other player's rematch offer, which the server took before this player's: once it has arrived (null after 3 s). */
async function rematchOffered(live: LiveMatch): Promise<string | null> {
  const find = (): string | null => {
    const ms = live.session;
    if (!ms) return null;
    const r = ms.state.rematch;
    if (r && r.by !== live.seat) return r.code;
    for (const e of ms.queue) if (e.t === 'rematch' && e.by !== live.seat) return e.code;
    return null;
  };
  for (let i = 0; i < 30; i++) {
    const c = find();
    if (c) return c;
    if (i === 0) live.client.resync();
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

type Modal = 'relief' | 'drop' | 'card' | 'overview' | 'pause' | 'holed' | 'rewatch' | 'mhole' | 'mwait' | 'mover' | 'mrewatch' | 'mlink' | null;

/** The live match's own panels: the pause menu opens over them, and closing it brings them back. */
const MATCH_PANELS: Modal[] = ['mhole', 'mwait', 'mover', 'mrewatch'];

export class HudScene extends Phaser.Scene {
  play!: PlayScene;
  private W = 480;
  private H = 270;
  private root!: Phaser.GameObjects.Container;
  private modalLayer!: Phaser.GameObjects.Container;
  private modal: Modal = null;
  // top-left
  private cardBtn!: Button;
  private holeBox!: Panel;
  private holeTxt!: Phaser.GameObjects.BitmapText;
  private info!: Panel;
  private infoLines: Phaser.GameObjects.BitmapText[] = [];
  private elevArrow!: Phaser.GameObjects.Image;
  private elevTxt!: Phaser.GameObjects.BitmapText;
  // top-right
  private windPanel!: Panel;
  private windArrow!: Phaser.GameObjects.Image;
  private windTxt!: Phaser.GameObjects.BitmapText;
  private miniPanel!: Panel;
  private mini!: Phaser.GameObjects.Image;
  private miniG!: Phaser.GameObjects.Graphics;
  private mapBtn!: Button;
  private menuBtn!: Button;
  // bottom
  private aimL!: Button;
  private aimR!: Button;
  private aimLabel!: Panel;
  private clubPanel!: Panel;
  private clubIcon!: Phaser.GameObjects.Image;
  private clubName!: Phaser.GameObjects.BitmapText;
  private clubCarry!: Phaser.GameObjects.BitmapText;
  private clubUp!: Button;
  private clubDown!: Button;
  private spinBtn!: Button;
  private scaleBtn!: Button;
  private unplayBtn!: Button;
  private mulliganBtn!: Button;
  private swingBtn!: Button;
  private meterPanel!: Panel;
  private meterG!: Phaser.GameObjects.Graphics;
  private meterLabels: Phaser.GameObjects.BitmapText[] = [];
  private meterRead!: Phaser.GameObjects.BitmapText;
  private offArrow!: Phaser.GameObjects.Image;
  // banners
  private banner!: Phaser.GameObjects.BitmapText;
  private sub!: Phaser.GameObjects.BitmapText;
  private bannerTimer?: Phaser.Time.TimerEvent;
  private intro: Phaser.GameObjects.Container | null = null;
  reliefTitle = '';
  // the practice ground's panel (target / green, wind or drill, the other area, a tally)
  private practiceBox: Panel | null = null;
  private practiceLabel!: Phaser.GameObjects.BitmapText;
  private practiceA!: Button;
  private practiceB!: Button;
  private practiceStats!: Phaser.GameObjects.BitmapText;
  // a live match: names and standing at the top, the other player's turn at the bottom
  private matchBar: Panel | null = null;
  private matchNames!: Phaser.GameObjects.BitmapText;
  private matchStatus!: Phaser.GameObjects.BitmapText;
  private matchLink!: Phaser.GameObjects.BitmapText;
  private matchDots!: Phaser.GameObjects.Graphics;
  private giveBtn!: Button;
  /** the move clock: a penalty stroke for slow play, and claiming the match, for the player kept waiting */
  private penBtn!: Button;
  private claimBtn!: Button;
  /** where the match bar is (the buttons under it line up there) */
  private barMid = 0;
  private barTop = 0;
  /** the clock whose 3:30 warning has been given (once per shot) */
  private warnedTurn = -1;
  /** the clock whose claim has been sounded for the waiting player */
  private claimSounded = -1;
  /** the waiting panel's clock line, and whether it offers the claim (drawn again when that changes) */
  private waitClock: Phaser.GameObjects.BitmapText | null = null;
  private waitClaim = false;
  /** when the match bar was last brought up to date (the clock moves on by itself) */
  private matchAt = 0;
  private watchPanel!: Panel;
  private watchTxt!: Phaser.GameObjects.BitmapText;
  private lastMatchResult: HoleResult | null = null;
  /** the match panel the pause menu was opened over (shown again when it closes) */
  private pauseReturn: (() => void) | null = null;
  /** the hole whose result has sounded (a redraw of its panel stays quiet) */
  private soundedHole = -1;
  /** who was online when the waiting panel was drawn (it is drawn again when that changes) */
  private waitOnline = '';
  /** a text kept for measuring the match bar's names (made once, not every frame) */
  private probe: Phaser.GameObjects.BitmapText | null = null;
  /**
   * Chat (developer, 2026-10-22): a button under the menu button with the
   * number of unread messages, and a note under the match bar when one comes.
   * Above the match panels (between holes is when players talk), below the card.
   */
  private chatLayer: Phaser.GameObjects.Container | null = null;
  private chatBtn!: Button;
  private chatBadge!: Phaser.GameObjects.Container;
  private chatBadgeTxt!: Phaser.GameObjects.BitmapText;
  private chatNote!: Panel;
  private chatNoteTxt!: Phaser.GameObjects.BitmapText;
  private chatNoteTimer: Phaser.Time.TimerEvent | null = null;
  /** the chat panel is open */
  private chatting = false;
  /** a message that came during this player's shot: shown once the shot is over (developer: no distraction while hitting) */
  private heldNote: ChatMsg | null = null;
  /** the "press T to chat" hint has been considered on this page */
  private chatHinted = false;
  /** the banner on screen: when it went up and for how long (a banner that follows waits for it) */
  private bannerAt = 0;
  private bannerFor = 0;
  private queuedFlash: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('hud');
  }

  create() {
    // Phaser reuses this object when the scene starts again (the next round in the same
    // tab): forget the last round's objects, which were destroyed when it stopped. Left
    // in place, refresh() wrote to destroyed text and froze the game on the second round
    // (developer, 2026-10-19: "freezes when I load a course for the first time").
    this.infoLines = [];
    this.meterLabels = [];
    this.intro = null;
    this.modal = null;
    this.cardLayer = null;
    this.modalBeforeCard = null;
    this.bannerTimer = undefined;
    this.redraw = null;
    this.practiceBox = null;
    this.matchBar = null;
    this.lastMatchResult = null;
    this.pauseReturn = null;
    this.soundedHole = -1;
    this.waitOnline = '';
    this.warnedTurn = -1;
    this.claimSounded = -1;
    this.waitClock = null;
    this.waitClaim = false;
    this.matchAt = 0;
    this.probe = null;
    this.chatLayer = null;
    this.chatNoteTimer = null;
    this.chatting = false;
    this.heldNote = null;
    this.chatHinted = false;
    this.bannerAt = 0;
    this.bannerFor = 0;
    this.queuedFlash = null;
    this.play = this.scene.get('play') as PlayScene;
    uiCamera(this.cameras.main);
    this.W = app.view.w;
    this.H = app.view.h;
    this.root = this.add.container(0, 0);
    this.modalLayer = this.add.container(0, 0).setDepth(100);
    this.build();
    this.layout();
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    this.refresh();
  }

  /** Draws the open dialog again (after a resize or a phone turning), so its buttons stay on screen. */
  private redraw: (() => void) | null = null;

  private onResize() {
    uiCamera(this.cameras.main);
    this.W = app.view.w;
    this.H = app.view.h;
    this.layout();
    if (this.modal && this.redraw) this.redraw();
    this.refresh();
  }

  // ------------------------------------------------------------------ build
  private build() {
    const p = this.play;
    this.cardBtn = new Button(this, 0, 0, 30, 14, 'card', () => this.toggleCard());
    this.holeBox = new Panel(this, 0, 0, 30, 14);
    const flagI = this.add.image(4, 3, 'ui', 'flag_icon').setOrigin(0, 0);
    this.holeTxt = txt(this, 14, 2, '1');
    this.holeBox.add([flagI, this.holeTxt]);
    this.info = new Panel(this, 0, 0, 74, 48);
    for (let i = 0; i < 4; i++) {
      const t = txt(this, 5, 3 + i * 11, '');
      this.infoLines.push(t);
      this.info.add(t);
    }
    // height of the pin above or below the ball, after the distance (developer, 2026-10-20)
    this.elevArrow = this.add.image(0, 3 + 2 * 11 + 3, 'ui', 'arrow_down').setOrigin(0, 0).setVisible(false);
    this.elevTxt = txt(this, 0, 3 + 2 * 11, '', { color: COLORS.dim });
    this.info.add([this.elevArrow, this.elevTxt]);
    this.windPanel = new Panel(this, 0, 0, 44, 46);
    const wl = txt(this, 22, 2, 'wind', { origin: [0.5, 0], color: COLORS.dim });
    this.windArrow = this.add.image(22, 22, 'ui', 'wind_0');
    this.windTxt = txt(this, 22, 33, '0', { origin: [0.5, 0] });
    this.windPanel.add([wl, this.windArrow, this.windTxt]);
    this.miniPanel = new Panel(this, 0, 0, 80, 80);
    this.mini = this.add.image(3, 3, 'mini_1').setOrigin(0, 0);
    this.miniG = this.add.graphics();
    this.miniPanel.add([this.mini, this.miniG]);
    this.mapBtn = new Button(this, 0, 0, 26, 13, 'map', () => this.toggleOverview(), { color: 'grey' });
    // the pause menu (also Esc): resume, settings, save and exit, quit the round
    this.menuBtn = new Button(this, 0, 0, 30, 14, 'menu', () => this.togglePause(), { color: 'grey' });

    // aim: a tap nudges the target a little; holding moves it, faster the longer it is held
    this.aimL = new Button(this, 0, 0, 16, 15, '', () => undefined, { icon: 'arrow_left', sound: null });
    this.aimR = new Button(this, 0, 0, 16, 15, '', () => undefined, { icon: 'arrow_right', sound: null });
    this.aimLabel = new Panel(this, 0, 0, 26, 15);
    this.aimLabel.add(txt(this, 13, 2, 'aim', { origin: [0.5, 0] }));
    for (const b of [this.aimL, this.aimR]) this.holdRepeat(b, b === this.aimL ? 1 : -1);
    this.clubPanel = new Panel(this, 0, 0, 66, 42);
    this.clubIcon = this.add.image(33, 9, 'ui', 'club_driver');
    this.clubName = txt(this, 33, 16, 'driver', { origin: [0.5, 0] });
    this.clubCarry = txt(this, 33, 27, '', { origin: [0.5, 0], color: COLORS.dim });
    this.clubPanel.add([this.clubIcon, this.clubName, this.clubCarry]);
    this.clubUp = new Button(this, 0, 0, 15, 20, '', () => p.cycleClub(-1), { icon: 'arrow_up', sound: null });
    this.clubDown = new Button(this, 0, 0, 15, 20, '', () => p.cycleClub(1), { icon: 'arrow_down', sound: null });
    this.spinBtn = new Button(this, 0, 0, 20, 18, '', () => p.setSpin(p.spin === 0 ? 1 : p.spin === 1 ? -1 : 0), { icon: 'spin_0', color: 'grey', sound: null });
    this.scaleBtn = new Button(this, 0, 0, 34, 14, 'full', () => p.cycleScale(), { color: 'grey', sound: null });
    this.unplayBtn = new Button(this, 0, 0, 52, 13, 'unplayable', () => this.openUnplayable(), { color: 'grey' });
    this.mulliganBtn = new Button(this, 0, 0, 52, 13, 'mulligan', () => this.play.takeMulligan(), { color: 'grey' });
    this.swingBtn = new Button(this, 0, 0, 58, 20, 'swing', (ev) => this.onSwingButton(ev.time), { onDown: true, sound: null, scale: 1 });
    this.meterPanel = new Panel(this, 0, 0, 190, 24);
    this.meterG = this.add.graphics();
    this.meterPanel.add(this.meterG);
    for (const v of [25, 50, 75, 100]) {
      const t = txt(this, 0, 0, String(v), { origin: [0.5, 0], color: COLORS.dim });
      this.meterLabels.push(t);
      this.meterPanel.add(t);
    }
    this.meterRead = txt(this, 0, 0, '', { origin: [0.5, 1], color: COLORS.white });
    this.meterRead.setVisible(false);
    this.offArrow = this.add.image(0, 0, 'ui', 'wind_0').setVisible(false).setTint(0xfff2a0);
    this.banner = txt(this, 0, 0, '', { origin: [0.5, 0.5], scale: 2 }).setDepth(50);
    this.sub = txt(this, 0, 0, '', { origin: [0.5, 0.5] }).setDepth(50);
    this.root.add([this.menuBtn, this.cardBtn, this.holeBox, this.info, this.windPanel, this.miniPanel, this.mapBtn, this.aimL, this.aimR, this.aimLabel,
      this.clubPanel, this.clubUp, this.clubDown, this.spinBtn, this.scaleBtn, this.unplayBtn, this.mulliganBtn, this.meterPanel, this.meterRead, this.swingBtn, this.offArrow]);
    if (p.round.cfg.practice) this.buildPractice();
    if (p.match) this.buildMatch();
  }

  /** The match bar (top): both names, who is online, the standing; "give putt"; the other player's turn (bottom). */
  private buildMatch() {
    const bar = new Panel(this, 0, 0, 150, 25, 0.82);
    this.matchNames = txt(this, 75, 3, '', { origin: [0.5, 0] });
    this.matchStatus = txt(this, 75, 13, '', { origin: [0.5, 0], color: COLORS.yellow });
    this.matchDots = this.add.graphics(); // who is online: a green dot before the name (grey: their game is closed)
    bar.add([this.matchNames, this.matchStatus, this.matchDots]);
    this.matchBar = bar;
    this.matchLink = txt(this, 0, 0, '', { origin: [0.5, 0], color: COLORS.red });
    // hidden from the tap until the server has the concession (PlayScene.canGivePutt): no second one
    this.giveBtn = new Button(this, 0, 0, 70, 14, 'give putt', () => this.givePutt(), { color: 'grey' });
    // asked first (a penalty stroke can decide a hole, a claim ends the match)
    this.penBtn = new Button(this, 0, 0, 78, 14, 'penalty stroke', () => this.askPenalty(), { color: 'grey' });
    this.claimBtn = new Button(this, 0, 0, 74, 14, 'claim match', () => this.askClaim());
    this.watchPanel = new Panel(this, 0, 0, 180, 18, 0.85);
    this.watchTxt = txt(this, 90, 4, '', { origin: [0.5, 0] });
    this.watchPanel.add(this.watchTxt);
    this.probe = txt(this, 0, 0, '').setVisible(false);
    this.root.add([bar, this.matchLink, this.giveBtn, this.penBtn, this.claimBtn, this.watchPanel]);
    this.buildChat();
  }

  private buildChat() {
    const live = this.play.match!;
    const layer = this.add.container(0, 0).setDepth(110);
    this.chatBtn = new Button(this, 0, 0, 30, 14, 'chat', () => this.openChat(), { color: 'grey' });
    const badge = this.add.container(0, 0);
    const dot = this.add.graphics();
    dot.fillStyle(0x1c140f, 1).fillRect(0, 0, 12, 10).fillStyle(0xd8402e, 1).fillRect(1, 1, 10, 8);
    this.chatBadgeTxt = txt(this, 6, 1, '', { origin: [0.5, 0] });
    badge.add([dot, this.chatBadgeTxt]);
    this.chatBadge = badge.setVisible(false);
    this.chatNote = new Panel(this, 0, 0, 200, 16, 0.9);
    this.chatNoteTxt = txt(this, 6, 4, '', { color: COLORS.white });
    this.chatNote.add(this.chatNoteTxt);
    this.chatNote.setSize(200, 16).setInteractive(new Phaser.Geom.Rectangle(0, 0, 200, 16), Phaser.Geom.Rectangle.Contains);
    this.chatNote.on('pointerdown', () => this.openChat());
    this.chatNote.setVisible(false);
    layer.add([this.chatBtn, badge, this.chatNote]);
    this.chatLayer = layer;
    const off = live.onChatNews((m) => this.chatArrived(m));
    this.events.once('shutdown', off);
  }

  /** Can the chat open now (a match with two players, on a server that has chat)? */
  chatAvailable(): boolean {
    return !!this.play.match?.chatReady && !this.chatting;
  }

  /** The chat panel (a swing in progress stops first: the meter mustn't run out under it). */
  openChat() {
    const live = this.play.match;
    if (!live || !this.chatAvailable()) return;
    this.play.cancelSwing();
    this.hideChatNote();
    this.chatting = true;
    try { localStorage.setItem('golf:chat:used', '1'); } catch { /* blocked */ } // found it: no more hints
    openChat(this, live, this.play.me, () => { this.chatting = false; if (this.sys.isActive()) this.refresh(); });
    this.refresh();
  }

  /**
   * Is this player hitting: aiming, swinging, their stroke on its way or in
   * the air, a drop to take? Chat keeps quiet then (developer, 2026-10-22: "i
   * don't want the chat to distract players while they're hitting"): no note,
   * no sound, no count, until the ball has stopped and the turn has passed.
   */
  private hitting(): boolean {
    const p = this.play;
    const ms = p.match?.session;
    if (!ms) return false;
    if (['aim', 'swing', 'commit', 'relief', 'drop'].includes(p.state)) return true;
    return (p.state === 'flight' || p.state === 'settle') && p.round === ms.rounds[p.me];
  }

  /** A message from the other player while the panel is shut: a note under the match bar for a few seconds, and a sound (held while hitting). */
  private chatArrived(m: ChatMsg) {
    if (!this.chatLayer || this.chatting || !this.sys.isActive()) return;
    if (this.hitting()) { this.heldNote = m; this.refresh(); return; }
    this.showChatNote(m);
  }

  private showChatNote(m: ChatMsg) {
    if (!this.chatLayer) return;
    const who = (this.play.oppName() || 'your friend').slice(0, 12);
    // the pixel font has plain letters only (emoji and the like are left out here; the panel shows them)
    const text = `${who}: ${m.text}`.replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim();
    const w = Math.min(260, this.W - 16);
    const max = Math.floor((w - 12) / 5) * 2 - 3; // two lines of text
    setTxt(this.chatNoteTxt, text.length > max ? `${text.slice(0, max)}...` : text);
    this.chatNoteTxt.setMaxWidth(w - 12).setTint(COLORS.white);
    const h = Math.round(this.chatNoteTxt.height) + 8;
    this.chatNote.resize(w, h, 0.9);
    this.chatNote.setSize(w, h);
    (this.chatNote.input!.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, w, h);
    this.placeChatNote();
    this.chatNote.setVisible(true);
    sfx('tick', 1.4);
    this.chatNoteTimer?.remove();
    this.chatNoteTimer = this.time.delayedCall(6000, () => this.hideChatNote());
    this.refresh();
  }

  /** The hint is shown once per match, and not at all once the player has opened the chat. */
  private chatHintDue(code: string): boolean {
    try {
      if (localStorage.getItem('golf:chat:used')) return false;
      const key = `golf:match:${code}:chathint`;
      if (localStorage.getItem(key)) return false;
      localStorage.setItem(key, '1');
      return true;
    } catch { return true; }
  }

  /** "press t to chat with kevin" (on a phone: "tap chat"), in the note's place under the match bar, a little longer. */
  private showChatHint() {
    const who = (this.play.oppName() || 'your friend').slice(0, 12);
    let touch = false;
    try { touch = navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches; } catch { /* a computer */ }
    const text = touch ? `tap chat (top right) to talk to ${who}` : `press t (or tap chat) to chat with ${who}`;
    const w = Math.min(260, this.W - 16);
    setTxt(this.chatNoteTxt, text);
    this.chatNoteTxt.setMaxWidth(w - 12).setTint(COLORS.yellow);
    const h = Math.round(this.chatNoteTxt.height) + 8;
    this.chatNote.resize(w, h, 0.9);
    this.chatNote.setSize(w, h);
    (this.chatNote.input!.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, w, h);
    this.placeChatNote();
    this.chatNote.setVisible(true);
    this.chatNoteTimer?.remove();
    this.chatNoteTimer = this.time.delayedCall(8000, () => this.hideChatNote());
  }

  private hideChatNote() {
    this.chatNoteTimer?.remove();
    this.chatNoteTimer = null;
    if (this.chatLayer) this.chatNote.setVisible(false);
  }

  /** The chat button under the menu button; the note under the match bar (and its buttons). */
  private placeChat() {
    if (!this.chatLayer) return;
    const x = this.W - 48 - 34, y = 20;
    this.chatBtn.setPosition(x, y);
    this.chatBadge.setPosition(x - 6, y - 5); // on the corner, clear of the label
    this.placeChatNote();
  }

  private placeChatNote() {
    if (!this.chatLayer) return;
    const w = this.chatNote.pw;
    this.chatNote.setPosition(Math.round(Math.max(4, Math.min(this.W - 4 - w, this.barMid - w / 2))), this.barTop + 55);
  }

  /** The practice ground's panel: change target or green, wind or drill distance, go to the other area. */
  private buildPractice() {
    const p = this.play;
    const w = 150;
    const box = new Panel(this, 0, 0, w, 50);
    const prev = new Button(this, 4, 3, 16, 13, '', () => p.practiceStep(-1), { icon: 'arrow_left', color: 'grey' });
    const next = new Button(this, w - 20, 3, 16, 13, '', () => p.practiceStep(1), { icon: 'arrow_right', color: 'grey' });
    this.practiceLabel = txt(this, w / 2, 5, '', { origin: [0.5, 0] });
    this.practiceA = new Button(this, 4, 19, 70, 13, ' ', () => {
      if (p.round.holeNumber <= 5) p.practiceToggleWind(); else p.practiceCycleDrill();
    }, { color: 'grey' });
    this.practiceB = new Button(this, 76, 19, 70, 13, ' ', () => p.practiceStep(0, true));
    this.practiceStats = txt(this, 5, 36, '', { color: COLORS.dim, maxWidth: w - 8 });
    box.add([prev, next, this.practiceLabel, this.practiceA, this.practiceB, this.practiceStats]);
    this.practiceBox = box;
    this.root.add(box);
  }

  private refreshPractice() {
    const box = this.practiceBox;
    const pr = this.play.practice;
    if (!box || !pr) return;
    const r = this.play.round;
    const range = r.holeNumber <= 5;
    box.setVisible(this.play.state === 'aim' && !this.modal);
    if (range) {
      setTxt(this.practiceLabel, `${app.settings.units === 'yd' ? `${r.tee.cardYd} yd` : `${Math.round(r.tee.cardYd * YD)} m`} target`);
      this.practiceA.setLabel(`wind: ${pr.wind ? 'on' : 'off'}`);
      this.practiceB.setLabel('putting green');
      const c = pr.log.avgCarry(this.play.club.id);
      setTxt(this.practiceStats, c ? `${this.play.club.name}: ${c.n} ${c.n === 1 ? 'ball' : 'balls'}, avg carry ${fmtDist(c.avg)} ${unitLabel()}` : 'no balls with this club yet');
    } else {
      setTxt(this.practiceLabel, `green: ${PUTTING_GREENS[r.holeNumber - 6] ?? ''}`);
      const d = pr.log.drill;
      this.practiceA.setLabel(`${d.ft} ft putts`);
      this.practiceB.setLabel('range');
      setTxt(this.practiceStats, `ball ${d.ball + 1} of ${DRILL_BALLS}  ·  holed ${d.holed}`);
    }
  }

  /** A range ball has stopped: carry, total, and how far off line. */
  practiceRangeShot(rs: RangeShot, club: Club) {
    if (rs.holed) { this.flash('in the hole!', COLORS.yellow, `${club.name}  ·  carry ${fmtDist(rs.carry)} ${unitLabel()}`, 1500); return; }
    const off = Math.abs(rs.offline);
    const line = off < 1 ? 'on line' : `${fmtDist(off)} ${unitLabel()} ${rs.offline > 0 ? 'right' : 'left'}`;
    this.flash(`carry ${fmtDist(rs.carry)} ${unitLabel()}`, COLORS.white, `total ${fmtDist(rs.total)} ${unitLabel()}  ·  ${line}`, 1500);
    this.refresh();
  }

  /** A drill putt has stopped: holed, or how far long or short; after ten, the set's tally. */
  practicePutt(sim: SimResult, from: { x: number; y: number }, cup: { x: number; y: number }, setDone: boolean) {
    const log = this.play.practice?.log;
    if (setDone && log?.lastSet) {
      const s = log.lastSet;
      this.flash(`${s.holed} of ${DRILL_BALLS} holed`, s.holed >= 7 ? COLORS.yellow : COLORS.white, `from ${s.ft} ft  ·  ten more`, 2000);
    } else if (sim.holed) {
      this.flash('holed!', COLORS.green, '', 1000);
    } else {
      const ux = cup.x - from.x, uy = cup.y - from.y, L = Math.hypot(ux, uy) || 1;
      const along = ((sim.end.x - cup.x) * ux + (sim.end.y - cup.y) * uy) / L;
      const d = Math.hypot(sim.end.x - cup.x, sim.end.y - cup.y);
      this.flash(`${distLabel(d).replace(/(\d)(ft|m)$/, '$1 $2')} ${along > 0 ? 'long' : 'short'}`, COLORS.white, '', 1000);
    }
    this.refresh();
  }

  private holdRepeat(b: Button, dir: number) {
    let timer: Phaser.Time.TimerEvent | null = null;
    let since = 0;
    b.on('pointerdown', () => {
      if (!b.enabled) return;
      timer?.remove();
      this.play.aimStep(dir);
      since = this.time.now;
      let last = since;
      timer = this.time.addEvent({
        delay: 16, loop: true, callback: () => {
          const now = this.time.now;
          this.play.aimHold(dir, now - since, now - last);
          last = now;
        },
      });
    });
    const stop = () => { timer?.remove(); timer = null; };
    b.on('pointerup', stop);
    b.on('pointerout', stop);
  }

  private layout() {
    const W = this.W, H = this.H;
    const portrait = H > W;
    this.cardBtn.setPosition(4, 4);
    this.holeBox.setPosition(37, 4);
    this.info.setPosition(4, 21);
    this.windPanel.setPosition(W - 48, 4);
    this.menuBtn.setPosition(W - 48 - 34, 4);
    // mini-map under the wind panel
    this.miniPanel.setPosition(W - 4 - this.miniPanel.pw, 54);
    this.mapBtn.setPosition(W - 4 - 26, 54 + this.miniPanel.ph + 3);
    const by = H - 4;
    this.clubPanel.setPosition(4, by - 42);
    this.clubUp.setPosition(72, by - 42);
    this.clubDown.setPosition(72, by - 20);
    this.aimL.setPosition(4, by - 42 - 19);
    this.aimLabel.setPosition(22, by - 42 - 19);
    this.aimR.setPosition(50, by - 42 - 19);
    this.swingBtn.setPosition(W - 62, by - 20);
    this.spinBtn.setPosition(W - 62 - 24, by - 19);
    // landscape: the meter sits between the club controls (left) and the scale/spin/swing buttons (right)
    const gapL = 4 + 66 + 4 + 15 + 6, gapR = W - 62 - 24 - 38 - 6;
    const mw = portrait ? Math.min(220, W - 16) : Math.max(120, Math.min(220, gapR - gapL));
    this.meterPanel.resize(mw, 24);
    if (portrait) {
      this.meterPanel.setPosition(Math.round((W - mw) / 2), by - 42 - 19 - 32);
    } else {
      this.meterPanel.setPosition(Math.round(gapL + (gapR - gapL - mw) / 2), by - 24);
    }
    this.meterRead.setPosition(Math.round(this.meterPanel.x + mw / 2), this.meterPanel.y - 2);
    this.scaleBtn.setPosition(W - 62 - 24 - 38, by - 18);
    this.unplayBtn.setPosition(4, 21 + 48 + 3);
    this.mulliganBtn.setPosition(4, 21 + 48 + 3 + 16);
    this.practiceBox?.setPosition(4, 21 + 48 + 3);
    if (this.matchBar) {
      // between the info panel (left: it starts at y 21, under the bar's bottom, so the bar clears its right
      // edge at 78) and the menu button (right); on a narrow phone, under them
      const left = 4 + 74 + 4, right = W - 48 - 34 - 4;
      let bw: number, bx: number, top: number;
      if (right - left >= 110) {
        bw = Math.min(170, right - left);
        bx = Math.round(left + (right - left - bw) / 2);
        top = 4;
      } else {
        // a narrow phone: under the info panel and its buttons, clear of the mini-map column; if that
        // leaves too little room, under the mini-map and its button, the whole width
        const miniLeft = W - 4 - this.miniPanel.pw - 4;
        if (miniLeft - 4 >= 110) {
          bw = Math.min(170, miniLeft - 4);
          bx = Math.round(4 + (miniLeft - 4 - bw) / 2);
          top = 21 + 48 + 3 + 34;
        } else {
          bw = Math.min(170, W - 8);
          bx = Math.round((W - bw) / 2);
          top = 54 + this.miniPanel.ph + 3 + 13 + 6;
        }
      }
      this.matchBar.resize(bw, 25);
      this.matchBar.setPosition(bx, top);
      this.matchNames.setX(Math.round(bw / 2));
      this.matchStatus.setX(Math.round(bw / 2));
      this.matchLink.setPosition(Math.round(bx + bw / 2), top + 27);
      this.barMid = Math.round(bx + bw / 2);
      this.barTop = top;
      this.placeMatchButtons();
      const ww = Math.min(220, W - 16);
      this.watchPanel.resize(ww, 18);
      this.watchPanel.setPosition(Math.round((W - ww) / 2), H - 4 - 18 - (portrait ? 40 : 0));
      this.watchTxt.setX(Math.round(ww / 2));
      this.placeChat();
    }
    this.placeBanner();
    if (this.intro) this.showIntro();
  }

  // ------------------------------------------------------------------ state
  refresh() {
    const p = this.play;
    if (!p || !p.round) return;
    const r = p.round;
    const aiming = p.state === 'aim';
    const swinging = p.state === 'swing';
    setTxt(this.holeTxt, String(r.holeName.num));
    const d = r.distToPin();
    const lieTxt = r.lie ? r.lie.label : '';
    const surf = SURFACE_LABEL[r.surfaceAt()] ?? '';
    setTxt(this.infoLines[0], `par ${r.hole.par}`);
    // a match's penalty strokes for slow play count in the shot number (the Round doesn't hold them)
    setTxt(this.infoLines[1], p.state === 'holed' || p.state === 'replay' || p.state === 'between' || p.state === 'over' ? `${p.state === 'between' || p.state === 'over' ? 'strokes' : 'holed'}: ${r.tally.strokes}` : `shot ${r.tally.strokes + p.slowOf(r) + 1}`);
    // with the putter in hand the distance is in feet (or metres), like the putting meter
    setTxt(this.infoLines[2], p.club.kind === 'putter' ? distLabel(d).replace(/(\d)(ft|m)$/, '$1 $2') : `${fmtDist(d)} ${unitLabel()}`);
    // the pin's height above (up arrow) or below (down) the ball, in feet: elevation changes
    // how far a shot carries (about 4 yd per 10 ft for a 7-iron); not shown when putting or within 3 ft
    const dz = (r.course.terrain.z(r.pin.x, r.pin.y) - r.course.terrain.z(r.ball.x, r.ball.y)) / 0.3048;
    const showElev = p.club.kind !== 'putter' && Math.abs(dz) >= 3 && !r.cfg.practice;
    this.elevArrow.setVisible(showElev);
    setTxt(this.elevTxt, showElev ? `${Math.round(Math.abs(dz))} ft` : '');
    if (showElev) {
      const x = this.infoLines[2].x + this.infoLines[2].width + 4;
      this.elevArrow.setFrame(dz > 0 ? 'arrow_up' : 'arrow_down').setX(x);
      this.elevTxt.setX(x + 7);
      if (this.elevTxt.x + this.elevTxt.width > 71) setTxt(this.elevTxt, `${Math.round(Math.abs(dz))}ft`); // 3 digits: fits the panel
    }
    setTxt(this.infoLines[3], r.ball.teedUp ? 'tee' : lieTxt || surf);
    this.infoLines[3].setTint(r.lie && r.penalLie() ? COLORS.yellow : COLORS.green);
    if (r.cfg.practice) {
      setTxt(this.infoLines[0], r.holeNumber <= 5 ? 'range' : 'putting green');
      setTxt(this.infoLines[1], 'practice');
      setTxt(this.holeTxt, r.holeNumber <= 5 ? `${r.holeNumber}` : `${r.holeNumber - 5}`);
    }
    this.cardBtn.setVisible(!r.cfg.practice);
    // wind
    const w = r.wind;
    const k = ((Math.round(w.dir / (Math.PI / 8)) % 16) + 16) % 16;
    this.windArrow.setFrame(`wind_${k}`).setVisible(w.mph >= 0.5);
    setTxt(this.windTxt, w.mph < 0.5 ? 'calm' : w.mph.toFixed(1));
    // club
    const c = p.club;
    this.clubIcon.setFrame(`club_${c.kind === 'driver' ? 'driver' : c.kind}`);
    setTxt(this.clubName, c.name);
    if (c.kind === 'putter') setTxt(this.clubCarry, `100%: ${puttScaleLabel(p.puttScale)}`);
    else setTxt(this.clubCarry, `${fmtDist(r.carryFor(c, p.swingScale))} ${unitLabel()}`);
    this.spinBtn.setIcon(`spin_${p.spin}`).setVisible(c.kind !== 'putter');
    this.scaleBtn.setLabel(c.kind === 'putter' ? puttScaleLabel(p.puttScale) : swingLabel(p.swingScale)).setVisible(true);
    for (const b of [this.aimL, this.aimR, this.clubUp, this.clubDown, this.spinBtn, this.scaleBtn]) b.setEnabled(aiming);
    this.swingBtn.setEnabled(aiming || swinging);
    this.swingBtn.setLabel(c.kind === 'putter' ? 'putt' : 'swing');
    this.unplayBtn.setVisible(aiming && !r.ball.teedUp && r.tally.strokes > 0 && !r.onHoleGreen());
    this.mulliganBtn.setVisible(aiming && r.cfg.settings.mulligans && !r.mulliganUsed && r.shotNo > 0);
    const showCtl = !['intro', 'holed', 'loading', 'relief', 'drop', 'watch', 'between', 'over', 'idle'].includes(p.state); // not behind the relief / drop panels
    for (const o of [this.aimL, this.aimR, this.aimLabel, this.clubPanel, this.clubUp, this.clubDown, this.swingBtn, this.meterPanel]) o.setVisible(showCtl);
    if (!showCtl) { this.spinBtn.setVisible(false); this.scaleBtn.setVisible(false); this.unplayBtn.setVisible(false); this.mulliganBtn.setVisible(false); }
    // minimap
    const mm = app.course!.json.maps.holes.find((m) => m.hole === r.courseHole)!;
    if (this.mini.texture.key !== `mini_${r.courseHole}`) this.mini.setTexture(`mini_${r.courseHole}`);
    if (this.miniPanel.pw !== mm.w + 6 || this.miniPanel.ph !== mm.h + 6) {
      this.miniPanel.resize(mm.w + 6, mm.h + 6);
      this.layout();
    }
    this.drawMini();
    this.refreshPractice();
    this.refreshMatch();
  }

  /** The match bar and the other player's turn, kept up to date. */
  private refreshMatch() {
    const p = this.play;
    const live = p.match;
    if (!this.matchBar || !live?.session) return;
    const s = live.session.state;
    const me = p.me;
    const turn = live.session.turn;
    // names cut to fit the bar (two 16-letter names ran past its ends)
    const nm = (k: Seat) => (k === me ? 'you' : (s.players[k]?.name ?? '?').slice(0, 9));
    const n0 = `${nm(0)}${turn === 0 ? ' <' : ''}`, n1 = `${nm(1)}${turn === 1 ? ' <' : ''}`;
    setTxt(this.matchNames, `  ${n0}      ${n1}`);
    // a dot before each name: green when that player's game is open
    const g = this.matchDots;
    g.clear();
    const probe = this.probe!;
    setTxt(probe, `  ${n0}      `);
    const x0 = Math.round(this.matchNames.x - this.matchNames.width / 2);
    for (const k of [0, 1] as Seat[]) {
      const on = k === me ? live.status === 'online' || live.status === 'polling' : live.online[k];
      const dx = k === 0 ? x0 + 3 : x0 + Math.round(probe.width) + 3 - 9;
      g.fillStyle(0x0b0f13, 1).fillRect(dx - 1, 5, 5, 5);
      g.fillStyle(on ? 0x6fdc7a : 0x6b737d, 1).fillRect(dx, 6, 3, 3);
    }
    const between = s.phase === 'playing' && !holeLive(s);
    const hn = live.session.holeNumber;
    const where = s.phase !== 'playing' ? '' : between ? `  ·  thru ${s.results.length}` : isExtra(s.cfg, s.hole) ? `  ·  ${ordinal(s.hole + 1)}: hole ${hn}` : `  ·  hole ${hn}`;
    setTxt(this.matchStatus, `${statusText(s, me)}${where}`);
    let link = '';
    let linkColor: number = COLORS.red;
    const clock = live.clock();
    if (live.status === 'connecting' || live.status === 'offline') link = 'reconnecting...';
    else if (live.status === 'polling') link = 'slow connection';
    else if (live.rebuilding || p.matchBehind()) link = 'catching up...';
    else if (p.commitWait() > 700) link = 'sending...';
    else if (holeLive(s) && turn === other(me) && !live.online[other(me)]) link = `${p.oppName()}'s game is offline${clock && clock.elapsed >= 60_000 ? `  ·  ${clockText(clock.elapsed)}` : ' - waiting'}`;
    else if (clock) { const l = this.clockLine(clock); if (l) { link = l.text; linkColor = l.color; } }
    setTxt(this.matchLink, link);
    this.matchLink.setTint(linkColor);
    this.matchLink.setVisible(!!link);
    this.giveBtn.setVisible(p.canGivePutt() && !this.modal).setEnabled(true);
    if (this.chatLayer) {
      const ready = live.chatReady && !this.cardLayer;
      this.chatBtn.setVisible(ready).setEnabled(true);
      const n = live.chatUnread;
      // nothing new shows while this player is hitting; what came meanwhile shows when the shot is over
      const quiet = this.hitting();
      const flag = ready && n > 0 && !this.chatting && !quiet;
      this.chatBadge.setVisible(flag);
      setTxt(this.chatBadgeTxt, n > 9 ? '+' : String(n));
      this.chatBtn.setColor(flag ? 'orange' : 'grey');
      if (!ready || quiet) this.hideChatNote();
      // once per match, until the player has found the chat: how to open it (developer, 2026-10-22: "otherwise
      // I don't think people will figure it out"); not while hitting, and not over a message
      if (ready && !quiet && !this.chatHinted && !this.chatting && !this.heldNote) {
        this.chatHinted = true;
        if (n === 0 && this.chatHintDue(live.code)) this.showChatHint();
      }
      if (ready && !quiet && this.heldNote) {
        const m = this.heldNote;
        this.heldNote = null;
        if (!this.chatting && m.id > 0 && live.chatUnread > 0) this.showChatNote(m);
      }
    }
    const choice = p.clockChoice();
    this.penBtn.setVisible(choice.penalty && !this.modal).setEnabled(true);
    this.claimBtn.setVisible(choice.claim && !this.modal && p.state === 'watch').setEnabled(true);
    this.placeMatchButtons();
    if (clock) this.clockNotice(clock, choice.claim);
    if (this.modal === 'mwait') {
      // the waiting panel's clock, and its claim (drawn again when that comes)
      if (choice.claim !== this.waitClaim) this.matchWaiting();
      else if (this.waitClock) setTxt(this.waitClock, clock && clock.waiter === me && clock.elapsed >= 60_000 ? `waiting ${clockText(clock.elapsed)}${choice.claim ? '' : '  ·  claim at 5:00'}` : '');
    }
    // the line stopped for good (match gone, opened elsewhere, versions differ, out of step): a panel says so
    const stopped = live.status === 'gone' || live.status === 'elsewhere' || live.status === 'version' || !!live.broken;
    if (stopped && this.modal !== 'mlink' && this.modal !== 'pause' && !this.cardLayer) this.showMatchLink();
    else if (!stopped && this.modal === 'mlink') { this.closeModal(); this.play.matchReshow(); }
    // the waiting panel says whether the other player's game is open: drawn again when that changes
    const on = live.online.join();
    if (this.modal === 'mwait' && on !== this.waitOnline) this.matchWaiting();
    const watching = p.state === 'watch';
    this.watchPanel.setVisible(watching && !this.modal);
    if (watching) {
      const r = p.round;
      const d = r.distToPin();
      const dist = r.onHoleGreen() ? distLabel(d).replace(/(\d)(ft|m)$/, '$1 $2') : `${fmtDist(d)} ${unitLabel()}`;
      setTxt(this.watchTxt, `${p.oppName()} to play  ·  ${dist}  ·  ${r.ball.teedUp ? 'tee' : r.lie?.label ?? ''}`);
    }
  }

  /** "you're 1 up · hole 4" for a banner's second line ("all square · 19th: hole 1" in extra holes). */
  matchLine(): string {
    const live = this.play.match;
    if (!live?.session) return '';
    const s = live.session.state;
    const where = isExtra(s.cfg, s.hole) ? `${ordinal(s.hole + 1)}: hole ${live.session.holeNumber}` : `hole ${live.session.holeNumber}`;
    return `${statusText(s, this.play.me)}  ·  ${where}`;
  }

  /** "give putt", "penalty stroke" and "claim match" in a row under the match bar (those showing). */
  private placeMatchButtons() {
    if (!this.matchBar) return;
    const shown = [this.giveBtn, this.penBtn, this.claimBtn].filter((b) => b.visible);
    const widths = shown.map((b) => (b === this.giveBtn ? 70 : b === this.penBtn ? 78 : 74));
    const total = widths.reduce((a, b) => a + b, 0) + 4 * Math.max(0, shown.length - 1);
    let x = Math.round(this.barMid - total / 2);
    shown.forEach((b, i) => { b.setPosition(x, this.barTop + 38); x += widths[i] + 4; });
  }

  /**
   * The move clock under the match bar (CLOCK, developer 2026-10-21): to the
   * player it waits for, from a minute on, the penalty stroke at 2:00, the
   * warning from 3:30 and the claim at 5:00; to the waiting player, how long
   * it has been. It runs whether or not either player is in the match.
   */
  private clockLine(c: ClockView): { text: string; color: number } | null {
    const p = this.play;
    if (c.elapsed < 60_000) return null;
    const t = clockText(c.elapsed);
    const opp = p.oppName().slice(0, 10);
    if (c.on === p.me) {
      if (c.elapsed >= CLOCK.claimMs) return { text: `${t}  ·  ${opp} can claim the match`, color: COLORS.red };
      if (c.elapsed >= CLOCK.warnMs) return { text: `play now: ${clockText(CLOCK.claimMs - c.elapsed)} to a claim`, color: COLORS.red };
      if (c.kind === 'shot' && !c.slowGiven && c.elapsed >= CLOCK.penaltyMs) return { text: `${t}  ·  penalty stroke possible`, color: COLORS.yellow };
      return { text: c.kind === 'shot' ? `${t}  ·  ${c.slowGiven ? 'claim at 5:00' : 'penalty at 2:00'}` : `${opp} is on the tee  ·  ${t}`, color: COLORS.white };
    }
    if (c.waiter === p.me) return { text: `${c.kind === 'shot' ? `${opp}'s shot` : `${opp} to the tee`}: ${t}`, color: COLORS.white };
    return null;
  }

  /** Once per shot: the 3:30 warning to the player on the clock (a banner and a sound), and the claim's sound for the one waiting. */
  private clockNotice(c: ClockView, claimable: boolean) {
    const p = this.play;
    if (c.on === p.me && c.elapsed >= CLOCK.warnMs && c.elapsed < CLOCK.claimMs && this.warnedTurn !== c.turn) {
      this.warnedTurn = c.turn;
      this.flash('play now', COLORS.red, `${p.oppName()} can claim the match in ${clockText(CLOCK.claimMs - c.elapsed)}`, 2600);
      sfx('bad');
    }
    if (claimable && c.waiter === p.me && this.claimSounded !== c.turn) {
      this.claimSounded = c.turn;
      sfx('good');
    }
  }

  /** "penalty stroke": asked first (the other player may be slow for a reason; the choice is the waiting player's). */
  private askPenalty() {
    const p = this.play;
    const c = p.match?.clock();
    if (!c || !p.clockChoice().penalty) return;
    this.openModal('pause'); // the match waits while the question is up
    confirmBox(this, this.modalLayer, 'add a penalty stroke?', `${p.oppName()} has taken ${clockText(c.elapsed)} over this shot. The stroke counts on this hole.`, 'not now', 'add it',
      () => {
        this.closeModal();
        if (!p.clockChoice().penalty) this.flash('too late', COLORS.white, `${p.oppName()} has played`, 1400);
        else p.matchPenalty();
        p.matchUnheld();
        this.refresh();
      }, () => { this.closeModal(); p.matchUnheld(); this.refresh(); });
  }

  /** "claim match": asked first (it ends the match). */
  private askClaim() {
    const p = this.play;
    const c = p.match?.clock();
    if (!c || !p.clockChoice().claim) return;
    const back = this.modal && MATCH_PANELS.includes(this.modal) ? this.redraw : null;
    this.openModal('pause');
    const what = c.kind === 'shot' ? "hasn't played on" : "hasn't come to the tee";
    confirmBox(this, this.modalLayer, 'claim the match?', `${p.oppName()} ${what} for ${clockText(c.elapsed)}. You win the match by forfeit - it can't be undone.`, 'keep waiting', 'claim it',
      () => {
        this.closeModal();
        if (!p.clockChoice().claim) { this.flash('too late', COLORS.white, `${p.oppName()} is back on the match`, 1400); if (back) back(); }
        else p.matchClaim();
        p.matchUnheld();
        this.refresh();
      }, () => { this.closeModal(); if (back) back(); p.matchUnheld(); this.refresh(); });
  }

  private drawMini() {
    const p = this.play;
    const r = p.round;
    const mm = app.course!.json.maps.holes.find((m) => m.hole === r.courseHole)!;
    const g = this.miniG;
    g.clear();
    const toM = (x: number, y: number) => ({ x: 3 + Math.round((x - mm.x0) / mm.mPerPx), y: 3 + Math.round((mm.y1 - y) / mm.mPerPx) });
    const pin = toM(r.pin.x, r.pin.y);
    g.fillStyle(0xffffff, 1).fillRect(pin.x, pin.y - 3, 1, 4);
    g.fillStyle(0xe2382f, 1).fillRect(pin.x + 1, pin.y - 3, 2, 2);
    const b = toM(r.ball.x, r.ball.y);
    if (p.state === 'aim' || p.state === 'swing') {
      const dist = p.isPutting() ? r.distToPin() : r.fullCarry(p.club);
      const e = toM(r.ball.x + Math.cos(p.aim) * dist, r.ball.y + Math.sin(p.aim) * dist);
      g.lineStyle(1, 0xffffff, 0.8);
      g.lineBetween(b.x, b.y, e.x, e.y);
    }
    g.fillStyle(0x14161c, 1).fillRect(b.x - 1, b.y - 1, 3, 3);
    g.fillStyle(0xffffff, 1).fillRect(b.x, b.y, 1, 1);
  }

  /**
   * The result banner: a third of the way down, or at the top in a putting
   * view, where a third of the way down is where the cup or the golfer is
   * (afternoon review, 2026-10-20). Checked every frame: the view can change
   * while a banner shows (the cut to the green after an approach).
   */
  private placeBanner() {
    const y = this.play?.green && this.play.inGreenView() ? 16 : Math.round(this.H * 0.3);
    if (this.banner.y !== y) this.banner.setPosition(Math.round(this.W / 2), y);
    if (this.sub.y !== y + 16) this.sub.setPosition(Math.round(this.W / 2), y + 16);
    if (this.banner.x !== Math.round(this.W / 2)) { this.banner.x = Math.round(this.W / 2); this.sub.x = this.banner.x; }
  }

  /** Hide the result banner at once (a panel opens over the course). */
  hideBanner() {
    this.queuedFlash?.remove();
    this.queuedFlash = null;
    this.bannerTimer?.remove();
    this.tweens.killTweensOf([this.banner, this.sub]);
    this.banner.setVisible(false);
    this.sub.setVisible(false);
  }

  /** Called every frame by the Play scene. */
  tick() {
    const p = this.play;
    this.drawMeter();
    // the clock moves on by itself: the bar is brought up to date a few times a second
    if (this.matchBar && (p.state === 'commit' || this.time.now - this.matchAt > 250)) { this.matchAt = this.time.now; this.refreshMatch(); }
    if (this.banner.visible) this.placeBanner();
    if (p.state === 'flight') this.drawMiniBall();
    // arrow toward an off-screen ball (kept clear of the HUD panels)
    const off = p.ballOffscreen;
    if (off && !this.modal) {
      const cam = p.cameras.main;
      // play-camera device pixels -> HUD texels
      const sx = ((off.x - cam.worldView.x) * cam.zoom) / app.zoom, sy = ((off.y - cam.worldView.y) * cam.zoom) / app.zoom;
      // the screen's edges less the HUD: the info panel (left), the bottom controls and the mini-map
      // column (top right); under the mini-map the right edge itself, down to the swing button
      // (it floated mid-fairway, at the mini-map column's left side, for the full height)
      const portrait = this.H > this.W;
      const x0 = 96, xm = this.W - 16 - Math.max(48, this.miniPanel.pw + 8), x1 = this.W - 12, y0 = 30;
      const y1 = portrait ? Math.min(this.H - 78, this.meterPanel.y - 10) : this.H - 78;
      const yb = this.mapBtn.y + 13 + 10, yr = Math.min(this.swingBtn.y, this.spinBtn.y, portrait ? this.meterPanel.y : this.swingBtn.y) - 10;
      // the arrow sits at the nearest point of that area to the ball, pointing at it
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const spots = [{ x: clamp(sx, x0, xm), y: clamp(sy, y0, y1) }];
      if (yr > yb) spots.push({ x: clamp(sx, xm, x1), y: clamp(sy, yb, yr) });
      const at = spots.reduce((a, b) => (Math.hypot(b.x - sx, b.y - sy) < Math.hypot(a.x - sx, a.y - sy) ? b : a));
      const ang = Math.atan2(sy - at.y, sx - at.x);
      const k = ((Math.round(-ang / (Math.PI / 8)) % 16) + 16) % 16;
      const pulse = 0.65 + 0.35 * Math.sin(this.time.now / 180);
      this.offArrow.setVisible(true).setFrame(`wind_${k}`).setAlpha(pulse).setPosition(Math.round(at.x), Math.round(at.y));
    } else this.offArrow.setVisible(false);
  }

  private drawMiniBall() {
    this.drawMini();
  }

  private drawMeter() {
    const p = this.play;
    const g = this.meterG;
    g.clear();
    if (!this.meterPanel.visible) { this.meterRead.setVisible(false); return; }
    const putt = p.isPutting();
    const m = p.meter;
    const max = m ? m.max : (putt || p.swingScale < 1 ? PART_MAX : FULL_MAX);
    const lo = -ZONE_REACH;
    const x0 = 6, x1 = this.meterPanel.pw - 6, y0 = 4, h = 8;
    const X = (v: number) => Math.round(x0 + ((v - lo) / (max - lo)) * (x1 - x0));
    const r = p.round;
    // track
    g.fillStyle(0x0b0f13, 1).fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, h + 2);
    g.fillStyle(putt ? 0x34505c : 0x2c3640, 1).fillRect(x0, y0, x1 - x0, h);
    if (max > 100) g.fillStyle(0x5a2a22, 1).fillRect(X(100), y0, X(max) - X(100), h);
    // accuracy zone, centred on the start: red / yellow / green / yellow / red
    let half: number;
    if (putt) half = r.preset.perfectZone * p.club.windowMult;
    else {
      const mods = lieModsFor(r.lie, p.club);
      // an overswing (power past 100 %) halves the zone the moment the power is set, as the strike does
      const over = !!m && (m.phase === 'accuracy' || m.phase === 'done') && (m.power / 100) * p.swingScale > 1.0001;
      half = perfectHalfWidth(r.preset.perfectZone, p.club, { distMult: mods.distMult, windowMult: mods.windowMult }, over);
    }
    const good = half + (putt ? GOOD_BAND : lieModsFor(r.lie, p.club).goodBand ?? GOOD_BAND); // gorse: a sliver of yellow
    g.fillStyle(0xd23b2b, 1).fillRect(X(-ZONE_REACH), y0, X(ZONE_REACH) - X(-ZONE_REACH), h);
    // each band covers the pixels from its left edge to its right edge, both included: the cursor is drawn on
    // the rounded pixel of its position, so a tap shows inside a band exactly when it counts inside it
    g.fillStyle(0xf2c23a, 1).fillRect(X(-good), y0, X(good) - X(-good) + 1, h);
    g.fillStyle(0x4cd25c, 1).fillRect(X(-half), y0, X(half) - X(-half) + 1, h);
    // a dark line through the middle of the green, top to bottom of the bar: the perfect spot (developer)
    g.fillStyle(0x1f5a28, 1).fillRect(X(0), y0, 1, h);
    // ticks
    g.fillStyle(0x0b0f13, 1);
    for (const v of [25, 50, 75, 100]) g.fillRect(X(v), y0 + h - 3, 1, 3);
    this.meterLabels.forEach((t, i) => {
      const v = [25, 50, 75, 100][i];
      t.setPosition(X(v), y0 + h + 1);
      setTxt(t, putt ? puttScaleLabel(p.puttScale * v / 100) : String(v));
    });
    let read = '';
    if (m && (p.state === 'swing' || p.state === 'flight')) {
      const now = performance.now();
      const pos = Math.max(lo, Math.min(max, m.position(now)));
      m.drawn(now); // a tap counts where the cursor is drawn now (what the player sees)
      if (m.phase === 'accuracy' || m.phase === 'done') {
        g.fillStyle(0xffffff, 1).fillRect(X(Math.min(max, m.power)) - 1, y0 - 3, 3, 2);
      }
      const cx = X(pos);
      g.fillStyle(0x0b0f13, 1).fillRect(cx - 1, y0 - 3, 3, h + 6);
      g.fillStyle(0xffffff, 1).fillRect(cx, y0 - 2, 1, h + 4);
      // how far the cursor's power would send it (flat, calm)
      const pw = m.phase === 'power' ? pos : m.power;
      if (pw > 0) {
        const metres = putt ? p.puttScale * pw / 100 : r.carryFor(p.club, p.swingScale, pw / 100); // overswing: +8 % at most
        read = putt ? distLabel(metres) : `${fmtDist(metres)} ${unitLabel()}`;
      }
    }
    this.meterRead.setVisible(!!read);
    if (read) setTxt(this.meterRead, read);
  }

  private onSwingButton(time: number) {
    const p = this.play;
    if (p.state === 'aim' || p.state === 'swing') p.tap(time);
  }

  /** True when the pointer is over a HUD control or a modal is open. */
  blocks(ptr: Phaser.Input.Pointer): boolean {
    // the drop prompt is open while the player taps inside the relief area to place the ball
    if (this.modal && this.modal !== 'drop') return true;
    const hits = this.input.hitTestPointer(ptr);
    return hits.some((h) => (h as unknown as { visible?: boolean }).visible !== false && (h as unknown as { enabled?: boolean }).enabled !== false);
  }

  modalOpen(): boolean {
    return this.modal !== null && this.modal !== 'drop';
  }

  onModalKey(e: KeyboardEvent) {
    if (this.modal === 'card' && (e.key === 'c' || e.key === 'C' || e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.closeCard(); return; }
    if (this.modal === 'mhole' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.play.matchNextHole(); return; }
    if ((e.key === 'c' || e.key === 'C') && (this.modal === 'mhole' || this.modal === 'mover' || this.modal === 'mwait')) { this.toggleCard(); return; }
    if (this.modal === 'mrewatch' && e.key === 'Escape') { e.preventDefault(); this.reshowMatchHole(); return; }
    // the pause menu over a match panel (Esc, as on the course)
    if (e.key === 'Escape' && (this.modal === 'mhole' || this.modal === 'mwait' || this.modal === 'mover')) { e.preventDefault(); this.togglePause(); return; }
    if ((e.key === 'c' || e.key === 'C') && this.modal === 'holed') { this.toggleCard(); return; }
    if ((e.key === 'r' || e.key === 'R') && this.modal === 'holed') { this.rewatch(); return; }
    if (this.modal === 'rewatch' && (e.key === 'Escape' || e.key === 'r' || e.key === 'R')) { e.preventDefault(); this.backFromRewatch(); return; }
    if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'm' || e.key === 'M' || e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      if (this.modal === 'overview') this.closeModal();
      else if (this.modal === 'pause') this.closePause();
    }
    if ((e.key === ' ' || e.key === 'Enter') && this.modal === 'holed') {
      e.preventDefault();
      this.continueFromHoled();
    }
  }

  // ------------------------------------------------------------------ banners
  flash(s: string, color: number = COLORS.white, subline = '', ms = 1500) {
    this.queuedFlash?.remove();
    this.queuedFlash = null;
    setTxt(this.banner, s);
    this.banner.setTint(color).setVisible(true).setAlpha(1).setScale(2);
    setTxt(this.sub, subline);
    this.sub.setVisible(!!subline).setAlpha(1);
    this.bannerTimer?.remove();
    this.tweens.killTweensOf([this.banner, this.sub]);
    this.bannerAt = this.time.now;
    this.bannerFor = ms;
    this.bannerTimer = this.time.delayedCall(ms, () => {
      this.tweens.add({ targets: [this.banner, this.sub], alpha: 0, duration: 300 });
    });
  }

  /**
   * A banner that follows the one on screen ("your shot" after "kevin holes
   * out"): shown once that one has had a second, rather than over it.
   */
  flashAfter(s: string, color: number = COLORS.white, subline = '', ms = 1500) {
    const left = this.banner.visible && this.banner.alpha > 0.5 ? this.bannerAt + Math.min(this.bannerFor, 1000) - this.time.now : 0;
    if (left <= 0) { this.flash(s, color, subline, ms); return; }
    this.queuedFlash?.remove();
    this.queuedFlash = this.time.delayedCall(left, () => { this.queuedFlash = null; this.flash(s, color, subline, ms); });
  }

  strikeFeedback(st: Strike) {
    const lefty = this.play.round.cfg.settings.lefty;
    let label = 'perfect!';
    let color: number = COLORS.green;
    let note = '';
    if (st.quality === 'great') { label = 'great!'; note = `tiny ${missWord(st.side, false, lefty)} · `; }
    else if (st.quality === 'good') { label = `slight ${missWord(st.side, false, lefty)}`; color = COLORS.yellow; }
    else if (st.quality !== 'perfect') { label = missWord(st.side, true, lefty); color = COLORS.red; }
    const pw = Math.round(st.power * 100);
    this.flash(label, color, `${note}${pw}% power${st.overswing ? ' (overswing)' : ''}`, 1100);
  }

  puttFeedback(ps: PuttStrike, power: number) {
    const word = (ps.side > 0) !== this.play.round.cfg.settings.lefty ? 'push' : 'pull'; // a right-hander pushes it right
    const label = ps.quality === 'perfect' ? 'pure stroke' : ps.quality === 'great' ? 'good stroke' : ps.quality === 'good' ? `slight ${word}` : word;
    const color = ps.quality === 'perfect' || ps.quality === 'great' ? COLORS.green : ps.quality === 'good' ? COLORS.yellow : COLORS.red;
    this.flash(label, color, `${Math.round(power * 100)}% of ${puttScaleLabel(this.play.puttScale)}`, 900);
  }

  carryInfo(_ball: { x: number; y: number }, e: SimEvent) {
    const p = this.play;
    const st = p.shot?.spec;
    if (!st) return;
    const carry = Math.hypot(e.x - st.x, e.y - st.y);
    this.flash(`carry ${fmtDist(carry)} ${unitLabel()}`, COLORS.white, '', 1200);
  }

  restInfo() {
    const p = this.play;
    const r = p.round;
    const st = p.shot?.spec;
    if (!st || !p.sim) return;
    const total = Math.hypot(p.sim.end.x - st.x, p.sim.end.y - st.y);
    const where = SURFACE_LABEL[r.surfaceAt()] ?? '';
    // a putt is measured in feet, like the putting meter, and so is what is left on the green;
    // an approach that ends on the green is still in yards ("185 ft" for a 63-yd wedge)
    const putt = p.shot?.club.kind === 'putter';
    const ft = (m: number) => distLabel(m).replace(/(\d)(ft|m)$/, '$1 $2');
    const yd = (m: number) => `${fmtDist(m)} ${unitLabel()}`;
    this.flash(where, COLORS.white, `${(putt ? ft : yd)(total)} · ${(putt || r.onHoleGreen() ? ft : yd)(r.distToPin())} to go`, 1600);
  }

  // ------------------------------------------------------------------ intro
  showIntro() {
    this.intro?.destroy();
    const r = this.play.round;
    const W = this.W;
    const w = Math.min(220, W - 16), h = 70;
    const c = this.add.container(Math.round((W - w) / 2), Math.round(this.H - h - 30));
    const pnl = new Panel(this, 0, 0, w, h, 0.86);
    const portrait = this.add.image(8, 10, 'ui', 'portrait').setOrigin(0, 0);
    const ms = this.play.match?.session;
    const extra = !!ms && isExtra(ms.state.cfg, r.holeIndex);
    const t1 = txt(this, 64, 8, extra ? `${ordinal(r.holeIndex + 1)} hole` : holeTitle(r), { scale: 2 });
    const yd = r.tee.cardYd;
    const ydStr = app.settings.units === 'yd' ? `${yd} yd` : `${Math.round(yd * YD)} m`;
    const t2 = txt(this, 64, 30, `par ${r.hole.par}  ·  ${ydStr}  ·  ${r.cfg.tee.toLowerCase()}`, { color: COLORS.yellow });
    const t3 = txt(this, 64, 41, extra ? `hole ${r.holeNumber} again  ·  sudden death` : `${r.hole.handicap ? `handicap ${r.hole.handicap}  ·  ` : ""}pin ${r.pinLabel()}`, { color: extra ? COLORS.yellow : COLORS.dim });
    const wtxt = r.wind.mph < 0.5 ? 'calm' : `wind ${r.wind.mph.toFixed(1)} mph`;
    const live = this.play.match;
    const honour = live?.session ? (live.session.state.honour === this.play.me ? 'your honour' : `${this.play.oppName()}'s honour`) : '';
    const t4 = txt(this, 64, 52, `${wtxt}  ·  ${honour || 'tap to play'}`, { color: COLORS.dim });
    c.add([pnl, portrait, t1, t2, t3, t4]);
    this.intro = c;
    this.refresh();
  }

  hideIntro() {
    if (!this.intro) return;
    const c = this.intro;
    this.intro = null;
    this.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
    this.refresh();
  }

  // ------------------------------------------------------------------ modals
  private openModal(kind: Modal) {
    // a card opened during the shot must not hide (and later strand) the panel that follows it
    if (this.cardLayer) {
      this.cardLayer.destroy();
      this.cardLayer = null;
      this.modalBeforeCard = null;
      this.modalLayer.setVisible(true);
    }
    this.closeModal();
    this.modal = kind;
    this.modalLayer.removeAll(true);
    // a panel over the course hides the banner ("in the hole!" showed above the hole-complete panel);
    // the relief panels keep it: it says why they opened ("out of bounds")
    if (kind !== 'relief' && kind !== 'drop') this.hideBanner();
  }

  closeModal() {
    this.modal = null;
    this.redraw = null;
    this.modalLayer.removeAll(true);
  }

  private cardLayer: Phaser.GameObjects.Container | null = null;
  private modalBeforeCard: Modal = null;

  toggleCard() {
    if (this.cardLayer) { this.closeCard(); return; }
    this.play.cancelSwing();
    if (this.modal && this.modal !== 'holed' && this.modal !== 'mhole' && this.modal !== 'mover' && this.modal !== 'mwait') return;
    this.modalBeforeCard = this.modal;
    if (this.modal) this.modalLayer.setVisible(false);
    this.modal = 'card';
    const layer = this.add.container(0, 0).setDepth(120);
    const dim = dimmer(this, 0.6);
    dim.on('pointerdown', () => this.closeCard());
    layer.add(dim);
    const ms = this.play.match?.session;
    const card = ms ? matchCard(this, ms, this.play.me, this.W, this.H) : scorecard(this, this.play.round, this.W, this.H);
    layer.add(card);
    const below = Math.min(this.H - 14, (card.getData('bottom') as number) + 4);
    layer.add(txt(this, this.W / 2, below, 'tap anywhere to close', { origin: [0.5, 0], color: COLORS.dim }));
    this.cardLayer = layer;
  }

  closeCard() {
    this.cardLayer?.destroy();
    this.cardLayer = null;
    this.modal = this.modalBeforeCard;
    this.modalBeforeCard = null;
    this.modalLayer.setVisible(true);
    if (this.play.match) this.play.matchUnheld(); // what came while the card was open
  }

  toggleOverview() {
    if (this.modal === 'overview') { this.closeModal(); return; }
    this.play.cancelSwing();
    if (this.modal) return;
    this.openModal('overview');
    const r = this.play.round;
    const dim = dimmer(this, 0.75);
    dim.on('pointerdown', () => this.closeModal());
    this.modalLayer.add(dim);
    const mPer = app.course!.json.maps.overviewMPerPx;
    const pts = [...r.tee.centerline, [r.pin.x, r.pin.y], [r.ball.x, r.ball.y]];
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const pad = 40;
    let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const maxW = (this.W - 16) * mPer, maxH = (this.H - 36) * mPer;
    // expand to the screen aspect, clamp to the course map
    const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2;
    let wM = Math.max(x1 - x0, 60), hM = Math.max(y1 - y0, 60);
    let scale = 1;
    if (wM / mPer * 2 <= this.W - 16 && hM / mPer * 2 <= this.H - 36) scale = 2;
    wM = Math.min(maxW / scale, Math.max(wM, (this.W - 16) * mPer / scale));
    hM = Math.min(maxH / scale, Math.max(hM, (this.H - 36) * mPer / scale));
    x0 = cxm - wM / 2; x1 = cxm + wM / 2; y0 = cym - hM / 2; y1 = cym + hM / 2;
    const Wm = app.course!.json.world.width, Hm = app.course!.json.world.height;
    if (x0 < 0) { x1 -= x0; x0 = 0; }
    if (y0 < 0) { y1 -= y0; y0 = 0; }
    if (x1 > Wm) { x0 -= x1 - Wm; x1 = Wm; }
    if (y1 > Hm) { y0 -= y1 - Hm; y1 = Hm; }
    const cropX = Math.round(x0 / mPer), cropY = Math.round((Hm - y1) / mPer);
    const cropW = Math.round((x1 - x0) / mPer), cropH = Math.round((y1 - y0) / mPer);
    const img = this.add.image(0, 0, 'overview').setOrigin(0, 0).setCrop(cropX, cropY, cropW, cropH).setScale(scale);
    const ox = Math.round((this.W - cropW * scale) / 2) - cropX * scale;
    const oy = Math.round((this.H - 20 - cropH * scale) / 2) - cropY * scale;
    img.setPosition(ox, oy);
    const frame = this.add.graphics();
    frame.lineStyle(1, 0x0a0e12, 1).strokeRect(ox + cropX * scale - 1, oy + cropY * scale - 1, cropW * scale + 2, cropH * scale + 2);
    const g = this.add.graphics();
    const toS = (x: number, y: number) => ({ x: Math.round(ox + (x / mPer) * scale), y: Math.round(oy + ((Hm - y) / mPer) * scale) });
    // centre line
    g.lineStyle(1, 0xffffff, 0.35);
    const cl = r.tee.centerline;
    for (let i = 0; i < cl.length - 1; i++) { const a = toS(cl[i][0], cl[i][1]), b = toS(cl[i + 1][0], cl[i + 1][1]); g.lineBetween(a.x, a.y, b.x, b.y); }
    const pin = toS(r.pin.x, r.pin.y);
    g.fillStyle(0xffffff, 1).fillRect(pin.x, pin.y - 5, 1, 6);
    g.fillStyle(0xe2382f, 1).fillRect(pin.x + 1, pin.y - 5, 3, 2);
    const b = toS(r.ball.x, r.ball.y);
    g.fillStyle(0x14161c, 1).fillRect(b.x - 2, b.y - 2, 5, 5);
    g.fillStyle(0xffffff, 1).fillRect(b.x - 1, b.y - 1, 3, 3);
    const p = this.play;
    if (p.state === 'aim') {
      const dist = p.isPutting() ? r.distToPin() : r.fullCarry(p.club);
      const e = toS(r.ball.x + Math.cos(p.aim) * dist, r.ball.y + Math.sin(p.aim) * dist);
      g.lineStyle(1, 0xffd84a, 0.9).lineBetween(b.x, b.y, e.x, e.y);
      g.strokeCircle(e.x, e.y, 2);
    }
    const head = txt(this, this.W / 2, 4, `${holeTitle(r)}  ·  par ${r.hole.par}  ·  ${fmtDist(r.distToPin())} ${unitLabel()} to the pin`, { origin: [0.5, 0] });
    const foot = txt(this, this.W / 2, this.H - 13, 'tap or press tab to close', { origin: [0.5, 0], color: COLORS.dim });
    this.modalLayer.add([img, frame, g, head, foot]);
  }

  togglePause() {
    if (this.modal === 'pause') { this.closePause(); return; }
    this.play.cancelSwing();
    if (this.cardLayer) return;
    // in a match the menu opens over the match's own panels (waiting, a hole's result) and brings them back:
    // they had no way out to the title (review, item 3)
    const under = this.modal && MATCH_PANELS.includes(this.modal) && this.play.match ? this.redraw : null;
    if (this.modal && !under) return;
    this.openModal('pause');
    this.pauseReturn = under;
    const dim = dimmer(this, 0.6);
    this.modalLayer.add(dim);
    const w = this.play.match ? Math.min(180, this.W - 12) : 150, h = 128; // a match's two half-width buttons need the room
    const x = Math.round((this.W - w) / 2), y = Math.round((this.H - h) / 2);
    const pnl = new Panel(this, x, y, w, h, 0.92);
    const t = txt(this, x + w / 2, y + 6, 'paused', { origin: [0.5, 0], scale: 2 });
    const b1 = new Button(this, x + 15, y + 30, w - 30, 16, 'resume', () => this.closePause());
    const b2 = new Button(this, x + 15, y + 50, w - 30, 16, 'settings', () => { this.closePause(); this.scene.launch('settings', { from: 'hud' }); this.scene.pause('play'); this.scene.pause('hud'); }, { color: 'grey' });
    if (this.play.match) { this.matchMenu(x, y, w, pnl, t, b1, b2); return; }
    // the round is saved after every shot: this leaves it to continue from the title screen
    if (this.play.round.cfg.practice) {
      // practice: nothing to save
      const leave = new Button(this, x + 15, y + 70, w - 30, 16, 'leave practice', () => {
        this.closeModal();
        this.scene.stop('play');
        this.scene.start('title');
      }, { color: 'grey' });
      this.modalLayer.add([pnl, t, b1, b2, leave]);
      return;
    }
    const b3 = new Button(this, x + 15, y + 70, w - 30, 16, 'save & exit', () => {
      this.closeModal();
      this.scene.stop('play');
      this.scene.start('title');
    }, { color: 'grey' });
    const b4 = new Button(this, x + 15, y + 90, w - 30, 16, 'quit round', () => { this.closeModal(); this.confirmQuit(); }, { color: 'grey' });
    const note = txt(this, x + w / 2, y + 110, 'save & exit: continue it later', { origin: [0.5, 0], color: COLORS.dim });
    this.modalLayer.add([pnl, t, b1, b2, b3, b4, note]);
  }

  /** Quit the round for good: not saved, not on the leaderboard, can't be continued. */
  private confirmQuit() {
    this.openModal('pause');
    this.modalLayer.add(dimmer(this, 0.6));
    const w = 170, h = 74;
    const x = Math.round((this.W - w) / 2), y = Math.round((this.H - h) / 2);
    const pnl = new Panel(this, x, y, w, h, 0.92);
    const t1 = txt(this, x + w / 2, y + 7, 'quit this round?', { origin: [0.5, 0], scale: 2 });
    const t2 = txt(this, x + w / 2, y + 29, "it won't be saved or go on the leaderboard", { origin: [0.5, 0], color: COLORS.dim, maxWidth: w - 10 });
    const back = new Button(this, x + 8, y + h - 24, 70, 16, 'keep playing', () => this.closeModal(), { color: 'grey' });
    const quit = new Button(this, x + w - 78, y + h - 24, 70, 16, 'quit round', () => {
      this.closeModal();
      void clearSnapshot();
      this.scene.stop('play');
      this.scene.start('title');
    });
    this.modalLayer.add([pnl, t1, t2, back, quit]);
  }

  openUnplayable() {
    this.play.openUnplayable();
  }

  showRelief(title: string, options: ReliefArea[], optional: boolean) {
    this.reliefTitle = title;
    this.openModal('relief');
    this.redraw = () => this.showRelief(title, options, optional);
    const n = options.length + (optional ? 1 : 0);
    const w = Math.min(232, this.W - 12), h = 26 + n * 18;
    const x = Math.round((this.W - w) / 2), y = Math.round(this.H * 0.42);
    const pnl = new Panel(this, x, y, w, h, 0.9);
    const t = txt(this, x + w / 2, y + 5, title, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: w - 10 });
    this.modalLayer.add([pnl, t]);
    options.forEach((o, i) => {
      const label = `${o.label}${o.penalty ? ` (+${o.penalty})` : ''}`;
      const b = new Button(this, x + 6, y + 20 + i * 18, w - 12, 16, label, () => this.play.chooseRelief(i), { color: i === 0 && options.length > 1 ? 'grey' : 'orange' });
      this.modalLayer.add(b);
    });
    if (optional) {
      const b = new Button(this, x + 6, y + 20 + options.length * 18, w - 12, 16, 'play it as it lies', () => this.play.playAsItLies(), { color: 'grey' });
      this.modalLayer.add(b);
    }
    this.refresh(); // the stroke count and lie of this stroke, not the one before (and no shot controls behind the panel)
  }

  showDrop(a: ReliefArea) {
    this.openModal('drop');
    this.redraw = () => this.showDrop(a);
    const w = Math.min(232, this.W - 12), h = 38;
    const x = Math.round((this.W - w) / 2), y = this.H - h - 6;
    const pnl = new Panel(this, x, y, w, h, 0.9);
    const t = txt(this, x + w / 2, y + 4, `${a.label}: tap inside the area`, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: w - 8 });
    const ok = new Button(this, x + w - 74, y + 18, 68, 16, 'drop here', () => this.play.confirmDrop());
    const back = new Button(this, x + 6, y + 18, 50, 16, 'back', () => this.play.cancelDrop(), { color: 'grey' });
    this.modalLayer.add([pnl, t, ok, back]);
    this.refresh();
  }

  hideRelief() {
    this.closeModal();
    this.refresh();
  }

  /** Back from a replay: to the list of shots it was chosen from, or the hole-complete panel. */
  reshowHoled() {
    if (this.rewatching && this.play.replayable() > 1) { this.showRewatch(); return; }
    this.rewatching = false;
    if (this.lastHoled) this.showHoled(this.lastHoled[0], this.lastHoled[1], this.lastHoled[2], true);
  }

  /** Was the replay chosen from the list of shots? */
  private rewatching = false;

  /** "rewatch": one stroke plays at once; several open the list (developer, 2026-10-20). */
  rewatch() {
    const n = this.play.replayable();
    if (n === 1) { this.rewatching = false; this.play.startReplay(0); }
    else if (n > 1) this.showRewatch();
  }

  private backFromRewatch() {
    this.rewatching = false;
    if (this.lastHoled) this.showHoled(this.lastHoled[0], this.lastHoled[1], this.lastHoled[2], true);
  }

  /** Every stroke of the hole, to pick one to watch again (the last 16 if there were more). */
  showRewatch() {
    this.openModal('rewatch');
    this.rewatching = true;
    this.redraw = () => this.showRewatch();
    const all = this.play.round.strokes;
    const first = Math.max(0, all.length - 16);
    const list = all.slice(first);
    const units = app.settings.units;
    const two = list.length > 7;
    const rows = two ? Math.ceil(list.length / 2) : list.length;
    const w = Math.min(two ? 300 : 210, this.W - 12);
    const bh = 14, gap = 3;
    const h = 22 + rows * (bh + gap) + 24;
    const x = Math.round((this.W - w) / 2), y = Math.max(4, Math.round((this.H - h) / 2));
    const pnl = new Panel(this, x, y, w, h, 0.9);
    const title = txt(this, x + w / 2, y + 6, 'rewatch a shot', { origin: [0.5, 0] });
    this.modalLayer.add([pnl, title]);
    const cw = two ? Math.floor((w - 18) / 2) : w - 12;
    list.forEach((st, k) => {
      const col = two ? Math.floor(k / rows) : 0, row = two ? k % rows : k;
      const label = two ? strokeLabel(st, units).replace(/^shot /, '').replace(/ · out of bounds$/, ' · ob') : strokeLabel(st, units);
      const b = new Button(this, x + 6 + col * (cw + 6), y + 20 + row * (bh + gap), cw, bh, label, () => this.play.startReplay(first + k),
        { color: st.result === 'holed' ? undefined : 'grey' });
      this.modalLayer.add(b);
    });
    this.modalLayer.add(new Button(this, x + w / 2 - 26, y + h - 20, 52, 14, 'back', () => this.backFromRewatch(), { color: 'grey' }));
    this.refresh();
  }

  private lastHoled: [HoleScore, boolean, boolean] | null = null;

  showHoled(score: HoleScore, gimme: boolean, maxed = false, quiet = false) {
    this.openModal('holed');
    this.lastHoled = [score, gimme, maxed];
    this.redraw = () => this.showHoled(score, gimme, maxed, true);
    const r = this.play.round;
    const name = maxed ? 'max score' : scoreName(score.strokes, score.par);
    const d = score.strokes - score.par;
    const color = d < 0 ? COLORS.yellow : d === 0 ? COLORS.green : COLORS.white;
    if (!quiet) { if (d < 0) sfx('great'); else if (d === 0) sfx('good'); else sfx('bad'); }
    const tot = totals(r.scores);
    const eagle = !maxed && isListedEagle(r, score);
    const unnamed = eagle && r.cfg.playerName === DEFAULT_NAME;
    const w = Math.min(210, this.W - 12), h = unnamed ? 112 : eagle ? 100 : 92;
    const x = Math.round((this.W - w) / 2), y = Math.round(this.H * 0.28);
    const pnl = new Panel(this, x, y, w, h, 0.9);
    const t1 = txt(this, x + w / 2, y + 6, name + (gimme ? ' (gimme)' : ''), { origin: [0.5, 0], scale: 2, color });
    const t2 = txt(this, x + w / 2, y + 28, `${score.strokes} ${score.strokes === 1 ? 'stroke' : 'strokes'} on a par ${score.par}${score.penalties ? ` · ${score.penalties} penalty` : ''}`, { origin: [0.5, 0] });
    const t3 = txt(this, x + w / 2, y + 40, `${toPar(tot.toPar)} through ${tot.holes} · ${tot.strokes} total`, { origin: [0.5, 0], color: COLORS.dim });
    const last = r.isLastHole;
    const nb = new Button(this, x + w - 86, y + h - 22, 80, 16, last ? 'finish round' : 'next hole', () => this.continueFromHoled());
    const cb = new Button(this, x + 6, y + h - 22, 44, 16, 'card', () => this.toggleCard(), { color: 'grey' });
    this.modalLayer.add([pnl, t1, t2, t3, nb, cb]);
    if (this.play.replayable() > 0) {
      // the physics is deterministic: any stroke of the hole plays back exactly (player improvements, item 9; a choice of shot, 2026-10-20)
      this.modalLayer.add(new Button(this, x + 54, y + h - 22, 56, 16, 'rewatch', () => this.rewatch(), { color: 'grey' }));
    }
    if (eagle) {
      // the eagle goes on the shared list now; a player with no name is asked for one
      const t4 = txt(this, x + w / 2, y + 54, unnamed ? 'add your name for the recent eagles list' : 'on the recent eagles list!', { origin: [0.5, 0], color: COLORS.yellow, maxWidth: w - 12 });
      this.modalLayer.add(t4);
      if (unnamed) {
        const ab = new Button(this, x + w / 2 - 34, y + 67, 68, 16, 'add name', () => {
          askName(this, '', async (name) => {
            if (!name) return;
            await nameRound(r, name);
            if (t4.active) setTxt(t4, `${name}: on the recent eagles list!`);
            if (ab.active) ab.setVisible(false);
          }, 'your name for the eagles list');
        });
        this.modalLayer.add(ab);
      }
    }
    this.refresh();
  }

  // ------------------------------------------------------------ live match
  /**
   * Does the HUD hold the match's next events back? Under the pause menu and
   * the card nothing moves on: what happened meanwhile plays once they close
   * (the pause menu closed by itself when the other player reached the tee).
   */
  holdsMatch(): boolean {
    return this.modal === 'pause' || this.modal === 'mlink' || !!this.cardLayer;
  }

  /** The pause menu in a match: leave it for later, or concede the hole or the match. */
  private matchMenu(x: number, y: number, w: number, pnl: Panel, t: Phaser.GameObjects.BitmapText, b1: Button, b2: Button) {
    const p = this.play;
    const live = p.match!;
    const s = live.session!.state;
    const leave = new Button(this, x + 15, y + 70, w - 30, 16, 'leave for now', () => {
      this.pauseReturn = null;
      this.closeModal();
      this.scene.stop('play');
      this.scene.start('title');
    }, { color: 'grey' });
    const player = live.seat !== null;
    const canHole = player && holeLive(s) && p.state !== 'commit';
    const half = Math.floor((w - 34) / 2);
    // the question stays a pause (the match waits under it); "keep playing" goes back to what was there
    const ask = (title: string, body: string, what: 'hole' | 'match') => {
      this.openModal('pause');
      confirmBox(this, this.modalLayer, title, body, 'keep playing', 'concede', () => { this.pauseReturn = null; this.closeModal(); p.matchConcede(what); }, () => this.closePause());
    };
    const hole = new Button(this, x + 15, y + 90, half, 16, 'give up hole', () => ask('concede the hole?', `${p.oppName()} wins this hole`, 'hole'), { color: 'grey' });
    hole.setEnabled(canHole);
    const match = new Button(this, x + 19 + half, y + 90, half, 16, 'give up match', () => ask('concede the match?', `${p.oppName()} wins the match - it can't be undone`, 'match'), { color: 'grey' });
    match.setEnabled(player && s.phase === 'playing' && p.state !== 'commit');
    const note = txt(this, x + w / 2, y + 110, 'leave for now: continue it from the title', { origin: [0.5, 0], color: COLORS.dim, maxWidth: w - 10 });
    this.modalLayer.add([pnl, t, b1, b2, leave, hole, match, note]);
  }

  /** "give putt": asked first when it hands the other player the hole (it can't be taken back). */
  private givePutt() {
    const p = this.play;
    if (!p.canGivePutt()) return;
    if (p.givePuttOutcome() !== 'wins') { p.matchConcede('stroke'); this.refresh(); return; }
    this.openModal('pause'); // the match waits while the question is up
    confirmBox(this, this.modalLayer, 'give the putt?', `${p.oppName()} wins the hole with it`, 'let them putt', 'give it',
      () => {
        this.closeModal();
        // they putted while the question was up: their stroke stands
        if (!p.canGivePutt()) this.flash('too late', COLORS.white, `${p.oppName()} has putted`, 1400);
        else p.matchConcede('stroke');
        p.matchUnheld();
        this.refresh();
      }, () => { this.closeModal(); p.matchUnheld(); this.refresh(); });
  }

  /** Close the pause menu: back to the match panel it was opened over, if any. */
  closePause() {
    const back = this.pauseReturn;
    this.pauseReturn = null;
    this.closeModal();
    if (back) back();
    if (this.play.match) this.play.matchUnheld(); // what came while the menu was open
  }

  /** The match's line has stopped for good: why, and what can be done. */
  private showMatchLink() {
    const p = this.play;
    const live = p.match;
    if (!live) return;
    p.cancelSwing(); // a swing under this panel would run out into a full-power miss
    this.openModal('mlink');
    this.redraw = () => this.showMatchLink();
    this.modalLayer.add(dimmer(this, 0.55));
    const st = live.status;
    const title = live.broken ? 'out of step' : st === 'gone' ? 'match ended' : st === 'elsewhere' ? 'playing elsewhere' : 'update needed';
    const line = live.broken ?? (st === 'gone' ? 'this match no longer exists'
      : st === 'elsewhere' ? 'this match is open in another tab or on another device'
        : live.client.problem || 'this game and the match server differ - reload the page');
    const w = Math.min(230, this.W - 12);
    const t1 = txt(this, 0, 0, title, { origin: [0.5, 0], scale: 2, color: COLORS.yellow });
    if (t1.width > w - 8) t1.setScale(1);
    const t2 = txt(this, 0, 0, line, { origin: [0.5, 0], color: COLORS.dim, maxWidth: w - 12 });
    const bodyY = 7 + Math.ceil(t1.height) + 5;
    const h = bodyY + Math.ceil(t2.height) + 8 + 16 + 8;
    const x = Math.round((this.W - w) / 2), y = Math.round((this.H - h) / 2);
    t1.setPosition(Math.round(x + w / 2), y + 7);
    t2.setPosition(Math.round(x + w / 2), y + bodyY);
    const pnl = new Panel(this, x, y, w, h, 0.92);
    const toTitle = new Button(this, x + 8, y + h - 24, 60, 16, 'title', () => { this.closeModal(); this.scene.stop('play'); this.scene.start('title'); }, { color: 'grey' });
    this.modalLayer.add([pnl, t1, t2, toTitle]);
    if (st === 'elsewhere' && !live.broken) {
      this.modalLayer.add(new Button(this, x + w - 88, y + h - 24, 80, 16, 'play here', () => live.client.takeBack()));
    } else if (st === 'version' || live.broken) {
      this.modalLayer.add(new Button(this, x + w - 88, y + h - 24, 80, 16, 'reload', () => location.reload()));
    }
  }

  /** Waiting for the other player (at the next tee, or the first). */
  matchWaiting() {
    const p = this.play;
    const live = p.match;
    if (!live?.session) return;
    const s = live.session.state;
    this.openModal('mwait');
    this.redraw = () => this.matchWaiting();
    this.waitOnline = live.online.join();
    const w = Math.min(220, this.W - 12), h = 52;
    const x = Math.round((this.W - w) / 2), y = Math.round(this.H * 0.3);
    const opp = p.oppName();
    // the tee by its number on the card (a back nine starts at the 10th; "the 2nd tee" was hole 11); an extra hole by both
    const n = holeNo(s.cfg, s.hole);
    const where = `${n === 1 ? 'the first tee' : `the ${ordinal(n)} tee`}${isExtra(s.cfg, s.hole) ? ` for the ${ordinal(s.hole + 1)}` : ''}`;
    const pnl = new Panel(this, x, y, w, h, 0.88);
    const t1 = txt(this, x + w / 2, y + 6, `waiting for ${opp}`, { origin: [0.5, 0], scale: 2, maxWidth: w - 8 });
    if (t1.width > w - 8) t1.setScale(1);
    const t2 = txt(this, x + w / 2, y + 28, live.online[other(p.me)] ? `to come to ${where}` : `${opp}'s game is closed - they'll be back on the match from their title screen`, { origin: [0.5, 0], color: COLORS.dim, maxWidth: w - 10 });
    const t3 = txt(this, x + w / 2, 0, 'esc or menu: leave for now', { origin: [0.5, 0], color: COLORS.dim });
    // the move clock: how long they have kept this player waiting, and the claim once it can be made
    this.waitClaim = p.clockChoice().claim;
    this.waitClock = txt(this, x + w / 2, 0, '', { origin: [0.5, 0], color: COLORS.white });
    this.modalLayer.add([pnl, t1, t2, t3, this.waitClock]);
    let hh = h + Math.max(0, Math.ceil(t2.height) - 10) + 11 + 11;
    this.waitClock.setY(y + 28 + Math.ceil(t2.height) + 2);
    if (this.waitClaim) {
      hh += 20;
      this.modalLayer.add(new Button(this, Math.round(x + w / 2 - 40), y + hh - 13 - 20, 80, 16, 'claim match', () => this.askClaim()));
    }
    pnl.resize(w, hh);
    t3.setY(y + hh - 13);
    this.refresh();
  }

  /** A hole's result: who won it, the standing, next hole. */
  showMatchHole(res: HoleResult) {
    const p = this.play;
    const live = p.match!;
    const s = live.session!.state;
    const me = p.me, opp = other(me);
    this.lastMatchResult = res;
    this.openModal('mhole');
    this.redraw = () => this.showMatchHole(res);
    const oppName = p.oppName();
    const won = res.winner === me, lost = res.winner === opp;
    // an extra hole by its place in the match ("the 19th")
    const name = isExtra(s.cfg, res.hole) ? `the ${ordinal(res.hole + 1)}` : `hole ${holeNo(s.cfg, res.hole)}`;
    const title = res.winner === null ? `${name} halved` : won ? `you win ${name}` : `${oppName} wins ${name}`;
    // once per hole: the panel is drawn again after a rewatch, a resize or the pause menu
    if (this.soundedHole !== res.hole) {
      this.soundedHole = res.hole;
      if (won) sfx('great'); else if (res.winner === null) sfx('good'); else sfx('bad');
    }
    const sc = (k: Seat) => `${res.strokes[k]}${res.slow[k] ? ` (+${res.slow[k]} slow play)` : ''}${res.holed[k] ? '' : ', not holed'}`;
    const line = res.how === 'conceded' ? (won ? `${oppName} conceded it` : 'you conceded it') : `you ${sc(me)}  ·  ${oppName} ${sc(opp)}`;
    const w = Math.min(230, this.W - 12), h = 92;
    const x = Math.round((this.W - w) / 2), y = Math.round(this.H * 0.28);
    const pnl = new Panel(this, x, y, w, h, 0.9);
    const t1 = txt(this, x + w / 2, y + 6, title, { origin: [0.5, 0], scale: 2, color: won ? COLORS.yellow : lost ? COLORS.blue : COLORS.white, maxWidth: w - 8 });
    const t2 = txt(this, x + w / 2, y + 28, line, { origin: [0.5, 0], maxWidth: w - 10 });
    const left = holesLeft(s);
    const next = s.phase === 'finished' ? 'match over' : left > 0 ? `${left} to play` : 'extra holes: first to win one';
    const t3 = txt(this, x + w / 2, y + 40, `${statusText(s, me)}  ·  ${next}`, { origin: [0.5, 0], color: COLORS.dim, maxWidth: w - 10 });
    const ready = s.ready[me];
    const nb = new Button(this, x + w - 86, y + h - 22, 80, 16, ready ? 'waiting...' : 'next hole', () => p.matchNextHole());
    nb.setEnabled(!ready);
    const cb = new Button(this, x + 6, y + h - 22, 44, 16, 'card', () => this.toggleCard(), { color: 'grey' });
    this.modalLayer.add([pnl, t1, t2, t3, nb, cb]);
    if (live.session!.strokes.some((st) => st.sim)) this.modalLayer.add(new Button(this, x + 54, y + h - 22, 56, 16, 'rewatch', () => this.showMatchRewatch(), { color: 'grey' }));
    this.refresh();
  }

  /** Back to the hole's result (from a replay or the list of shots). */
  reshowMatchHole() {
    if (this.lastMatchResult) this.showMatchHole(this.lastMatchResult);
  }

  /** Both players' strokes on the hole, to watch one again. */
  showMatchRewatch() {
    const p = this.play;
    const ms = p.match?.session;
    if (!ms) return;
    this.openModal('mrewatch');
    this.redraw = () => this.showMatchRewatch();
    const list = ms.strokes.map((st, i) => ({ st, i })).filter((x) => x.st.sim).slice(-14);
    const two = list.length > 7;
    const rows = two ? Math.ceil(list.length / 2) : list.length;
    const w = Math.min(two ? 320 : 220, this.W - 12), bh = 14, gap = 3;
    const h = 22 + rows * (bh + gap) + 24;
    const x = Math.round((this.W - w) / 2), y = Math.max(4, Math.round((this.H - h) / 2));
    this.modalLayer.add([new Panel(this, x, y, w, h, 0.9), txt(this, x + w / 2, y + 6, 'rewatch a shot', { origin: [0.5, 0] })]);
    const cw = two ? Math.floor((w - 18) / 2) : w - 12;
    list.forEach(({ st, i }, k) => {
      const col = two ? Math.floor(k / rows) : 0, row = two ? k % rows : k;
      const who = st.seat === p.me ? 'you' : p.oppName();
      const label = `${who}: ${strokeLabel(st.stroke, app.settings.units).replace(/^shot /, '')}`;
      this.modalLayer.add(new Button(this, x + 6 + col * (cw + 6), y + 20 + row * (bh + gap), cw, bh, label, () => p.startMatchReplay(i), { color: st.stroke.result === 'holed' ? undefined : 'grey' }));
    });
    this.modalLayer.add(new Button(this, x + w / 2 - 26, y + h - 20, 52, 14, 'back', () => this.reshowMatchHole(), { color: 'grey' }));
    this.refresh();
  }

  /** The match is over: the result, the card, a rematch. */
  showMatchOver() {
    const p = this.play;
    const live = p.match!;
    const s = live.session!.state;
    const me = p.me;
    this.openModal('mover');
    this.redraw = () => this.showMatchOver();
    const o = s.outcome;
    const won = o?.winner === me, halved = o?.winner === null;
    if (!this.modalLayer.getData('sounded')) { if (won) sfx('great'); else if (halved) sfx('good'); else sfx('bad'); }
    const w = Math.min(240, this.W - 12), h = 104;
    const x = Math.round((this.W - w) / 2), y = Math.round(this.H * 0.26);
    const pnl = new Panel(this, x, y, w, h, 0.92);
    const t1 = txt(this, x + w / 2, y + 6, statusText(s, me), { origin: [0.5, 0], scale: 2, color: won ? COLORS.yellow : halved ? COLORS.white : COLORS.blue, maxWidth: w - 8 });
    let wins = 0, losses = 0, halves = 0;
    for (const r of s.results) { if (r.winner === null) halves++; else if (r.winner === me) wins++; else losses++; }
    // won by forfeit: why (the move clock)
    const why = o?.how === 'forfeit' ? (won ? `${p.oppName()} didn't play on` : "you didn't play on") : `holes won ${wins}  ·  lost ${losses}  ·  halved ${halves}`;
    const t2 = txt(this, x + w / 2, y + 30, why, { origin: [0.5, 0], color: COLORS.dim });
    this.modalLayer.add([pnl, t1, t2]);
    const theirs = s.rematch && s.rematch.by !== me ? s.rematch.code : null;
    const mine = s.rematch && s.rematch.by === me ? s.rematch.code : null;
    if (theirs) {
      this.modalLayer.add(txt(this, x + w / 2, y + 44, `${p.oppName()} wants a rematch`, { origin: [0.5, 0], color: COLORS.yellow }));
      this.modalLayer.add(new Button(this, x + w / 2 - 50, y + 58, 100, 16, 'play the rematch', () => { this.scene.stop('play'); this.scene.start('match', { mode: 'join', code: theirs, auto: true }); }));
    } else if (mine) {
      this.modalLayer.add(txt(this, x + w / 2, y + 48, `rematch offered: code ${mine}`, { origin: [0.5, 0], color: COLORS.dim }));
    } else {
      const rb = new Button(this, x + w / 2 - 50, y + 58, 100, 16, 'rematch', async () => {
        rb.setEnabled(false);
        rb.setLabel('making...');
        const made = await this.makeRematch();
        if (!made) { if (rb.active) { rb.setEnabled(true); rb.setLabel('rematch'); } return; }
        if (!this.sys.isActive()) return;
        this.scene.stop('play');
        this.scene.start('match', made.join ? { mode: 'join', code: made.code, auto: true } : { mode: 'invite', code: made.code });
      });
      this.modalLayer.add(rb);
    }
    this.modalLayer.add(new Button(this, x + 6, y + h - 22, 44, 16, 'card', () => this.toggleCard(), { color: 'grey' }));
    this.modalLayer.add(new Button(this, x + w - 66, y + h - 22, 60, 16, 'title', () => { this.scene.stop('play'); this.scene.start('title'); }, { color: 'grey' }));
    this.modalLayer.setData('sounded', true);
    this.refresh();
  }

  /**
   * A new match like this one (new wind and pins); the other player is offered
   * it here. Both asking at once: the server takes the first offer, and the
   * second player goes to that one (their own new match is left unused).
   */
  private async makeRematch(): Promise<{ code: string; join: boolean } | null> {
    const live = this.play.match;
    const s = live?.session?.state;
    if (!live || !s) return null;
    const me = this.play.me;
    const cfg = await newMatchConfig(s.cfg.tee, { holes: s.cfg.holes, courseHoles: s.cfg.courseHoles, length: s.cfg.length }, s.cfg.difficulty);
    // the player as they are in this match (a different name since would be a different player to the friend)
    const mine = s.players[me];
    const r = await createLiveMatch(cfg, { name: mine?.name ?? app.settings.playerName, lefty: mine?.lefty ?? app.settings.lefty });
    if (!r.ok) { this.flash("couldn't make the rematch", COLORS.red, r.message, 1800); return null; }
    // offered on this match's screen (wait for it to go: leaving closes the line; 10 s on a slow one)
    const sent = await Promise.race([live.client.send({ t: 'rematch', code: r.code }), new Promise<null>((res) => setTimeout(() => res(null), 10_000))]);
    if (sent && !sent.ok && sent.code === 'rematch_exists') {
      const theirs = await rematchOffered(live);
      if (theirs) { forgetMatch(r.code); return { code: theirs, join: true }; }
    }
    return { code: r.code, join: false };
  }

  continueFromHoled() {
    if (this.play.state !== 'holed') return;
    this.closeModal();
    const r = this.play.round;
    if (r.nextHole()) {
      this.play.startHoleIntro();
    } else {
      this.play.state = 'done'; // nothing more happens on the course while the round is saved (and a second tap does nothing)
      void finishRound(this);
    }
  }
}

/** What a scorecard shows: a title line, the nines, each hole's par and yards, and the scores. */
export interface CardData {
  title: string;
  blocks: (readonly [number, number, string])[];
  hole: (slot: number) => { par: number; yd: number | null };
  scores: HoleScore[];
  /** the number shown for a slot (a club's nines: 1-9 in each nine), the slot itself if absent */
  label?: (slot: number) => string;
}

/** "hole 12", or at a club of nines "white 3". */
export function holeTitle(r: import('../systems/game/round').Round): string {
  const n = r.holeName;
  return n.nine ? `${n.nine} ${n.num}` : `hole ${n.num}`;
}

/** The card of a round being played (or just finished). */
export function cardOfRound(r: import('../systems/game/round').Round): CardData {
  const holes = r.course.json.holes;
  const nCourse = holes.length;
  const shape = shapeOfCourse(r.course.json);
  const len = r.cfg.length ?? lengthOf(r.cfg.holes, nCourse);
  const first = r.cfg.holes[0] ?? 1;
  const ch = (h: number) => r.cfg.courseHoles?.[h - first] ?? courseHoleFor(h, nCourse);
  return {
    title: `${r.course.json.name}  ·  ${r.cfg.tee.toLowerCase()} tees  ·  ${r.cfg.playerName}`,
    blocks: cardBlocks(len, r.cfg.holes, shape),
    hole: (h) => { const hj = holes[ch(h) - 1]; return { par: hj.par, yd: hj.tees[r.cfg.tee]?.cardYd ?? 0 }; },
    scores: r.scores,
    ...(shape.nines ? { label: (h: number) => String(holeName(h, ch(h), shape).num) } : {}),
  };
}

/**
 * The card of a finished round from a leaderboard (only the nines it played).
 * Yards need the course's own data (`holes`, when it is the loaded course).
 */
export function cardOfEntry(e: LeaderboardEntry, courseName: string, holes: import('../data/course').HoleJson[] | null): CardData {
  const info = app.courses.find((c) => c.id === e.course);
  const shape = info ? shapeOfCourse(info) : undefined;
  const blocks = cardBlocks(e.length, e.scores.map((x) => x.hole), shape);
  const by = new Map(e.scores.map((s) => [s.hole, s]));
  const ch = (h: number) => e.holes?.[h - 1] ?? (holes ? courseHoleFor(h, holes.length) : h);
  return {
    title: `${courseName}  ·  ${e.tee.toLowerCase()} tees  ·  ${e.player}`,
    blocks,
    hole: (h) => {
      const hj = holes ? holes[ch(h) - 1] ?? null : null;
      return { par: by.get(h)?.par ?? hj?.par ?? 0, yd: hj ? hj.tees[e.tee]?.cardYd ?? null : null };
    },
    scores: e.scores,
    ...(shape?.nines ? { label: (h: number) => String(holeName(h, ch(h), shape).num) } : {}),
  };
}

/** Scorecard table: out and in (18-hole course, or a 9-hole course twice around), or one nine. */
export function scorecard(scene: Phaser.Scene, r: import('../systems/game/round').Round, W: number, H: number): Phaser.GameObjects.Container {
  return scorecardOf(scene, cardOfRound(r), W, H);
}

export function scorecardOf(scene: Phaser.Scene, d: CardData, W: number, H: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const blocks = d.blocks;
  const cellW = W < 330 ? 19 : 21; // 17 on a phone: three-digit yardages touched
  const labelW = 34, sumW = 24;
  const tw = labelW + cellW * 9 + sumW + 2;
  const x0 = Math.round((W - tw) / 2);
  const rowH = 11;
  const scoreH = 17; // tall enough for a circle / square around the number
  // no yards row when they aren't known (a shared card of a course that isn't loaded)
  const showYd = blocks.some(([a, b]) => { for (let h = a; h <= b; h++) if (d.hole(h).yd !== null) return true; return false; });
  const nRows = showYd ? 3 : 2;
  const parRow = showYd ? 2 : 1;
  const blockH = rowH * nRows + scoreH + 4;
  // the stats line: wrapped between its items, never inside one ("gir" and "6/9" were split), the panel taller by the extra lines
  const tot = totals(d.scores);
  const fw = tot.fairwayChances ? `${tot.fairways}/${tot.fairwayChances}` : '-';
  const items = [`total ${tot.strokes || '-'} (${tot.holes ? toPar(tot.toPar) : 'e'})`, `putts ${tot.putts}`, `fairways ${fw}`, `gir ${tot.gir}/${tot.holes}`, `penalties ${tot.penalties}`];
  const probe = txt(scene, 0, 0, '');
  const fits = (str: string) => { setTxt(probe, str); return probe.width <= tw; };
  const lines: string[] = [];
  for (const it of items) {
    const last = lines.length - 1;
    if (last >= 0 && fits(`${lines[last]}  ·  ${it}`)) lines[last] += `  ·  ${it}`;
    else lines.push(it);
  }
  probe.destroy();
  const statsH = 11 * (lines.length - 1);
  const th = blockH * blocks.length + 36 + statsH;
  const y0 = Math.max(4, Math.round((H - th) / 2) - 6);
  const pnl = new Panel(scene, x0 - 6, y0 - 4, tw + 12, th + 8, 0.94);
  c.add(pnl);
  c.add(txt(scene, x0, y0, d.title, { color: COLORS.dim, maxWidth: tw }));
  const byHole = new Map(d.scores.map((s) => [s.hole, s]));
  blocks.forEach(([a, b, lab], k) => {
    const yb = y0 + 14 + k * (blockH + 6);
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.06).fillRect(x0, yb, tw, rowH);
    g.fillStyle(0xffffff, 0.04).fillRect(x0, yb + rowH * parRow, tw, rowH);
    c.add(g);
    const rows = showYd ? ['hole', 'yards', 'par'] : ['hole', 'par'];
    const sy = yb + rowH * nRows + 4; // score text top (its digits are 6 x 9 px including the outline)
    rows.forEach((rl, i) => c.add(txt(scene, x0 + 2, yb + i * rowH + 1, rl, { color: COLORS.dim })));
    c.add(txt(scene, x0 + 2, sy, 'score', { color: COLORS.yellow }));
    let sumPar = 0, sumYd = 0, sumSc = 0, any = false, ydKnown = true;
    for (let h = a; h <= b; h++) {
      const hj = d.hole(h);
      const cx = x0 + labelW + (h - a) * cellW + cellW / 2;
      sumPar += hj.par;
      if (hj.yd === null) ydKnown = false; else sumYd += hj.yd;
      c.add(txt(scene, cx, yb + 1, d.label ? d.label(h) : String(h), { origin: [0.5, 0] }));
      if (showYd) c.add(txt(scene, cx, yb + rowH + 1, hj.yd === null ? '-' : String(hj.yd), { origin: [0.5, 0], color: COLORS.dim }));
      c.add(txt(scene, cx, yb + rowH * parRow + 1, String(hj.par), { origin: [0.5, 0] }));
      const s = byHole.get(h);
      if (s) {
        any = true;
        sumSc += s.strokes;
        const dd = s.strokes - s.par;
        const col = dd < 0 ? COLORS.yellow : dd === 0 ? COLORS.white : dd === 1 ? 0x9fd0ff : 0xff9b8a;
        const gg = scene.add.graphics();
        const mx = Math.round(cx), my = sy + 4; // centre of the digits
        // birdie: circle; eagle or better: filled circle; bogey: square; double bogey+: filled square
        if (dd <= -2) gg.fillStyle(COLORS.yellow, 0.22).fillCircle(mx, my + 0.5, 7);
        if (dd <= -1) gg.lineStyle(1, COLORS.yellow, 0.95).strokeCircle(mx, my + 0.5, 7);
        if (dd >= 2) gg.fillStyle(col, 0.18).fillRect(mx - 7, my - 6.5, 14, 14);
        if (dd >= 1) gg.lineStyle(1, col, 0.75).strokeRect(mx - 7, my - 6.5, 14, 14);
        c.add(gg);
        c.add(txt(scene, cx, sy, String(s.strokes), { origin: [0.5, 0], color: col }));
      }
    }
    const sx = x0 + labelW + 9 * cellW + sumW / 2;
    c.add(txt(scene, sx, yb + 1, lab, { origin: [0.5, 0], color: COLORS.dim }));
    if (showYd) c.add(txt(scene, sx, yb + rowH + 1, ydKnown ? String(sumYd) : '-', { origin: [0.5, 0], color: COLORS.dim }));
    c.add(txt(scene, sx, yb + rowH * parRow + 1, String(sumPar), { origin: [0.5, 0] }));
    if (any) c.add(txt(scene, sx, sy, String(sumSc), { origin: [0.5, 0], color: COLORS.yellow }));
  });
  lines.forEach((l, i) => c.add(txt(scene, x0, y0 + 14 + blocks.length * (blockH + 6) - 2 + i * 11, l, { color: COLORS.dim })));
  c.setData('bottom', y0 + th + 4);
  c.setData('top', y0 - 4);
  return c;
}

/** Putting distances: whole feet with yards, metres (one decimal under 10) with metres. */
export function distLabel(m: number): string {
  if (app.settings.units === 'yd') return `${Math.round(m / 0.3048)}ft`;
  return m < 10 ? `${Math.round(m * 10) / 10}m` : `${Math.round(m)}m`;
}

/** Putter scale / meter marks: always whole numbers. */
function puttScaleLabel(m: number): string {
  return app.settings.units === 'yd' ? `${Math.round(m / 0.3048)}ft` : `${Math.round(m)}m`;
}

function swingLabel(s: number): string {
  return s >= 1 ? 'full' : s === 0.75 ? '3/4' : s === 0.5 ? '1/2' : '1/4';
}

export { PX_PER_M };



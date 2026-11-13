// "Open to a challenge" on screen (developer, 2026-10-22): the box to say
// you're looking for a match, the notes at the top of the screen (someone is
// looking; an offer for you; the answer to yours: a few seconds each, nothing
// greyed out, a tap to act on one), and the way from a note to the screen
// that follows. Notes never come while a player is hitting: in a round they
// wait for the hole to end, like the match chat's.

import Phaser from 'phaser';
import { app } from '../app';
import { coursesByState } from '../data/registry';
import { forgetMatch } from '../match/live';
import { lobby, offeringFrom, setOffering } from '../match/challenge';
import type { LobbyEvent } from '../net/lobbyClient';
import { shortName } from '../save/milestones';
import { saveSettings } from '../save/store';
import { DEFAULT_NAME } from '../save/names';
import { ChallengeOffer, ChallengePost, minutesLeft } from '../systems/match/lobby';
import { askName } from './nameInput';
import { dialogOpen, dialogText, openDialog } from './domDialog';
import { toast, toastShown } from './toast';

const WHITE = '#f6f6f2', DIM = '#9fb0bd', YELLOW = '#ffd34a';

export const courseLabel = (id: string | null) => {
  if (id === null) return 'any course';
  const c = app.courses.find((k) => k.id === id);
  return c ? shortName(c.name) : id;
};

// ------------------------------------------------------------ the screens
/** The scene on top (a menu, or the HUD over a round): popups and names are asked over it. */
function topScene(game: Phaser.Game): Phaser.Scene | null {
  const sm = game.scene;
  if (sm.isActive('play')) return sm.getScene('hud');
  const on = sm.getScenes(true).filter((s) => !['bg', 'hud', 'play'].includes(s.sys.settings.key));
  return on[on.length - 1] ?? null;
}

/** Leave whatever is on screen for `key` (a round in play is saved as after every shot, and can be continued). */
export function goTo(game: Phaser.Game, key: string, data?: object) {
  const sm = game.scene;
  if (sm.isActive('play')) {
    const hud = sm.getScene('hud');
    hud.scene.stop('play');
    hud.scene.start(key, data);
    return;
  }
  topScene(game)?.scene.start(key, data);
}

/** A name before a challenge (the other player sees it); `go` once there is one. */
function withName(game: Phaser.Game, go: () => void) {
  if (app.settings.playerName && app.settings.playerName !== DEFAULT_NAME) { go(); return; }
  const s = topScene(game);
  if (!s) return;
  askName(s, '', (name) => {
    if (!name) return;
    app.settings.playerName = name;
    void saveSettings(app.settings);
    go();
  }, 'your name for the match', { why: 'the other player sees it' });
}

// --------------------------------------------------------- posting one
/** The box to say you're looking for a match: a course, or any course. */
export function openToChallenge(scene: Phaser.Scene, done: () => void) {
  withName(scene.game, () => {
    const dlg = openDialog(scene, 330, done);
    dlg.box.append(dialogText('open to a challenge', WHITE, 16), dialogText('everyone playing now sees it, for 15 minutes', DIM, 13));
    const sel = document.createElement('select');
    Object.assign(sel.style, {
      display: 'block', width: '100%', boxSizing: 'border-box', margin: '10px auto 0', font: '16px monospace', padding: '6px',
      border: '2px solid #394049', background: '#0b1116', color: WHITE, borderRadius: '4px',
    } as CSSStyleDeclaration);
    const any = document.createElement('option');
    any.value = '';
    any.textContent = 'any course (they choose)';
    sel.append(any);
    for (const g of coursesByState(app.courses)) {
      const og = document.createElement('optgroup');
      og.label = g.name.toLowerCase();
      for (const c of g.courses) {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name.toLowerCase();
        og.append(o);
      }
      sel.append(og);
    }
    const msg = dialogText('', '#ff7a6a', 13);
    dlg.box.append(sel, msg);
    const [post, cancel] = dlg.buttons(['post', 'cancel']);
    const off = lobby.onEvent((e) => {
      if (dlg.closed) { off(); return; }
      if (e.kind === 'posted' && e.mine) { off(); dlg.close(); done(); }
      if (e.kind === 'error') { msg.textContent = e.message; post.disabled = false; }
    });
    post.addEventListener('click', () => {
      msg.textContent = '';
      if (!lobby.post(app.settings.playerName, sel.value || null)) { msg.textContent = "can't reach the other players right now - try again in a moment"; return; }
      post.disabled = true;
    });
    cancel.addEventListener('click', () => { off(); dlg.close(); done(); });
  });
}

/** Your own post: the offers to it (accept or not now, each), stop looking, or keep at it. */
export function myPostDialog(scene: Phaser.Scene, done: () => void) {
  // (not one past its time that the lobby hasn't closed yet: it showed "0 min left" and offers to accept)
  const p = lobby.openPosts().find((x) => x.id === lobby.mine);
  if (!p) { done(); return; }
  const dlg = openDialog(scene, 330, done);
  Object.assign(dlg.box.style, { maxHeight: '80vh', overflowY: 'auto' });
  const left = minutesLeft(p, lobby.lobbyNow());
  dlg.box.append(
    dialogText("you're looking for a match", WHITE, 16),
    dialogText(`${courseLabel(p.course)}  ·  ${left} min left`, DIM, 13),
  );
  if (!lobby.offers.length) dlg.box.append(dialogText('no offers yet', DIM, 13));
  for (const o of lobby.offers) {
    dlg.box.append(dialogText(`${o.from} offers you a match`, YELLOW, 14), dialogText(`${courseLabel(o.course)}  ·  ${o.line}`, DIM, 12));
    const [yes, no] = dlg.buttons(['accept', 'not now']);
    yes.addEventListener('click', () => { dlg.close(); done(); answerOffer(scene.game, o, true); });
    no.addEventListener('click', () => { dlg.close(); done(); answerOffer(scene.game, o, false); });
  }
  const [stop, keep] = dlg.buttons(['stop looking', 'keep looking']);
  for (const b of [stop, keep]) b.style.background = '#4a525c';
  stop.addEventListener('click', () => { lobby.cancel(); dlg.close(); done(); });
  keep.addEventListener('click', () => { dlg.close(); done(); });
}

// ------------------------------------------------------- answering one
/** Take up a post: on its course straight to the new-match screen, else choose a course first. */
export function takeUp(game: Phaser.Game, p: ChallengePost) {
  withName(game, () => {
    setOffering(offeringFrom(p));
    if (p.course) goTo(game, 'courses', { purpose: 'match', from: 'title', courseId: p.course, pick: true });
    else goTo(game, 'courses', { purpose: 'match', from: 'title' });
  });
}

/** The popup for someone's post (also from the title's list). */
export function postDialog(game: Phaser.Game, p: ChallengePost, done: () => void = () => undefined) {
  const s = topScene(game);
  if (!s) return;
  const dlg = openDialog(s, 300, done);
  const left = minutesLeft(p, lobby.lobbyNow());
  dlg.box.append(
    dialogText(`${p.by} is looking for a match`, WHITE, 16),
    dialogText(p.course ? courseLabel(p.course) : 'any course: you choose it', YELLOW, 14),
    dialogText(`${left} min left`, DIM, 13),
  );
  const [play, later] = dlg.buttons([p.course ? 'play' : 'choose a course', 'not now']);
  play.addEventListener('click', () => { dlg.close(); done(); takeUp(game, p); });
  later.addEventListener('click', () => { dlg.close(); done(); });
}

/** Everyone looking for a match (the title's "+ N more"): one to play, or close. */
export function allPostsDialog(game: Phaser.Game) {
  const s = topScene(game);
  if (!s) return;
  const t = lobby.lobbyNow();
  const posts = lobby.openPosts().filter((p) => p.id !== lobby.mine).sort((a, b) => b.at - a.at).slice(0, 12);
  const dlg = openDialog(s, 320, () => undefined);
  Object.assign(dlg.box.style, { maxHeight: '76vh', overflowY: 'auto' });
  dlg.box.append(dialogText('looking for a match', WHITE, 16));
  for (const p of posts) {
    const [b] = dlg.buttons([`${p.by}  ·  ${courseLabel(p.course)}  ·  ${minutesLeft(p, t)} min`]);
    b.style.width = '100%';
    b.style.margin = '6px 0 0';
    b.addEventListener('click', () => { dlg.close(); postDialog(game, p); });
  }
  const [close] = dlg.buttons(['close']);
  close.style.background = '#4a525c';
  close.addEventListener('click', () => dlg.close());
}

/** Accept an offer (this player joins its match straight away) or not. */
function answerOffer(game: Phaser.Game, o: ChallengeOffer, accept: boolean) {
  if (!accept) { lobby.answer(o.id, false); return; }
  // joined once the lobby says the offer was still there: an offer withdrawn (or run out) while its
  // note was up put the player alone in a match nobody else was in, ready on the first tee, and five
  // minutes later able to claim it as a win
  void lobby.accept(o.id).then((r) => {
    if (r === 'unsent') return;
    if (r === 'gone') { toast({ title: 'that offer is no longer there', line: `${o.from} took it back, or it ran out`, ms: 5000 }); return; }
    goTo(game, 'match', { mode: 'join', code: o.code, auto: true });
  });
}

/** An offer to your post (a tap on its note): accept or not now. */
function offerDialog(game: Phaser.Game, o: ChallengeOffer) {
  const s = topScene(game);
  if (!s || !lobby.offers.some((x) => x.id === o.id)) return;
  const dlg = openDialog(s, 320, () => undefined);
  dlg.box.append(
    dialogText(`${o.from} offers you a match`, WHITE, 16),
    dialogText(courseLabel(o.course), YELLOW, 14),
    dialogText(o.line, DIM, 13),
  );
  const [yes, no] = dlg.buttons(['accept', 'not now']);
  yes.addEventListener('click', () => { dlg.close(); answerOffer(game, o, true); });
  no.addEventListener('click', () => { dlg.close(); answerOffer(game, o, false); });
}

const WHY: Record<string, string> = {
  declined: 'said not now',
  taken: 'is playing someone else',
  closed: 'is no longer looking',
  withdrawn: '',
};

/** The note for the answer to your offer, when you're not on its waiting screen. */
function replyNote(game: Phaser.Game, e: Extract<LobbyEvent, { kind: 'reply' }>, done: () => void) {
  const o = e.offer;
  if (!o) { done(); return; }
  if (e.accepted) {
    toast({
      title: `${o.to} accepted your match`, line: `${courseLabel(o.course)}  ·  ${o.line}`, ms: NOTE_MS.reply, onClose: done,
      onTap: () => goTo(game, 'match', { mode: 'continue', code: o.code }),
    });
  } else {
    toast({ title: `${o.to} ${WHY[e.why ?? 'closed'] || 'is no longer looking'}`, ms: NOTE_MS.post, onClose: done });
  }
}

// ----------------------------------------------------------- the queue
/** How long each note stays (ms). */
const NOTE_MS = { post: 7000, offer: 12000, reply: 12000 };

type Note = { kind: 'post'; post: ChallengePost } | { kind: 'offer'; offer: ChallengeOffer } | { kind: 'reply'; e: Extract<LobbyEvent, { kind: 'reply' }> };

/** Is now a good time for a note? Not over a box, not while a course loads, and in a round only once the hole is over. */
function quietNow(game: Phaser.Game, p: Note): boolean {
  if (dialogOpen() || toastShown()) return false;
  const sm = game.scene;
  if (sm.isActive('play')) {
    const ps = sm.getScene('play') as unknown as { state: string; match?: unknown };
    // in a live match someone else's post waits until it's over (it shows on the title anyway)
    if (p.kind === 'post' && ps.match) return false;
    return ['holed', 'between', 'over'].includes(ps.state);
  }
  if (sm.isActive('courses') && (sm.getScene('courses') as unknown as { busy?: boolean }).busy) return false;
  return true;
}

/** Still worth showing? (A post may have gone, an offer been answered from another device.) */
function stillLive(p: Note): boolean {
  if (p.kind === 'post') return lobby.openPosts().some((x) => x.id === p.post.id) && app.settings.challengePopups !== false;
  if (p.kind === 'offer') return lobby.offers.some((x) => x.id === p.offer.id);
  return true;
}

/** A waiting screen that shows this offer's answer itself (the match's invite screen): no popup then. */
let replyHandledBy: ((e: Extract<LobbyEvent, { kind: 'reply' }>) => boolean) | null = null;
export function handleReplies(f: typeof replyHandledBy) { replyHandledBy = f; }

let installed = false;

/** Start showing challenge notes (once per game). */
export function installChallengePopups(game: Phaser.Game) {
  if (installed) return;
  installed = true;
  const queue: Note[] = [];
  let showing = false;
  lobby.onEvent((e) => {
    if (e.kind === 'posted' && !e.mine) queue.push({ kind: 'post', post: e.post });
    else if (e.kind === 'offer') queue.push({ kind: 'offer', offer: e.offer });
    else if (e.kind === 'reply') {
      if (e.why === 'withdrawn') return; // taken back from this player's own games
      if (e.offer && !e.accepted) forgetMatch(e.offer.code); // a match nobody will join
      if (replyHandledBy?.(e)) return;
      queue.push({ kind: 'reply', e });
    }
  });
  const tick = () => {
    if (showing) return;
    while (queue.length && !stillLive(queue[0])) queue.shift();
    const p = queue[0];
    if (!p || !quietNow(game, p)) return;
    queue.shift();
    showing = true;
    const done = () => { showing = false; };
    if (p.kind === 'post') {
      const post = p.post;
      toast({
        title: `${post.by} is looking for a match`, line: post.course ? courseLabel(post.course) : 'any course: you choose it',
        ms: NOTE_MS.post, onClose: done, onTap: () => { if (lobby.openPosts().some((x) => x.id === post.id)) postDialog(game, post); },
      });
    } else if (p.kind === 'offer') {
      const o = p.offer;
      toast({ title: `${o.from} offers you a match`, line: `${courseLabel(o.course)}  ·  ${o.line}`, ms: NOTE_MS.offer, onClose: done, onTap: () => offerDialog(game, o) });
    } else replyNote(game, p.e, done);
  };
  setInterval(tick, 700);
}

// Chat in a live match (developer, 2026-10-22: typed messages only): the
// messages so far and a box to type in, in an HTML dialog over the game (a
// real input, so a phone's keyboard comes up, and any letter or emoji can be
// typed). Messages from the other player appear as they come while it is
// open. The server filters every message like a name (save/names.ts
// cleanChat), so what shows here is what both players see.

import Phaser from 'phaser';
import type { LiveMatch } from '../match/live';
import { CHAT, ChatMsg, Seat } from '../systems/match/types';
import { dialogInput, dialogText, openDialog } from './domDialog';

const ME = '#f59a4e', THEM = '#7cc0ff', DIM = '#9fb0bd', RED = '#ff7a6a', WHITE = '#f6f6f2';

/** "3:41 pm", or "tue 3:41 pm" for an older day. */
export function chatTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours(), m = d.getMinutes();
  const t = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? t : `${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()]} ${t}`;
}

/** The chat panel; `done` when it closes. */
export function openChat(scene: Phaser.Scene, live: LiveMatch, me: Seat, done: () => void) {
  const opp = live.session?.state.players[me === 0 ? 1 : 0]?.name ?? 'your friend';
  live.chatOpen = true;
  live.markChatRead();
  let unlisten = () => {};
  const finish = () => {
    unlisten();
    live.chatOpen = false;
    live.markChatRead();
    done();
  };
  const dlg = openDialog(scene, 380, finish);
  dlg.box.dataset.chat = '1';
  const title = dialogText(`chat with ${opp}`, WHITE, 15);
  const list = document.createElement('div');
  Object.assign(list.style, {
    marginTop: '8px', padding: '6px', minHeight: '70px', maxHeight: 'min(34vh, 260px)', overflowY: 'auto', textAlign: 'left',
    background: '#0b1116', border: '2px solid #394049', borderRadius: '4px', font: '14px monospace', lineHeight: '1.35',
  } as CSSStyleDeclaration);
  list.dataset.chatList = '1';
  const input = dialogInput(CHAT.maxLen, `message ${opp}`);
  input.enterKeyHint = 'send';
  const note = dialogText('', DIM, 12);
  dlg.box.append(title, list, input, note);
  const [send, close] = dlg.buttons(['send', 'close']);

  // messages this page is sending: shown greyed until the server has them, red if it didn't take one
  const pending: { key: number; text: string; failed?: string }[] = [];
  let pendingKey = 0;

  const line = (who: string, color: string, text: string, when: string, state?: 'sending' | 'failed', why?: string) => {
    const row = document.createElement('div');
    Object.assign(row.style, { margin: '2px 0', overflowWrap: 'anywhere', opacity: state === 'sending' ? '0.55' : '1' } as CSSStyleDeclaration);
    const name = document.createElement('span');
    name.textContent = `${who}: `;
    name.style.color = color;
    const body = document.createElement('span');
    body.textContent = text;
    body.style.color = state === 'failed' ? RED : WHITE;
    row.append(name, body);
    const tail = state === 'sending' ? 'sending...' : state === 'failed' ? `not sent: ${why ?? ''}` : when;
    if (tail) {
      const t = document.createElement('span');
      t.textContent = `  ${tail}`;
      Object.assign(t.style, { color: state === 'failed' ? RED : DIM, fontSize: '11px' } as CSSStyleDeclaration);
      row.append(t);
    }
    return row;
  };

  let shown = '';
  const render = (force = false) => {
    const msgs: ChatMsg[] = live.chat;
    const key = `${msgs.length}:${msgs[msgs.length - 1]?.id ?? 0}:${pending.map((p) => `${p.key}${p.failed ? 'x' : ''}`).join(',')}`;
    if (!force && key === shown) return;
    shown = key;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
    list.replaceChildren();
    if (!msgs.length && !pending.length) list.append(dialogText(`no messages yet - say hello to ${opp}`, DIM, 13));
    let lastAt = 0;
    for (const m of msgs) {
      // the time when it has been a while since the message before (a match can last days)
      const at = Date.parse(m.at);
      const when = !lastAt || at - lastAt > 10 * 60_000 ? chatTime(m.at) : '';
      lastAt = at;
      list.append(line(m.by === me ? 'you' : opp, m.by === me ? ME : THEM, m.text, when));
    }
    for (const p of pending) list.append(line('you', ME, p.text, '', p.failed ? 'failed' : 'sending', p.failed));
    if (atBottom || force) list.scrollTop = list.scrollHeight;
    if (live.chatOpen) live.markChatRead();
  };

  const go = async () => {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    input.value = '';
    note.textContent = '';
    const p: { key: number; text: string; failed?: string } = { key: pendingKey++, text };
    pending.push(p);
    render(true);
    const r = await live.say(text);
    if (dlg.closed) return;
    if (r.ok) pending.splice(pending.indexOf(p), 1);
    else {
      p.failed = r.message;
      if (!input.value) input.value = text; // to send again
      if (r.code === 'too_fast') note.textContent = 'slow down a moment, then send again';
    }
    render(true);
  };
  send.addEventListener('click', () => { void go(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); void go(); } });
  close.addEventListener('click', () => { if (!dlg.closed) { dlg.close(); finish(); } });
  unlisten = live.listen(() => { if (!dlg.closed) render(); });
  render(true);
  input.focus();
}

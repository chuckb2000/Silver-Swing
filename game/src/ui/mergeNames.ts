// Merge names (developer, 2026-10-21: "how to merge your scores if you've
// played under two names"): a player who has played under two names, on one
// device or two, puts all their rounds under one. The names this player code
// holds on the shared boards are listed to pick the one to keep; another
// device's player code can be added, and its names and rounds come too. The
// shared board moves the rounds and eagles (src/server/scores.ts handleMerge);
// this device's own board follows. The other names stay this player's, so
// nobody else can take them.

import Phaser from 'phaser';
import { app } from '../app';
import { keyCode, parseKeyCode } from '../save/identity';
import { mergeNames, nameConflicts, namesOfKey } from '../save/online';
import { renameAllLocal, saveSettings } from '../save/store';
import { dialogInput, dialogText, openDialog } from './domDialog';

const DIM = '#9fb0bd', RED = '#ff7a6a', WHITE = '#f6f6f2';

/** The "merge names" dialog; `done(true)` once something changed. */
export function askMerge(scene: Phaser.Scene, done: (changed: boolean) => void) {
  let changed = false;
  const dlg = openDialog(scene, 340, () => done(changed));
  const list = document.createElement('div');
  Object.assign(list.style, { marginTop: '6px', minHeight: '30px' } as CSSStyleDeclaration);
  const code = dialogInput(24, "another device's player code");
  code.style.fontSize = '15px';
  const msg = dialogText('looking up your names...', DIM, 13);
  dlg.box.append(
    dialogText('played under two names? pick the one to keep: rounds under the others go under it', WHITE, 14),
    list,
    dialogText('another device with its own player code? enter that code: its names and rounds join this one', DIM, 12),
    code,
    msg,
  );
  const [ok, cancel] = dlg.buttons(['merge', 'cancel']);
  let mine: string[] = [];
  let theirs: string[] = [];
  let from: string | null = null;
  let keep = '';
  let armed = false; // the first tap says what will happen; the second does it
  let busy = false;

  const say = (text: string, color = DIM) => { msg.style.color = color; msg.textContent = text; };
  const all = () => [...mine, ...theirs.filter((n) => !mine.includes(n))];
  const draw = () => {
    list.replaceChildren();
    for (const n of all()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = n;
      const on = n === keep;
      Object.assign(b.style, {
        margin: '4px', font: '14px monospace', padding: '4px 10px', color: WHITE, background: on ? '#e8681e' : '#394049',
        border: '2px solid #1c140f', borderBottomWidth: '3px', borderRadius: '4px', cursor: 'pointer',
      } as CSSStyleDeclaration);
      b.addEventListener('click', () => { keep = n; armed = false; ok.textContent = 'merge'; draw(); say(''); });
      list.append(b);
    }
  };

  void namesOfKey(app.settings.playerKey).then((names) => {
    if (dlg.closed) return;
    if (names === null) { say("the shared board can't be reached - try again when connected", RED); return; }
    mine = names;
    keep = mine.includes(app.settings.playerName) ? app.settings.playerName : mine[0] ?? '';
    draw();
    say(mine.length ? '' : 'no names on the shared boards with this code yet: finish a round first, or enter the other code');
  });

  // another device's code: its names are shown (and come with the merge)
  const lookUp = async () => {
    const raw = code.value.trim();
    if (!raw) { from = null; theirs = []; draw(); return; }
    const k = parseKeyCode(raw);
    if (!k) { say('that is not a player code', RED); return; }
    if (k === app.settings.playerKey) { say("that is this device's own code", RED); return; }
    say('checking...');
    const names = await namesOfKey(k);
    if (dlg.closed) return;
    if (names === null) { say("can't check codes offline - try again when connected", RED); return; }
    if (!names.length) { say('no names use that code - check it on the other device', RED); return; }
    from = k;
    theirs = names;
    if (!keep) keep = names[0];
    armed = false;
    ok.textContent = 'merge';
    draw();
    say(`${names.join(', ')} ${names.length === 1 ? 'comes' : 'come'} with that code`);
  };
  code.addEventListener('keydown', (e) => { if (e.key === 'Enter') void lookUp(); });
  code.addEventListener('change', () => { void lookUp(); });
  code.addEventListener('input', () => { armed = false; ok.textContent = 'merge'; });

  ok.addEventListener('click', async () => {
    if (busy || dlg.closed) return;
    if (code.value.trim() && !from) { await lookUp(); if (!from) return; }
    const names = all();
    if (!keep) { say('pick the name to keep', RED); return; }
    const others = names.filter((n) => n !== keep);
    if (!others.length && !from) { say('only one name: nothing to merge', RED); return; }
    if (!armed) {
      armed = true;
      ok.textContent = `merge into ${keep}`;
      say(others.length ? `rounds under ${others.join(', ')} go under ${keep}. tap again to merge` : `the other code's rounds come here, under ${keep}. tap again to merge`, WHITE);
      return;
    }
    busy = true;
    say('merging...');
    const usedFrom = !!from;
    const r = await mergeNames(keep, from ?? undefined);
    busy = false;
    if (dlg.closed) return;
    if (!r.ok) { armed = false; ok.textContent = 'merge'; say(r.message, RED); return; }
    await renameAllLocal(names, keep);
    app.settings.playerName = keep;
    nameConflicts.clear();
    await saveSettings(app.settings);
    changed = true;
    mine = [keep]; // (the others stay reserved for this player, off the list)
    theirs = [];
    from = null;
    code.value = '';
    draw();
    ok.style.display = 'none';
    cancel.textContent = 'close';
    // the other device still plays under its old code: its next rounds come here once it uses this one
    say(`done: ${r.moved} ${r.moved === 1 ? 'round' : 'rounds'} moved, everything is under ${keep}.`
      + (usedFrom ? ` on your other device: settings, player code, "use another", and enter ${keyCode(app.settings.playerKey)}` : ''), WHITE);
  });
  cancel.addEventListener('click', () => { if (!dlg.closed) { dlg.close(); done(changed); } });
}

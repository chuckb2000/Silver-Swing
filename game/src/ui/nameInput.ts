// The player's name: a text box over the game (the phone's keyboard comes up
// for it). Names are tidied and checked against the banned words list
// (save/names.ts); "player" is not a name; on the hosted site the name is
// claimed for this device, so a name another player holds is refused
// (developer, 2026-10-19). A refused name is shown in red and not accepted.
// The same person on a new device ("that name is taken" for their own name)
// enters the player code of their first device from here.

import Phaser from 'phaser';
import { app } from '../app';
import { DEFAULT_NAME, nameAllowed, tidyName } from '../save/names';
import { claimName, nameConflicts } from '../save/online';
import { saveSettings } from '../save/store';
import { askCode } from './codeInput';
import { dialogInput, dialogText, openDialog } from './domDialog';

export interface NameAskOpts {
  /** a line under the title: why the name is asked for */
  why?: string;
  /** the back-out button (default "cancel"; "skip" before a round) */
  skip?: string;
}

/** Ask for a name; `done` gets the new name, or null if the player backed out. */
export function askName(scene: Phaser.Scene, current: string, done: (name: string | null) => void, title = 'name for the leaderboard', o: NameAskOpts = {}) {
  const dlg = openDialog(scene, 270, () => done(null));
  const input = dialogInput(16, 'your name', current === DEFAULT_NAME ? '' : current);
  const msg = dialogText('', '#ff7a6a', 13);
  dlg.box.append(dialogText(title));
  if (o.why) dlg.box.append(dialogText(o.why, '#9fb0bd', 13));
  dlg.box.append(input, msg);
  const [ok, cancel, mine] = dlg.buttons(['ok', o.skip ?? 'cancel', "it's mine"]);
  mine.style.display = 'none';
  try { input.focus(); } catch { /* the player taps the box instead (iOS) */ }
  let busy = false;
  const finish = (name: string | null) => {
    if (dlg.closed) return;
    dlg.close();
    done(name);
  };
  const refuse = (text: string, taken = false) => {
    msg.style.color = '#ff7a6a';
    msg.textContent = text;
    mine.style.display = taken ? '' : 'none';
    input.select();
  };
  const submit = async () => {
    if (busy || dlg.closed) return;
    const v = tidyName(input.value);
    if (!v) { finish(null); return; }
    if (v === DEFAULT_NAME) { refuse('pick a name of your own'); return; }
    if (!nameAllowed(v)) { refuse("that name isn't allowed - try another"); return; }
    busy = true;
    msg.style.color = '#9fb0bd';
    msg.textContent = 'checking...';
    const r = await claimName(v);
    busy = false;
    if (dlg.closed) return;
    msg.textContent = '';
    if (r === 'taken') { refuse('another device has that name. yours? tap "it\'s mine" and enter its player code (settings on that device)', true); return; }
    if (r === 'too_many') { refuse('this device has too many names - use one of yours'); return; }
    if (r === 'invalid') { refuse("that name isn't allowed - try another"); return; }
    finish(v);
  };
  ok.addEventListener('click', () => { void submit(); });
  cancel.addEventListener('click', () => finish(null));
  mine.addEventListener('click', () => {
    // the player code of the device that holds the name; then the name is checked again
    const name = input.value;
    dlg.close();
    askCode(scene, (key) => {
      if (!scene.sys.isActive()) { done(null); return; }
      if (key && key !== app.settings.playerKey) {
        app.settings.playerKey = key;
        nameConflicts.clear();
        void saveSettings(app.settings);
      }
      askName(scene, name, done, title, o);
    });
  });
  input.addEventListener('input', () => { msg.textContent = ''; mine.style.display = 'none'; });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void submit();
  });
}

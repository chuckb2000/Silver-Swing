// Player code: the same person on a second device types the code shown in
// settings on the first one, so their names on the shared boards work there
// too (save/identity.ts). The code is checked with the shared board first: a
// code that holds no names is refused (a typo would otherwise make a new
// identity), and this device's own code is shown so it can be written down.

import Phaser from 'phaser';
import { app } from '../app';
import { keyCode, parseKeyCode } from '../save/identity';
import { namesOfKey } from '../save/online';
import { dialogInput, dialogText, openDialog } from './domDialog';

/** Ask for a player code; `done` gets the key, or null if the player backed out. */
export function askCode(scene: Phaser.Scene, done: (key: string | null) => void) {
  const dlg = openDialog(scene, 310, () => done(null));
  const input = dialogInput(24, 'abcd-efgh-ijkm-npqr');
  input.style.fontSize = '18px';
  const msg = dialogText('', '#ff7a6a', 13);
  dlg.box.append(
    dialogText('player code from your other device (its names come with it)', '#f6f6f2', 14),
    input,
    dialogText(`this device's code now: ${keyCode(app.settings.playerKey)} - write it down to come back to it`, '#9fb0bd', 12),
    msg,
  );
  const [ok, cancel] = dlg.buttons(['use code', 'cancel']);
  try { input.focus(); } catch { /* tapped instead (iOS) */ }
  let busy = false;
  const finish = (key: string | null) => {
    if (dlg.closed) return;
    dlg.close();
    done(key);
  };
  const submit = async () => {
    if (busy || dlg.closed) return;
    const k = parseKeyCode(input.value);
    if (!k) { msg.textContent = 'that is not a player code'; input.select(); return; }
    if (k === app.settings.playerKey) { finish(k); return; }
    busy = true;
    msg.style.color = '#9fb0bd';
    msg.textContent = 'checking...';
    const names = await namesOfKey(k);
    busy = false;
    if (dlg.closed) return;
    msg.style.color = '#ff7a6a';
    if (names === null) { msg.textContent = "can't check codes offline - try again when connected"; return; }
    if (!names.length) { msg.textContent = 'no names use that code - check it on the other device'; input.select(); return; }
    finish(k);
  };
  ok.addEventListener('click', () => { void submit(); });
  cancel.addEventListener('click', () => finish(null));
  input.addEventListener('input', () => { msg.textContent = ''; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void submit(); });
}

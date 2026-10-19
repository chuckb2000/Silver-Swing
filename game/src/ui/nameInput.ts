// The player's name: a text box over the game (the phone's keyboard comes up
// for it). Names are tidied and checked against the banned words list
// (save/names.ts); a refused name is shown in red and not accepted.

import Phaser from 'phaser';
import { nameAllowed, tidyName } from '../save/names';

/** Ask for a name; `done` gets the new name, or null if the player backed out. */
export function askName(scene: Phaser.Scene, current: string, done: (name: string | null) => void) {
  const r = scene.game.canvas.getBoundingClientRect();
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', left: `${r.left + r.width / 2 - 125}px`, top: `${r.top + r.height / 2 - 40}px`, width: '250px',
    padding: '10px', background: '#121a20', border: '3px solid #e8681e', borderRadius: '6px', zIndex: '10',
    font: '15px monospace', color: '#f6f6f2', textAlign: 'center',
  } as CSSStyleDeclaration);
  const label = document.createElement('div');
  label.textContent = 'name for the leaderboard';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 16;
  input.value = current === 'player' ? '' : current;
  input.placeholder = 'your name';
  Object.assign(input.style, {
    display: 'block', width: '220px', margin: '8px auto 0', font: '20px monospace', padding: '6px',
    border: '2px solid #394049', background: '#0b1116', color: '#f6f6f2', borderRadius: '4px',
  } as CSSStyleDeclaration);
  const msg = document.createElement('div');
  Object.assign(msg.style, { minHeight: '18px', marginTop: '6px', color: '#ff7a6a', fontSize: '13px' } as CSSStyleDeclaration);
  box.append(label, input, msg);
  document.body.appendChild(box);
  input.focus();
  let closed = false;
  const close = (name: string | null) => {
    if (closed) return;
    closed = true;
    box.remove();
    done(name);
  };
  const submit = () => {
    const v = tidyName(input.value);
    if (!v) { close(null); return; }
    if (!nameAllowed(v)) {
      msg.textContent = "that name isn't allowed - try another";
      input.select();
      return false;
    }
    close(v);
    return true;
  };
  input.addEventListener('input', () => { msg.textContent = ''; });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close(null);
  });
  // tapping elsewhere: keep a good name, drop a refused one
  input.addEventListener('blur', () => { setTimeout(() => { if (!closed && submit() === false) close(null); }, 0); });
}

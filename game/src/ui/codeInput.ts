// Player code: the same person on a second device types the code shown in
// settings on the first one, so their names on the shared boards work there
// too (save/identity.ts).

import Phaser from 'phaser';
import { parseKeyCode } from '../save/identity';

/** Ask for a player code; `done` gets the key, or null if the player backed out. */
export function askCode(scene: Phaser.Scene, done: (key: string | null) => void) {
  const r = scene.game.canvas.getBoundingClientRect();
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', left: `${r.left + r.width / 2 - 150}px`, top: `${r.top + r.height / 2 - 60}px`, width: '300px',
    padding: '10px', background: '#121a20', border: '3px solid #e8681e', borderRadius: '6px', zIndex: '10',
    font: '14px monospace', color: '#f6f6f2', textAlign: 'center',
  } as CSSStyleDeclaration);
  const label = document.createElement('div');
  label.textContent = 'player code from your other device (your names come with it)';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 24;
  input.placeholder = 'abcd-efgh-ijkm-npqr';
  Object.assign(input.style, {
    display: 'block', width: '250px', margin: '8px auto 0', font: '18px monospace', padding: '6px',
    border: '2px solid #394049', background: '#0b1116', color: '#f6f6f2', borderRadius: '4px',
  } as CSSStyleDeclaration);
  const msg = document.createElement('div');
  Object.assign(msg.style, { minHeight: '18px', marginTop: '6px', color: '#ff7a6a', fontSize: '13px' } as CSSStyleDeclaration);
  const row = document.createElement('div');
  const ok = document.createElement('button');
  const cancel = document.createElement('button');
  ok.textContent = 'use code';
  cancel.textContent = 'cancel';
  for (const b of [ok, cancel]) Object.assign(b.style, { margin: '6px 6px 0', font: '14px monospace', padding: '4px 10px' } as CSSStyleDeclaration);
  row.append(ok, cancel);
  box.append(label, input, msg, row);
  document.body.appendChild(box);
  input.focus();
  let closed = false;
  const close = (key: string | null) => {
    if (closed) return;
    closed = true;
    box.remove();
    done(key);
  };
  const submit = () => {
    const k = parseKeyCode(input.value);
    if (!k) { msg.textContent = 'that is not a player code'; input.select(); return; }
    close(k);
  };
  ok.addEventListener('click', submit);
  cancel.addEventListener('click', () => close(null));
  input.addEventListener('input', () => { msg.textContent = ''; });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close(null);
  });
}

// A small HTML dialog over the game (text entry needs a real input so the
// phone's keyboard comes up). One at a time, on a full-screen dimmer that keeps
// taps and keys off the game underneath; it closes when the scene that opened
// it shuts down. Tapping the dimmer or pressing Escape cancels.

import Phaser from 'phaser';

let current: { cancel: () => void } | null = null;

export interface DomDialog {
  box: HTMLDivElement;
  /** a row of buttons; returns them in order */
  buttons: (labels: string[]) => HTMLButtonElement[];
  /** close without calling the cancel handler */
  close: () => void;
  readonly closed: boolean;
}

/** Is one of these dialogs open now (a popup waits for it to close)? */
export function dialogOpen(): boolean {
  return current !== null;
}

export function openDialog(scene: Phaser.Scene, width: number, onCancel: () => void): DomDialog {
  current?.cancel();
  const back = document.createElement('div');
  Object.assign(back.style, { position: 'fixed', left: '0', top: '0', right: '0', bottom: '0', background: 'rgba(5,8,11,0.55)', zIndex: '10' } as CSSStyleDeclaration);
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', left: '50%', top: '18%', transform: 'translateX(-50%)', width: `${width}px`, maxWidth: 'calc(100vw - 28px)',
    padding: '10px', background: '#121a20', border: '3px solid #e8681e', borderRadius: '6px', zIndex: '11',
    font: '15px monospace', color: '#f6f6f2', textAlign: 'center', boxSizing: 'border-box',
  } as CSSStyleDeclaration);
  document.body.append(back, box);
  let closed = false;
  // keys go to the dialog only (Phaser listens on the window: Space would start a swing)
  const keys = (e: KeyboardEvent) => {
    if (box.contains(e.target as Node)) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') cancel();
  };
  window.addEventListener('keydown', keys, true);
  box.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') cancel();
  });
  const close = () => {
    if (closed) return;
    closed = true;
    back.remove();
    box.remove();
    window.removeEventListener('keydown', keys, true);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cancel);
    if (current === me) current = null;
  };
  function cancel() {
    if (closed) return;
    close();
    onCancel();
  }
  const me = { cancel };
  current = me;
  back.addEventListener('pointerdown', (e) => { e.preventDefault(); cancel(); });
  // a press or a release on the dialog stays in it: Phaser also listens on the window and took one as a
  // tap on the game underneath (developer, 2026-10-22: "close" on a card from the recent list opened the
  // card of the round under the button, again and again)
  for (const el of [back, box]) {
    for (const t of ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'] as const) el.addEventListener(t, (e) => e.stopPropagation());
  }
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cancel);
  return {
    box,
    close,
    get closed() { return closed; },
    buttons: (labels: string[]) => {
      const row = document.createElement('div');
      const out = labels.map((l) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = l;
        Object.assign(b.style, {
          margin: '8px 4px 0', font: '14px monospace', padding: '6px 12px', color: '#f6f6f2', background: '#e8681e',
          border: '2px solid #1c140f', borderBottomWidth: '4px', borderRadius: '4px', cursor: 'pointer',
        } as CSSStyleDeclaration);
        row.append(b);
        return b;
      });
      box.append(row);
      return out;
    },
  };
}

/** A text input styled for the dialogs. */
export function dialogInput(maxLength: number, placeholder: string, value = ''): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = maxLength;
  input.placeholder = placeholder;
  input.value = value;
  input.autocomplete = 'off';
  input.spellcheck = false;
  Object.assign(input.style, {
    display: 'block', width: '100%', boxSizing: 'border-box', margin: '8px auto 0', font: '20px monospace', padding: '6px',
    border: '2px solid #394049', background: '#0b1116', color: '#f6f6f2', borderRadius: '4px',
  } as CSSStyleDeclaration);
  return input;
}

export function dialogText(text: string, color = '#f6f6f2', size = 15): HTMLDivElement {
  const d = document.createElement('div');
  d.textContent = text;
  Object.assign(d.style, { color, fontSize: `${size}px`, marginTop: '6px', minHeight: '18px', overflowWrap: 'anywhere' } as CSSStyleDeclaration);
  return d;
}

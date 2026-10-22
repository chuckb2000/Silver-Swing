// A note at the top of the screen that shows for a few seconds and goes
// (developer, 2026-10-22: no popup that greys out the screen for someone
// looking for a match, an offer or its answer). Nothing under it is dimmed or
// blocked; a tap on the note itself acts on it, and never reaches the game.

export interface Toast {
  close: () => void;
}

const FADE_MS = 250;

let shown: { el: HTMLDivElement; close: () => void } | null = null;

/** Is a note on screen now? */
export function toastShown(): boolean {
  return shown !== null;
}

/**
 * Show a note for `ms`: `title` in white, `line` under it in yellow, and "tap to see" when there's
 * something to do (`onTap`, which closes the note first). `onClose` runs once it has gone, however.
 */
export function toast(o: { title: string; line?: string; ms: number; onTap?: () => void; onClose?: () => void }): Toast {
  shown?.close();
  const el = document.createElement('div');
  el.dataset.toast = '1';
  Object.assign(el.style, {
    position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100vw - 28px)', boxSizing: 'border-box',
    padding: '6px 14px', background: 'rgba(18,26,32,0.94)', border: '2px solid #e8681e', borderRadius: '6px', zIndex: '9',
    font: '13px monospace', color: '#f6f6f2', textAlign: 'center', opacity: '0', transition: `opacity ${FADE_MS}ms`,
    cursor: o.onTap ? 'pointer' : 'default', userSelect: 'none', pointerEvents: 'auto',
  } as CSSStyleDeclaration);
  const line = (text: string, color: string, size: number) => {
    const d = document.createElement('div');
    d.textContent = text;
    Object.assign(d.style, { color, fontSize: `${size}px`, overflowWrap: 'anywhere' } as CSSStyleDeclaration);
    el.append(d);
  };
  line(o.title, '#f6f6f2', 14);
  if (o.line) line(o.line, '#ffd34a', 13);
  if (o.onTap) line('tap to see', '#9fb0bd', 11);
  // a press on the note stays on it (Phaser listens on the window: it would be a tap on the game too)
  for (const t of ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'] as const) el.addEventListener(t, (e) => e.stopPropagation());
  document.body.append(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (shown?.el === el) shown = null;
    el.style.opacity = '0';
    setTimeout(() => el.remove(), FADE_MS);
    o.onClose?.();
  };
  const timer = setTimeout(close, o.ms);
  if (o.onTap) {
    const go = o.onTap;
    el.addEventListener('click', () => { close(); go(); });
  }
  shown = { el, close };
  return { close };
}

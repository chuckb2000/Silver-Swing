// Leaderboard backup dialogs, built from plain DOM elements. Native buttons and
// text areas give copy, paste and the file picker a real user gesture (Phaser
// button callbacks run a frame later), and copying text still works where file
// downloads are blocked, such as a sandboxed frame.

import { importBackup } from '../save/store';

const STYLE_ID = 'lg-backup-style';
const CSS = `
.lg-dim{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;box-sizing:border-box;
  padding:max(12px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) max(12px,env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));
  background:rgba(8,12,16,.72);font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#f6f6f2}
.lg-box{box-sizing:border-box;width:min(460px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:10px;
  padding:14px;background:#121a20;border:3px solid #1c140f;box-shadow:0 0 0 2px #5d6673;border-radius:4px}
.lg-box h2{margin:0;font-size:18px;color:#ffd84a}
.lg-box p{margin:0;color:#a9b3bd}
.lg-box textarea{box-sizing:border-box;width:100%;min-height:8em;resize:vertical;padding:8px;border:2px solid #394049;border-radius:3px;
  background:#0b1014;color:#f6f6f2;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.lg-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.lg-btn{appearance:none;position:relative;border:2px solid #1c140f;border-radius:3px;padding:7px 14px;font:inherit;font-weight:700;
  color:#f6f6f2;cursor:pointer;background:#e8681e;box-shadow:inset 0 -3px 0 #a4451a,inset 0 2px 0 #f59a4e}
.lg-btn.grey{background:#5d6673;box-shadow:inset 0 -3px 0 #394049,inset 0 2px 0 #7d8794}
.lg-btn:focus-visible,.lg-box textarea:focus-visible,.lg-file:focus-within{outline:2px solid #ffd84a;outline-offset:2px}
.lg-file{overflow:hidden}
.lg-file input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.lg-msg{min-height:1.45em;color:#ffd84a}
.lg-msg.err{color:#ff6a5a}
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids);
  return e;
}

function button(label: string, grey: boolean, onClick: () => void) {
  const b = el('button', { type: 'button', className: grey ? 'lg-btn grey' : 'lg-btn', textContent: label });
  b.addEventListener('click', onClick);
  return b;
}

/** A centred dialog over the game. Keys stay in the dialog while it is open. */
function modal(title: string, onClose: () => void) {
  if (!document.getElementById(STYLE_ID)) {
    document.head.appendChild(el('style', { id: STYLE_ID, textContent: CSS }));
  }
  const box = el('div', { className: 'lg-box' }, el('h2', { textContent: title }));
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', title);
  const dim = el('div', { className: 'lg-dim' }, box);
  let closed = false;
  // The game listens for keys on window; stop them there (capture phase) so
  // typing or Escape never reaches it. Default actions (typing, paste, Tab)
  // still happen.
  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.type === 'keydown' && e.key === 'Escape') { e.preventDefault(); close(); }
  };
  const close = () => {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKey, true);
    dim.remove();
    onClose();
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  document.body.appendChild(dim);
  return { box, close };
}

const finePointer = () => { try { return matchMedia('(pointer: fine)').matches; } catch { return false; } };

/** Show the backup text with a copy button. */
export function showBackup(text: string, rounds: number): Promise<void> {
  return new Promise((resolve) => {
    const { box, close } = modal('back up scores', resolve);
    const area = el('textarea', { readOnly: true, value: text, spellcheck: false });
    area.setAttribute('aria-label', 'backup text');
    const msg = el('div', { className: 'lg-msg' });
    msg.setAttribute('aria-live', 'polite');
    const selectAll = () => {
      area.focus();
      area.select();
      msg.textContent = 'text selected. copy it with ctrl+c, cmd+c or long-press.';
    };
    const copy = button('copy', false, () => {
      try {
        navigator.clipboard.writeText(text).then(() => { msg.textContent = 'copied.'; }, selectAll);
      } catch {
        selectAll();
      }
    });
    box.append(
      el('p', { textContent: `${rounds} ${rounds === 1 ? 'round' : 'rounds'}. keep this text somewhere safe, such as a note or an email to yourself. to restore it, choose import on any device and paste it in.` }),
      area,
      el('div', { className: 'lg-row' }, copy, button('close', true, close)),
      msg,
    );
    copy.focus();
  });
}

/** Ask for backup text (pasted or from a file) and merge it into the leaderboard.
 *  Resolves the number of rounds added, or null if cancelled. */
export function askImport(): Promise<number | null> {
  return new Promise((resolve) => {
    let added: number | null = null;
    const { box, close } = modal('restore scores', () => resolve(added));
    const area = el('textarea', { placeholder: 'paste backup text here', spellcheck: false });
    area.setAttribute('aria-label', 'backup text');
    const msg = el('div', { className: 'lg-msg err' });
    msg.setAttribute('aria-live', 'polite');
    const run = async (text: string) => {
      if (!text.trim()) { msg.textContent = 'paste the backup text first, or choose a file.'; return; }
      const n = await importBackup(text.trim());
      if (n < 0) { msg.textContent = "that isn't a scores backup. copy the whole text from export and try again."; return; }
      added = n;
      close();
    };
    const file = el('input', { type: 'file', accept: '.json,.txt,application/json,text/plain' });
    file.setAttribute('aria-label', 'choose a backup file');
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      area.value = await f.text();
      void run(area.value);
    });
    const pick = el('label', { className: 'lg-btn grey lg-file', textContent: 'choose file' });
    pick.append(file);
    box.append(
      el('p', { textContent: 'paste the text from export, or choose a saved backup file. rounds you already have are skipped.' }),
      area,
      el('div', { className: 'lg-row' }, button('import', false, () => void run(area.value)), pick, button('cancel', true, close)),
      msg,
    );
    if (finePointer()) area.focus();
  });
}

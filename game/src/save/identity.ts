// This device's player key: a random private id sent with every round and
// eagle so a name on the shared boards belongs to one device (developer,
// 2026-10-19: no two people with the same name). It never appears on a board.
// The same person on another device copies it there (settings: player code).

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // no l, o, 0, 1

export function newPlayerKey(): string {
  const bytes = new Uint8Array(16);
  try { crypto.getRandomValues(bytes); } catch { for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256); }
  let s = '';
  for (const b of bytes) s += ALPHABET[b % 32];
  return s;
}

export const isPlayerKey = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{16}$/.test(v);

/** The key as a code to read out or copy: abcd-efgh-ijkm-npqr. */
export const keyCode = (k: string) => k.replace(/(.{4})(?=.)/g, '$1-');

/** A typed or pasted code back to a key (null if it isn't one). */
export function parseKeyCode(code: string): string | null {
  const k = code.toLowerCase().replace(/[^a-z0-9]/g, '');
  return isPlayerKey(k) ? k : null;
}

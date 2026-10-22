// "Open to a challenge" in the game (developer, 2026-10-22): the line to the
// lobby (src/net/lobbyClient.ts), opened once the site turns out to have live
// matches, and the challenge being answered while its match is set up (the
// new-match screen offers it to the poster instead of inviting a friend).

import { app } from '../app';
import { LobbyClient, LobbyDeps } from '../net/lobbyClient';
import type { ChallengePost } from '../systems/match/lobby';
import { liveMatchesAvailable } from './live';

export const lobby = new LobbyClient({
  base: '',
  // (no WebSocket outside a browser, as in the unit tests: the line then never opens)
  WebSocket: (typeof WebSocket !== 'undefined' ? WebSocket : class { constructor() { throw new Error('no WebSocket'); } }) as unknown as LobbyDeps['WebSocket'],
});

/** The post being answered: the new-match screen makes the match, then offers it to its poster. */
export interface Offering { post: string; to: string; course: string | null }
let offering: Offering | null = null;
export const currentOffering = () => offering;
export function setOffering(o: Offering | null) { offering = o; }
export const offeringFrom = (p: ChallengePost): Offering => ({ post: p.id, to: p.by, course: p.course });

// (the end-to-end tests read the lobby's picture through it, as they read the game through __game)
if (typeof window !== 'undefined') (window as unknown as { __lobby?: LobbyClient }).__lobby = lobby;

let started = false;

/** Open the line to the lobby (once; again when the player code changes). */
export async function startLobby(): Promise<void> {
  if (!(await liveMatchesAvailable())) return;
  const key = app.settings.playerKey;
  if (!key) return;
  lobby.start(key);
  if (started) return;
  started = true;
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') lobby.wake(); });
  }
}

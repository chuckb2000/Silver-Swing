// "Open to a challenge" (developer, 2026-10-22): a player says they're looking
// for a match; everyone with the game open sees it (a popup, and a line on the
// title screen for 15 minutes) and can offer one, on the course the poster
// chose or on one they propose; the poster accepts one offer or declines. The
// lobby is one Durable Object (src/server/lobby.ts, the match Worker's object
// named "lobby"). The match itself is an ordinary live match: the one who
// offers makes it (its code goes with the offer) and the poster joins it. Pure.

/** Lobby limits and times. */
export const LOBBY = {
  /** the lobby's protocol: a game and a lobby that disagree don't talk */
  version: 1,
  /** how long a post stays up (developer: "like 15 minutes") */
  postMs: 15 * 60_000,
  /** open offers one player may have out at once */
  maxOffers: 3,
  /** posts and offers the lobby keeps at most (a guard, not a limit anyone meets) */
  maxPosts: 60,
  maxAllOffers: 200,
  /** a player posts at most this often (a post and a cancel in a loop would pop up on every screen) */
  postEveryMs: 20_000,
  /** open lines to the lobby */
  maxSockets: 300,
  /** a message to the lobby is small */
  maxMessage: 4096,
  /** the match line that goes with an offer ("18 holes · blue tees · normal") */
  maxLine: 90,
} as const;

/** The object in the match Worker that is the lobby (a match code is six letters: this can't be one). */
export const LOBBY_NAME = 'lobby';

/** A player looking for a match, as everyone sees it. */
export interface ChallengePost {
  id: string;
  /** the poster's name */
  by: string;
  /** the course the poster wants (a course id), or null: any course (the others propose one) */
  course: string | null;
  /** when it went up, and until when it stays (the lobby's clock, ms) */
  at: number;
  until: number;
}

/** A match offered to a post: made already, waiting for the poster to join it. */
export interface ChallengeOffer {
  id: string;
  /** the post it answers, and its poster's name */
  post: string;
  to: string;
  /** who offers it */
  from: string;
  /** the live match's code: the poster joins it to accept */
  code: string;
  course: string;
  /** "18 holes · blue tees · normal" */
  line: string;
  at: number;
}

/** Why an offer came to nothing. */
export type OfferEnd = 'declined' | 'taken' | 'withdrawn' | 'closed';

/** Game -> lobby. `name` goes with what other players see (a player may rename between posts). */
export type LobbyAction =
  | { type: 'hello'; key: string; v: number }
  | { type: 'post'; name: string; course: string | null }
  | { type: 'cancel' }
  | { type: 'offer'; name: string; post: string; code: string; course: string; line: string }
  | { type: 'withdraw'; offer: string }
  | { type: 'answer'; offer: string; accept: boolean };

/** Lobby -> game. */
export type LobbyNews =
  /** after hello: every open post, this player's own post, the offers to it, and the offers this player has out */
  | { type: 'welcome'; v: number; now: number; online: number; posts: ChallengePost[]; mine: string | null; offers: ChallengeOffer[]; sent: ChallengeOffer[] }
  /** a new post (to everyone; `mine` to the poster's own games) */
  | { type: 'posted'; post: ChallengePost; now: number; mine?: boolean }
  /** a post is gone: cancelled, taken (the poster accepted an offer) or expired */
  | { type: 'closed'; post: string; why: 'cancelled' | 'taken' | 'expired' }
  /** to the poster's games: an offer came in */
  | { type: 'offer'; offer: ChallengeOffer }
  /** to the poster's games: an offer went (withdrawn, or answered from another of their games) */
  | { type: 'offerGone'; offer: string; why: OfferEnd | 'accepted' }
  /** to the offerer's games: the offer is in */
  | { type: 'sent'; offer: ChallengeOffer }
  /** to the offerer's games: the answer */
  | { type: 'reply'; offer: string; accepted: boolean; why?: OfferEnd }
  /** how many players have the game open */
  | { type: 'online'; n: number }
  | { type: 'error'; code: string; message: string };

export const isPostId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{6,16}$/.test(v);
export const isCourseId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9_]{1,40}$/.test(v);

/** Minutes left on a post, as the title screen says it ("12 min", "1 min"). */
export function minutesLeft(post: ChallengePost, now: number): number {
  return Math.max(0, Math.ceil((post.until - now) / 60_000));
}

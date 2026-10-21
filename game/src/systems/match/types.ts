// Live match play (design: docs/reports/multiplayer_live_match.md): the shared
// vocabulary of the match server (src/server/matchRoom.ts) and the game.
// Pure data; nothing here touches Phaser, the browser or the network.

import type { Difficulty } from '../../data/difficulty';
import type { BallPos, PendingRelief } from '../game/round';
import type { PuttStrike, Strike } from '../swing/outcome';

/** Bumped when the messages change in a way an older game can't read. */
export const PROTOCOL = 1;

/**
 * Bumped whenever rules.ts decides anything differently. The match server and
 * the games must run the same rules, or one accepts a move the other refuses:
 * a game whose number differs from the server's is told to update (or, if the
 * server is the older one, that the match server needs deploying).
 */
export const RULES = 2;

/** The keep-alive a game sends, and the server's answer (sent without waking the match's object). */
export const PING = '{"type":"ping"}';
export const PONG = '{"type":"pong"}';

/** Why the server closed a game's WebSocket (the game acts on these; others mean "connect again"). */
export const CLOSE = {
  /** no such match (deleted, or never made) */
  noMatch: 4004,
  /** the socket never said who it was */
  noHello: 4008,
  /** the match expired and was deleted */
  expired: 4010,
  /** the same player opened the match on another tab or device */
  replaced: 4011,
  /** the game and the server run different rules (RULES) */
  version: 4012,
} as const;

export type Seat = 0 | 1;

/** What the other player sees of a player (their private key stays on the server). */
export interface MatchPlayer {
  name: string;
  lefty: boolean;
}

/** Fixed when the match is made: both players play exactly this. */
export interface MatchConfig {
  protocol: number;
  courseId: string;
  /** the course's files as the creator had them (courses/versions.json; 'dev' in development) */
  courseVersion: string;
  tee: string;
  /** scorecard hole numbers, as RoundConfig.holes */
  holes: number[];
  difficulty: Difficulty;
  /** wind, lies, gusts and the pin sheet come from it (the same for both players) */
  seed: number;
  /** a pin per hole of the match */
  pins: [number, number][];
  startedAt: string;
}

/** A player's hole after a stroke or a drop: what the other game needs to show it and to know whose turn it is. */
export interface HoleSnap {
  /** index of the hole in cfg.holes */
  hole: number;
  tally: { strokes: number; putts: number; penalties: number; fairway: boolean | null; reachedGreenAt: number | null };
  ball: BallPos;
  prev: BallPos;
  shotNo: number;
  shotSeq: number;
  /** a relief choice the stroke left open (water, out of bounds, wrong green, cart path) */
  pending: PendingRelief | null;
  holed: boolean;
}

/** A stroke as the player's game planned it (src/systems/game/round.ts PlannedShot), with the club by id. */
export interface ShotInfo {
  club: string;
  spec: { x: number; y: number; z: number; aim: number };
  strike: Strike | null;
  putt: PuttStrike | null;
  puttDist: number | null;
  gustMph: number;
  scale: number;
  /** what the player's meter read (the watcher's feedback line: "92% power") */
  power: number;
}

export type ConcedeWhat = 'stroke' | 'hole' | 'match';

/** What a player's game asks the server to add to the match. */
export type Action =
  | { t: 'join'; player: MatchPlayer }
  | { t: 'ready'; hole: number }
  | { t: 'stroke'; hole: number; after: HoleSnap; shot: ShotInfo; path: string }
  | { t: 'relief'; hole: number; after: HoleSnap; penalty: number; label: string }
  /** `strokes`: what the other player had played when the putt was given (a stroke that crossed it makes it void) */
  | { t: 'concede'; what: ConcedeWhat; hole: number; strokes?: number }
  | { t: 'rematch'; code: string };

/** An entry in the match's log, numbered by the server. */
export type MatchEvent =
  | { t: 'created'; cfg: MatchConfig; player: MatchPlayer }
  | { t: 'joined'; player: MatchPlayer; honour: Seat }
  | ({ by: Seat } & Exclude<Action, { t: 'join' }>);

export type Logged = MatchEvent & { seq: number; at: string; cid?: string };

/** One player's hole, as the match sees it (enough for the order of play and the result). */
export interface PlayerHole {
  strokes: number;
  x: number;
  y: number;
  /** still on the teeing area (not started, or to play again from it) */
  teed: boolean;
  holed: boolean;
  /** holed by a conceded stroke */
  conceded: boolean;
  pending: PendingRelief | null;
}

export interface HoleResult {
  /** index of the hole in cfg.holes */
  hole: number;
  strokes: [number, number];
  holed: [boolean, boolean];
  winner: Seat | null;
  /** 'conceded': a player gave up the hole */
  how: 'played' | 'conceded';
}

export interface MatchOutcome {
  winner: Seat | null;
  /** "3&2", "1 up", "all square", "conceded" */
  margin: string;
  how: 'holes' | 'conceded';
}

export interface MatchState {
  cfg: MatchConfig;
  players: [MatchPlayer, MatchPlayer | null];
  seq: number;
  phase: 'waiting' | 'playing' | 'finished';
  /** index (in cfg.holes) of the hole being played, or about to be */
  hole: number;
  honour: Seat;
  /** both players have to be at the hole (past the last hole's result) before anyone plays it */
  ready: [boolean, boolean];
  p: [PlayerHole, PlayerHole];
  results: HoleResult[];
  outcome: MatchOutcome | null;
  /** a new match one of the players made after this one (its code) */
  rematch: { by: Seat; code: string } | null;
}

/** A rule a move broke; `code` is for the game, the message for a person. */
export class MatchError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

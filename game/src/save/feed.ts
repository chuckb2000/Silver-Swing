// Friends' activity feed (player improvements, item 8): the latest rounds on
// the shared board. Pure: used by the server function and the game.

export interface FeedRow {
  id: string;
  player: string;
  course: string;
  length: string;
  tee: string;
  gross: number;
  toPar: number;
  holes: number;
  casual: boolean;
  daily: string | null;
  date: string;      // when the round was played
  received: string;  // when the board got it
  pb: boolean;       // the player's best on this board (course, tees, length) so far
  record: boolean;   // lower than anyone's before it on this board
}

/** Badges for a round, from the best scores on its board before it arrived (null: none yet). */
export function feedBadges(gross: number, casual: boolean, prevBest: number | null, prevRecord: number | null): { pb: boolean; record: boolean } {
  if (casual) return { pb: false, record: false };
  return { pb: prevBest !== null && gross < prevBest, record: prevRecord !== null && gross < prevRecord };
}

export function isFeedRow(r: unknown): r is FeedRow {
  const x = r as Partial<FeedRow> | null;
  return !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.player === 'string' && typeof x.course === 'string'
    && Number.isFinite(x.gross) && Number.isFinite(x.toPar) && typeof x.received === 'string';
}

/** "just now", "5 min ago", "2 h ago", "3 days ago", or the date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (now - t) / 1000);
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  if (s < 7 * 86_400) { const d = Math.round(s / 86_400); return `${d} ${d === 1 ? 'day' : 'days'} ago`; }
  return iso.slice(0, 10);
}

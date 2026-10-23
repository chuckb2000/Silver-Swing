// The music's playing order (pure): every movement once in a shuffled round,
// then a new shuffle that never starts with the one just played.

/** A shuffled order of 0..n-1 (`random` in [0, 1)), not starting with `last`. */
export function shuffled(n: number, random: () => number, last = -1): number[] {
  const o = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  if (n > 1 && o[0] === last) [o[0], o[n - 1]] = [o[n - 1], o[0]];
  return o;
}

/** Plays through `shuffled` rounds: `next()` is the index of the track to play now. */
export class Playlist {
  private order: number[] = [];
  private at = -1;
  private last = -1;

  constructor(private readonly n: number, private readonly random: () => number = Math.random) {}

  next(): number {
    if (this.n === 0) return -1;
    this.at++;
    if (this.at >= this.order.length) {
      this.order = shuffled(this.n, this.random, this.last);
      this.at = 0;
    }
    this.last = this.order[this.at];
    return this.last;
  }

  /** The track after the current one (to fetch ahead), without moving on. */
  peek(): number {
    if (this.n === 0) return -1;
    if (this.at + 1 < this.order.length) return this.order[this.at + 1];
    return -1; // a new shuffle comes next: nothing to fetch yet
  }
}

// Milestones (player improvements, item 11): first birdie, first eagle, a
// course's first round, breaking 100/90/80/70, every course in a state played.
// Worked out from a player's finished rounds, so nothing extra is stored and
// the list is the same on every device that has the rounds. Pure.

import { nameInGroup } from '../data/registry';
import type { LeaderboardEntry } from './entry';
import { isFullRound } from '../systems/game/lengths';

export interface Milestone {
  key: string;      // unique per player: 'birdie', 'birdie:<course>', 'break:<course>:80', 'state:OR', ...
  text: string;     // "first birdie at langston"
  round: string;    // the round that earned it
  date: string;     // when
  course?: string;
  /** a lesser milestone the same round also earned (broke 90 and 100 at once): left out of banners */
  minor?: boolean;
}

export interface MilestoneCourse { id: string; name: string; state: string }

const BREAK_18 = [100, 90, 80, 70];
const BREAK_9 = [50, 45, 40, 35];

/** words that end a club's name and say nothing about which course it is */
const CLUB_SUFFIX = / (golf (and|&) country club|golf and country|golf club|country club|golf course|golf links|golf center|club|cc)$/i;
/** short names no rule gives (the part people call it by) */
const SHORT_NAMES: Record<string, string> = { 'sydney r. marovitz': 'marovitz' };

/**
 * "Langston Golf Course" -> "langston" (short names read better in a banner and a list). Never down
 * to a bare "the" (developer, 2026-11-14: The Country Club read "the" on the recent list): "The
 * Country Club" stays itself. "The Old Course, St Andrews" -> "the old course", "Shaughnessy Golf
 * and Country Club" -> "shaughnessy", "The Mountain Course at Spruce Peak" -> "spruce peak".
 */
export function shortName(name: string): string {
  let n = name.replace(/,.*$/, '').trim().replace(/\s+-\s+/g, ' ');
  const at = n.match(/^the (?:\w+ )?course at (.+)$/i);
  if (at) n = at[1];
  const cut = n.replace(CLUB_SUFFIX, '');
  if (cut && !/^(the|a)$/i.test(cut)) n = cut;
  // "Pronghorn Nicklaus Course" -> "pronghorn nicklaus", but "The Old Course" keeps its word
  if (/ course$/i.test(n) && !/^the /i.test(n) && n.split(' ').length >= 3) n = n.replace(/ course$/i, '');
  const low = n.toLowerCase();
  return SHORT_NAMES[low] ?? low;
}

/**
 * A name cut to `max` characters for a list column: a leading "the" goes first ("the sea ranch" in
 * 10 is "sea ranch"), then whole words when that keeps most of the room ("willamette valley" in 12
 * is "willamette"), else the characters that fit, so the Bandon courses stay apart in a narrow
 * column ("bandon dun", "bandon pre"); never ending on a space or a comma.
 */
export function fitName(s: string, max: number): string {
  if (s.length <= max) return s;
  const t = s.replace(/^the /i, '');
  if (t.length <= max) return t;
  const sp = t.lastIndexOf(' ', max);
  if (sp >= max * 0.7) return t.slice(0, sp).replace(/[\s,.&-]+$/, '');
  return t.slice(0, max).replace(/[\s,.&-]+$/, '');
}

/**
 * A course's label under its card in the passport (17 characters): a course at a place with
 * several drops the place's name, as on the course list ("Pumpkin Ridge Witch Hollow" is
 * "witch hollow", "East Potomac White Course" "east po white"; developer, 2026-10-25).
 */
export function passportName(c: { name: string; group?: string; groupName?: string; keepName?: boolean }): string {
  return fitName(listName(c), 17);
}

/**
 * A course's name in the passport and the lists across courses (recent, eagles, most
 * birdies, this week): the short name, and for a course at a place with several, its name
 * there, with a short form of the place's name for East Potomac ("east po white").
 */
export function listName(c: { name: string; group?: string; groupName?: string; keepName?: boolean }): string {
  const n = c.groupName ? nameInGroup(c.name, c.groupName, c.keepName) : c.name;
  const prefix = c.group ? PASSPORT_PREFIX[c.group] : undefined;
  if (prefix) return `${prefix} ${shortName(n).replace(/ course$/, '')}`;
  return shortName(n);
}

/** places whose courses keep a short form of the place's name in the passport (developer, 2026-10-25) */
const PASSPORT_PREFIX: Record<string, string> = { east_potomac: 'east po' };

const isEighteen = (e: LeaderboardEntry) => isFullRound(e.length);

/**
 * Every milestone in a player's rounds, in the order they were earned. Casual
 * rounds and rounds on courses no longer offered are left out.
 */
export function milestonesOf(rounds: LeaderboardEntry[], courses: MilestoneCourse[], stateNames: Record<string, string> = {}): Milestone[] {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const list = rounds.filter((e) => !e.casual && e.length !== 'xc' && byId.has(e.course)).slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const out: Milestone[] = [];
  const have = new Set<string>();
  const played = new Set<string>();
  const add = (key: string, text: string, e: LeaderboardEntry, course?: string, minor = false) => {
    if (have.has(key)) return;
    have.add(key);
    out.push({ key, text, round: e.id, date: e.date, course, minor });
  };
  const byState = new Map<string, string[]>();
  for (const c of courses) {
    if (!byState.has(c.state)) byState.set(c.state, []);
    byState.get(c.state)!.push(c.id);
  }
  for (const e of list) {
    const c = byId.get(e.course)!;
    const at = shortName(c.name);
    played.add(e.course);
    add(`course:${e.course}`, `first round at ${at}`, e, e.course, true);
    const holes = e.scores.filter((s) => s.strokes > 0);
    if (holes.some((s) => s.strokes === 1)) add('ace', 'hole in one!', e, e.course);
    if (holes.some((s) => s.strokes <= s.par - 2)) {
      add('eagle', 'first eagle', e, e.course);
      add(`eagle:${e.course}`, `first eagle at ${at}`, e, e.course, true);
    }
    if (holes.some((s) => s.strokes < s.par)) {
      add('birdie', 'first birdie', e, e.course);
      add(`birdie:${e.course}`, `first birdie at ${at}`, e, e.course, true);
    }
    // a whole round only (the summary is reached after the last hole)
    const full = holes.length === e.scores.length && (isEighteen(e) || holes.length === 9); // breaking 40 is for nine holes, not 13
    if (full) {
      const marks = isEighteen(e) ? BREAK_18 : BREAK_9;
      const nine = isEighteen(e) ? '' : ' on nine';
      const broke = marks.filter((m) => e.gross < m);
      broke.forEach((m, i) => add(`break:${e.course}:${isEighteen(e) ? 18 : 9}:${m}`, `broke ${m}${nine} at ${at}`, e, e.course, i < broke.length - 1));
      if (e.toPar <= 0) add(`par:${e.course}:${isEighteen(e) ? 18 : 9}`, `${e.toPar < 0 ? 'under' : 'level'} par${nine} at ${at}`, e, e.course);
    }
    for (const [code, ids] of byState) {
      if (ids.length >= 2 && ids.every((id) => played.has(id))) add(`state:${code}`, `every ${(stateNames[code] ?? code).toLowerCase()} course played`, e);
    }
    if (courses.length >= 2 && courses.every((x) => played.has(x.id))) add('all', 'every course played!', e);
  }
  return out;
}

/** The milestones a round has just earned, the main ones first (for the summary's banner). */
export function earnedBy(roundId: string, all: Milestone[]): Milestone[] {
  const mine = all.filter((m) => m.round === roundId);
  const keys = new Set(mine.map((m) => m.key));
  // "first birdie" already says it: "first birdie at x" from the same round is left out
  const repeat = (m: Milestone) => (m.key.startsWith('birdie:') && keys.has('birdie')) || (m.key.startsWith('eagle:') && keys.has('eagle'));
  return [...mine.filter((m) => !m.minor), ...mine.filter((m) => m.minor && !repeat(m))];
}

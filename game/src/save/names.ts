// Player names on the leaderboards: a list of words that aren't allowed
// (swearing, slurs, sexual terms) and the usual ways around it - digits and
// symbols for letters (1 for i, 0 for o, $ for s ...), spaces or dots between
// letters, repeated letters. Pure: the game checks a name as it is typed and
// the server (functions/api/scores) checks it again before storing a round,
// and hides a name that fails on rounds already stored.
//
// Two lists: STRONG words are refused anywhere in a name ("xfuckx"); MILD
// words, which hide inside ordinary names (class, Dickson, Scunthorpe ...),
// only when they are a whole word or the whole name. Add words to either list.

const STRONG = [
  // swearing and sexual terms
  'fuck', 'fuk', 'fck', 'fvck', 'fcuk', 'phuck', 'motherf', 'shit', 'bitch', 'biatch', 'cunt', 'twat', 'wank', 'bollock',
  'asshole', 'arsehole', 'bastard', 'bullshit', 'dickhead', 'cocksuck', 'blowjob', 'handjob', 'rimjob', 'jizz', 'cumshot',
  'pussy', 'penis', 'vagina', 'boner', 'dildo', 'porn', 'hentai', 'whore', 'slut', 'skank', 'milf', 'orgasm',
  'masturb', 'jackoff', 'jerkoff', 'testicle', 'clitor', 'rapist', 'paedo', 'molest', 'incest',
  'hitler', 'kkk', 'siegheil', 'heilhit',
  // slurs (race, ethnicity, religion, sexuality, gender, disability)
  'nigg', 'nigga', 'chink', 'gook', 'wetback', 'beaner', 'kike', 'raghead', 'towelhead',
  'sandnig', 'jigaboo', 'porchmonk', 'junglebunn', 'darkie', 'zipperhead', 'redskin',
  'faggot', 'fagot', 'tranny', 'shemale', 'retard', 'spaz', 'mongoloid', 'cripple',
];

const MILD = [
  'ass', 'arse', 'fag', 'fags', 'cock', 'dick', 'dicks', 'tit', 'tits', 'titty', 'cum', 'jap', 'japs', 'homo', 'queer',
  'damn', 'piss', 'crap', 'hoe', 'hoes', 'sex', 'sexy', 'nude', 'nudes', 'boob', 'boobs', 'butt', 'balls', 'nutsack',
  'spick', 'kyke', 'anal', 'rape', 'raped', 'rapes', 'pedo', 'pedos', 'nazi', 'nazis', 'gyp', 'gypped', 'coon', 'coons',
  'spic', 'spics', 'niger', 'negro', 'negros', 'injun', 'injuns', 'paki', 'pakis', 'dyke', 'dykes', 'hooker', 'hookers', 'turd', 'prick', 'pecker', 'schlong', 'knob', 'bellend', 'minge', 'kunt', 'azz',
];

// look-alike characters -> letters (1 and | are tried both as i and as l)
const LOOK: Record<string, string> = {
  '0': 'o', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '+': 't', '€': 'e', '£': 'l', '¡': 'i', '(': 'c', '<': 'c', 'µ': 'u', 'ß': 'b',
};

/** The name as letters only, look-alikes replaced (two readings: 1 as i and as l), repeated letters collapsed. */
function readings(name: string): { words: string[][]; joined: string[] } {
  const base = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const out: { words: string[][]; joined: string[] } = { words: [], joined: [] };
  for (const one of ['i', 'l']) {
    let s = '';
    for (const ch of base) s += ch === '1' || ch === '|' ? one : LOOK[ch] ?? ch;
    const words = s.split(/[^a-z]+/).filter(Boolean);
    const squash = (w: string) => w.replace(/(.)\1+/g, '$1');
    out.words.push(words, words.map(squash));
    const joined = words.join('');
    out.joined.push(joined, squash(joined));
  }
  return out;
}

// squashed forms too ("fuuuck" -> "fuck"), unless that leaves too little ("kkk" -> "k", "ass" -> "as")
const squash = (w: string) => w.replace(/(.)\1+/g, '$1');
const strongSquashed = STRONG.map(squash).filter((w) => w.length >= 3 && w !== 'as');
const mildSet = new Set([...MILD, ...MILD.map(squash).filter((w) => w.length >= 3)]);

/** Is this name allowed on the leaderboard? */
export function nameAllowed(name: string): boolean {
  const r = readings(name);
  for (const j of r.joined) {
    if (STRONG.some((w) => j.includes(w)) || strongSquashed.some((w) => j.includes(w))) return false;
    if (mildSet.has(j)) return false;
  }
  for (const words of r.words) if (words.some((w) => mildSet.has(w))) return false;
  return true;
}

export const DEFAULT_NAME = 'player';

/** Characters a name may use, lower case, at most 16 long (the game's font and the board's column). */
export function tidyName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9 .'-]/g, '').replace(/\s+/g, ' ').slice(0, 16).trim();
}

/** The name to show or store: tidied, and the default if it is empty or not allowed. */
export function boardName(raw: string): string {
  const t = tidyName(raw);
  return t && nameAllowed(t) ? t : DEFAULT_NAME;
}

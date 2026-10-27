// The game's two course lists, made from the courses themselves so no course
// build edits a shared file (docs/reports/course_creation_speedup.md, item 2):
//   public/courses/index.json      every public/courses/<id>/course.json (not the practice ground)
//   public/sprites/title/index.json the title screen's views (sprites/title/<id>.png), one per place
// Both are gitignored. Run by the Vite build and dev server (vite.config.ts), by
// the unit tests (tests/setup/course-lists.ts), by pipeline s10 and by
// `node scripts/course-lists.mjs` from game/.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PUBLIC = resolve(HERE, '..', 'public');

/** Places with several courses in their own data folders (scripts/course-groups.json). */
export function groupsFile() {
  const raw = JSON.parse(readFileSync(join(HERE, 'course-groups.json'), 'utf8'));
  return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('_')));
}

/** The course-list entry of one course.json (what the course screen and the registry need). */
export function entryOf(c, groups = {}) {
  // the longest tees first (developer, 2026-10-22: Wannamoisett listed Blue left of the longer Black)
  const tees = [...(c.teeSets ?? [])].sort((a, b) => (b.totalYd ?? 0) - (a.totalYd ?? 0));
  const def = tees.find((t) => t.name === c.defaultTee) ?? tees[0] ?? { totalYd: 0 };
  const e = {
    id: c.id, name: c.name, location: c.location, state: c.state, theme: c.theme,
    holes: c.holes.length, par: c.par, defaultTee: c.defaultTee, totalYd: def.totalYd, teeSets: tees.map((t) => t.name),
    // for handicaps (src/systems/game/handicap.ts): each hole's par and stroke index, each tee's rating and slope
    pars: c.holes.map((h) => h.par), si: c.holes.map((h) => h.handicap ?? 0),
    ratings: Object.fromEntries(tees.filter((t) => t.rating > 0 && t.slope > 0).map((t) => [t.name, [t.rating, t.slope]])),
  };
  if (c.group) Object.assign(e, { group: c.group, groupName: c.groupName, layout: c.layout });
  else {
    // a place whose courses each have their own folder (Bandon Dunes Golf Resort): its group from course-groups.json
    const g = Object.entries(groups).find(([, v]) => v.courses.includes(c.id));
    if (g) Object.assign(e, { group: g[0], groupName: g[1].name, ...(g[1].keepNames ? { keepName: true } : {}) });
  }
  if (c.nines) e.nines = c.nines; // a club of three or more nines: the rounds it offers
  return e;
}

/** Every listed course, by id (the first is a new player's starting course). */
export function courseEntries(publicDir = PUBLIC) {
  const root = join(publicDir, 'courses');
  const out = [];
  const groups = groupsFile();
  for (const id of readdirSync(root).sort()) {
    const f = join(root, id, 'course.json');
    if (!existsSync(f)) continue; // a shared world folder (east_potomac) or leftovers
    const c = JSON.parse(readFileSync(f, 'utf8'));
    if (c.practice || c.id !== id) continue; // the practice ground has its own button
    out.push(entryOf(c, groups));
  }
  return out;
}

/** The title screen's course views: every sprites/title/<id>.png of a listed course, one per place. */
export function titleMaps(entries, publicDir = PUBLIC) {
  const seen = new Set();
  const maps = [];
  for (const e of entries) {
    // one view per shared world (East Potomac); a resort's courses each keep their own
    const key = e.group && !e.keepName ? e.group : e.id;
    if (seen.has(key) || !existsSync(join(publicDir, 'sprites', 'title', `${e.id}.png`))) continue;
    seen.add(key);
    maps.push(e.id);
  }
  return maps;
}

/** Write both lists (only when they change, so the dev server doesn't reload for nothing). */
export function writeCourseLists(publicDir = PUBLIC) {
  const entries = courseEntries(publicDir);
  const put = (file, body) => {
    const text = JSON.stringify(body, null, 1) + '\n';
    if (!existsSync(file) || readFileSync(file, 'utf8') !== text) writeFileSync(file, text);
  };
  put(join(publicDir, 'courses', 'index.json'), { courses: entries });
  const maps = titleMaps(entries, publicDir);
  if (existsSync(join(publicDir, 'sprites', 'title'))) put(join(publicDir, 'sprites', 'title', 'index.json'), { maps });
  return { courses: entries.length, maps: maps.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = writeCourseLists();
  console.log(`wrote courses/index.json (${r.courses} courses) and sprites/title/index.json (${r.maps} views)`);
}

// The course list (courses/index.json) - pure helpers, no Phaser.

export interface CourseInfo {
  id: string;
  name: string;
  location: string;
  theme: string;
  holes: number;      // 9 or 18
  par: number;
  defaultTee: string;
  totalYd: number;
  teeSets: string[];
  state?: string;     // postal code (MA, OR); optional - read from the location otherwise
}

/** Tree sprite sheet for a course theme (the Pacific Northwest set is the original one). */
export function treeSheet(theme: string): string {
  return theme === 'pnw' ? 'sprites/trees' : `sprites/trees_${theme}`;
}

/** The course to start with: the last one played if it still exists, else the first. */
export function initialCourseId(courses: CourseInfo[], last: string): string | null {
  if (courses.some((c) => c.id === last)) return last;
  return courses[0]?.id ?? null;
}

/** US states (and DC) by postal code. */
export const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export const OTHER_STATE = '--';

/**
 * A course's state as a postal code: its `state` field, or else the last part
 * of its location ("Lake Oswego, Clackamas County, Oregon" -> OR).
 */
export function stateOf(c: Pick<CourseInfo, 'location'> & { state?: string }): string {
  const s = (c.state ?? '').trim().toUpperCase();
  if (STATES[s]) return s;
  const last = (c.location ?? '').split(',').pop()?.trim() ?? '';
  const code = last.toUpperCase();
  if (STATES[code]) return code;
  const byName = Object.keys(STATES).find((k) => STATES[k].toLowerCase() === last.toLowerCase());
  return byName ?? OTHER_STATE;
}

export function stateName(code: string): string {
  return STATES[code] ?? 'other';
}

/** States that have courses, A-Z by name, each with its courses A-Z. */
export function coursesByState(courses: CourseInfo[]): { code: string; name: string; courses: CourseInfo[] }[] {
  const groups = new Map<string, CourseInfo[]>();
  for (const c of courses) {
    const k = stateOf(c);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }
  return [...groups.entries()]
    .map(([code, list]) => ({ code, name: stateName(code), courses: list.slice().sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => (a.code === OTHER_STATE ? 1 : b.code === OTHER_STATE ? -1 : a.name.localeCompare(b.name)));
}

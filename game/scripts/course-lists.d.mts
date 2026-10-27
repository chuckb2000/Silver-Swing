// Types for course-lists.mjs (the unit tests import it).

/** A course-list entry (public/courses/index.json `courses[]`). */
export interface CourseListEntry {
  id: string; name: string; location: string; state: string; theme: string;
  holes: number; par: number; defaultTee: string; totalYd: number;
  /** longest first */
  teeSets: string[];
  pars: number[]; si: number[];
  ratings: Record<string, [number, number]>;
  group?: string; groupName?: string; layout?: string;
  /** keeps its full name inside its group (scripts/course-groups.json keepNames) */
  keepName?: boolean;
  nines?: { id: string; name: string; holes: number[] }[];
}

export const PUBLIC: string;
/** A place whose courses each have their own folder (scripts/course-groups.json). */
export interface CourseGroup { name: string; courses: string[]; keepNames?: boolean; why?: string }
export function groupsFile(): Record<string, CourseGroup>;
export function entryOf(c: unknown, groups?: Record<string, CourseGroup>): CourseListEntry;
export function courseEntries(publicDir?: string): CourseListEntry[];
export function titleMaps(entries: CourseListEntry[], publicDir?: string): string[];
export function writeCourseLists(publicDir?: string): { courses: number; maps: number };

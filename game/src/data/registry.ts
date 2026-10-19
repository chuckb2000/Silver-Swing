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

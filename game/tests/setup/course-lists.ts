// Unit tests read public/courses/index.json: make it from the courses first (it is generated, not committed).
// @ts-expect-error plain JS module
import { writeCourseLists } from '../../scripts/course-lists.mjs';

export default function setup() {
  writeCourseLists();
}

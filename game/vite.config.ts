import { defineConfig } from 'vite';
// @ts-expect-error plain JS module
import { writeCourseLists } from './scripts/course-lists.mjs';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
  // the course lists are made from the courses at every build and dev start (scripts/course-lists.mjs)
  plugins: [{ name: 'course-lists', buildStart() { writeCourseLists(); } }],
});

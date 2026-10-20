// Writes dist/courses/versions.json: a short hash of each course's files, so
// the service worker (public/sw.js) keeps a course on the device until it is
// rebuilt. Also stamps dist/sw.js with this build's id (a new build is a new
// worker, offered as an update on the title screen). Run after `vite build`.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'dist/courses';
const files = (dir) => readdirSync(dir).sort().flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : [p];
});
const versions = {};
for (const id of readdirSync(root).sort()) {
  const dir = join(root, id);
  if (!statSync(dir).isDirectory()) continue;
  const h = createHash('sha256');
  for (const f of files(dir)) { h.update(f.slice(dir.length)); h.update(readFileSync(f)); }
  versions[id] = h.digest('hex').slice(0, 12);
}
writeFileSync(join(root, 'versions.json'), JSON.stringify(versions, null, 1) + '\n');
const build = createHash('sha256').update(readFileSync('dist/index.html')).update(JSON.stringify(versions)).digest('hex').slice(0, 12);
writeFileSync('dist/sw.js', readFileSync('dist/sw.js', 'utf8').replace('__BUILD__', build));
console.log(`wrote dist/courses/versions.json (${Object.keys(versions).length} courses), sw.js build ${build}`);

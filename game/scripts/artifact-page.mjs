// Writes dist/artifact.html: the built page without its <html>, <head> and
// <body> tags, for hosts that wrap a page in their own document skeleton
// (a claude.ai artifact). Run after `vite build`; the other files in dist/ are
// published next to it at the same relative paths.

import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const one = (re, what) => {
  const m = html.match(re);
  if (!m) throw new Error(`dist/index.html has no ${what}`);
  return m[0];
};
const parts = [
  one(/<title>[\s\S]*?<\/title>/, 'title'),
  one(/<meta name="viewport"[^>]*>/, 'viewport meta'),
  one(/<style>[\s\S]*?<\/style>/, 'style'),
  '<div id="game"></div>',
  ...(html.match(/<link rel="modulepreload"[^>]*>/g) ?? []),
  ...(html.match(/<script\b[^>]*><\/script>/g) ?? []),
];
if (!parts.some((p) => p.startsWith('<script'))) throw new Error('dist/index.html has no script');
writeFileSync('dist/artifact.html', parts.join('\n') + '\n');
console.log('wrote dist/artifact.html');

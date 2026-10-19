#!/usr/bin/env node
// Counts raw hex colours in console code (docs/CONSOLE_DESIGN.md, rollout
// step 9): colours belong in lib/theme/tokens.ts. Public-site designs
// (ministry presets and content) and the tokens themselves are left out.
// `npm run scan:colours` prints the count per folder; with --max <n> it fails
// when the total grows past n, so new raw colours show up in review.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const SKIP = [/^lib\/theme\//, /^apps\/_shared\/public\//, /^lib\/public-sites\//, /^app\/\(public\)\//, /\.test\.tsx?$/, /^lib\/geo\//];
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g;

const counts = new Map();
let total = 0;
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(tsx?|css)$/.test(n)) continue;
    const rel = relative(root, p);
    if (SKIP.some(re => re.test(rel))) continue;
    const hits = (readFileSync(p, 'utf8').match(HEX) ?? []).length;
    if (!hits) continue;
    const folder = rel.split('/').slice(0, 2).join('/');
    counts.set(folder, (counts.get(folder) ?? 0) + hits);
    total += hits;
  }
})(root);

for (const [f, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(n).padStart(6), f);
console.log(`${String(total).padStart(6)} raw hex colours in console code`);
const i = process.argv.indexOf('--max');
if (i > 0 && total > Number(process.argv[i + 1])) {
  console.error(`More raw colours than the recorded ceiling (${process.argv[i + 1]}): use or add a token in lib/theme/tokens.ts.`);
  process.exit(1);
}

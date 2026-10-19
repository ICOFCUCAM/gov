#!/usr/bin/env node
// Counts raw hex colours in console code (docs/CONSOLE_DESIGN.md, rollout
// step 9): colours belong in lib/theme/tokens.ts. Public-site designs
// (ministry presets and content) and the tokens themselves are left out.
// `npm run scan:colours` prints the count per folder; with --max <n> it fails
// when the total grows past n, so new raw colours show up in review.
// It also counts low-opacity white text (`text-white/<60`), which reads below
// 4.5:1 on the dark grounds (go-live review M-11; use a NIGHT or CONSOLE
// token); --max-dim <n> fails when that count grows past n.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const SKIP = [/^lib\/theme\//, /^apps\/_shared\/public\//, /^lib\/public-sites\//, /^app\/\(public\)\//, /\.test\.tsx?$/, /^lib\/geo\//];
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g;

const DIM = /\btext-white\/(?:[0-9]|[1-5][0-9])\b/g;

const counts = new Map();
const dimCounts = new Map();
let total = 0;
let dim = 0;
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(tsx?|css)$/.test(n)) continue;
    const rel = relative(root, p);
    if (SKIP.some(re => re.test(rel))) continue;
    const text = readFileSync(p, 'utf8');
    const folder = rel.split('/').slice(0, 2).join('/');
    const dims = (text.match(DIM) ?? []).length;
    if (dims) { dimCounts.set(rel, dims); dim += dims; }
    const hits = (text.match(HEX) ?? []).length;
    if (!hits) continue;
    counts.set(folder, (counts.get(folder) ?? 0) + hits);
    total += hits;
  }
})(root);

for (const [f, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(n).padStart(6), f);
console.log(`${String(total).padStart(6)} raw hex colours in console code`);
for (const [f, n] of [...dimCounts].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(6), f);
console.log(`${String(dim).padStart(6)} uses of low-opacity white text (text-white/<60) in console code`);
let failed = false;
const i = process.argv.indexOf('--max');
if (i > 0 && total > Number(process.argv[i + 1])) {
  console.error(`More raw colours than the recorded ceiling (${process.argv[i + 1]}): use or add a token in lib/theme/tokens.ts.`);
  failed = true;
}
const j = process.argv.indexOf('--max-dim');
if (j > 0 && dim > Number(process.argv[j + 1])) {
  console.error(`More low-opacity white text than the recorded ceiling (${process.argv[j + 1]}): use text-night-muted / text-night-faint or a console token (lib/theme/tokens.ts).`);
  failed = true;
}
if (failed) process.exit(1);

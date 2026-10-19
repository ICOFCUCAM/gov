#!/usr/bin/env node
// Which countries' map shapes still disagree with their official subdivisions?
//   npm run scan:boundaries            table of countries below 95% coverage
//   npm run scan:boundaries -- --json  machine-readable list (for build-boundaries.mjs)
import { DIVISIONS, currentShapes, targetLevel, coverage } from './boundaries-lib.mjs';

const rows = [];
for (const iso3 of Object.keys(DIVISIONS)) {
  const t = targetLevel(iso3);
  const cur = currentShapes(iso3);
  if (!t || !cur) continue;
  rows.push({ iso3, name: cur.country.name, level: t.level, official: t.units.length, shapes: cur.country.provinces.length, source: cur.source, coverage: coverage(t.units, cur.country.provinces) });
}
const needs = rows.filter(r => r.coverage < 0.95).sort((a, b) => a.coverage - b.coverage);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(needs.map(r => r.iso3)));
} else {
  const pct = x => `${Math.round(x * 100)}%`.padStart(4);
  console.log(`${rows.length} countries with an official list · ${rows.length - needs.length} covered (≥95%) · ${needs.length} need new shapes\n`);
  for (const r of needs) console.log(`  ${r.iso3}  ${r.name.padEnd(34)} level ${r.level.padEnd(2)}  official ${String(r.official).padStart(4)}  shapes ${String(r.shapes).padStart(4)}  covered ${pct(r.coverage)}  (${r.source})`);
}

#!/usr/bin/env node
// Label every map shape with its official name in the nation's own spelling
// (ISO 3166-2, src/lib/geo/divisions.json), e.g. "Małopolskie" rather than
// "Lesser Poland Voivodeship". A shape is renamed only when it matches an
// official unit by ISO code or by the same name; anything else keeps its
// label. Translations (i18n) are left as they are.
//
//   node scripts/official-names.mjs            rewrite admin1/ and boundaries/
//   node scripts/official-names.mjs --dry      report only

import fs from 'node:fs';
import path from 'node:path';
import { GEO, DIVISIONS, norm } from './boundaries-lib.mjs';

const dry = process.argv.includes('--dry');
let files = 0, renamed = 0, matched = 0, shapes = 0;
const examples = [];

for (const dir of ['admin1', 'boundaries']) {
  const root = path.join(GEO, dir);
  if (!fs.existsSync(root)) continue;
  for (const f of fs.readdirSync(root).filter(x => /^[A-Z]{3}\.json$/.test(x))) {
    const file = path.join(root, f);
    const raw = fs.readFileSync(file, 'utf8');
    const country = JSON.parse(raw);
    const official = DIVISIONS[country.iso3] ?? [];
    const byCode = new Map(official.map(r => [r[0], r[1]]));
    const byName = new Map();
    for (const r of official) { const n = norm(r[1]); byName.set(n, byName.has(n) ? null : r[1]); }
    let changed = false;
    for (const p of country.provinces) {
      shapes++;
      const name = byCode.get(p.code) ?? byName.get(norm(p.name)) ?? null;
      if (!name) continue;
      matched++;
      if (name !== p.name) {
        if (examples.length < 12) examples.push(`${country.iso3}: ${p.name} → ${name}`);
        p.name = name; renamed++; changed = true;
      }
    }
    if (changed) {
      files++;
      if (!dry) fs.writeFileSync(file, JSON.stringify(country));
    }
  }
}
console.log(`${shapes} shapes · ${matched} matched to an official unit · ${renamed} renamed in ${files} files${dry ? ' (dry run)' : ''}`);
for (const e of examples) console.log('  ' + e);

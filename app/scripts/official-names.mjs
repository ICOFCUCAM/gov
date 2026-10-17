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
    // Names first: some map files carry codes ISO has since reassigned (Iran's
    // "Markazi" shape is coded IR-22, which ISO now gives to Hormozgān), so a
    // code is trusted only when the shape's own name names no other unit and
    // no other shape already claimed that unit by name.
    // Two shapes of the same name (the US state and DC are both "Washington"):
    // the one whose code agrees keeps the name, the other is placed by its code.
    const codeOf = new Map(official.map(r => [r[1], r[0]]));
    const sharers = new Map();
    for (const p of country.provinces) { const n = byName.get(norm(p.name)); if (n) sharers.set(n, [...(sharers.get(n) ?? []), p]); }
    const ownName = p => {
      const n = byName.get(norm(p.name));
      const all = n ? sharers.get(n) : null;
      return !n || all.length === 1 || p.code === codeOf.get(n) || !all.some(q => q.code === codeOf.get(n)) ? n : undefined;
    };
    const claimed = new Set(country.provinces.map(ownName).filter(Boolean));
    // A code shared by several shapes is an old parent-region code (Bosnia's
    // cantons all carry BA-BIH), not theirs; such codes are not used.
    const codeCount = new Map();
    for (const p of country.provinces) codeCount.set(p.code, (codeCount.get(p.code) ?? 0) + 1);
    const target = country.provinces.map(p => {
      const own = ownName(p);
      const viaCode = codeCount.get(p.code) === 1 ? byCode.get(p.code) : undefined;
      return own ?? (viaCode && !claimed.has(viaCode) && (own === undefined || !byName.has(norm(p.name))) ? viaCode : null);
    });
    // Never create a repeated label: a rename that would give a shape the
    // name another shape ends up with is dropped, and the shape keeps its own.
    const finalName = (i) => target[i] ?? country.provinces[i].name;
    for (let pass = 0; pass < 3; pass++) {
      const count = new Map();
      country.provinces.forEach((_, i) => count.set(finalName(i), (count.get(finalName(i)) ?? 0) + 1));
      country.provinces.forEach((p, i) => {
        if (target[i] && target[i] !== p.name && count.get(target[i]) > 1) target[i] = null;
      });
    }
    let changed = false;
    country.provinces.forEach((p, i) => {
      shapes++;
      const name = target[i];
      if (!name) return;
      matched++;
      if (name !== p.name) {
        if (examples.length < 12) examples.push(`${country.iso3}: ${p.name} → ${name}`);
        p.name = name; renamed++; changed = true;
      }
    });
    if (changed) {
      files++;
      if (!dry) fs.writeFileSync(file, JSON.stringify(country));
    }
  }
}
console.log(`${shapes} shapes · ${matched} matched to an official unit · ${renamed} renamed in ${files} files${dry ? ' (dry run)' : ''}`);
for (const e of examples) console.log('  ' + e);

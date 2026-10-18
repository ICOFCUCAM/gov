#!/usr/bin/env node
// Each country's capital (or capitals) for the maps: Natural Earth 1:10m
// populated places (public domain), features marked "Admin-0 capital" and
// "Admin-0 capital alt", with the role Natural Earth records (official,
// administrative, legislative, judicial, de facto). Former capitals are left
// out. Where a country has several, the platform does not choose between them:
// setup lists them and the nation's own setting (SovereignProfile.map.capital)
// always wins over this default.
//
//   node scripts/build-capitals.mjs [populated_places.geojson]
//   (without a file it fetches ne_10m_populated_places_simple from the Natural
//   Earth repository; behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/geo/capitals.json');
const URL_ = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson';

const ROLES = [['official', /offici?al/i], ['administrative', /administrative/i], ['legislative', /legislative/i], ['judicial', /judicial/i], ['de facto', /de facto/i]];

const file = process.argv[2];
const data = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : await (await fetch(URL_)).json();
const out = {};
for (const f of data.features) {
  const p = f.properties;
  if (p.featurecla !== 'Admin-0 capital' && p.featurecla !== 'Admin-0 capital alt') continue;
  const iso3 = p.adm0_a3;
  if (!/^[A-Z]{3}$/.test(iso3)) continue;
  const note = String(p.capin ?? '');
  if (/former/i.test(note)) continue;
  if (!p.adm0cap && !/offici?al|capital|administrative|legislative|judicial/i.test(note)) continue;
  const roles = ROLES.filter(([, re]) => re.test(note)).map(([r]) => r);
  (out[iso3] ??= []).push({
    name: String(p.name).replace(/\s+/g, ' ').trim(),
    lng: Math.round(p.longitude * 1e4) / 1e4,
    lat: Math.round(p.latitude * 1e4) / 1e4,
    ...(roles.length ? { roles } : {}),
    main: p.adm0cap === 1 && p.capalt !== 1,
    rank: p.scalerank ?? 9,
  });
}
// Natural Earth's main capital first (then by its map rank), then the others.
for (const k of Object.keys(out)) {
  out[k].sort((a, b) => Number(b.main) - Number(a.main) || a.rank - b.rank);
  out[k] = out[k].map(({ main, rank, ...c }) => c);
}
const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]));
fs.writeFileSync(OUT, JSON.stringify(sorted) + '\n');
console.log(`${Object.keys(sorted).length} countries written to ${path.relative(process.cwd(), OUT)}`);

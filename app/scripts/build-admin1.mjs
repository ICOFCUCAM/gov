// One-time build from public-domain Natural Earth:
//  • admin-1 (states/provinces) → compact per-country files (real provinces)
//  • admin-0 (countries)        → compact per-country OUTLINE files (all
//    ~242 countries) so every country renders a real national boundary.
// Coordinates rounded to 2 decimals (~1km) — ample at command scale.
// Run: node scripts/build-admin1.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const A1 = '/tmp/ne_admin1_10m.geojson';
const A0 = '/tmp/ne0.geojson';
const DIR1 = resolve('src/lib/geo/admin1');
const DIR0 = resolve('src/lib/geo/outline');
const IDX = resolve('src/lib/geo/countries.json');
for (const d of [DIR1, DIR0]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

const r2 = n => Math.round(n * 100) / 100;
// Round to ~1km and decimate long rings (every 2nd point past 80) — faithful
// at command scale, keeps per-country lazy chunks small from 10m source.
function ring(c) {
  const out = [];
  const step = c.length > 80 ? 2 : 1;
  for (let i = 0; i < c.length; i += step) out.push([r2(c[i][0]), r2(c[i][1])]);
  const last = c[c.length - 1];
  if (out.length && (out[out.length - 1][0] !== r2(last[0]) || out[out.length - 1][1] !== r2(last[1]))) out.push([r2(last[0]), r2(last[1])]);
  return out.length >= 4 ? out : null;
}
function rings(rs) { return rs.map(ring).filter(Boolean); }
function geom(g) {
  if (!g) return null;
  if (g.type === 'Polygon') { const c = rings(g.coordinates); return c.length ? { type: 'Polygon', coordinates: c } : null; }
  if (g.type === 'MultiPolygon') {
    const c = g.coordinates.map(rings).filter(p => p.length);
    return c.length ? { type: 'MultiPolygon', coordinates: c } : null;
  }
  return null;
}

// ---- admin-1 provinces (rich countries) ----
const a1 = JSON.parse(readFileSync(A1, 'utf8'));
const prov = new Map();
for (const f of a1.features) {
  const p = f.properties || {}; const iso3 = p.adm0_a3;
  const gm = geom(f.geometry);
  if (!iso3 || !gm) continue;
  if (!prov.has(iso3)) prov.set(iso3, { iso3, iso2: p.iso_a2 || '', name: p.admin || iso3, provinces: [] });
  prov.get(iso3).provinces.push({
    name: p.name_en || p.name || p.iso_3166_2 || 'Region',
    i18n: { en: p.name_en || p.name || '', fr: p.name_fr || '', es: p.name_es || '', pt: p.name_pt || '', ru: p.name_ru || '', zh: p.name_zh || '', ar: p.name_ar || '', hi: p.name_hi || '' },
    code: p.iso_3166_2 || p.code_hasc || '', lng: r2(p.longitude ?? 0), lat: r2(p.latitude ?? 0),
    geometry: gm,
  });
}
for (const [iso3, c] of prov) if (c.provinces.length) writeFileSync(resolve(DIR1, `${iso3}.json`), JSON.stringify(c));

// ---- admin-0 outlines (every country) ----
const a0 = JSON.parse(readFileSync(A0, 'utf8'));
const index = [];
for (const f of a0.features) {
  const p = f.properties || {}; const iso3 = p.ADM0_A3;
  const gm = geom(f.geometry);
  if (!iso3 || !gm) continue;
  const name = p.NAME_EN || p.ADMIN || iso3;
  writeFileSync(resolve(DIR0, `${iso3}.json`), JSON.stringify({ iso3, iso2: p.ISO_A2 || '', name, geometry: gm }));
  index.push({ iso3, iso2: p.ISO_A2 || '', name, continent: p.CONTINENT || '', provinces: prov.get(iso3)?.provinces.length ?? 0 });
}
index.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(IDX, JSON.stringify(index));
process.stdout.write(`outlines=${index.length} withProvinces=${index.filter(c => c.provinces).length}\n`);

// One-time build: split public-domain Natural Earth admin-1 (states/
// provinces) into compact per-country GeoJSON + a country index for the
// selector. Coordinates rounded to 2 decimals (~1km) — ample for a
// command-scale map and ~10x smaller. Run: node scripts/build-admin1.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = '/tmp/ne_admin1_50m.geojson';
const OUT_DIR = resolve('src/lib/geo/admin1');
const IDX = resolve('src/lib/geo/countries.json');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const r2 = n => Math.round(n * 100) / 100;
const ring = c => c.map(([x, y]) => [r2(x), r2(y)]);
function geom(g) {
  if (g.type === 'Polygon') return { type: 'Polygon', coordinates: g.coordinates.map(ring) };
  if (g.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: g.coordinates.map(p => p.map(ring)) };
  return null;
}

const fc = JSON.parse(readFileSync(SRC, 'utf8'));
const byCountry = new Map();
for (const f of fc.features) {
  const p = f.properties || {};
  const iso3 = p.adm0_a3;
  if (!iso3 || !f.geometry) continue;
  const gm = geom(f.geometry);
  if (!gm) continue;
  if (!byCountry.has(iso3)) byCountry.set(iso3, { iso3, iso2: p.iso_a2 || '', name: p.admin || p.geonunit || iso3, provinces: [] });
  byCountry.get(iso3).provinces.push({
    name: p.name_en || p.name || p.iso_3166_2 || 'Region',
    i18n: {
      en: p.name_en || p.name || '', fr: p.name_fr || '', es: p.name_es || '',
      pt: p.name_pt || '', ru: p.name_ru || '', zh: p.name_zh || '',
      ar: p.name_ar || '', hi: p.name_hi || '',
    },
    code: p.iso_3166_2 || p.code_hasc || '',
    lng: r2(p.longitude ?? 0), lat: r2(p.latitude ?? 0),
    geometry: gm,
  });
}

const index = [];
let total = 0;
for (const [iso3, c] of byCountry) {
  if (c.provinces.length === 0) continue;
  writeFileSync(resolve(OUT_DIR, `${iso3}.json`), JSON.stringify(c));
  index.push({ iso3, iso2: c.iso2, name: c.name, provinces: c.provinces.length });
  total++;
}
index.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(IDX, JSON.stringify(index, null, 0));
process.stdout.write(`countries=${total} indexed=${index.length}\n`);

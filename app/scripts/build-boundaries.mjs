#!/usr/bin/env node
// Upgrade map shapes where they disagree with a country's official subdivisions.
//
// Sources: geoBoundaries gbOpen (https://www.geoboundaries.org) and OCHA's
// Common Operational Datasets on HDX (https://data.humdata.org, "cod-ab-<iso3>",
// published from national statistics and mapping offices). Each file's
// licence and source are recorded in src/lib/geo/boundaries/index.json and
// credited on the map. When both cover a country, the better coverage of its
// official list wins; on a tie the national dataset (HDX) is preferred.
//
//   npm i --no-save mapshaper            (or set MAPSHAPER_DIR to an install)
//   node scripts/build-boundaries.mjs KEN GHA      specific countries
//   node scripts/build-boundaries.mjs --needed     every country scan:boundaries flags
//   (behind an HTTPS proxy, run with NODE_USE_ENV_PROXY=1 so Node's fetch uses it)
//
// A country is written only when the new shapes cover more of its official
// list than the shapes the map draws today, so a build can only upgrade a map.
// Output keeps the admin-1 file format (name, code, label point, geometry),
// simplified for on-screen display, so the map component is unchanged.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { GEO, BOUNDARY_INDEX, boundaryIndex, admin1Shapes, currentShapes, targetLevel, matchUnits, coverage, norm } from './boundaries-lib.mjs';

const require = createRequire(process.env.MAPSHAPER_DIR ? path.join(process.env.MAPSHAPER_DIR, 'x.js') : import.meta.url);
const mapshaper = require('mapshaper');
const { geoArea, geoBounds } = await import('d3-geo');
const CACHE = process.env.BOUNDARY_CACHE ?? path.join(process.env.TMPDIR ?? '/tmp', 'geoboundaries');
const RAW = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen';
const OPEN = /public domain|cc ?by|odbl|open data|open government|cc0|creative commons/i;

async function fetchJson(url, file) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const r = await fetch(url);
    if (!r.ok) return null;
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

async function source(iso3, adm) {
  const base = `${RAW}/${iso3}/${adm}/geoBoundaries-${iso3}-${adm}`;
  const meta = await fetchJson(`${base}-metaData.json`, path.join(CACHE, `${iso3}-${adm}-meta.json`));
  if (!meta) return null;
  const geo = await fetchJson(`${base}_simplified.geojson`, path.join(CACHE, `${iso3}-${adm}.geojson`));
  return geo?.features?.length ? { adm, meta, geo } : null;
}

const decimals = bbox => {
  const extent = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1], 0.01);
  return Math.min(4, Math.max(2, Math.round(-Math.log10(extent / 1500))));
};

// d3-geo (the map's renderer) takes outer rings clockwise and holes
// counter-clockwise, the reverse of RFC 7946; a reversed outer ring would be
// drawn as the whole globe minus the country.
const area = ring => ring.reduce((a, [x1, y1], i) => { const [x2, y2] = ring[(i + 1) % ring.length]; return a + (x2 - x1) * (y2 + y1); }, 0);
const wind = (ring, cw) => ((area(ring) > 0) === cw ? ring : [...ring].reverse());
const rewindPolygon = rings => rings.map((r, i) => wind(r, i === 0));
function rewind(g) {
  if (g.type === 'Polygon') return { ...g, coordinates: rewindPolygon(g.coordinates) };
  if (g.type === 'MultiPolygon') return { ...g, coordinates: g.coordinates.map(rewindPolygon) };
  return g;
}

async function simplify(geo) {
  const input = JSON.stringify(geo);
  const probe = await mapshaper.applyCommands('-i in.json -info save-to=info.json', { 'in.json': input });
  const bbox = JSON.parse(probe['info.json'])[0].bbox;
  const p = decimals(bbox);
  const out = await mapshaper.applyCommands(
    `-i in.json -clean -simplify resolution=1000x1000 keep-shapes -each "lx=this.innerX, ly=this.innerY" -o out.json format=geojson precision=${(10 ** -p).toFixed(p)}`,
    { 'in.json': input });
  return JSON.parse(out['out.json']);
}

// OCHA COD-AB on HDX: a zip of <iso3>_admin1…4.geojson with adm<N>_name fields.
const HDX = 'https://data.humdata.org/api/3/action/package_show?id=';
async function codSources(iso3) {
  const dir = path.join(CACHE, `cod-${iso3}`);
  if (!fs.existsSync(path.join(dir, 'meta.json'))) {
    const r = await fetch(HDX + `cod-ab-${iso3.toLowerCase()}`).catch(() => null);
    if (!r?.ok) return [];
    const pkg = (await r.json()).result;
    const zip = pkg?.resources?.find(x => /geojson/i.test(x.format ?? '') && /\.zip$/i.test(x.url));
    if (!zip) return [];
    const z = await fetch(zip.url);
    if (!z.ok) return [];
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'cod.zip'), Buffer.from(await z.arrayBuffer()));
    execFileSync('unzip', ['-o', '-q', path.join(dir, 'cod.zip'), '-d', path.join(dir, 'x')]);
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ source: pkg.dataset_source, licence: pkg.license_title, id: pkg.name }));
  }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const out = [];
  for (const n of [1, 2]) {
    const f = fs.readdirSync(path.join(dir, 'x')).find(x => new RegExp(`admin${n}\\.geojson$`, 'i').test(x));
    if (!f) continue;
    const geo = JSON.parse(fs.readFileSync(path.join(dir, 'x', f), 'utf8'));
    for (const ft of geo.features) ft.properties = { shapeName: ft.properties[`adm${n}_name`] ?? '', shapeISO: '', validOn: ft.properties.valid_on };
    const year = String(geo.features[0]?.properties.validOn ?? '').slice(0, 4);
    out.push({ adm: `ADM${n}`, via: 'OCHA HDX', official: true, geo,
      meta: { boundarySource: meta.source, boundaryLicense: meta.licence, licenseDetail: '', boundaryYear: year, boundaryID: meta.id } });
  }
  return out;
}

async function build(iso3) {
  const t = targetLevel(iso3);
  const cur = currentShapes(iso3);
  if (!t || !cur) return { iso3, skip: 'no official list or no map' };
  const before = coverage(t.units, cur.country.provinces);
  const candidates = [];
  for (const adm of ['ADM1', 'ADM2']) {
    const s = await source(iso3, adm);
    if (!s) continue;
    const shapes = s.geo.features.map(f => ({ code: f.properties.shapeISO || '', name: f.properties.shapeName || '' }));
    candidates.push({ ...s, via: 'geoBoundaries', official: false, shapes, cov: coverage(t.units, shapes) });
  }
  for (const s of await codSources(iso3).catch(() => [])) {
    const shapes = s.geo.features.map(f => ({ code: '', name: f.properties.shapeName }));
    candidates.push({ ...s, shapes, cov: coverage(t.units, shapes) });
  }
  // A level with far more shapes than official units is the level below (e.g. Mali's
  // cercles under its regions), matched only through shared names.
  const fits = c => c.shapes.length <= Math.max(t.units.length * 1.5, t.units.length + 3);
  const best = candidates.filter(fits).sort((a, b) => b.cov - a.cov || Number(b.official) - Number(a.official))[0];
  if (!best) return { iso3, skip: candidates.length ? 'no source level of the right size' : 'not in geoBoundaries or HDX' };
  const licence = `${best.meta.boundaryLicense} ${best.meta.licenseDetail ?? ''}`;
  if (!OPEN.test(licence)) return { iso3, skip: `licence not open: ${best.meta.boundaryLicense}` };
  // GADM forbids redistribution and commercial use whatever licence a re-publisher lists.
  if (/gadm/i.test(best.meta.boundarySource ?? '')) return { iso3, skip: `derived from GADM, whose licence does not allow redistribution` };
  if (best.cov < 0.75 || best.cov < before + 0.05) return { iso3, skip: `no clear gain (${pct(before)} → ${pct(best.cov)} with ${best.adm})` };

  const simple = await simplify(best.geo);
  const feats = simple.features.filter(f => f.geometry);
  const shapes = feats.map(f => ({ code: f.properties.shapeISO || '', name: f.properties.shapeName || '' }));
  const hits = matchUnits(t.units, shapes);
  const unitOf = new Map([...hits].map(([code, i]) => [i, t.units.find(u => u.code === code)]));
  // Translations carry over from the previous shapes of the same unit.
  const old = admin1Shapes(iso3)?.provinces ?? [];
  const oldBy = new Map(old.flatMap(p => [[p.code, p], [norm(p.name), p]]));
  const provinces = feats.map((f, i) => {
    const u = unitOf.get(i);
    const name = u?.name ?? f.properties.shapeName;
    const code = u?.code ?? (f.properties.shapeISO || `${iso3}-${i + 1}`);
    const prev = oldBy.get(code) ?? oldBy.get(norm(name));
    const i18n = prev && norm(prev.name) === norm(name) ? prev.i18n : { en: name };
    const r = n => Number(n.toFixed(2));
    return { name, i18n, code, lng: r(f.properties.lx), lat: r(f.properties.ly), geometry: rewind(f.geometry) };
  });
  // The new shapes must cover the same territory as today's, or the map would show gaps.
  const land = ps => ps.reduce((a, p) => a + geoArea(p.geometry), 0);
  const ratio = land(provinces) / land(cur.country.provinces);
  if (!(ratio > 0.85 && ratio < 1.15)) return { iso3, skip: `territory differs from today's map (${pct(ratio)} of its area)` };
  const box = ps => geoBounds({ type: 'FeatureCollection', features: ps.map(p => ({ type: 'Feature', properties: {}, geometry: p.geometry })) });
  const [nb, ob] = [box(provinces), box(cur.country.provinces)];
  const drift = Math.max(...[0, 1].flatMap(i => [Math.abs(nb[i][0] - ob[i][0]), Math.abs(nb[i][1] - ob[i][1])]));
  if (drift > 1.5) return { iso3, skip: `outline differs from today's map (edges move ${drift.toFixed(1)}°, e.g. islands left out)` };
  const base = admin1Shapes(iso3) ?? cur.country;
  const country = { iso3, iso2: base.iso2, name: base.name, provinces };
  fs.mkdirSync(path.join(GEO, 'boundaries'), { recursive: true });
  fs.writeFileSync(path.join(GEO, 'boundaries', `${iso3}.json`), JSON.stringify(country));
  const missing = t.units.filter(u => !hits.has(u.code)).map(u => u.name);
  return {
    iso3, before, after: hits.size / t.units.length, units: provinces.length, missing,
    entry: {
      level: t.level, adm: best.adm, units: provinces.length,
      coverage: Number((hits.size / t.units.length).toFixed(3)),
      source: best.meta.boundarySource, licence: best.meta.boundaryLicense, year: best.meta.boundaryYear,
      id: best.meta.boundaryID, via: best.via,
    },
  };
}

const pct = x => `${Math.round(x * 100)}%`;
let list = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (process.argv.includes('--needed')) {
  list = JSON.parse(execFileSync(process.execPath, [path.join(path.dirname(new URL(import.meta.url).pathname), 'scan-boundaries.mjs'), '--json'], { encoding: 'utf8' }));
}
const index = boundaryIndex();
for (const iso3 of list) {
  let r;
  try { r = await build(iso3); } catch (e) { r = { iso3, skip: `error: ${e.message}` }; }
  if (r.skip) { console.log(`  ${iso3}  kept    ${r.skip}`); continue; }
  index[iso3] = r.entry;
  console.log(`  ${iso3}  upgraded ${pct(r.before)} → ${pct(r.after)}  ${r.units} shapes (${r.entry.via} ${r.entry.adm}, ${r.entry.licence}, ${r.entry.source})${r.missing.length ? `  missing: ${r.missing.slice(0, 6).join(', ')}${r.missing.length > 6 ? '…' : ''}` : ''}`);
}
fs.writeFileSync(BOUNDARY_INDEX, JSON.stringify(Object.fromEntries(Object.entries(index).sort()), null, 1) + '\n');

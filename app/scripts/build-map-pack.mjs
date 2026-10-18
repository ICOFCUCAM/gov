#!/usr/bin/env node
// Second-level (district) map shapes, so the map can drill down from a
// region to its districts (docs/MAP_SYSTEM_PLAN.md, phase 3).
//
// Source: geoBoundaries gbOpen (https://www.geoboundaries.org), the first
// level below the shapes the map draws today that is clearly finer than them:
// ADM2 for most nations; for Uganda, whose map already draws its districts,
// the sub-counties (geoBoundaries ADM4). Only open licences are used; GADM-derived
// data is refused. Each file's licence and source are recorded in
// src/lib/geo/admin2/index.json and credited on the map.
//
//   npm i --no-save mapshaper            (or set MAPSHAPER_DIR to an install)
//   node scripts/build-map-pack.mjs KEN UGA NGA GHA USA
//   node scripts/build-map-pack.mjs USA --adm=ADM2      force the level
//   (behind an HTTPS proxy, run with NODE_USE_ENV_PROXY=1 so Node's fetch uses it)
//
// Each unit is placed under the first-level unit (parent) that contains its
// label point, using the shapes the map draws today (boundaries/<ISO>.json
// when listed in boundaries/index.json, else admin1/<ISO>.json). Shapes are
// simplified adaptively so each country stays within the drill-down budget
// (≤ 1 MB gzipped): as detailed as possible for small countries, harder for
// large ones. Output: src/lib/geo/admin2/<ISO>.json
//   { iso3, units: [{ code, name, parent?, lng, lat, geometry }] }

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { GEO, boundaryIndex } from './boundaries-lib.mjs';

const require = createRequire(process.env.MAPSHAPER_DIR ? path.join(process.env.MAPSHAPER_DIR, 'x.js') : import.meta.url);
const mapshaper = require('mapshaper');
const { geoContains, geoBounds } = await import('d3-geo');

const CACHE = process.env.BOUNDARY_CACHE ?? path.join(process.env.TMPDIR ?? '/tmp', 'geoboundaries');
const RAW = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen';
const OPEN = /public domain|cc ?by|odbl|open data|open government|cc0|creative commons/i;
const OUT = path.join(GEO, 'admin2');
const INDEX = path.join(OUT, 'index.json');
/** Drill-down budget is 1 MB gzipped; aim a little below it. */
const BUDGET = 900 * 1024;
/** Simplification steps, most detailed first (mapshaper resolution, in pixels). */
const STEPS = [6000, 4000, 3000, 2000, 1500, 1000, 700, 500, 350];

const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));

async function fetchJson(url, file) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const r = await fetch(url);
    if (!r.ok) return null;
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  try { return read(file); } catch { return null; }
}

async function source(iso3, adm) {
  const base = `${RAW}/${iso3}/${adm}/geoBoundaries-${iso3}-${adm}`;
  const meta = await fetchJson(`${base}-metaData.json`, path.join(CACHE, `${iso3}-${adm}-meta.json`));
  if (!meta) return null;
  const geo = await fetchJson(`${base}_simplified.geojson`, path.join(CACHE, `${iso3}-${adm}.geojson`));
  return geo?.features?.length ? { adm, meta, geo } : null;
}

/** The first-level shapes the map draws today (same rule as src/lib/geo/admin1.ts). */
function firstLevel(iso3) {
  const listed = boundaryIndex()[iso3];
  const up = path.join(GEO, 'boundaries', `${iso3}.json`);
  if (listed && fs.existsSync(up)) return { adm: listed.adm ?? 'ADM1', country: read(up) };
  const ne = path.join(GEO, 'admin1', `${iso3}.json`);
  return fs.existsSync(ne) ? { adm: 'ADM1', country: read(ne) } : null;
}

// d3-geo (the map's renderer) takes outer rings clockwise and holes
// counter-clockwise, the reverse of RFC 7946 (same as build-boundaries.mjs).
const area = ring => ring.reduce((a, [x1, y1], i) => { const [x2, y2] = ring[(i + 1) % ring.length]; return a + (x2 - x1) * (y2 + y1); }, 0);
const wind = (ring, cw) => ((area(ring) > 0) === cw ? ring : [...ring].reverse());
const rewindPolygon = rings => rings.map((r, i) => wind(r, i === 0));
function rewind(g) {
  if (g.type === 'Polygon') return { ...g, coordinates: rewindPolygon(g.coordinates) };
  if (g.type === 'MultiPolygon') return { ...g, coordinates: g.coordinates.map(rewindPolygon) };
  return g;
}

async function simplify(input, resolution, precision) {
  const out = await mapshaper.applyCommands(
    `-i in.json -clean -simplify resolution=${resolution}x${resolution} keep-shapes -each "lx=this.innerX, ly=this.innerY" -o out.json format=geojson precision=${precision}`,
    { 'in.json': input });
  return JSON.parse(out['out.json']);
}

const slug = s => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unit';
const featureOf = geometry => ({ type: 'Feature', properties: {}, geometry });

/** Parent lookup: the first-level shape containing a point, with a bounding-box prefilter. */
function parentFinder(provinces) {
  const shapes = provinces.map(p => {
    const [[x0, y0], [x1, y1]] = geoBounds(featureOf(p.geometry));
    return { code: p.code, f: featureOf(p.geometry), box: [x0, y0, x1, y1] };
  });
  const inBox = ([x, y], [x0, y0, x1, y1]) => y >= y0 && y <= y1 && (x0 <= x1 ? x >= x0 && x <= x1 : x >= x0 || x <= x1);
  return pt => shapes.find(s => inBox(pt, s.box) && geoContains(s.f, pt))?.code;
}

/** Points spread over a unit (vertices of its rings) for the fallback vote and the border check. */
function vertices(g, max = 40) {
  const pts = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap(poly => poly[0]);
  const step = Math.max(1, Math.floor(pts.length / max));
  return pts.filter((_, i) => i % step === 0);
}

/** Interior sample points of a unit (a small grid inside it) to see whether it lies across first-level borders. */
function interior(g, f, n = 6) {
  const [[x0, y0], [x1, y1]] = geoBounds(f);
  if (x0 > x1) return [];
  const out = [];
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) {
    const p = [x0 + ((x1 - x0) * i) / (n + 1), y0 + ((y1 - y0) * j) / (n + 1)];
    if (geoContains(f, p)) out.push(p);
  }
  return out;
}

async function build(iso3, forced) {
  const first = firstLevel(iso3);
  if (!first) return { iso3, skip: 'no first-level shapes for the map' };
  // geoBoundaries numbers its levels its own way (Uganda: ADM2 counties of
  // 2006, ADM3 today's districts, ADM4 sub-counties), so take the first level
  // below today's map that is clearly finer than it (≥ 1.5 × its units).
  const top = first.country.provinces.length;
  const from = Number(String(first.adm).replace(/\D/g, '') || 1) + 1;
  let s = null;
  const tried = [];
  for (const adm of forced ? [forced] : [2, 3, 4].filter(n => n >= from).map(n => `ADM${n}`)) {
    const c = await source(iso3, adm);
    if (!c) { tried.push(`${adm} missing`); continue; }
    if (!forced && c.geo.features.length < top * 1.5) { tried.push(`${adm} ${c.geo.features.length} units, not finer than ${top}`); continue; }
    s = c; break;
  }
  if (!s) return { iso3, skip: `no finer level in geoBoundaries gbOpen (${tried.join('; ')})` };
  const adm = s.adm;
  const licence = `${s.meta.boundaryLicense} ${s.meta.licenseDetail ?? ''}`;
  if (!OPEN.test(licence)) return { iso3, skip: `licence not open: ${s.meta.boundaryLicense}` };
  // GADM forbids redistribution and commercial use whatever licence a re-publisher lists.
  if (/gadm/i.test(`${s.meta.boundarySource ?? ''} ${s.meta.boundarySourceURL ?? ''}`)) return { iso3, skip: 'derived from GADM, whose licence does not allow redistribution' };

  const input = JSON.stringify(s.geo);
  const probe = await mapshaper.applyCommands('-i in.json -info save-to=info.json', { 'in.json': input });
  const bbox = JSON.parse(probe['info.json'])[0].bbox;
  const extent = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  const precision = extent < 5 ? '0.00001' : '0.0001';

  const findParent = parentFinder(first.country.provinces);
  let units = null, gz = 0, resolution = 0;
  for (const res of STEPS) {
    const simple = await simplify(input, res, precision);
    const feats = simple.features.filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
    units = feats.map(f => ({ f, name: String(f.properties.shapeName ?? '').trim(), iso: String(f.properties.shapeISO ?? '').trim() }));
    const body = JSON.stringify(units.map(u => ({ geometry: u.f.geometry })));
    gz = zlib.gzipSync(body).length;
    resolution = res;
    if (gz <= BUDGET) break;
  }
  if (!units?.length) return { iso3, skip: 'no units after simplification' };

  const r = (n, d) => Number(Number(n).toFixed(d));
  const ld = precision === '0.00001' ? 4 : 3;
  const used = new Set();
  let viaVote = 0;
  const crossing = [];
  const out = units.map(({ f, name, iso }) => {
    const geometry = rewind(f.geometry);
    const label = [f.properties.lx, f.properties.ly];
    let parent = findParent(label);
    if (!parent) {
      // Label point outside every first-level shape (coastline or border drawn
      // differently by the two sources): take the parent most of its outline lies in.
      const votes = new Map();
      for (const p of vertices(geometry)) { const c = findParent(p); if (c) votes.set(c, (votes.get(c) ?? 0) + 1); }
      parent = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (parent) viaVote++;
    }
    if (parent) {
      const pts = interior(geometry, featureOf(geometry));
      const other = pts.filter(p => { const c = findParent(p); return c && c !== parent; }).length;
      if (pts.length >= 5 && other / pts.length > 0.2) crossing.push(`${name} (${parent}, ${Math.round((100 * other) / pts.length)}% elsewhere)`);
    }
    let code = /^[A-Z]{2}-[A-Z0-9]+$/.test(iso) && !used.has(iso) ? iso : '';
    if (!code) {
      const base = `${parent || iso3}:${slug(name)}`;
      code = base;
      for (let n = 2; used.has(code); n++) code = `${base}-${n}`;
    }
    used.add(code);
    return { code, name: name || code, ...(parent ? { parent } : {}), lng: r(label[0], ld), lat: r(label[1], ld), geometry };
  });
  if (!out.length) return { iso3, skip: 'zero units' };

  const file = { iso3, units: out };
  const text = JSON.stringify(file);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${iso3}.json`), text);
  const parents = out.filter(u => u.parent).length;
  return {
    iso3, resolution, gzip: zlib.gzipSync(text).length, raw: text.length, viaVote, crossing,
    entry: {
      adm, units: out.length, source: s.meta.boundarySource, licence: s.meta.boundaryLicense,
      year: String(s.meta.boundaryYear ?? ''), via: 'geoBoundaries', id: s.meta.boundaryID, parents,
    },
  };
}

const forced = process.argv.find(a => a.startsWith('--adm='))?.slice(6).toUpperCase();
const list = process.argv.slice(2).filter(a => !a.startsWith('--')).map(a => a.toUpperCase());
if (!list.length) { console.log('usage: node scripts/build-map-pack.mjs KEN UGA … [--adm=ADM2]'); process.exit(1); }
const index = fs.existsSync(INDEX) ? read(INDEX) : {};
for (const iso3 of list) {
  let r;
  try { r = await build(iso3, forced); } catch (e) { r = { iso3, skip: `error: ${e.message}` }; }
  if (r.skip) { console.log(`  ${iso3}  skipped  ${r.skip}`); continue; }
  index[iso3] = r.entry;
  const kb = n => `${Math.round(n / 1024)} KB`;
  console.log(`  ${iso3}  ${r.entry.units} units (${r.entry.adm}), ${r.entry.parents} with a parent${r.viaVote ? ` (${r.viaVote} by outline vote)` : ''}; ${kb(r.raw)} raw, ${kb(r.gzip)} gzipped at ${r.resolution}px; ${r.entry.licence}, ${r.entry.source}`);
  if (r.crossing.length) console.log(`        across first-level borders (${r.crossing.length}): ${r.crossing.slice(0, 8).join('; ')}${r.crossing.length > 8 ? '…' : ''}`);
}
fs.writeFileSync(INDEX, JSON.stringify(Object.fromEntries(Object.entries(index).sort()), null, 1) + '\n');

#!/usr/bin/env node
// Map shape packs: TopoJSON (shared arcs, integer coordinates) in two detail
// levels per country (docs/MAP_SYSTEM_PLAN.md, phase 3 "TopoJSON packs and two
// detail levels"). The maps load these packs, never the source files.
//
//   npm run build:topo              rebuild every pack
//   npm run build:topo -- KEN USA   rebuild some countries only
//
// Sources (unchanged, still written by build-boundaries.mjs, official-names.mjs
// and build-map-pack.mjs): src/lib/geo/boundaries, admin1, outline (first
// level, chosen exactly as lib/geo/admin1.ts did before the packs) and
// src/lib/geo/admin2 (districts). Output: src/lib/geo/topo/
//   a1/<ISO>.full.json      every vertex of the source (lossless: the source's own
//                           coordinate grid), for drill-down and position checks
//   a1/<ISO>.overview.json  simplified for the whole-nation map and small panels
//   a2/<ISO>.full.json, a2/<ISO>.overview.json   the same for districts
//   index.json              SHA-256 of each source, so a test can tell when a
//                           source changed and the packs were not rebuilt
//
// Overview simplification works on the shared arcs (Visvalingam, topojson-
// simplify), so neighbours keep one common border: no gaps or overlaps. A unit
// is never dropped: the largest ring of every unit, every ring touching another
// unit and every ring kept keeps at least three corners; only detached specks
// (islets, lakes) below the threshold go. A country whose overview fails any
// check (a unit missing, an inside-out shape) is retried with a finer threshold.
// The output is deterministic: the same sources give the same bytes.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { topology } from 'topojson-server';
import { presimplify, simplify, filter } from 'topojson-simplify';
import { feature, neighbors } from 'topojson-client';
import { geoArea } from 'd3-geo';

const GEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'geo');
const OUT = path.join(GEO, 'topo');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const exists = f => fs.existsSync(f);
const gz = o => zlib.gzipSync(JSON.stringify(o)).length;
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

/**
 * Overview steps, coarsest first: [threshold as a share of the country's land
 * area, grid as the number of cells across the country's longest side]. The
 * first step whose result passes every check is kept; the last is the full
 * shapes, so a country always has an overview.
 */
const OVERVIEW_STEPS = [[1e-4, 1e4], [3e-5, 3e4], [1e-5, 1e5], [0, 0]];
/** Detached rings (islets, lakes) under this multiple of the threshold are left out of the overview. */
const SPECK = 0.25;

// ---------- sources ----------

/** The first-level source for a country, chosen exactly as loadCountry() chose before the packs. */
function admin1Source(iso3, countries, upgraded) {
  if (upgraded[iso3] && exists(path.join(GEO, 'boundaries', `${iso3}.json`))) return 'boundaries';
  const meta = countries.find(c => c.iso3 === iso3);
  if (meta && meta.provinces > 0) return exists(path.join(GEO, 'admin1', `${iso3}.json`)) ? 'admin1' : null;
  return exists(path.join(GEO, 'outline', `${iso3}.json`)) ? 'outline' : null;
}

// ---------- coordinates on the source's own grid ----------

function eachPoint(g, fn) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) for (const p of ring) fn(p);
}

/** The source's decimal places (≤ 7): coordinates become exact integers on that grid. */
function decimals(geoms) {
  let d = 0;
  for (const g of geoms) eachPoint(g, p => {
    for (const v of p.slice(0, 2)) {
      while (d < 7 && Math.abs(v * 10 ** d - Math.round(v * 10 ** d)) > 1e-6) d++;
    }
  });
  return d;
}

const toGrid = (g, d) => ({
  type: g.type,
  coordinates: g.type === 'Polygon'
    ? g.coordinates.map(r => r.map(p => [Math.round(p[0] * 10 ** d), Math.round(p[1] * 10 ** d)]))
    : g.coordinates.map(poly => poly.map(r => r.map(p => [Math.round(p[0] * 10 ** d), Math.round(p[1] * 10 ** d)]))),
});

// ---------- topology helpers ----------

const ringsOf = g => (g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []);

function ringPoints(arcs, ring) {
  const out = [];
  for (const a of ring) {
    const arc = a < 0 ? arcs[~a].slice().reverse() : arcs[a];
    for (let i = out.length ? 1 : 0; i < arc.length; i++) out.push(arc[i]);
  }
  return out;
}

function signedArea(pts) {
  let s = 0;
  for (let i = 0, n = pts.length - 1; i < n; i++) s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  return s / 2;
}
const planarArea = pts => Math.abs(signedArea(pts));

/**
 * Delta-encodes integer arcs and sets the transform that turns them back into
 * degrees. `k` > 1 snaps the overview to a coarser grid (k source steps); a
 * shared arc snaps the same way for both neighbours, so they still meet.
 */
function encode(topo, d, meta, k = 1) {
  const arcs = topo.arcs.map(arc => {
    const out = [];
    let x = 0, y = 0;
    for (const q of arc) {
      const p = [Math.round(q[0] / k), Math.round(q[1] / k)];
      const dx = p[0] - x, dy = p[1] - y;
      if (out.length && dx === 0 && dy === 0) continue;
      out.push([dx, dy]);
      x = p[0]; y = p[1];
    }
    return out;
  });
  const s = +(k * 10 ** -d).toPrecision(12);
  const box = topo.bbox ? topo.bbox.map(v => +(v * 10 ** -d).toFixed(d)) : undefined;
  return { type: 'Topology', civicos: meta, ...(box ? { bbox: box } : {}), transform: { scale: [s, s], translate: [0, 0] }, objects: topo.objects, arcs };
}

/** Simplified copy of an integer topology; never drops a unit. */
function overview(topo, share) {
  if (!share) return topo;
  const geoms = topo.objects.units ? topo.objects.units.geometries : [topo.objects.outline];
  const users = new Map();
  geoms.forEach((g, gi) => { for (const r of ringsOf(g).flat()) for (const a of r) { const i = a < 0 ? ~a : a; (users.get(i) ?? users.set(i, new Set()).get(i)).add(gi); } });
  const land = geoms.reduce((s, g) => s + ringsOf(g).reduce((t, poly) => t + planarArea(ringPoints(topo.arcs, poly[0])), 0), 0);
  const minWeight = land * share;
  const pre = presimplify(topo);
  const keep = new Set();
  geoms.forEach((g, gi) => {
    const polys = ringsOf(g);
    let biggest = null, most = -1;
    for (const poly of polys) {
      const a = planarArea(ringPoints(topo.arcs, poly[0]));
      if (a > most) { most = a; biggest = poly[0]; }
    }
    for (const poly of polys) poly.forEach(ring => {
      const attached = ring.some(a => [...users.get(a < 0 ? ~a : a)].some(o => o !== gi));
      if (ring === biggest || attached || planarArea(ringPoints(topo.arcs, ring)) >= minWeight * SPECK) {
        keep.add(ring);
        guardCorners(pre.arcs, ring);
      }
    });
  });
  // A kept ring that simplification would turn inside out (a sliver folding
  // over itself) keeps every vertex instead; repeat until none flips.
  let simple = simplify(pre, minWeight);
  for (let pass = 0; pass < 8; pass++) {
    const flipped = [...keep].filter(ring => {
      const before = signedArea(ringPoints(topo.arcs, ring)), after = signedArea(ringPoints(simple.arcs, ring));
      return after === 0 || Math.sign(after) !== Math.sign(before);
    });
    if (!flipped.length) break;
    for (const ring of flipped) for (const a of ring) for (const p of pre.arcs[a < 0 ? ~a : a]) p[2] = Infinity;
    simple = simplify(pre, minWeight);
  }
  return filter(simple, ring => keep.has(ring));
}

/** A kept ring keeps at least three distinct corners after simplification. */
function guardCorners(arcs, ring) {
  const key = p => `${p[0]},${p[1]}`;
  const corners = new Set();
  for (const a of ring) { const arc = arcs[a < 0 ? ~a : a]; corners.add(key(arc[0])); corners.add(key(arc[arc.length - 1])); }
  if (corners.size >= 3) return;
  const inner = ring.flatMap(a => arcs[a < 0 ? ~a : a].slice(1, -1)).filter(p => p[2] !== Infinity).sort((p, q) => q[2] - p[2]);
  for (const p of inner) {
    if (corners.size >= 3) break;
    if (!corners.has(key(p))) { p[2] = Infinity; corners.add(key(p)); }
  }
}

// ---------- checks ----------

function decodeUnits(topo) {
  if (topo.objects.units) return feature(topo, topo.objects.units).features.map(f => ({ ...f.properties, geometry: f.geometry }));
  return [{ geometry: feature(topo, topo.objects.outline).geometry }];
}

/** Which units touch which: the overview must keep every shared border. */
const adjacency = topo => (topo.objects.units ? JSON.stringify(neighbors(topo.objects.units.geometries).map((n, i) => n.filter(j => j !== i))) : '');

function problems(topo, want, touching) {
  const units = decodeUnits(topo);
  const out = [];
  if (touching !== undefined && adjacency(topo) !== touching) out.push('neighbours differ from the full shapes');
  if (units.length !== want.length) out.push(`${units.length} of ${want.length} units`);
  units.forEach((u, i) => {
    if (want[i] !== undefined && u.code !== want[i]) out.push(`unit ${i} is ${u.code}, not ${want[i]}`);
    const g = u.geometry;
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) { out.push(`${u.code ?? 'outline'}: no shape`); return; }
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    if (!polys.length || polys.some(p => !p.length || p.some(r => r.length < 4))) out.push(`${u.code ?? 'outline'}: degenerate ring`);
    if (geoArea(g) > 2 * Math.PI) out.push(`${u.code ?? 'outline'}: inside out`);
  });
  return out;
}

// ---------- build ----------

/**
 * Builds both levels for one source. `units` carry their fields (kept as
 * properties, in source order) and their geometry; `outline` is used for
 * countries drawn as one outline only.
 */
function pack(meta, { units, outline }) {
  const geoms = units ? units.map(u => u.geometry) : [outline];
  const d = decimals(geoms);
  const objects = units
    ? { units: { type: 'FeatureCollection', features: units.map(({ geometry, ...props }) => ({ type: 'Feature', properties: props, geometry: toGrid(geometry, d) })) } }
    : { outline: toGrid(outline, d) };
  const want = units ? units.map(u => u.code) : [undefined];
  const fresh = () => JSON.parse(JSON.stringify(topology(objects)));
  const full = encode(fresh(), d, { ...meta, detail: 'full' });
  const bad = problems(full, want);
  if (bad.length) throw new Error(`${meta.level}/${meta.iso3} full: ${bad.join('; ')}`);
  const [x0, y0, x1, y1] = fresh().bbox;
  for (const [share, cells] of OVERVIEW_STEPS) {
    const k = cells ? Math.max(1, Math.floor(Math.max(x1 - x0, y1 - y0) / cells)) : 1;
    const over = encode(overview(fresh(), share), d, { ...meta, detail: 'overview', ...(share ? { simplified: share } : {}) }, k);
    const issues = problems(over, want, adjacency(full));
    // Tiny countries gain nothing from simplifying: their overview is the full shapes.
    if (!issues.length) return { full, over: gz(over) < gz(full) ? over : { ...full, civicos: { ...meta, detail: 'overview' } } };
    if (share) console.log(`${meta.level}/${meta.iso3}: overview at ${share} failed (${issues.join('; ')}), trying finer`);
    else throw new Error(`${meta.level}/${meta.iso3} overview: ${issues.join('; ')}`);
  }
  throw new Error('unreachable');
}

function write(level, iso3, packs) {
  fs.mkdirSync(path.join(OUT, level), { recursive: true });
  for (const [detail, topo] of [['full', packs.full], ['overview', packs.over]]) {
    fs.writeFileSync(path.join(OUT, level, `${iso3}.${detail}.json`), JSON.stringify(topo));
  }
}

const INDEX = path.join(OUT, 'index.json');
const only = new Set(process.argv.slice(2).filter(a => /^[A-Z]{3}$/.test(a)));
const want = iso3 => !only.size || only.has(iso3);
const index = only.size && exists(INDEX) ? read(INDEX) : { a1: {}, a2: {} };
const countries = read(path.join(GEO, 'countries.json'));
const upgraded = read(path.join(GEO, 'boundaries', 'index.json'));
const isos = dir => (exists(path.join(GEO, dir)) ? fs.readdirSync(path.join(GEO, dir)).filter(f => /^[A-Z]{3}\.json$/.test(f)).map(f => f.slice(0, 3)) : []);

let n = 0;
const all1 = [...new Set([...countries.map(c => c.iso3), ...isos('boundaries'), ...isos('admin1'), ...isos('outline')])].sort();
for (const iso3 of all1) {
  if (!want(iso3)) continue;
  const from = admin1Source(iso3, countries, upgraded);
  if (!from) { delete index.a1[iso3]; continue; }
  const file = path.join(GEO, from, `${iso3}.json`);
  const src = read(file);
  const meta = { level: 'a1', iso3: src.iso3, iso2: src.iso2, name: src.name, from };
  write('a1', iso3, pack(meta, from === 'outline' ? { outline: src.geometry } : { units: src.provinces }));
  index.a1[iso3] = { from: `${from}/${iso3}.json`, sha256: sha256(file) };
  n++;
}

const a2Index = read(path.join(GEO, 'admin2', 'index.json'));
for (const iso3 of Object.keys(a2Index).sort()) {
  if (!want(iso3)) continue;
  const file = path.join(GEO, 'admin2', `${iso3}.json`);
  if (!exists(file)) { delete index.a2[iso3]; continue; }
  const src = read(file);
  write('a2', iso3, pack({ level: 'a2', iso3: src.iso3 }, { units: src.units }));
  index.a2[iso3] = { from: `admin2/${iso3}.json`, sha256: sha256(file) };
  n++;
}

// Packs whose source no longer exists are removed.
if (!only.size) {
  for (const level of ['a1', 'a2']) {
    const dir = path.join(OUT, level);
    if (!exists(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (!index[level][f.slice(0, 3)]) fs.rmSync(path.join(dir, f));
  }
}
const sorted = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
fs.writeFileSync(INDEX, JSON.stringify({ a1: sorted(index.a1), a2: sorted(index.a2) }, null, 1) + '\n');
console.log(`built ${n} packs (two levels each) in ${path.relative(process.cwd(), OUT)}`);

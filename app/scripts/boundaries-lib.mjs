// Shared by scan-boundaries.mjs and build-boundaries.mjs: compares a country's
// map shapes with its official subdivisions (src/lib/geo/divisions.json).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'geo');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export const DIVISIONS = read(path.join(GEO, 'divisions.json'));
export const BOUNDARY_INDEX = path.join(GEO, 'boundaries', 'index.json');
export const boundaryIndex = () => (fs.existsSync(BOUNDARY_INDEX) ? read(BOUNDARY_INDEX) : {});

/** Shapes the map draws today: the upgraded boundaries when present, otherwise Natural Earth admin-1. */
export function currentShapes(iso3) {
  const upgraded = path.join(GEO, 'boundaries', `${iso3}.json`);
  if (fs.existsSync(upgraded)) return { source: 'boundaries', country: read(upgraded) };
  const ne = path.join(GEO, 'admin1', `${iso3}.json`);
  return fs.existsSync(ne) ? { source: 'admin1', country: read(ne) } : null;
}
export const admin1Shapes = iso3 => {
  const f = path.join(GEO, 'admin1', `${iso3}.json`);
  return fs.existsSync(f) ? read(f) : null;
};

/** The country's official levels: I (no parent) and II (beneath level I). */
export function officialLevels(iso3) {
  const rows = DIVISIONS[iso3] ?? [];
  const codes = new Set(rows.map(r => r[0]));
  const unit = r => ({ code: r[0], name: r[1], type: r[2] });
  const l1 = rows.filter(r => !r[3] || !codes.has(r[3])).map(unit);
  const top = new Set(l1.map(u => u.code));
  const l2 = rows.filter(r => r[3] && top.has(r[3])).map(unit);
  return { I: home(l1), II: home(l2) };
}

// Same rule as src/lib/geo/divisions.ts: territories administered apart (e.g. US outlying areas) are not mapped.
const DETACHED = /outlying|dependenc|overseas territory/i;
const home = units => { const h = units.filter(u => !DETACHED.test(u.type)); return h.length ? h : units; };

export function norm(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\b(region|province|state|county|district|department|governorate|prefecture|city|municipality|oblast|krai|kraj|voivodeship|canton|parish|atoll|island|islands|of|the|de|du|des|la|le|el|al)\b/g, '')
    .replace(/[^a-z]/g, '');
}

/** Match shapes ({code,name}) to official units by ISO code, then by name. Returns code → shape index. */
export function matchUnits(units, shapes) {
  const byCode = new Map(), byName = new Map();
  shapes.forEach((s, i) => {
    if (s.code) byCode.set(s.code, i);
    const n = norm(s.name);
    if (n && !byName.has(n)) byName.set(n, i);
  });
  const hits = new Map();
  const used = new Set();
  for (const u of units) {
    let i = byCode.get(u.code);
    if (i === undefined || used.has(i)) i = byName.get(norm(u.name));
    if (i !== undefined && !used.has(i)) { hits.set(u.code, i); used.add(i); }
  }
  return hits;
}

export const coverage = (units, shapes) => (units.length ? matchUnits(units, shapes).size / units.length : 0);

/**
 * The official level the map should show: the one today's shapes already
 * follow most closely (Uganda, France and the UK draw their second level),
 * otherwise the first level.
 */
export function targetLevel(iso3) {
  const lv = officialLevels(iso3);
  const shapes = admin1Shapes(iso3)?.provinces ?? [];
  if (!lv.I.length) return null;
  const c1 = coverage(lv.I, shapes), c2 = coverage(lv.II, shapes);
  return lv.II.length && c2 > c1 && c2 >= 0.3 ? { level: 'II', units: lv.II } : { level: 'I', units: lv.I };
}

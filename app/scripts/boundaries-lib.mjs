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
  // Last, spelling variants of the same name (e.g. ISO "Sembabule", UBOS "Ssembabule"):
  // at most two letters apart, and only when exactly one unused shape is that close.
  for (const u of units) {
    if (hits.has(u.code)) continue;
    const n = norm(u.name);
    if (n.length < 5) continue;
    const near = shapes.map((s, i) => [i, norm(s.name)]).filter(([i, m]) => !used.has(i) && m.length >= 5 && distance(n, m) <= 2);
    if (near.length === 1) { hits.set(u.code, near[0][0]); used.add(near[0][0]); }
  }
  // Then long and short forms of the same name, again only when exactly one shape fits:
  // one name starts the other ("Gambela Peoples" / "Gambela"), or one is the
  // initials of the other ("SNNP" / "Southern Nations, Nationalities and Peoples").
  const initials = s => String(s).split(/[\s,-]+/).filter(w => w && !/^(and|of|the|de|et|y|e)$/i.test(w)).map(w => w[0].toLowerCase()).join('');
  for (const u of units) {
    if (hits.has(u.code)) continue;
    const n = norm(u.name);
    if (n.length < 5) continue;
    const fit = shapes.map((s, i) => [i, s]).filter(([i, s]) => {
      if (used.has(i)) return false;
      const m = norm(s.name);
      if (m.length >= 5 && (n.startsWith(m) || m.startsWith(n))) return true;
      const short = s.name.replace(/[^A-Za-z]/g, '');
      return short.length >= 3 && short === short.toUpperCase() && short.toLowerCase() === initials(u.name);
    });
    if (fit.length === 1) { hits.set(u.code, fit[0][0]); used.add(fit[0][0]); }
  }
  return hits;
}

function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
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

// District (admin-2) conversion shared by scripts/build-map-pack.mjs (the
// bundled district files) and lib/data/map-pack.ts (districts installed for
// a nation at setup, from geoBoundaries or an uploaded file). Plain
// JavaScript so the Node build script and the app import the same rules;
// types in admin2-convert.d.mts.
//
// Rules (docs/MAP_SYSTEM_PLAN.md, phase 3):
// - open licences only (OPEN), never GADM-derived data (its licence forbids
//   redistribution whatever a re-publisher lists);
// - each unit's parent is the first-level shape containing its label point,
//   from the shapes the map draws (never typed); when the label point lies
//   outside every first-level shape, the parent most of its outline lies in;
// - code = ISO 3166-2 when the source has one (unique), else
//   `${parent || iso3}:${slug(name)}`, numbered when repeated;
// - rings wound the way d3-geo (the map's renderer) expects.

import { geoArea, geoBounds, geoCentroid, geoContains } from 'd3-geo';

/** Licences the platform accepts for district shapes. */
export const OPEN = /public domain|cc ?by|odbl|open data|open government|cc0|creative commons/i;

/** Why a geoBoundaries metadata record may not be used, or null when it may. */
export function licenceRefusal(meta) {
  const licence = `${meta?.boundaryLicense ?? ''} ${meta?.licenseDetail ?? ''}`;
  if (!OPEN.test(licence)) return `licence not open: ${meta?.boundaryLicense || 'none recorded'}`;
  if (/gadm/i.test(`${meta?.boundarySource ?? ''} ${meta?.boundarySourceURL ?? ''} ${meta?.boundaryLicense ?? ''}`)) return 'derived from GADM, whose licence does not allow redistribution';
  return null;
}

/**
 * geoBoundaries numbers its levels its own way (Uganda: ADM2 counties of
 * 2006, ADM3 today's districts, ADM4 sub-counties): the levels to try, from
 * the first one below the shapes the map draws today.
 */
export function levelsBelow(firstAdm) {
  const from = Number(String(firstAdm ?? 'ADM1').replace(/\D/g, '') || 1) + 1;
  return [2, 3, 4].filter(n => n >= from).map(n => `ADM${n}`);
}
/** A level is used only when clearly finer than the first level (≥ 1.5 × its units). */
export const finerThan = (units, top) => units >= top * 1.5;

export const slug = s => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unit';
export const featureOf = geometry => ({ type: 'Feature', properties: {}, geometry });

// d3-geo (the map's renderer) takes outer rings clockwise and holes
// counter-clockwise, the reverse of RFC 7946 (same as build-boundaries.mjs).
const area = ring => ring.reduce((a, [x1, y1], i) => { const [x2, y2] = ring[(i + 1) % ring.length]; return a + (x2 - x1) * (y2 + y1); }, 0);
const wind = (ring, cw) => ((area(ring) > 0) === cw ? ring : [...ring].reverse());
const rewindPolygon = rings => rings.map((r, i) => wind(r, i === 0));
export function rewind(g) {
  if (g.type === 'Polygon') return { ...g, coordinates: rewindPolygon(g.coordinates) };
  if (g.type === 'MultiPolygon') return { ...g, coordinates: g.coordinates.map(rewindPolygon) };
  return g;
}

/**
 * Coordinates rounded to `digits` decimals, repeated points dropped and rings
 * closed; rings left with fewer than three points are dropped. Null when
 * nothing is left or the geometry is not an area in longitude/latitude.
 */
export function roundGeometry(g, digits = 5) {
  if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon') || !Array.isArray(g.coordinates)) return null;
  const k = 10 ** digits;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const out = [];
  for (const poly of polys) {
    if (!Array.isArray(poly)) return null;
    const rings = [];
    for (const ring of poly) {
      if (!Array.isArray(ring)) return null;
      const pts = [];
      for (const p of ring) {
        const x = Number(p?.[0]), y = Number(p?.[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 180 || Math.abs(y) > 90) return null;
        const q = [Math.round(x * k) / k, Math.round(y * k) / k];
        const last = pts[pts.length - 1];
        if (!last || last[0] !== q[0] || last[1] !== q[1]) pts.push(q);
      }
      if (pts.length >= 3 && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) pts.push([...pts[0]]);
      if (pts.length >= 4) rings.push(pts);
      else if (!rings.length) break; // outer ring collapsed: drop the polygon
    }
    if (rings.length) out.push(rings);
  }
  if (!out.length) return null;
  return out.length === 1 ? { type: 'Polygon', coordinates: out[0] } : { type: 'MultiPolygon', coordinates: out };
}

/** Parent lookup: the first-level shape containing a point, with a bounding-box prefilter. */
export function parentFinder(provinces) {
  const shapes = provinces.filter(p => p.geometry).map(p => {
    const [[x0, y0], [x1, y1]] = geoBounds(featureOf(p.geometry));
    return { code: p.code, f: featureOf(p.geometry), box: [x0, y0, x1, y1] };
  });
  const inBox = ([x, y], [x0, y0, x1, y1]) => y >= y0 && y <= y1 && (x0 <= x1 ? x >= x0 && x <= x1 : x >= x0 || x <= x1);
  return pt => shapes.find(s => inBox(pt, s.box) && geoContains(s.f, pt))?.code;
}

/** Points spread over a unit (vertices of its rings) for the fallback vote and the border check. */
export function vertices(g, max = 40) {
  const pts = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap(poly => poly[0]);
  const step = Math.max(1, Math.floor(pts.length / max));
  return pts.filter((_, i) => i % step === 0);
}

/** Interior sample points of a unit (a small grid inside it) to see whether it lies across first-level borders. */
export function interior(g, f = featureOf(g), n = 6) {
  const [[x0, y0], [x1, y1]] = geoBounds(f);
  if (x0 > x1) return [];
  const out = [];
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) {
    const p = [x0 + ((x1 - x0) * i) / (n + 1), y0 + ((y1 - y0) * j) / (n + 1)];
    if (geoContains(f, p)) out.push(p);
  }
  return out;
}

/**
 * A point inside the unit for its label (the build script takes mapshaper's
 * inner point instead): its centre when that lies inside, else a point inside
 * its largest part (a coastal unit with islands can have its centre at sea).
 */
export function labelPoint(g) {
  const f = featureOf(g);
  const c = geoCentroid(f);
  if (geoContains(f, c)) return c;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const largest = polys.map(p => ({ p, a: geoArea({ type: 'Polygon', coordinates: p }) })).sort((a, b) => b.a - a.a)[0].p;
  const lc = geoCentroid({ type: 'Polygon', coordinates: largest });
  if (geoContains(f, lc)) return lc;
  const inner = interior(g, f, 8);
  if (inner.length) return inner.sort((a, b) => Math.hypot(a[0] - lc[0], a[1] - lc[1]) - Math.hypot(b[0] - lc[0], b[1] - lc[1]))[0];
  return largest[0][0];
}

/**
 * Units with their parent and code. `items` are { geometry, name, iso, label }
 * (geometry as the source gives it; label a point inside it). Returns the
 * units ({ code, name, parent?, lng, lat, geometry }), how many parents came
 * from the outline vote, and units lying across first-level borders.
 */
export function assignUnits(items, findParent, iso3, labelDigits = 4) {
  const r = n => Number(Number(n).toFixed(labelDigits));
  const used = new Set();
  let viaVote = 0;
  const crossing = [];
  const units = items.map(({ geometry: raw, name: rawName, iso: rawIso, label }) => {
    const geometry = rewind(raw);
    const name = String(rawName ?? '').trim();
    const iso = String(rawIso ?? '').trim();
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
      const pts = interior(geometry);
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
    return { code, name: name || code, ...(parent ? { parent } : {}), lng: r(label[0]), lat: r(label[1]), geometry };
  });
  return { units, viaVote, crossing };
}

// Parcel geometry (lib/data/parcels.ts, docs/PARCEL_REGISTER.md): reading a
// parcel's outline, checking it is a valid polygon in the OGC Simple Features
// sense, and measuring it. Pure: no I/O, no map.
//
// - A parcel is a GeoJSON Polygon or MultiPolygon in longitude/latitude
//   (WGS 84), stored as a MultiPolygon wound as RFC 7946 asks (exteriors
//   anticlockwise, holes clockwise; rewound silently, and said so).
// - Every ring is closed (its first point repeated last), has at least three
//   distinct points, and does not cross itself (lib/geo/topology.ts kinks);
//   rings of one polygon do not cross each other, holes lie inside their
//   exterior, and the parts of a MultiPolygon do not overlap.
// - Area is computed on the sphere (spherical excess, R = 6,378,137 m, as GIS
//   tools compute geodesic area), never typed.
// - Overlap between two parcels is estimated on a raster over their common
//   bounding box (rasterise(), at most 250,000 cells; the cell size is
//   returned with the estimate): two parcels sharing an edge overlap by zero.

import type { Geom } from './admin1';
import { gridOver, kinksOf, rasterise, ringKinks } from './topology';

export type Position = [number, number];
export type Ring = Position[];
export interface MultiPolygonGeom { type: 'MultiPolygon'; coordinates: Ring[][] }
export type BBox = [number, number, number, number];

/** Most points one parcel may have (a surveyed parcel has tens). */
export const MAX_PARCEL_POINTS = 5000;
/** Largest parcel (km²): beyond it the record is a territory, not a parcel. */
export const MAX_PARCEL_KM2 = 100;
const R = 6_378_137;
const rad = (d: number) => (d * Math.PI) / 180;

/** Signed planar area of a closed ring in degrees² (positive when anticlockwise). */
export function planarArea(r: Ring): number {
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) s += r[i]![0] * r[i + 1]![1] - r[i + 1]![0] * r[i]![1];
  return s / 2;
}

/** Area of a closed ring on the sphere (m², unsigned). */
export function ringAreaM2(r: Ring): number {
  const n = r.length - 1; // closed: the last point repeats the first
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const prev = r[(i - 1 + n) % n]!, cur = r[i]!, next = r[(i + 1) % n]!;
    total += (rad(next[0]) - rad(prev[0])) * Math.sin(rad(cur[1]));
  }
  return Math.abs((total * R * R) / 2);
}

/** Area of a MultiPolygon (m²): exteriors less their holes. */
export function areaM2(g: MultiPolygonGeom): number {
  let a = 0;
  for (const poly of g.coordinates) poly.forEach((ring, k) => { a += (k === 0 ? 1 : -1) * ringAreaM2(ring); });
  return Math.max(0, a);
}

export function bboxOf(g: MultiPolygonGeom): BBox {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const poly of g.coordinates) for (const p of poly[0] ?? []) { if (p[0] < w) w = p[0]; if (p[0] > e) e = p[0]; if (p[1] < s) s = p[1]; if (p[1] > n) n = p[1]; }
  return [w, s, e, n];
}

export const boxesMeet = (a: BBox, b: BBox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

/** Whether a point lies inside a ring (planar ray casting). */
export function inRing(p: Position, r: Ring): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length - 1; j = i++) {
    const [xi, yi] = r[i]!, [xj, yj] = r[j]!;
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Whether a point lies inside a polygon (inside its exterior and outside every hole). */
export const inPolygon = (p: Position, poly: Ring[]): boolean => !!poly[0] && inRing(p, poly[0]) && poly.slice(1).every(h => !inRing(p, h));

/** Segments ab and cd cross in their interiors (touching at an end point is not crossing). */
function segmentsCross(a: Position, b: Position, c: Position, d: Position): boolean {
  const o = (p: Position, q: Position, r: Position) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function ringsCross(r: Ring, s: Ring): boolean {
  for (let i = 0; i < r.length - 1; i++) for (let j = 0; j < s.length - 1; j++) if (segmentsCross(r[i]!, r[i + 1]!, s[j]!, s[j + 1]!)) return true;
  return false;
}

/**
 * A point well inside the parcel (in its largest part): the centroid of the
 * exterior when it is inside, else the middle of the widest span of a
 * horizontal line through the part. Used to find the region and district a
 * parcel lies in (a crescent's centroid can fall outside it).
 */
export function interiorPoint(g: MultiPolygonGeom): Position {
  let best = g.coordinates[0]!, bestA = -1;
  for (const p of g.coordinates) { const a = Math.abs(planarArea(p[0]!)); if (a > bestA) { bestA = a; best = p; } }
  const ext = best[0]!;
  // Centroid of the exterior ring (planar).
  let cx = 0, cy = 0, a2 = 0;
  for (let i = 0; i < ext.length - 1; i++) {
    const [x0, y0] = ext[i]!, [x1, y1] = ext[i + 1]!;
    const f = x0 * y1 - x1 * y0;
    a2 += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  if (a2 !== 0) {
    const c: Position = [cx / (3 * a2), cy / (3 * a2)];
    if (inPolygon(c, best)) return c;
  }
  // The widest span of horizontal lines at several heights.
  let ys = Infinity, yn = -Infinity;
  for (const p of ext) { if (p[1] < ys) ys = p[1]; if (p[1] > yn) yn = p[1]; }
  let out: Position = ext[0]!, width = -1;
  for (let k = 1; k <= 9; k++) {
    const y = ys + ((yn - ys) * k) / 10;
    const xs: number[] = [];
    for (const ring of best) for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i]!, [x2, y2] = ring[i + 1]!;
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1]! - xs[i]! > width) { width = xs[i + 1]! - xs[i]!; out = [(xs[i]! + xs[i + 1]!) / 2, y]; }
  }
  return out;
}

const cellM2 = (grid: { minY: number; dx: number; dy: number }, row: number) =>
  grid.dx * grid.dy * 111_320 * 111_320 * Math.cos(rad(grid.minY + (row + 0.5) * grid.dy));

/** The overlap of two parcels (m², estimated on a raster over their common box) and the raster's cell size (m). */
export function overlapAreaM2(a: MultiPolygonGeom, b: MultiPolygonGeom, cells = 250_000): { areaM2: number; cellM: number } {
  const ba = bboxOf(a), bb = bboxOf(b);
  if (!boxesMeet(ba, bb)) return { areaM2: 0, cellM: 0 };
  const box: BBox = [Math.max(ba[0], bb[0]), Math.max(ba[1], bb[1]), Math.min(ba[2], bb[2]), Math.min(ba[3], bb[3])];
  if (box[2] <= box[0] || box[3] <= box[1]) return { areaM2: 0, cellM: 0 };
  const grid = gridOver(box, cells);
  const ma = rasterise(a as unknown as Geom, grid), mb = rasterise(b as unknown as Geom, grid);
  let m2 = 0;
  for (let row = 0; row < grid.rows; row++) {
    let n = 0;
    for (let c = 0; c < grid.cols; c++) { const k = row * grid.cols + c; if (ma[k] && mb[k]) n++; }
    if (n) m2 += n * cellM2(grid, row);
  }
  const cellM = Math.sqrt(grid.dx * 111_320 * Math.cos(rad((box[1] + box[3]) / 2)) * grid.dy * 111_320);
  return { areaM2: Math.round(m2 * 100) / 100, cellM: Math.round(cellM * 1000) / 1000 };
}

export interface ReadGeometry { geometry: MultiPolygonGeom; areaM2: number; bbox: BBox; points: number; notes: string[] }

/**
 * Read and check a parcel's outline: GeoJSON (object or text) Polygon,
 * MultiPolygon, or a Feature holding one. Returns the MultiPolygon wound as
 * RFC 7946 asks, its area and box, or the first reason it is not a valid
 * parcel.
 */
export function readParcelGeometry(input: unknown): ReadGeometry | { error: string } {
  let g = input;
  if (typeof g === 'string') {
    if (!g.trim()) return { error: 'Give the parcel\'s outline (a GeoJSON Polygon or MultiPolygon)' };
    try { g = JSON.parse(g); } catch { return { error: 'The outline is not valid GeoJSON' }; }
  }
  if (g && typeof g === 'object' && (g as { type?: string }).type === 'Feature') g = (g as { geometry?: unknown }).geometry;
  const geo = g as { type?: string; coordinates?: unknown } | null;
  if (!geo || (geo.type !== 'Polygon' && geo.type !== 'MultiPolygon') || !Array.isArray(geo.coordinates)) return { error: 'The outline must be a GeoJSON Polygon or MultiPolygon in longitude/latitude' };
  const polys = (geo.type === 'Polygon' ? [geo.coordinates] : geo.coordinates) as unknown[];
  if (!polys.length) return { error: 'The outline has no polygon' };
  const notes: string[] = [];
  let points = 0, rewound = 0;
  const out: Ring[][] = [];
  for (const [pi, rawPoly] of polys.entries()) {
    const part = polys.length > 1 ? ` of part ${pi + 1}` : '';
    if (!Array.isArray(rawPoly) || !rawPoly.length) return { error: `Part ${pi + 1} has no rings` };
    const poly: Ring[] = [];
    for (const [ri, rawRing] of (rawPoly as unknown[]).entries()) {
      const name = ri === 0 ? `The outer ring${part}` : `Hole ${ri}${part}`;
      if (!Array.isArray(rawRing)) return { error: `${name} is not a list of points` };
      const ring: Ring = [];
      for (const p of rawRing as unknown[]) {
        const x = Array.isArray(p) ? Number(p[0]) : NaN, y = Array.isArray(p) ? Number(p[1]) : NaN;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return { error: `${name} has a point that is not two numbers` };
        if (Math.abs(x) > 180 || Math.abs(y) > 90) return { error: `${name} has a point outside longitude −180…180 / latitude −90…90 (coordinates in metres need their coordinate system declared)` };
        const q: Position = [Math.round(x * 1e8) / 1e8, Math.round(y * 1e8) / 1e8];
        const last = ring[ring.length - 1];
        if (!last || last[0] !== q[0] || last[1] !== q[1]) ring.push(q);
      }
      if (ring.length < 2) return { error: `${name} has fewer than three corners` };
      const first = ring[0]!, last = ring[ring.length - 1]!;
      if (first[0] !== last[0] || first[1] !== last[1]) return { error: `${name} is not closed: its last point must repeat its first` };
      if (ring.length < 4) return { error: `${name} has fewer than three corners` };
      points += ring.length;
      if (points > MAX_PARCEL_POINTS) return { error: `The outline has more than ${MAX_PARCEL_POINTS.toLocaleString('en')} points` };
      const crossing = ringKinks(ring, 1)[0];
      if (crossing) return { error: `${name} crosses itself near ${crossing[1].toFixed(6)}, ${crossing[0].toFixed(6)} (latitude, longitude)` };
      const a = planarArea(ring);
      if (a === 0) return { error: `${name} has no area` };
      if ((ri === 0) !== (a > 0)) { ring.reverse(); rewound++; }
      poly.push(ring);
    }
    out.push(poly);
  }
  if (rewound) notes.push(`${rewound} ring${rewound === 1 ? '' : 's'} rewound (outer rings anticlockwise, holes clockwise)`);
  const geometry: MultiPolygonGeom = { type: 'MultiPolygon', coordinates: out };
  const kinks = kinksOf(geometry as unknown as Geom, 1);
  if (kinks.length) return { error: `The outline crosses itself near ${kinks[0]![1].toFixed(6)}, ${kinks[0]![0].toFixed(6)} (latitude, longitude)` };
  for (const [pi, poly] of out.entries()) {
    for (let h = 1; h < poly.length; h++) {
      if (ringsCross(poly[0]!, poly[h]!)) return { error: `Hole ${h} crosses the outer ring${out.length > 1 ? ` of part ${pi + 1}` : ''}` };
      if (!poly[h]!.slice(0, -1).every(p => inRing(p, poly[0]!) || poly[0]!.some(q => q[0] === p[0] && q[1] === p[1]))) return { error: `Hole ${h} is not inside its outer ring` };
      for (let k = h + 1; k < poly.length; k++) if (ringsCross(poly[h]!, poly[k]!)) return { error: `Holes ${h} and ${k} cross each other` };
    }
  }
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const a: MultiPolygonGeom = { type: 'MultiPolygon', coordinates: [out[i]!] }, b: MultiPolygonGeom = { type: 'MultiPolygon', coordinates: [out[j]!] };
    if (boxesMeet(bboxOf(a), bboxOf(b)) && (ringsCross(out[i]![0]!, out[j]![0]!) || overlapAreaM2(a, b, 40_000).areaM2 > 0.01)) return { error: `Parts ${i + 1} and ${j + 1} overlap: a parcel's parts must not` };
  }
  const area = areaM2(geometry);
  if (area < 1) return { error: 'The parcel has less than 1 m² of area' };
  if (area > MAX_PARCEL_KM2 * 1e6) return { error: `The parcel covers more than ${MAX_PARCEL_KM2} km²` };
  return { geometry, areaM2: Math.round(area * 100) / 100, bbox: bboxOf(geometry), points, notes };
}

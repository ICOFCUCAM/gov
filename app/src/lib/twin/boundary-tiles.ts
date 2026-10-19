// The nation's boundaries as vector tiles (architecture review G4, R13):
// /api/twin/tiles/boundaries/{z}/{x}/{y}.mvt, Mapbox Vector Tiles (MVT 2.1,
// the platform's encoder in lib/geo/mvt.ts) with three polygon layers:
//
//   regions   the official subdivisions (level 1)
//   districts the districts (level 2), from zoom DISTRICT_MIN_ZOOM
//   disputed  disputed territory near the nation, drawn as the nation's
//             worldview says (lib/map/disputed.ts): with the neutral default
//             every area is `disputed: true` and `shownAs: "disputed"`;
//             only when the nation chose a point of view in setup
//             (map.worldview) is an area that view gives to a country marked
//             `shownAs: <that country>`. The platform never chooses a side.
//             Clients draw it above the regions, as DisputedLayer does.
//
// Shapes are read the way every map reads them, through loadNationGeography()
// and loadDistricts() (lib/map/geography.ts): a boundary version the mapping
// authority published replaces the bundled shapes from its validFrom date,
// and districts installed for the nation apply. The tiles are cut and cached
// per boundary version: the version key (nation, the version in force for
// each level, the installed districts, the worldview) is worked out on every
// request, so a version that comes into force (published, or its date
// reached), a withdrawn one, new districts or a changed worldview drop the
// cache and change every tile's ETag at once.
//
// Same reading rules as the facility tiles: behind the official's session,
// or a GIS client's integration key / access token of scope ogc:read
// (machineReadRefusal(), BEARER_READS in lib/auth/roles.ts).

import { createHash } from 'node:crypto';
import type { Geom } from '@/lib/geo/admin1';
import { EXTENT, encodeTile, tileBounds, validTile, type TileShape } from '@/lib/geo/mvt';
import { loadDistricts, loadNationGeography } from '@/lib/map/geography';
import { activeBoundary } from '@/lib/map/boundary-active';
import { installedDistrictsSummary } from '@/lib/map/districts-installed';
import { disputedAreas, disputeText, worldviewLabel } from '@/lib/map/disputed';
import { nationIso3, nationWorldview } from '@/lib/nation/registry';

export const BOUNDARY_LAYERS = { regions: 'regions', districts: 'districts', disputed: 'disputed' } as const;
export const BOUNDARY_MIN_ZOOM = 0;
export const BOUNDARY_MAX_ZOOM = 14;
/** Districts are in tiles from this zoom (below it they are too small to tell apart). */
export const DISTRICT_MIN_ZOOM = 5;
/** Tile units kept around each tile so outlines are not cut at its edge. */
export const BOUNDARY_BUFFER = 64;
const CACHE_TILES = 2048;

export const BOUNDARY_FIELDS = {
  regions: { code: 'Official code (ISO 3166-2)', name: 'Name the nation uses', level: 'Level (1)' },
  districts: { code: 'District code', name: 'Name', parent: 'Region code it lies in', level: 'Level (2)' },
  disputed: {
    id: 'Disputed area id (Natural Earth)', name: 'Name', note: 'Who administers it and who claims it', disputed: 'true unless the nation\'s chosen point of view gives it to a country',
    shownAs: '"disputed", or the country (platform code) the nation\'s chosen point of view gives it to', parties: 'Countries that administer, claim or are given it (comma-separated)', text: 'How it is drawn and why',
  },
} as const;

type BBox = [number, number, number, number];
interface Shape { id: number; bbox: BBox; polygons: number[][][][]; properties: TileShape['properties'] }
interface Prepared { key: string; iso3: string | null; worldview: string; credit: string; regions: Shape[]; districts: Shape[]; disputed: Shape[]; bounds: BBox | null; version: { regions?: string; districts?: string } }
interface Cache { key: string; prepared: Promise<Prepared>; tiles: Map<string, { bytes: Uint8Array; features: number }> }

// Derived from the stores, never persisted: not a __civicos key.
const g = globalThis as unknown as { __boundaryTileCache?: Cache };

const polygonsOf = (geom: Geom | null | undefined): number[][][][] =>
  !geom ? [] : geom.type === 'Polygon' ? [geom.coordinates as number[][][]] : (geom.coordinates as number[][][][]);

function bboxOfPolygons(ps: number[][][][]): BBox {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of ps) for (const r of p) for (const c of r) { const x = c[0]!, y = c[1]!; if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }
  return [w, s, e, n];
}
const meets = (a: BBox, b: BBox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

/** What the tiles are cut from right now: changes when another boundary version comes into force, districts are installed or removed, or the worldview changes. */
export async function boundaryVersionKey(): Promise<string> {
  const iso3 = nationIso3() ?? null;
  if (!iso3) return 'none';
  const [one, two, installed] = await Promise.all([activeBoundary(iso3, 1), activeBoundary(iso3, 2), installedDistrictsSummary(iso3)]);
  return [iso3, `r:${one ? `${one.id}@${one.validFrom}` : 'bundled'}`, `d:${two ? `${two.id}@${two.validFrom}` : installed ? `installed@${installed.installedAt}` : 'bundled'}`, `w:${nationWorldview()}`].join('|');
}

async function prepare(key: string): Promise<Prepared> {
  const iso3 = nationIso3() ?? null, worldview = nationWorldview();
  if (!iso3) return { key, iso3, worldview, credit: 'No nation installed', regions: [], districts: [], disputed: [], bounds: null, version: {} };
  const [geo, dist, one, two] = await Promise.all([loadNationGeography(iso3, [], 'full'), loadDistricts(iso3, undefined, 'full'), activeBoundary(iso3, 1), activeBoundary(iso3, 2)]);
  let n = 0;
  const regions: Shape[] = (geo?.units ?? []).filter(u => u.geometry).map(u => {
    const polygons = polygonsOf(u.geometry);
    return { id: ++n, bbox: bboxOfPolygons(polygons), polygons, properties: { code: u.code, name: u.name, level: 1 } };
  });
  const districts: Shape[] = (dist?.units ?? []).filter(u => u.geometry).map(u => {
    const polygons = polygonsOf(u.geometry);
    return { id: ++n, bbox: bboxOfPolygons(polygons), polygons, properties: { code: u.code, name: u.name, parent: u.parent, level: 2 } };
  });
  const all = [...regions, ...districts].map(s => s.bbox);
  const bounds: BBox | null = all.length ? [Math.min(...all.map(b => b[0])), Math.min(...all.map(b => b[1])), Math.max(...all.map(b => b[2])), Math.max(...all.map(b => b[3]))] : null;
  // Disputed areas near the nation (within a degree of its extent), as its worldview draws them.
  const near: BBox | null = bounds ? [bounds[0] - 1, bounds[1] - 1, bounds[2] + 1, bounds[3] + 1] : null;
  const disputed: Shape[] = near ? disputedAreas(worldview).flatMap(a => {
    const polygons = polygonsOf(a.geometry), bbox = bboxOfPolygons(polygons);
    if (!meets(bbox, near)) return [];
    return [{ id: ++n, bbox, polygons, properties: {
      id: a.id, name: a.name, note: a.note ?? undefined, disputed: a.shownAs === 'disputed', shownAs: a.shownAs, parties: a.parties.join(','), text: disputeText(a, worldview),
    } }];
  }) : [];
  const dCredit = dist ? dist.own ?? `${dist.credit.source}${dist.credit.licence ? ` (${dist.credit.licence})` : ''}` : null;
  return {
    key, iso3, worldview, regions, districts, disputed, bounds,
    credit: [geo?.credit, dCredit, disputed.length ? 'Disputed areas: Natural Earth (public domain)' : null].filter(Boolean).join('; '),
    version: { ...(one ? { regions: `version ${one.n} in force from ${one.validFrom}` } : {}), ...(two ? { districts: `version ${two.n} in force from ${two.validFrom}` } : {}) },
  };
}

/** The prepared shapes for the boundaries in force now (cut again only when the version key changes). */
async function current(): Promise<Cache> {
  const key = await boundaryVersionKey();
  if (!g.__boundaryTileCache || g.__boundaryTileCache.key !== key) {
    const prepared = prepare(key);
    g.__boundaryTileCache = { key, prepared, tiles: new Map() };
    prepared.catch(() => { if (g.__boundaryTileCache?.key === key) g.__boundaryTileCache = undefined; });
  }
  return g.__boundaryTileCache;
}

/** Forget the cut tiles (tests). */
export function resetBoundaryTiles(): void { g.__boundaryTileCache = undefined; }

// ── Cutting shapes to a tile ──────────────────────────────────────────────

const MAX_LAT = 85.0511287798066;
function project(lng: number, lat: number, z: number, x: number, y: number): [number, number] {
  const n = 2 ** z, phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return [(((lng + 180) / 360) * n - x) * EXTENT, (((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n - y) * EXTENT];
}

/** Sutherland–Hodgman: a closed ring clipped to the box lo…hi on both axes. */
export function clipRing(ring: [number, number][], lo: number, hi: number): [number, number][] {
  let out = ring;
  const edges: [(p: [number, number]) => boolean, (a: [number, number], b: [number, number]) => [number, number]][] = [
    [p => p[0] >= lo, (a, b) => [lo, a[1] + ((b[1] - a[1]) * (lo - a[0])) / (b[0] - a[0])]],
    [p => p[0] <= hi, (a, b) => [hi, a[1] + ((b[1] - a[1]) * (hi - a[0])) / (b[0] - a[0])]],
    [p => p[1] >= lo, (a, b) => [a[0] + ((b[0] - a[0]) * (lo - a[1])) / (b[1] - a[1]), lo]],
    [p => p[1] <= hi, (a, b) => [a[0] + ((b[0] - a[0]) * (hi - a[1])) / (b[1] - a[1]), hi]],
  ];
  for (const [inside, cross] of edges) {
    if (!out.length) break;
    const next: [number, number][] = [];
    for (let i = 0; i < out.length; i++) {
      const cur = out[i]!, prev = out[(i + out.length - 1) % out.length]!;
      const ci = inside(cur), pi = inside(prev);
      if (ci) { if (!pi) next.push(cross(prev, cur)); next.push(cur); }
      else if (pi) next.push(cross(prev, cur));
    }
    out = next;
  }
  return out;
}

/** Twice the signed area by the surveyor's formula (tile coordinates, y down). */
export const ringArea2 = (r: readonly [number, number][]) => {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const p = r[i]!, q = r[(i + 1) % r.length]!; a += p[0] * q[1] - q[0] * p[1]; }
  return a;
};

/** One shape's rings in a tile: projected, clipped to the tile and its buffer, rounded, oriented (exteriors positive, holes negative). */
function cut(polygons: number[][][][], z: number, x: number, y: number): [number, number][][] {
  const lo = -BOUNDARY_BUFFER, hi = EXTENT + BOUNDARY_BUFFER, rings: [number, number][][] = [];
  for (const poly of polygons) {
    let outerKept = false;
    poly.forEach((ring, k) => {
      if (k > 0 && !outerKept) return;
      const pts: [number, number][] = [];
      for (const c of ring) pts.push(project(c[0]!, c[1]!, z, x, y));
      if (pts.length > 1 && pts[0]![0] === pts[pts.length - 1]![0] && pts[0]![1] === pts[pts.length - 1]![1]) pts.pop();
      const clipped = clipRing(pts, lo, hi);
      const r: [number, number][] = [];
      for (const p of clipped) {
        const q: [number, number] = [Math.round(p[0]), Math.round(p[1])];
        const last = r[r.length - 1];
        if (!last || last[0] !== q[0] || last[1] !== q[1]) r.push(q);
      }
      while (r.length > 1 && r[0]![0] === r[r.length - 1]![0] && r[0]![1] === r[r.length - 1]![1]) r.pop();
      const a = r.length >= 3 ? ringArea2(r) : 0;
      if (!a) return;
      if ((k === 0) !== (a > 0)) r.reverse();
      rings.push(r);
      if (k === 0) outerKept = true;
    });
  }
  return rings;
}

function layerShapes(shapes: readonly Shape[], z: number, x: number, y: number, box: BBox): TileShape[] {
  const out: TileShape[] = [];
  for (const s of shapes) {
    if (!meets(s.bbox, box)) continue;
    const rings = cut(s.polygons, z, x, y);
    if (rings.length) out.push({ id: s.id, type: 'polygon', rings, properties: s.properties });
  }
  return out;
}

/** Parse "{z}/{x}/{y}" (y may end in .mvt or .pbf) within the boundary tiles' zoom range. */
export function parseBoundaryTile(z: string, x: string, y: string): { z: number; x: number; y: number } | null {
  const yy = y.replace(/\.(mvt|pbf)$/i, '');
  if (![z, x, yy].every(s => /^\d{1,8}$/.test(s))) return null;
  const t = { z: Number(z), x: Number(x), y: Number(yy) };
  return validTile(t.z, t.x, t.y, BOUNDARY_MAX_ZOOM) ? t : null;
}

/** One boundary tile: its bytes, the version key and an ETag that changes with the boundaries in force. */
export async function boundaryTile(z: number, x: number, y: number): Promise<{ bytes: Uint8Array; etag: string; version: string; features: number }> {
  const c = await current();
  const p = await c.prepared;
  const k = `${z}/${x}/${y}`;
  const etag = `"${createHash('sha256').update(`${c.key}|${k}`).digest('hex').slice(0, 32)}"`;
  let t = c.tiles.get(k);
  if (!t) {
    const box = tileBounds(z, x, y, BOUNDARY_BUFFER);
    const layers = [
      { name: BOUNDARY_LAYERS.regions, points: [], shapes: layerShapes(p.regions, z, x, y, box) },
      { name: BOUNDARY_LAYERS.districts, points: [], shapes: z >= DISTRICT_MIN_ZOOM ? layerShapes(p.districts, z, x, y, box) : [] },
      { name: BOUNDARY_LAYERS.disputed, points: [], shapes: layerShapes(p.disputed, z, x, y, box) },
    ];
    t = { bytes: encodeTile(layers), features: layers.reduce((n, l) => n + l.shapes.length, 0) };
    if (c.tiles.size >= CACHE_TILES) c.tiles.delete(c.tiles.keys().next().value!);
    c.tiles.set(k, t);
  } else { c.tiles.delete(k); c.tiles.set(k, t); } // most recently used last
  return { ...t, etag, version: c.key };
}

/** TileJSON 3.0.0 describing the boundary tiles. */
export async function boundaryTileJson(origin: string) {
  const c = await current();
  const p = await c.prepared;
  const b = p.bounds ?? [-180, -85.0511, 180, 85.0511];
  return {
    tilejson: '3.0.0',
    name: 'National boundaries',
    description: `The nation's official subdivisions and districts in force (as every map draws them), and disputed territory near the nation drawn as its worldview says: ${worldviewLabel(p.worldview)}. Draw the "disputed" layer above the others.`,
    version: '1.0.0',
    scheme: 'xyz',
    tiles: [`${origin}/api/twin/tiles/boundaries/{z}/{x}/{y}.mvt`],
    minzoom: BOUNDARY_MIN_ZOOM,
    maxzoom: BOUNDARY_MAX_ZOOM,
    bounds: b,
    center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 5],
    attribution: p.credit,
    boundaryVersion: { key: c.key, ...p.version },
    worldview: p.worldview,
    vector_layers: [
      { id: BOUNDARY_LAYERS.regions, description: `Official subdivisions (${p.regions.length})`, minzoom: BOUNDARY_MIN_ZOOM, maxzoom: BOUNDARY_MAX_ZOOM, fields: BOUNDARY_FIELDS.regions },
      { id: BOUNDARY_LAYERS.districts, description: `Districts (${p.districts.length})`, minzoom: DISTRICT_MIN_ZOOM, maxzoom: BOUNDARY_MAX_ZOOM, fields: BOUNDARY_FIELDS.districts },
      { id: BOUNDARY_LAYERS.disputed, description: `Disputed territory near the nation (${p.disputed.length}), never assigned to a side unless the nation chose a point of view`, minzoom: BOUNDARY_MIN_ZOOM, maxzoom: BOUNDARY_MAX_ZOOM, fields: BOUNDARY_FIELDS.disputed },
    ],
  };
}

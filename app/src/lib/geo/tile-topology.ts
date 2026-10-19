// Boundaries simplified per tile zoom, keeping their topology (architecture
// review G4; used by lib/twin/boundary-tiles.ts).
//
// A boundary tile at a low zoom does not need the full-detail district file:
// most of its vertices fall within a fraction of one tile unit of each other.
// Simplifying each shape on its own would open slivers between neighbours
// (each side of a shared border drops different points), so the shapes of
// every layer are first turned into one topology (topojson-server: every
// border two shapes share becomes one arc, also across layers where the
// coordinates coincide), in Web Mercator world units (0–1, the tiles' own
// projection). Each arc's points get Visvalingam weights once (planar
// triangle area in world units², topojson-simplify `presimplify`), and a
// zoom keeps the points whose weight is at least its tolerance:
//
//   (SIMPLIFY_TILE_UNITS × one tile unit at that zoom)²
//
// A shared border is one arc, so both neighbours get exactly the same points
// at every zoom: no gaps and no overlaps. Arc ends (where three shapes meet,
// or a coast meets a border) are always kept, and every ring keeps at least
// three distinct points at every zoom (the strongest points of a ring that
// would collapse are kept on its arcs, so a neighbour sharing them keeps them
// too), so no unit and no island disappears. Pure: no I/O.

import { topology } from 'topojson-server';
import { presimplify } from 'topojson-simplify';
import { EXTENT } from './mvt';

/** Tolerance in tile units (4,096 a tile; 4 is half a pixel of a tile drawn 512 px wide): a point is dropped while the triangle it makes with its neighbours is smaller than this side squared. */
export const SIMPLIFY_TILE_UNITS = 4;
/** World units (Web Mercator, 0–1) per tile unit at a zoom. */
export const tileUnit = (z: number) => 1 / (2 ** z * EXTENT);
/** The smallest weight a point keeps at a zoom (world units²). */
export const zoomTolerance = (z: number, units = SIMPLIFY_TILE_UNITS) => (units * tileUnit(z)) ** 2;

const MAX_LAT = 85.0511287798066;
/** Longitude/latitude to Web Mercator world units (x right, y down, 0–1). */
export function toWorld(lng: number, lat: number): [number, number] {
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return [(lng + 180) / 360, (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2];
}

/** A polygon as rings of arc references (topojson: ~i is arc i reversed). */
type ArcPolygon = number[][];
type WPt = [number, number, number];
export type WorldPolygon = [number, number][][];

export interface TileTopology {
  /** Shapes per layer, in the input order: their polygons as arc references (empty for a shape with no area). */
  layers: Record<string, ArcPolygon[][]>;
  /** Number of points in the input and in the arcs (shared borders once). */
  vertices: { input: number; arcs: number };
  /** The shape's polygons at a tile zoom, in world units (rings closed: last point = first). */
  polygons(layer: string, index: number, z: number): WorldPolygon[];
  /** Points kept over all arcs at a zoom (each shared border once). */
  verticesAt(z: number): number;
}

/**
 * One topology for several layers of polygons given in longitude/latitude
 * (GeoJSON Polygon / MultiPolygon coordinates: polygons → rings → [lng, lat]).
 */
export function buildTileTopology(input: Record<string, number[][][][][]>, o: { units?: number } = {}): TileTopology {
  let inputVertices = 0;
  const objects: Record<string, unknown> = {};
  for (const [name, shapes] of Object.entries(input)) {
    objects[name] = {
      type: 'GeometryCollection',
      geometries: shapes.map(polys => {
        const coordinates = polys.map(poly => poly.map(ring => ring.map(c => { inputVertices++; return toWorld(c[0]!, c[1]!); })));
        return coordinates.length ? { type: 'MultiPolygon', coordinates } : { type: null };
      }),
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = topology(objects as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pre = presimplify(topo as any);
  const arcs = pre.arcs as unknown as WPt[][];
  const layers: Record<string, ArcPolygon[][]> = {};
  for (const name of Object.keys(input)) {
    const geoms = ((topo.objects as Record<string, { geometries: { type: string | null; arcs?: number[][] | number[][][] }[] }>)[name]?.geometries) ?? [];
    layers[name] = geoms.map(g => (g.type === 'Polygon' ? [g.arcs as ArcPolygon] : g.type === 'MultiPolygon' ? (g.arcs as ArcPolygon[]) : []));
  }
  const rings: number[][] = [];
  for (const shapes of Object.values(layers)) for (const polys of shapes) for (const poly of polys) for (const ring of poly) rings.push(ring);
  const arcVertices = arcs.reduce((s, a) => s + a.length, 0);

  // Per zoom: each arc's kept points (computed once a zoom is asked for).
  const byZoom = new Map<number, [number, number][][]>();
  const arcsAt = (z: number): [number, number][][] => {
    let got = byZoom.get(z);
    if (got) return got;
    const t = zoomTolerance(z, o.units);
    const extra = new Map<number, Set<number>>();
    const keeps = (a: number, i: number) => arcs[a]![i]![2] >= t || !!extra.get(a)?.has(i);
    for (const ring of rings) {
      // Distinct points of the ring that stay: every arc's kept points but its first (the previous arc's last).
      let kept = 0;
      for (const ref of ring) { const a = ref < 0 ? ~ref : ref, arc = arcs[a]!; for (let i = 1; i < arc.length; i++) if (keeps(a, i)) kept++; }
      if (kept >= 3) continue;
      // Too few: keep the ring's strongest dropped points on their arcs (so a neighbour sharing them keeps them too).
      const cands: { a: number; i: number; w: number }[] = [];
      for (const ref of ring) { const a = ref < 0 ? ~ref : ref, arc = arcs[a]!; for (let i = 1; i < arc.length - 1; i++) if (!keeps(a, i)) cands.push({ a, i, w: arc[i]![2] }); }
      cands.sort((p, q) => q.w - p.w);
      for (const c of cands.slice(0, 3 - kept)) { const s = extra.get(c.a) ?? new Set<number>(); s.add(c.i); extra.set(c.a, s); }
    }
    got = arcs.map((arc, a) => {
      const out: [number, number][] = [];
      for (let i = 0; i < arc.length; i++) if (keeps(a, i)) out.push([arc[i]![0], arc[i]![1]]);
      return out;
    });
    byZoom.set(z, got);
    return got;
  };

  return {
    layers,
    vertices: { input: inputVertices, arcs: arcVertices },
    polygons(layer, index, z) {
      const polys = layers[layer]?.[index];
      if (!polys?.length) return [];
      const kept = arcsAt(z);
      return polys.map(poly => poly.map(ring => {
        const out: [number, number][] = [];
        ring.forEach((ref, k) => {
          const arc = ref < 0 ? [...kept[~ref]!].reverse() : kept[ref]!;
          for (let i = k === 0 ? 0 : 1; i < arc.length; i++) out.push(arc[i]!);
        });
        return out;
      }));
    },
    verticesAt(z) { return arcsAt(z).reduce((s, a) => s + a.length, 0); },
  };
}

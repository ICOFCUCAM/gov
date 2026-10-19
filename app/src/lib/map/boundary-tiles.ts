// Boundary vector tiles on the client (architecture review G4, register
// 16.24): a console map with many units (an opened region with hundreds of
// districts, a nation whose regions are its districts) draws their shapes
// from the platform's boundary tiles (/api/twin/tiles/boundaries/{z}/{x}/{y}.mvt,
// cut from the boundaries in force through loadNationGeography() /
// loadDistricts() and simplified per zoom on one topology, so neighbours meet
// without gaps) for the part of the map in view, instead of every vertex of
// the full shapes. The tiles are read only from the platform.
//
// Each tile's polygons are clipped back to the tile's own box (the tiles
// carry a buffer, so neighbouring tiles overlap), turned into longitude /
// latitude and grouped by unit code across tiles. The fill of a unit is its
// pieces together (they meet at tile edges without overlapping); its outline
// is every edge of those pieces except the ones lying on a tile's edge, so no
// seam is stroked where a unit crosses from one tile into the next. The map
// keeps its own units, names, figures, drill-down and disputed territory; the
// tiles only replace the drawing of the units they carry (matched by code).

import { EXTENT, clipRing, decodeTile, fromTile } from '@/lib/geo/mvt';
import { tileKey, type TileAddress, type TileSource } from './tile-loader';

/** The platform's boundary tiles (viewer session, same origin). */
export const BOUNDARY_TILES: TileSource = { kind: 'xyz', url: '/api/twin/tiles/boundaries/{z}/{x}/{y}.mvt' };
/** A map draws its units from the boundary tiles above this many units (the SVG of the full shapes below it). */
export const BOUNDARY_TILE_UNITS = 300;
/** Districts are in the tiles from this zoom (lib/twin/boundary-tiles.ts DISTRICT_MIN_ZOOM). */
export const BOUNDARY_DISTRICT_ZOOM = 5;
export const BOUNDARY_MAX_ZOOM = 14;
/** The tiles' unit layers (the disputed layer is drawn by DisputedLayer, as on every map). */
export const BOUNDARY_UNIT_LAYERS = ['regions', 'districts'] as const;

/** One unit's part of a tile, in longitude/latitude: rings to fill and the edges to stroke. */
export interface UnitPiece { code: string; layer: string; rings: [number, number][][]; edges: [number, number][][] }
/** Units drawn from tiles: per code, the rings to fill and the edges to stroke (longitude/latitude). */
export type TileUnits = Map<string, { rings: [number, number][][]; edges: [number, number][][] }>;

const onBorder = (a: [number, number], b: [number, number]) =>
  (a[0] === 0 && b[0] === 0) || (a[0] === EXTENT && b[0] === EXTENT) || (a[1] === 0 && b[1] === 0) || (a[1] === EXTENT && b[1] === EXTENT);

/**
 * The unit polygons of one decoded boundary tile, clipped to the tile's own
 * box: rings to fill and edges to stroke (edges along the tile's box left
 * out), in longitude/latitude.
 */
export function unitPiecesOf(bytes: Uint8Array, t: TileAddress, layers: readonly string[] = BOUNDARY_UNIT_LAYERS): UnitPiece[] {
  const out: UnitPiece[] = [];
  for (const l of decodeTile(bytes)) {
    if (!layers.includes(l.name)) continue;
    const scale = EXTENT / (l.extent || EXTENT);
    for (const f of l.features) {
      const code = f.properties.code;
      if (f.type !== 3 || typeof code !== 'string' || !f.rings?.length) continue;
      const rings: [number, number][][] = [], edges: [number, number][][] = [];
      for (const raw of f.rings) {
        const r = clipRing(raw.map(p => [p[0] * scale, p[1] * scale] as [number, number]), 0, EXTENT);
        if (r.length < 3) continue;
        rings.push(r.map(p => fromTile(p[0], p[1], t.z, t.x, t.y)));
        // The ring's edges as runs of consecutive edges not lying on the tile's box.
        let run: [number, number][] = [];
        // Where this ring's first run went, when it starts at the ring's first point (the last run may continue it).
        const startsAt = onBorder(r[0]!, r[1 % r.length]!) ? -1 : edges.length;
        let broken = false;
        for (let i = 0; i < r.length; i++) {
          const a = r[i]!, b = r[(i + 1) % r.length]!;
          if (onBorder(a, b)) { broken = true; if (run.length > 1) edges.push(run); run = []; continue; }
          if (!run.length) run.push(fromTile(a[0], a[1], t.z, t.x, t.y));
          run.push(fromTile(b[0], b[1], t.z, t.x, t.y));
        }
        if (run.length > 1) {
          // The last run ends where the first began: one line, so the outline has no break there.
          if (broken && startsAt >= 0 && edges[startsAt]) edges[startsAt] = [...run, ...edges[startsAt]!.slice(1)];
          else edges.push(run);
        }
      }
      if (rings.length) out.push({ code, layer: l.name, rings, edges });
    }
  }
  return out;
}

/** Pieces of several tiles grouped by unit code. */
export function mergeUnitPieces(sets: readonly (readonly UnitPiece[])[]): TileUnits {
  const m: TileUnits = new Map();
  for (const s of sets) for (const p of s) {
    const u = m.get(p.code);
    if (u) { u.rings.push(...p.rings); u.edges.push(...p.edges); } else m.set(p.code, { rings: [...p.rings], edges: [...p.edges] });
  }
  return m;
}

/** An SVG path of rings (closed) and edges (open) projected with a map's projection; points off the projection are left out. */
export function tilePath(rings: readonly [number, number][][], project: (lng: number, lat: number) => [number, number] | null, closed: boolean): string {
  const parts: string[] = [];
  for (const r of rings) {
    const pts: string[] = [];
    for (const c of r) { const q = project(c[0], c[1]); if (q) pts.push(`${q[0].toFixed(1)} ${q[1].toFixed(1)}`); }
    if (pts.length >= (closed ? 3 : 2)) parts.push(`M ${pts.join(' L ')}${closed ? ' Z' : ''}`);
  }
  return parts.join(' ');
}

/** Recent boundary tiles' pieces, least recently used dropped first. */
export class PieceCache {
  private m = new Map<string, Promise<UnitPiece[]>>();
  constructor(private max = 256) {}
  get(k: string, load: () => Promise<UnitPiece[]>): Promise<UnitPiece[]> {
    let p = this.m.get(k);
    if (p) { this.m.delete(k); this.m.set(k, p); return p; }
    p = load();
    this.m.set(k, p);
    p.catch(() => this.m.delete(k));
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
    return p;
  }
  get size(): number { return this.m.size; }
}

/** Load the unit pieces of the tiles covering a view and group them by unit. */
export async function loadUnitTiles(tiles: readonly TileAddress[], o: { fetch: (t: TileAddress) => Promise<Uint8Array | null>; cache: PieceCache }): Promise<{ units: TileUnits; tiles: number }> {
  const sets = await Promise.all(tiles.map(t => o.cache.get(tileKey(t), async () => {
    const b = await o.fetch(t);
    return b ? unitPiecesOf(b, t) : [];
  })));
  return { units: mergeUnitPieces(sets), tiles: tiles.length };
}

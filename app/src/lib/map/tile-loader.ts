// Vector tiles on the client (architecture review G4, R13): which Web
// Mercator tiles cover what a map shows, at a tile zoom fine enough for its
// scale; fetching them from the platform's own tile route
// (/api/twin/tiles/facilities/{z}/{x}/{y}.mvt, viewer-aware: the server
// generalises restricted sites) or from a PMTiles archive by range requests
// (/api/twin/tiles/facilities.pmtiles, or a copy on an air-gapped
// installation's own server); decoding them (lib/geo/mvt.ts) into features
// with longitude/latitude; and keeping recent tiles in a small cache. Nothing
// is fetched from outside the platform. A tile the server cut short (more
// than its point limit) is replaced by its four children.

import { decodeTile, fromTile, type Prop } from '@/lib/geo/mvt';
import { ArchiveChanged, PMTilesReader, httpSource } from '@/lib/geo/pmtiles';
import type { MapTone } from './model';

export interface TileFeature { key: string; lng: number; lat: number; props: Record<string, Prop> }
export type TileSource = { kind: 'xyz'; url: string } | { kind: 'pmtiles'; url: string };
export interface TileAddress { z: number; x: number; y: number }

/** The most points the platform puts in one tile (lib/twin/tiles.ts MAX_TILE_POINTS). */
export const TILE_POINT_LIMIT = 50_000;
const MAX_LAT = 85.0511287798066;

export function lngLatToTile(lng: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n);
  return [Math.max(0, Math.min(n - 1, x)), Math.max(0, Math.min(n - 1, y))];
}

/** Tiles at zoom z covering a [west, south, east, north] box (west > east crosses the antimeridian). */
export function tilesForBounds(b: readonly [number, number, number, number], z: number): TileAddress[] {
  const [w, s, e, n] = b;
  const spans: [number, number][] = w <= e ? [[w, e]] : [[w, 180], [-180, e]];
  const out: TileAddress[] = [];
  for (const [a, c] of spans) {
    const [x0, y0] = lngLatToTile(a, n, z), [x1, y1] = lngLatToTile(c, s, z);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ z, x, y });
  }
  return out;
}

/**
 * The tile zoom for a map drawing `pxPerDegree` screen pixels per degree of
 * longitude: the lowest zoom whose tile grid (4,096 units a tile) places a
 * point within half a screen pixel, between minZoom and maxZoom; lowered
 * while the box would need more than maxTiles tiles.
 */
export function chooseTiles(bounds: readonly [number, number, number, number], pxPerDegree: number, o: { minZoom?: number; maxZoom?: number; maxTiles?: number } = {}): { z: number; tiles: TileAddress[] } {
  const minZ = o.minZoom ?? 0, maxZ = o.maxZoom ?? 14, maxTiles = o.maxTiles ?? 64;
  let z = Math.ceil(Math.log2(Math.max(1e-9, (360 * pxPerDegree) / 2048)));
  z = Math.max(minZ, Math.min(maxZ, Number.isFinite(z) ? z : minZ));
  let tiles = tilesForBounds(bounds, z);
  while (tiles.length > maxTiles && z > minZ) { z--; tiles = tilesForBounds(bounds, z); }
  return { z, tiles };
}

export const tileKey = (t: TileAddress) => `${t.z}/${t.x}/${t.y}`;
export const childrenOf = (t: TileAddress): TileAddress[] => [0, 1, 2, 3].map(k => ({ z: t.z + 1, x: t.x * 2 + (k & 1), y: t.y * 2 + (k >> 1) }));

/** A tile's features with their longitude/latitude; the key is the feature's id property when it has one. */
export function featuresOf(bytes: Uint8Array, t: TileAddress, layer: string): TileFeature[] {
  const l = decodeTile(bytes).find(x => x.name === layer);
  if (!l) return [];
  const out: TileFeature[] = [];
  for (const f of l.features) {
    const g = f.geometry[0];
    if (f.type !== 1 || !g) continue;
    const [lng, lat] = fromTile(g[0], g[1], t.z, t.x, t.y, l.extent);
    out.push({ key: typeof f.properties.id === 'string' ? f.properties.id : f.id != null ? String(f.id) : `${lng.toFixed(6)},${lat.toFixed(6)}`, lng, lat, props: f.properties });
  }
  return out;
}

/** Features of several tiles, each once (a point near a tile's edge is in its neighbour's buffer too). */
export function mergeFeatures(sets: readonly (readonly TileFeature[])[]): TileFeature[] {
  const seen = new Set<string>(), out: TileFeature[] = [];
  for (const s of sets) for (const f of s) { if (seen.has(f.key)) continue; seen.add(f.key); out.push(f); }
  return out;
}

export interface LoadedTile { features: TileFeature[]; truncated: boolean }

/** One tile's bytes (null when there is none there); `truncated` when the server cut it at its point limit. */
export type FetchTile = (t: TileAddress, version?: string) => Promise<(Uint8Array & { truncated?: boolean }) | null>;

/** Fetches one tile from a source. */
export function tileFetcher(source: TileSource, fetchImpl: typeof fetch = (...a) => fetch(...a)): FetchTile {
  if (source.kind === 'pmtiles') {
    let reader = new PMTilesReader(httpSource(source.url, fetchImpl, { credentials: 'same-origin' }));
    return async (t: TileAddress) => {
      try { return await reader.tile(t.z, t.x, t.y); }
      catch (e) {
        // A rebuilt archive: start again from its new header, once.
        if (!(e instanceof ArchiveChanged)) throw e;
        reader = new PMTilesReader(httpSource(source.url, fetchImpl, { credentials: 'same-origin' }));
        return reader.tile(t.z, t.x, t.y);
      }
    };
  }
  return async (t: TileAddress, version?: string) => {
    const url = source.url.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)) + (version ? `${source.url.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}` : '');
    const r = await fetchImpl(url, { credentials: 'same-origin' });
    if (r.status === 404 || r.status === 204) return null;
    if (!r.ok) throw new Error(`tile ${tileKey(t)}: ${r.status}`);
    const b = new Uint8Array(await r.arrayBuffer());
    return Object.assign(b, { truncated: r.headers.get('x-truncated') === 'true' });
  };
}

/** Recent tiles, least recently used dropped first. */
export class TileCache {
  private m = new Map<string, Promise<LoadedTile>>();
  constructor(private max = 256) {}
  get(k: string, load: () => Promise<LoadedTile>): Promise<LoadedTile> {
    let p = this.m.get(k);
    if (p) { this.m.delete(k); this.m.set(k, p); return p; }
    p = load();
    this.m.set(k, p);
    p.catch(() => this.m.delete(k));
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
    return p;
  }
  clear(): void { this.m.clear(); }
  get size(): number { return this.m.size; }
}

/**
 * Load the features covering `tiles`: each tile from the cache or the
 * source; a tile cut short at the point limit is replaced by its children
 * (up to `maxZoom`), so every point arrives. Returns the merged features.
 */
export async function loadTiles(tiles: readonly TileAddress[], o: { fetch: FetchTile; cache: TileCache; layer: string; version?: string; maxZoom: number; depth?: number }): Promise<{ features: TileFeature[]; truncated: boolean; tiles: number }> {
  const sets: TileFeature[][] = [];
  let truncated = false, count = 0;
  await Promise.all(tiles.map(async t => {
    const got = await o.cache.get(`${o.version ?? ''}|${tileKey(t)}`, async () => {
      const b = await o.fetch(t, o.version);
      if (!b) return { features: [], truncated: false };
      const features = featuresOf(b, t, o.layer);
      return { features, truncated: !!b.truncated || features.length >= TILE_POINT_LIMIT };
    });
    count++;
    if (got.truncated && t.z < o.maxZoom && (o.depth ?? 0) < 4) {
      const sub = await loadTiles(childrenOf(t), { ...o, depth: (o.depth ?? 0) + 1 });
      sets.push(sub.features); truncated ||= sub.truncated; count += sub.tiles;
    } else { sets.push(got.features); truncated ||= got.truncated; }
  }));
  return { features: mergeFeatures(sets), truncated, tiles: count };
}

/**
 * What a map shows, in longitude/latitude, and its scale: the visible part
 * of the frame (under the map's zoom) sampled on a grid and inverted through
 * the map's projection, plus screen pixels per degree of longitude at its
 * centre. Null when no part of the frame inverts (off the globe).
 */
export function viewBounds(m: { width: number; height: number; invert: (x: number, y: number) => [number, number] | null; projectRaw: (lng: number, lat: number) => [number, number] | null }, zoom?: { z: number; tx: number; ty: number } | null, samples = 9): { bounds: [number, number, number, number]; pxPerDegree: number } | null {
  const z = zoom && zoom.z > 0 ? zoom : { z: 1, tx: 0, ty: 0 };
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const sx = (m.width * i) / (samples - 1), sy = (m.height * j) / (samples - 1);
      const q = m.invert((sx - z.tx) / z.z, (sy - z.ty) / z.z);
      if (!q) continue;
      w = Math.min(w, q[0]); e = Math.max(e, q[0]); s = Math.min(s, q[1]); n = Math.max(n, q[1]);
    }
  }
  if (!Number.isFinite(w)) return null;
  // A margin of one sample step, so points just past a sampled edge are not missed.
  const mx = (e - w) / (samples - 1), my = (n - s) / (samples - 1);
  const bounds: [number, number, number, number] = [Math.max(-180, w - mx), Math.max(-MAX_LAT, s - my), Math.min(180, e + mx), Math.min(MAX_LAT, n + my)];
  const c = m.invert((m.width / 2 - z.tx) / z.z, (m.height / 2 - z.ty) / z.z) ?? [(w + e) / 2, (s + n) / 2];
  const a = m.projectRaw(c[0], c[1]), b = m.projectRaw(c[0] + 0.1, c[1]);
  const pxPerDegree = a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) * 10 * z.z : m.width / Math.max(1e-6, e - w);
  return { bounds, pxPerDegree };
}

/** A located-point layer read from vector tiles (NationMap `pointTiles`). */
export interface PointTileSource {
  source: TileSource;
  /** The tiles' layer name (default "facilities"). */
  layer?: string;
  minZoom?: number;
  maxZoom?: number;
  /** Change it to fetch the tiles again (e.g. every half minute). */
  version?: string;
  /** A feature as a map point, or null to leave it out (a page's filters). */
  toPoint: (f: TileFeature) => { key: string; label: string; tone: MapTone; glyph?: string; href?: string; generalised?: boolean } | null;
}

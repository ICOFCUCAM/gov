// The parcel map's arithmetic (components/features/sites/ParcelMap.tsx): a
// Web Mercator view (centre and fractional zoom) over a canvas, the tiles it
// needs, parcel tiles decoded into world pixels, and which parcel lies under
// a point. Pure: no DOM. Parcels come only from the platform's parcel tiles
// (/api/twin/tiles/parcels, public fields only); the outlines of regions and
// districts from its boundary tiles.

import { EXTENT, decodeTile, type Prop } from '@/lib/geo/mvt';

export const TILE_PX = 256;
const MAX_LAT = 85.0511287798066;
export interface View { lng: number; lat: number; z: number }
export interface WorldShape { id: string; layer: string; rings: [number, number][][]; props: Record<string, Prop> }

/** Longitude/latitude to world pixels at zoom z (x right, y down). */
export function toPx(lng: number, lat: number, z: number): [number, number] {
  const size = TILE_PX * 2 ** z;
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return [((lng + 180) / 360) * size, ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * size];
}
/** World pixels at zoom z back to longitude/latitude. */
export function fromPx(x: number, y: number, z: number): [number, number] {
  const size = TILE_PX * 2 ** z;
  const lng = (x / size) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI;
  return [lng, lat];
}

/** The zoom that fits a box in a canvas of the given size. */
export function fitZoom(b: readonly [number, number, number, number], width: number, height: number, max = 19): number {
  const [x0, y0] = toPx(b[0], b[3], 0), [x1, y1] = toPx(b[2], b[1], 0);
  const z = Math.log2(Math.min(width / Math.max(1e-9, x1 - x0), height / Math.max(1e-9, y1 - y0)) * 0.85);
  return Math.max(2, Math.min(max, Number.isFinite(z) ? z : 6));
}

/** The tiles at tile zoom tz covering a view of a canvas. */
export function tilesInView(v: View, width: number, height: number, tz: number): { z: number; x: number; y: number }[] {
  const scale = 2 ** (tz - v.z);
  const [cx, cy] = toPx(v.lng, v.lat, tz);
  const n = 2 ** tz;
  const x0 = Math.floor((cx - (width / 2) * scale) / TILE_PX), x1 = Math.floor((cx + (width / 2) * scale) / TILE_PX);
  const y0 = Math.max(0, Math.floor((cy - (height / 2) * scale) / TILE_PX)), y1 = Math.min(n - 1, Math.floor((cy + (height / 2) * scale) / TILE_PX));
  const out: { z: number; x: number; y: number }[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ z: tz, x: ((x % n) + n) % n, y });
  return out;
}

/** A tile's polygons in world pixels at its own zoom. */
export function shapesOf(bytes: Uint8Array, t: { z: number; x: number; y: number }, layers: readonly string[]): WorldShape[] {
  const out: WorldShape[] = [];
  for (const l of decodeTile(bytes)) {
    if (!layers.includes(l.name)) continue;
    const k = TILE_PX / (l.extent || EXTENT);
    for (const f of l.features) {
      if (f.type !== 3 || !f.rings?.length) continue;
      out.push({
        id: String(f.properties.id ?? f.properties.code ?? f.id ?? ''), layer: l.name, props: f.properties,
        rings: f.rings.map(r => r.map(p => [t.x * TILE_PX + p[0] * k, t.y * TILE_PX + p[1] * k] as [number, number])),
      });
    }
  }
  return out;
}

/** Whether a point (world pixels) lies in a shape (even-odd over its rings). */
export function inShape(p: [number, number], s: WorldShape): boolean {
  let inside = false;
  for (const r of s.rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i]!, [xj, yj] = r[j]!;
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

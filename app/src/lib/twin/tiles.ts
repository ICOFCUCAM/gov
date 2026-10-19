// The national facility register as vector tiles (architecture review G4,
// R13): published sites as a Mapbox Vector Tile point layer "facilities" at
// /api/twin/tiles/facilities/{z}/{x}/{y}.mvt, built on request from the
// register's spatial index (lib/data/facilities.ts), plus a TileJSON 3.0
// description. Positions are as the viewer may see them: restricted sites are
// generalised through viewFacility() for viewers without need, exactly as in
// the OGC collection; confidential categories are never in the register.

import { listFacilities, categoryOf, nationalId, type Viewer } from '@/lib/data/facilities';
import { encodeTile, tileBounds, toTile, validTile, EXTENT, type TilePoint } from '@/lib/geo/mvt';

export const TILE_LAYER = 'facilities';
export const MIN_ZOOM = 0;
export const MAX_ZOOM = 18;
/** Points just outside a tile are kept so symbols at its edge are not cut. */
export const BUFFER = 64;
/** At most this many points in one tile (a whole nation at zoom 0 stays bounded). */
export const MAX_TILE_POINTS = 50_000;
export const MVT_TYPE = 'application/vnd.mapbox-vector-tile';

export const TILE_FIELDS: Record<string, string> = {
  id: 'Display id (FAC-xxxxx)', nationalId: 'Opaque national FacilityID (UUID v7)', name: 'Name', category: 'Category key', categoryLabel: 'Category',
  status: 'Operating status', regionCode: 'Region code (ISO 3166-2)', certified: 'Location certified', generalised: 'Position generalised (restricted site)',
};

/** Parse "{z}/{x}/{y}" with an optional .mvt or .pbf on y. */
export function parseTile(z: string, x: string, y: string): { z: number; x: number; y: number } | null {
  const yy = y.replace(/\.(mvt|pbf)$/i, '');
  if (![z, x, yy].every(s => /^\d{1,8}$/.test(s))) return null;
  const t = { z: Number(z), x: Number(x), y: Number(yy) };
  return validTile(t.z, t.x, t.y, MAX_ZOOM) ? t : null;
}

/** One tile of published sites as the viewer may see them. */
export function facilitiesTile(z: number, x: number, y: number, viewer: Viewer): { bytes: Uint8Array; count: number; truncated: boolean } {
  const bbox = tileBounds(z, x, y, BUFFER);
  const sites = listFacilities({ bbox }, viewer);
  const points: TilePoint[] = [];
  for (const s of sites) {
    const [px, py] = toTile(s.location.lng, s.location.lat, z, x, y);
    if (px < -BUFFER || py < -BUFFER || px > EXTENT + BUFFER || py > EXTENT + BUFFER) continue;
    const n = Number(s.id.replace(/\D/g, ''));
    points.push({
      ...(Number.isSafeInteger(n) ? { id: n } : {}), x: px, y: py,
      properties: {
        id: s.id, nationalId: nationalId(s), name: s.name, category: s.category, categoryLabel: categoryOf(s.category)?.label,
        status: s.status, regionCode: s.place.regionCode, certified: s.certification.state === 'certified', ...(s.generalised ? { generalised: true } : {}),
      },
    });
    if (points.length >= MAX_TILE_POINTS) break;
  }
  return { bytes: encodeTile([{ name: TILE_LAYER, points }]), count: points.length, truncated: points.length >= MAX_TILE_POINTS };
}

/** TileJSON 3.0.0 describing the facilities tiles. */
export function facilitiesTileJson(origin: string, viewer: Viewer) {
  const sites = listFacilities({}, viewer);
  const xs = sites.map(s => s.location.lng), ys = sites.map(s => s.location.lat);
  const bounds = sites.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : [-180, -85.0511, 180, 85.0511];
  return {
    tilejson: '3.0.0',
    name: 'National facility register',
    description: 'Published sites of the national facility register as a Mapbox Vector Tile point layer. Restricted sites are generalised for viewers without need; confidential sites are not included.',
    version: '1.0.0',
    scheme: 'xyz',
    tiles: [`${origin}/api/twin/tiles/facilities/{z}/{x}/{y}.mvt`],
    minzoom: MIN_ZOOM,
    maxzoom: MAX_ZOOM,
    bounds,
    center: [(bounds[0]! + bounds[2]!) / 2, (bounds[1]! + bounds[3]!) / 2, 6],
    vector_layers: [{ id: TILE_LAYER, description: 'Published sites (points)', minzoom: MIN_ZOOM, maxzoom: MAX_ZOOM, fields: TILE_FIELDS }],
  };
}

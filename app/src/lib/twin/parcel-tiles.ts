// The land parcel register as vector tiles (architecture review G4;
// docs/PARCEL_REGISTER.md): /api/twin/tiles/parcels/{z}/{x}/{y}.mvt, one
// polygon layer "parcels" of published parcels in their public shape only
// (publicParcel(): parcel id, land use, area, region and district, survey
// method and accuracy; never rights or holders), from PARCEL_MIN_ZOOM (below
// it a parcel is smaller than a pixel and a tile would hold a city's
// parcels). Encoded by the platform's MVT encoder (lib/geo/mvt.ts).
//
// Simplified per zoom without gaps (lib/geo/tile-topology.ts): the published
// parcels meeting a block — one tile at BLOCK_ZOOM and a buffer — are made
// into one topology, so an edge two neighbouring parcels share is one arc,
// simplified once per tile zoom and drawn the same for both. Every tile of
// that block (at its zoom and deeper) is cut from that topology. Blocks are
// built on demand and kept per register generation (parcelGeneration(),
// which changes with every published change), so a publication, amendment or
// withdrawal drops the cache and changes every tile's ETag.
//
// Same reading rules as the facility and boundary tiles: the official's
// session, or a GIS client's integration key / access token of scope
// ogc:read (machineReadRefusal(), BEARER_READS in lib/auth/roles.ts).

import { createHash } from 'node:crypto';
import { encodeTile, tileBounds, validTile, type TileShape } from '@/lib/geo/mvt';
import { buildTileTopology, SIMPLIFY_TILE_UNITS, type TileTopology } from '@/lib/geo/tile-topology';
import { boxesMeet, type BBox } from '@/lib/geo/parcel-geometry';
import { parcelCounts, parcelGeneration, publicParcel, publishedInBox, type PublicParcel } from '@/lib/data/parcels';
import { cut, BOUNDARY_BUFFER } from './boundary-tiles';

export const PARCEL_LAYER = 'parcels';
/** Parcels are in tiles from this zoom (a tile about 5 km across at the equator). */
export const PARCEL_MIN_ZOOM = 13;
export const PARCEL_MAX_ZOOM = 20;
/** The zoom of the blocks a topology is built for. */
export const BLOCK_ZOOM = PARCEL_MIN_ZOOM;
/** At most this many parcels in one tile (marked x-truncated); a block's topology holds at most four times as many. */
export const MAX_TILE_PARCELS = 20_000;
const MAX_BLOCK_PARCELS = MAX_TILE_PARCELS * 4;
const CACHE_BLOCKS = 64;
const CACHE_TILES = 2048;

/** The fields of the "parcels" layer: public only (a test holds that no holder field is here). */
export const PARCEL_FIELDS: Record<string, string> = {
  id: 'Record number (PCL-nnnnnn)', parcelId: 'National parcel id', landUse: 'Land use', areaM2: 'Area in m² (computed from the outline)',
  regionCode: 'Region code (from the map)', region: 'Region', districtCode: 'District code (from the map)', district: 'District',
  surveyMethod: 'How the outline was surveyed', accuracyM: 'Stated accuracy of the outline (m)',
};

interface Block { parcels: PublicParcel[]; topo: TileTopology | null; truncated: boolean }
interface Cache { generation: string; blocks: Map<string, Block>; tiles: Map<string, { bytes: Uint8Array; features: number; truncated: boolean }> }
// Derived from the register, never persisted: not a __civicos key.
const g = globalThis as unknown as { __parcelTileCache?: Cache };

function cache(): Cache {
  const generation = parcelGeneration();
  if (!g.__parcelTileCache || g.__parcelTileCache.generation !== generation) g.__parcelTileCache = { generation, blocks: new Map(), tiles: new Map() };
  return g.__parcelTileCache;
}
export function resetParcelTiles(): void { g.__parcelTileCache = undefined; }

/** The block (a tile at BLOCK_ZOOM) a tile at zoom ≥ BLOCK_ZOOM lies in. */
const blockOf = (z: number, x: number, y: number) => ({ x: Math.floor(x / 2 ** (z - BLOCK_ZOOM)), y: Math.floor(y / 2 ** (z - BLOCK_ZOOM)) });

function block(c: Cache, bx: number, by: number): Block {
  const k = `${bx}/${by}`;
  let b = c.blocks.get(k);
  if (b) { c.blocks.delete(k); c.blocks.set(k, b); return b; }
  const box = tileBounds(BLOCK_ZOOM, bx, by, BOUNDARY_BUFFER) as BBox;
  const all = publishedInBox(box);
  const parcels = all.slice(0, MAX_BLOCK_PARCELS).map(publicParcel);
  const topo = parcels.length ? buildTileTopology({ [PARCEL_LAYER]: parcels.map(p => p.geometry.coordinates as unknown as number[][][][]) }) : null;
  b = { parcels, topo, truncated: all.length > MAX_BLOCK_PARCELS };
  c.blocks.set(k, b);
  while (c.blocks.size > CACHE_BLOCKS) c.blocks.delete(c.blocks.keys().next().value!);
  return b;
}

/** Parse "{z}/{x}/{y}" (y may end in .mvt or .pbf) within the parcel tiles' zoom range (below the minimum zoom a tile is empty). */
export function parseParcelTile(z: string, x: string, y: string): { z: number; x: number; y: number } | null {
  const yy = y.replace(/\.(mvt|pbf)$/i, '');
  if (![z, x, yy].every(s => /^\d{1,8}$/.test(s))) return null;
  const t = { z: Number(z), x: Number(x), y: Number(yy) };
  return validTile(t.z, t.x, t.y, PARCEL_MAX_ZOOM) ? t : null;
}

const featureId = (id: string) => { const n = Number(/^PCL-(\d+)$/.exec(id)?.[1]); return Number.isFinite(n) ? n : undefined; };

/**
 * One parcel tile: its bytes, ETag (changes with every published change),
 * feature count and whether it was cut at MAX_TILE_PARCELS. Simplified for
 * its zoom (`simplify: false`, for checks, cuts the full outlines and is not
 * cached). Empty below PARCEL_MIN_ZOOM.
 */
export function parcelTile(z: number, x: number, y: number, o: { simplify?: boolean } = {}): { bytes: Uint8Array; etag: string; features: number; truncated: boolean } {
  const c = cache();
  const simplify = o.simplify !== false;
  const k = `${z}/${x}/${y}`;
  const etag = `"${createHash('sha256').update(`parcels|${c.generation}|${k}${simplify ? '' : '|full'}`).digest('hex').slice(0, 32)}"`;
  if (z < PARCEL_MIN_ZOOM) return { bytes: encodeTile([]), etag, features: 0, truncated: false };
  let t = simplify ? c.tiles.get(k) : undefined;
  if (!t) {
    const { x: bx, y: by } = blockOf(z, x, y);
    const b = block(c, bx, by);
    const box = tileBounds(z, x, y, BOUNDARY_BUFFER) as BBox;
    const shapes: TileShape[] = [];
    let truncated = b.truncated;
    for (const [i, p] of b.parcels.entries()) {
      if (!boxesMeet(p.bbox, box)) continue;
      if (shapes.length >= MAX_TILE_PARCELS) { truncated = true; break; }
      const rings = simplify && b.topo ? cut(b.topo.polygons(PARCEL_LAYER, i, z), z, x, y, true) : cut(p.geometry.coordinates as unknown as number[][][][], z, x, y);
      if (!rings.length) continue;
      shapes.push({
        id: featureId(p.id), type: 'polygon', rings,
        properties: {
          id: p.id, parcelId: p.parcelId, landUse: p.landUse, areaM2: Math.round(p.areaM2 * 10) / 10,
          regionCode: p.place.regionCode, region: p.place.region, districtCode: p.place.districtCode, district: p.place.district,
          surveyMethod: p.survey.method, accuracyM: p.survey.accuracyM,
        },
      });
    }
    t = { bytes: encodeTile([{ name: PARCEL_LAYER, points: [], shapes }]), features: shapes.length, truncated };
    if (simplify) {
      if (c.tiles.size >= CACHE_TILES) c.tiles.delete(c.tiles.keys().next().value!);
      c.tiles.set(k, t);
    }
  } else { c.tiles.delete(k); c.tiles.set(k, t); }
  return { ...t, etag };
}

/** TileJSON 3.0.0 describing the parcel tiles. */
export function parcelTileJson(origin: string) {
  const counts = parcelCounts();
  const all = publishedInBox([-180, -90, 180, 90]);
  const bounds: BBox = all.length
    ? [Math.min(...all.map(p => p.bbox[0])), Math.min(...all.map(p => p.bbox[1])), Math.max(...all.map(p => p.bbox[2])), Math.max(...all.map(p => p.bbox[3]))]
    : [-180, -85.0511, 180, 85.0511];
  return {
    tilejson: '3.0.0',
    name: 'Land parcels',
    description: `Published parcels of the nation's land parcel register (${counts.published.toLocaleString('en')}), public fields only: no rights or holders. From zoom ${PARCEL_MIN_ZOOM}; at most ${MAX_TILE_PARCELS.toLocaleString('en')} parcels a tile (x-truncated).`,
    version: '1.0.0',
    scheme: 'xyz',
    tiles: [`${origin}/api/twin/tiles/parcels/{z}/{x}/{y}.mvt`],
    minzoom: PARCEL_MIN_ZOOM,
    maxzoom: PARCEL_MAX_ZOOM,
    bounds,
    center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2, PARCEL_MIN_ZOOM + 2],
    attribution: 'Land parcel register of the nation\'s cadastre authority',
    generation: parcelGeneration(),
    simplification: { method: `Visvalingam per zoom on one topology per block of zoom-${BLOCK_ZOOM} tiles (an edge two parcels share is simplified once: no gaps or overlaps between them)`, toleranceTileUnits: SIMPLIFY_TILE_UNITS },
    vector_layers: [{ id: PARCEL_LAYER, description: 'Published land parcels (public fields)', minzoom: PARCEL_MIN_ZOOM, maxzoom: PARCEL_MAX_ZOOM, fields: PARCEL_FIELDS }],
  };
}

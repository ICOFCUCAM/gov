// The rest of an institution's published sites for its public "find us"
// locator, read in the visitor's browser from the platform's public PMTiles
// archive (/api/twin/tiles/facilities.pmtiles, lib/twin/tiles-archive.ts) by
// range requests, when the page carries only the first LOCATOR_MAX_SITES and
// the visitor searches or asks for all. The archive holds only what the public
// may see (restricted sites generalised, confidential never), and it is the
// platform's own address: nothing leaves the platform. Loaded on demand
// (dynamic import), so a first visit costs nothing.

import { PMTilesReader, httpSource } from '@/lib/geo/pmtiles';
import { FACILITY_ARCHIVE, TileCache, chooseTiles, loadTiles, tileFetcher, type TileFeature } from '@/lib/map/tile-loader';
import type { LocatorSite, SiteLocations } from './locator-types';

const HIDDEN = new Set(['planned', 'under-construction', 'decommissioned']);

/** A position on the locator's map, from its Mercator fit (d3 geoMercator: x = tx + kλ, y = ty − k·ln tan(π/4 + φ/2)). */
export function placeOn(m: { k: number; tx: number; ty: number }, lng: number, lat: number): [number, number] {
  const lam = (lng * Math.PI) / 180, phi = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return [Math.round((m.tx + m.k * lam) * 10) / 10, Math.round((m.ty - m.k * Math.log(Math.tan(Math.PI / 4 + phi / 2))) * 10) / 10];
}

/** A tile feature as a locator site, when it is the institution's and open to visit. */
export function locatorSite(f: TileFeature, institutionId: string, m: { k: number; tx: number; ty: number }): LocatorSite | null {
  const p = f.props;
  if (p.owner !== institutionId || HIDDEN.has(String(p.status))) return null;
  const [x, y] = placeOn(m, f.lng, f.lat);
  return {
    id: String(p.id ?? f.key), name: String(p.name ?? ''), ...(p.region ? { region: String(p.region) } : {}),
    category: String(p.category ?? ''), categoryLabel: String(p.categoryLabel ?? p.category ?? ''), status: String(p.status ?? ''),
    approx: p.generalised === true, lat: Math.round(f.lat * 1e5) / 1e5, lng: Math.round(f.lng * 1e5) / 1e5, x, y,
  };
}

/**
 * Every published site of the institution in the archive, sorted as the
 * server sorts the first ones (region, then name). Read at the archive's
 * finest zoom that covers the nation in at most 64 tiles (about 40 m at zoom 8).
 */
export async function archiveSites(d: SiteLocations, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<LocatorSite[]> {
  if (!d.institutionId || !d.map?.mercator) return [];
  const h = await new PMTilesReader(httpSource(FACILITY_ARCHIVE.url, fetchImpl)).header();
  if (h.maxLon < h.minLon) return [];
  const plan = chooseTiles([h.minLon, h.minLat, h.maxLon, h.maxLat], 1e9, { minZoom: h.minZoom, maxZoom: h.maxZoom, maxTiles: 64 });
  const r = await loadTiles(plan.tiles, { fetch: tileFetcher(FACILITY_ARCHIVE, fetchImpl), cache: new TileCache(128), layer: 'facilities', maxZoom: h.maxZoom });
  const out: LocatorSite[] = [];
  for (const f of r.features) { const s = locatorSite(f, d.institutionId, d.map.mercator); if (s) out.push(s); }
  return out.sort((a, b) => (a.region ?? '').localeCompare(b.region ?? '') || a.name.localeCompare(b.name));
}

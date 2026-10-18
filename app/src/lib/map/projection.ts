// How a nation is drawn: a projection chosen for its shape and place on the
// globe, rotated to its own longitude so nations across the 180° meridian
// (Russia, Fiji, New Zealand, Kiribati, the United States with Alaska) keep
// their size; equal-area for shaded maps, so a region's colour is not
// exaggerated by its latitude. Distant territories go in inset boxes, as on
// official national maps. The nation may choose the projection itself
// (SovereignProfile.map.projection, setup); a national grid by EPSG code is
// later work (register 17.1).

import {
  geoAlbersUsa, geoAzimuthalEqualArea, geoBounds, geoCentroid, geoConicEqualArea, geoDistance,
  geoMercator, geoTransverseMercator, type GeoProjection, type GeoPermissibleObjects,
} from 'd3-geo';

/** Territories far from the mainland drawn in inset boxes; each inner list shares one box. The US uses geoAlbersUsa's own. */
export const INSETS: Record<string, string[][]> = {
  ESP: [['ES-TF', 'ES-GC']],
  PRT: [['PT-20'], ['PT-30']],
  ECU: [['EC-W']],
  FRA: [['FR-GP', 'FR-MQ', 'FR-GF'], ['FR-RE', 'FR-YT']],
};

export type ProjectionKind = 'albers-usa' | 'conic-equal-area' | 'azimuthal-equal-area' | 'transverse-mercator';

/** The span of a feature collection in degrees, measured the short way round (bounds cross 180° when west > east). */
export function spanOf(fc: GeoPermissibleObjects): { lonSpan: number; latSpan: number; lon0: number; lat0: number; south: number; north: number } {
  const [[w, s], [e, n]] = geoBounds(fc);
  const [lon0, lat0] = geoCentroid(fc);
  return { lonSpan: e >= w ? e - w : e + 360 - w, latSpan: n - s, lon0, lat0, south: s, north: n };
}

/**
 * Which projection suits a nation: tall and narrow, wide in the middle
 * latitudes, or compact. A projection the nation chose wins, except the
 * United States layout, which only places the United States.
 */
export function projectionKind(iso3: string, fc: GeoPermissibleObjects, chosen?: ProjectionKind): ProjectionKind {
  if (chosen && (chosen !== 'albers-usa' || iso3 === 'USA')) return chosen;
  if (iso3 === 'USA') return 'albers-usa';
  const { lonSpan, latSpan, lat0 } = spanOf(fc);
  const width = lonSpan * Math.cos((lat0 * Math.PI) / 180);
  if (latSpan > 1.6 * width) return 'transverse-mercator';
  if (lonSpan > 25 && Math.abs(lat0) > 20 && latSpan > 4) return 'conic-equal-area';
  return 'azimuthal-equal-area';
}

/** A projection for the nation, rotated to its own centre (not yet fitted to a box). */
export function projectionFor(iso3: string, fc: GeoPermissibleObjects, chosen?: ProjectionKind): GeoProjection {
  const kind = projectionKind(iso3, fc, chosen);
  const { lon0, lat0, south, north } = spanOf(fc);
  if (kind === 'albers-usa') return geoAlbersUsa() as unknown as GeoProjection;
  if (kind === 'transverse-mercator') return geoTransverseMercator().rotate([-lon0, -lat0]);
  if (kind === 'conic-equal-area') {
    const p1 = south + (north - south) / 6, p2 = north - (north - south) / 6;
    return geoConicEqualArea().rotate([-lon0, 0]).parallels([p1, p2]);
  }
  return geoAzimuthalEqualArea().rotate([-lon0, -lat0]);
}

/** Inset boxes keep a small Mercator view of their territories. */
export const insetProjection = (): GeoProjection => geoMercator();

const NICE = [1, 2, 5];
/**
 * A scale bar for a fitted projection: a round distance in km and its length
 * in pixels, measured across the middle of the map (true there; an
 * equal-area map is not equidistant everywhere). Null when it cannot be
 * measured (e.g. the centre falls outside the AlbersUsa layout).
 */
export function scaleBar(proj: GeoProjection, width: number, height: number, maxPx = width * 0.22): { km: number; px: number } | null {
  const y = height / 2, x0 = width / 2 - 50, x1 = width / 2 + 50;
  const a = proj.invert?.([x0, y]), b = proj.invert?.([x1, y]);
  if (!a || !b || a.some(Number.isNaN) || b.some(Number.isNaN)) return null;
  const kmPer100 = geoDistance(a, b) * 6371.0088;
  if (!(kmPer100 > 0)) return null;
  const maxKm = (kmPer100 * maxPx) / 100;
  const mag = 10 ** Math.floor(Math.log10(maxKm));
  let km = mag;
  for (const n of NICE) if (n * mag <= maxKm) km = n * mag;
  return { km, px: Math.round((km / kmPer100) * 100) };
}

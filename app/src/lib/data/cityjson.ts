// The national facility register as CityJSON 2.0 (architecture review G5,
// R20): a first step towards a city and infrastructure twin that 3D tools
// (QGIS 3D, ninja, azul, FME, CesiumJS through converters) can open.
//
// - A site with a footprint and a height is a Building with an LoD1 Solid:
//   its outline extruded from the ground (0 m) to its height.
// - A site with a footprint and no height is a Building with an LoD0
//   MultiSurface (the outline on the ground).
// - Any other site is a GenericCityObject with an LoD0 MultiPoint at its
//   position.
//
// Coordinates are WGS 84 longitude, latitude and height above the ground
// (EPSG:4979 axes; there is no terrain model, so heights are relative to the
// ground at the site), stored as integers through the CityJSON transform.
// Viewer-aware: restricted sites come generalised from viewFacility() —
// without their footprint, as a point — for viewers without need; confidential
// categories are never in the register.

import { listFacilities, categoryOf, nationalId, type Viewer, type Facility } from './facilities';

export const CITYJSON_VERSION = '2.0';
const SCALE: [number, number, number] = [1e-7, 1e-7, 0.01];

type Site = Facility & { generalised?: boolean };

export function facilitiesCityJson(viewer: Viewer, opts: { title?: string; category?: string } = {}) {
  const sites: Site[] = listFacilities({ ...(opts.category ? { category: opts.category } : {}) }, viewer);
  const vertices: [number, number, number][] = [];
  const index = new Map<string, number>();
  let tx = Infinity, ty = Infinity;
  for (const s of sites) {
    const pts = s.footprint ? s.footprint.coordinates[0]! : [[s.location.lng, s.location.lat]];
    for (const p of pts) { if (p[0]! < tx) tx = p[0]!; if (p[1]! < ty) ty = p[1]!; }
  }
  if (!Number.isFinite(tx)) { tx = 0; ty = 0; }
  const translate: [number, number, number] = [tx, ty, 0];
  const v = (lng: number, lat: number, h: number): number => {
    const q: [number, number, number] = [Math.round((lng - translate[0]) / SCALE[0]), Math.round((lat - translate[1]) / SCALE[1]), Math.round(h / SCALE[2])];
    const k = q.join(',');
    let i = index.get(k);
    if (i === undefined) { i = vertices.push(q) - 1; index.set(k, i); }
    return i;
  };

  const objects: Record<string, unknown> = {};
  let lod1 = 0, lod0 = 0, points = 0;
  for (const s of sites) {
    const attributes = {
      name: s.name, ...(s.localName ? { localName: s.localName } : {}), facilityId: s.id, ...(nationalId(s) ? { nationalId: nationalId(s) } : {}),
      category: s.category, categoryLabel: categoryOf(s.category)?.label ?? s.category, status: s.status, ...(s.place.regionCode ? { regionCode: s.place.regionCode } : {}),
      ...(s.heightM ? { measuredHeight: s.heightM } : {}), ...(s.levels ? { storeysAboveGround: s.levels } : {}),
      locationCertified: s.certification.state === 'certified', ...(s.generalised ? { positionGeneralised: true } : {}),
    };
    let geometry: unknown;
    let type = 'GenericCityObject';
    const ring = s.footprint?.coordinates[0];
    if (ring && ring.length >= 4) {
      type = 'Building';
      const open = ring.slice(0, -1); // CityJSON rings are not closed
      const bottom = open.map(p => v(p[0]!, p[1]!, 0));
      if (s.heightM) {
        const top = open.map(p => v(p[0]!, p[1]!, s.heightM!));
        // The footprint is wound anticlockwise seen from above: the top keeps that order (normal up),
        // the bottom is reversed (normal down), each wall runs bottom i → bottom i+1 → top i+1 → top i (normal out).
        const walls = open.map((_, i) => { const j = (i + 1) % open.length; return [[bottom[i]!, bottom[j]!, top[j]!, top[i]!]]; });
        geometry = { type: 'Solid', lod: '1', boundaries: [[[[...bottom].reverse()], [top], ...walls]] };
        lod1++;
      } else {
        geometry = { type: 'MultiSurface', lod: '0', boundaries: [[bottom]] };
        lod0++;
      }
    } else {
      geometry = { type: 'MultiPoint', lod: '0', boundaries: [v(s.location.lng, s.location.lat, 0)] };
      points++;
    }
    objects[nationalId(s) ?? s.id] = { type, attributes, geometry: [geometry] };
  }

  const lngs = vertices.map(p => p[0] * SCALE[0] + translate[0]), lats = vertices.map(p => p[1] * SCALE[1] + translate[1]), hs = vertices.map(p => p[2] * SCALE[2]);
  const doc = {
    type: 'CityJSON',
    version: CITYJSON_VERSION,
    transform: { scale: SCALE, translate },
    metadata: {
      title: opts.title ?? 'National facility register',
      referenceSystem: 'https://www.opengis.net/def/crs/EPSG/0/4979',
      ...(vertices.length ? { geographicalExtent: [Math.min(...lngs), Math.min(...lats), Math.min(...hs), Math.max(...lngs), Math.max(...lats), Math.max(...hs)] } : {}),
    },
    CityObjects: objects,
    vertices,
  };
  return { doc, counts: { lod1, lod0Footprints: lod0, lod0Points: points } };
}

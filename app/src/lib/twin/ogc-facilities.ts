// The national facility register as an OGC API – Features collection,
// "facilities": published sites as GeoJSON points (CRS84) with their category,
// owning institution, status, how and how well the position was captured and
// whether its location is certified. Restricted sites are generalised for
// anyone outside the owning institution and the whole government
// (lib/data/facilities.ts viewFacility); confidential categories are never in
// the register. Filters: bbox, category, datetime (sites published by then).
// Each feature carries the opaque national FacilityID (`nationalId`, a UUID
// v7 minted at publication); the feature id stays the display id FAC-xxxxx.

import { listFacilities, categoryOf, nationalId, type Viewer } from '@/lib/data/facilities';
import { getMinistry } from '@/lib/data/store';
import { QUERYABLES_REL, filterQs, matchesFilters, type PropertyFilter } from './ogc-queryables';
import { DATETIME_AS_OF, MAX_LIMIT, pageLinks, parseBbox, parseDatetime } from './ogc';

export const FACILITY_COLLECTION = 'facilities';
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';

export function facilitiesInfo(base: string) {
  const sites = listFacilities({}, { signedIn: false });
  const xs = sites.map(s => s.location.lng), ys = sites.map(s => s.location.lat);
  return {
    id: FACILITY_COLLECTION,
    title: 'National facility register',
    description: `Published sites (schools, health facilities, police, power, airports and more) recorded by their institutions. Restricted sites are generalised for viewers without need; confidential sites are not included. ${DATETIME_AS_OF} Here it keeps the sites published by then.`,
    itemType: 'feature',
    crs: [CRS84],
    ...(sites.length ? { extent: { spatial: { bbox: [[Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]], crs: CRS84 } } } : {}),
    links: [
      { href: `${base}/collections/${FACILITY_COLLECTION}`, rel: 'self', type: 'application/json', title: 'This collection' },
      { href: `${base}/collections/${FACILITY_COLLECTION}/items`, rel: 'items', type: 'application/geo+json', title: 'Features' },
      { href: `${base}/collections/${FACILITY_COLLECTION}/queryables`, rel: QUERYABLES_REL, type: 'application/schema+json', title: 'Queryables' },
    ],
  };
}

function featureOf(s: ReturnType<typeof listFacilities>[number]) {
  return {
    type: 'Feature' as const,
    id: s.id,
    geometry: { type: 'Point' as const, coordinates: [s.location.lng, s.location.lat] },
    properties: {
      ...(nationalId(s) ? { nationalId: nationalId(s) } : {}),
      name: s.name, ...(s.localName ? { localName: s.localName } : {}),
      category: s.category, categoryLabel: categoryOf(s.category)?.label,
      institution: getMinistry(s.ownerId)?.name ?? s.ownerId, status: s.status,
      region: s.place.region, regionCode: s.place.regionCode, ...(s.place.district ? { district: s.place.district, districtCode: s.place.districtCode } : {}),
      identifiers: s.ids, captured: s.location.method, accuracyMetres: s.location.accuracyM,
      locationCertified: s.certification.state === 'certified', certification: s.certification.state,
      sensitivity: s.sensitivity, ...(s.generalised ? { positionGeneralised: true } : {}),
      publishedAt: s.publishedAt,
    },
  };
}

export function facilityItems(base: string, q: { limit?: string | null; offset?: string | null; bbox?: string | null; datetime?: string | null; category?: string | null; filters?: PropertyFilter }, viewer: Viewer) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || 100));
  const offset = Math.max(0, Number(q.offset) || 0);
  const bbox = parseBbox(q.bbox ?? null);
  if (bbox && 'error' in bbox) return bbox;
  const datetime = parseDatetime(q.datetime ?? null);
  if (typeof datetime !== 'string') return datetime;
  const { category: cat, ...filters } = q.filters ?? {};
  const category = q.category ?? cat;
  // bbox reads the register's spatial index, on the positions the viewer may see.
  const all = listFacilities({ category: category ?? undefined, ...(bbox ? { bbox } : {}) }, viewer)
    .filter(s => !s.publishedAt || s.publishedAt <= datetime)
    .map(featureOf)
    .filter(f => matchesFilters(f.properties, filters));
  const page = all.slice(offset, offset + limit);
  const href = `${base}/collections/${FACILITY_COLLECTION}/items`;
  const qs = (o: number) => `?limit=${limit}&offset=${o}${q.bbox ? `&bbox=${encodeURIComponent(q.bbox)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}${q.datetime ? `&datetime=${encodeURIComponent(q.datetime)}` : ''}${filterQs(filters)}`;
  return {
    type: 'FeatureCollection' as const,
    features: page,
    numberMatched: all.length,
    numberReturned: page.length,
    timeStamp: new Date().toISOString(),
    links: [
      ...pageLinks(href, qs, offset, limit, all.length),
      { href: `${base}/collections/${FACILITY_COLLECTION}`, rel: 'collection', type: 'application/json' },
    ],
  };
}

export function facilityItem(base: string, id: string, viewer: Viewer) {
  // By the display id (FAC-00012) or the opaque national FacilityID.
  const s = listFacilities({}, viewer).find(x => x.id === id || nationalId(x) === id);
  if (!s) return null;
  return { ...featureOf(s), links: [{ href: `${base}/collections/${FACILITY_COLLECTION}/items/${encodeURIComponent(id)}`, rel: 'self', type: 'application/geo+json' }] };
}

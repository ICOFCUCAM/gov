// The land parcel register as an OGC API – Features collection, "parcels"
// (INSPIRE Cadastral Parcels in spirit): published parcels as GeoJSON
// MultiPolygons (CRS84) with their public fields only — national parcel id
// (nationalCadastralReference), area computed from the outline, land use,
// region and district from the map, survey method and accuracy. Never rights
// or holders: features are built from publicParcel() (lib/data/parcels.ts),
// which has no rights field. Filters: bbox (through the register's spatial
// index), the queryables, CQL2, datetime (parcels published by then).

import { publicParcel, publishedInBox, getParcel, parcelCounts, type PublicParcel } from '@/lib/data/parcels';
import { QUERYABLES_REL, filterQs, matchesFilters, type PropertyFilter } from './ogc-queryables';
import { DATETIME_AS_OF, MAX_LIMIT, pageLinks, parseBbox, parseDatetime } from './ogc';
import { cql2Matches, type ParsedFilter } from './cql2';

export const PARCEL_COLLECTION = 'parcels';
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';
const WORLD: [number, number, number, number] = [-180, -90, 180, 90];

export function parcelsInfo(base: string) {
  const all = publishedInBox(WORLD);
  const extent = all.length ? [Math.min(...all.map(p => p.bbox[0])), Math.min(...all.map(p => p.bbox[1])), Math.max(...all.map(p => p.bbox[2])), Math.max(...all.map(p => p.bbox[3]))] : null;
  return {
    id: PARCEL_COLLECTION,
    title: 'Land parcel register',
    description: `Published land parcels of the nation's cadastre (${parcelCounts().published.toLocaleString('en')}): national parcel id, outline, area computed from it, land use, region and district from the map, how the outline was surveyed. Rights and holders are personal data and are not in this collection. ${DATETIME_AS_OF} Here it keeps the parcels published by then.`,
    itemType: 'feature',
    crs: [CRS84],
    ...(extent ? { extent: { spatial: { bbox: [extent], crs: CRS84 } } } : {}),
    links: [
      { href: `${base}/collections/${PARCEL_COLLECTION}`, rel: 'self', type: 'application/json', title: 'This collection' },
      { href: `${base}/collections/${PARCEL_COLLECTION}/items`, rel: 'items', type: 'application/geo+json', title: 'Features' },
      { href: `${base}/collections/${PARCEL_COLLECTION}/queryables`, rel: QUERYABLES_REL, type: 'application/schema+json', title: 'Queryables' },
    ],
  };
}

/** A parcel as a feature: public fields only. */
export function parcelFeature(p: PublicParcel) {
  return {
    type: 'Feature' as const,
    id: p.id,
    geometry: p.geometry,
    properties: {
      parcelId: p.parcelId, nationalCadastralReference: p.parcelId, areaM2: p.areaM2, landUse: p.landUse,
      regionCode: p.place.regionCode, region: p.place.region, ...(p.place.districtCode ? { districtCode: p.place.districtCode, district: p.place.district } : {}),
      surveyMethod: p.survey.method, accuracyM: p.survey.accuracyM, ...(p.survey.surveyedAt ? { surveyedAt: p.survey.surveyedAt } : {}),
      publishedAt: p.publishedAt, version: p.version,
    },
  };
}

export function parcelItems(base: string, q: { limit?: string | null; offset?: string | null; bbox?: string | null; datetime?: string | null; filters?: PropertyFilter; cql?: ParsedFilter }) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || 100));
  const offset = Math.max(0, Number(q.offset) || 0);
  const bbox = parseBbox(q.bbox ?? null);
  if (bbox && 'error' in bbox) return bbox;
  const datetime = parseDatetime(q.datetime ?? null);
  if (typeof datetime !== 'string') return datetime;
  const filters = q.filters ?? {};
  const all = publishedInBox(bbox ?? WORLD)
    .filter(p => !p.publishedAt || p.publishedAt <= datetime)
    .map(p => parcelFeature(publicParcel(p)))
    .filter(f => matchesFilters(f.properties, filters))
    .filter(f => cql2Matches(q.cql, f));
  const page = all.slice(offset, offset + limit);
  const href = `${base}/collections/${PARCEL_COLLECTION}/items`;
  const qs = (o: number) => `?limit=${limit}&offset=${o}${q.bbox ? `&bbox=${encodeURIComponent(q.bbox)}` : ''}${q.datetime ? `&datetime=${encodeURIComponent(q.datetime)}` : ''}${filterQs(filters)}${q.cql?.qs ?? ''}`;
  return {
    type: 'FeatureCollection' as const,
    features: page,
    numberMatched: all.length,
    numberReturned: page.length,
    timeStamp: new Date().toISOString(),
    links: [
      ...pageLinks(href, qs, offset, limit, all.length),
      { href: `${base}/collections/${PARCEL_COLLECTION}`, rel: 'collection', type: 'application/json' },
    ],
  };
}

/** One published parcel, by its record number or national parcel id. */
export function parcelItem(base: string, id: string) {
  const p = getParcel(id);
  if (!p || p.state !== 'published') return null;
  return { ...parcelFeature(publicParcel(p)), links: [{ href: `${base}/collections/${PARCEL_COLLECTION}/items/${encodeURIComponent(p.id)}`, rel: 'self', type: 'application/geo+json' }, { href: `${base}/collections/${PARCEL_COLLECTION}`, rel: 'collection', type: 'application/json' }] };
}

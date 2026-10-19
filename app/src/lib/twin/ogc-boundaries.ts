// The nation's published boundaries as an OGC API – Features collection,
// "boundaries": the units of the version in force (regions and districts)
// as GeoJSON polygons (CRS84), each with its code, level, version, the date
// the version took effect and its source and licence. `datetime` picks the
// version in force on that date (as known now); `level` 1 or 2; bbox by the
// unit's centre. Only versions published by the nation's mapping authority
// (lib/data/boundaries.ts); the bundled shapes stay in "subdivisions".

import { boundariesInForce } from '@/lib/data/boundaries';
import type { ActiveBoundary } from '@/lib/map/boundary-active';
import { MAX_LIMIT, parseBbox, parseDatetime } from './ogc';

export const BOUNDARY_COLLECTION = 'boundaries';
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';

export function boundariesInfo(base: string) {
  const force = boundariesInForce();
  const pts = force.flatMap(b => b.units);
  const xs = pts.map(u => u.lng), ys = pts.map(u => u.lat);
  return {
    id: BOUNDARY_COLLECTION,
    title: 'National boundaries (published versions)',
    description: `Regions and districts as the nation's mapping authority publishes them, version in force by date.${force.length ? ` In force now: ${force.map(b => `${b.level === 1 ? 'regions' : 'districts'} version ${b.n} from ${b.validFrom} (${b.credit})`).join('; ')}.` : ' None published yet.'}`,
    itemType: 'feature',
    crs: [CRS84],
    ...(pts.length ? { extent: { spatial: { bbox: [[Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]], crs: CRS84 } } } : {}),
    links: [
      { href: `${base}/collections/${BOUNDARY_COLLECTION}`, rel: 'self', type: 'application/json', title: 'This collection' },
      { href: `${base}/collections/${BOUNDARY_COLLECTION}/items`, rel: 'items', type: 'application/geo+json', title: 'Features' },
    ],
  };
}

function featuresOf(b: ActiveBoundary) {
  return b.units.map(u => ({
    type: 'Feature' as const,
    id: `${b.id}:${u.code}`,
    geometry: u.geometry,
    properties: {
      code: u.code, name: u.name, level: b.level, ...(u.parent ? { parent: u.parent } : {}), ...(u.sourceCode ? { sourceCode: u.sourceCode } : {}),
      version: b.n, versionId: b.id, validFrom: b.validFrom, publishedAt: b.publishedAt, source: b.credit,
    },
  }));
}

export function boundaryItems(base: string, q: { limit?: string | null; offset?: string | null; bbox?: string | null; datetime?: string | null; level?: string | null }) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || 100));
  const offset = Math.max(0, Number(q.offset) || 0);
  const bbox = parseBbox(q.bbox ?? null);
  if (bbox && 'error' in bbox) return bbox;
  const datetime = parseDatetime(q.datetime ?? null);
  if (typeof datetime !== 'string') return datetime;
  const all = boundariesInForce(new Date(datetime))
    .filter(v => !q.level || String(v.level) === q.level)
    .flatMap(v => (bbox ? { ...v, units: v.units.filter(u => u.lng >= bbox[0] && u.lng <= bbox[2] && u.lat >= bbox[1] && u.lat <= bbox[3]) } : v))
    .flatMap(featuresOf);
  const page = all.slice(offset, offset + limit);
  const href = `${base}/collections/${BOUNDARY_COLLECTION}/items`;
  const qs = (o: number) => `?limit=${limit}&offset=${o}${q.bbox ? `&bbox=${encodeURIComponent(q.bbox)}` : ''}${q.level ? `&level=${encodeURIComponent(q.level)}` : ''}${q.datetime ? `&datetime=${encodeURIComponent(q.datetime)}` : ''}`;
  return {
    type: 'FeatureCollection' as const,
    features: page,
    numberMatched: all.length,
    numberReturned: page.length,
    timeStamp: new Date().toISOString(),
    links: [
      { href: href + qs(offset), rel: 'self', type: 'application/geo+json' },
      ...(offset + limit < all.length ? [{ href: href + qs(offset + limit), rel: 'next', type: 'application/geo+json' }] : []),
      { href: `${base}/collections/${BOUNDARY_COLLECTION}`, rel: 'collection', type: 'application/json' },
    ],
  };
}

export function boundaryItem(base: string, id: string) {
  const f = boundariesInForce().flatMap(featuresOf).find(x => x.id === id);
  return f ? { ...f, links: [{ href: `${base}/collections/${BOUNDARY_COLLECTION}/items/${encodeURIComponent(id)}`, rel: 'self', type: 'application/geo+json' }] } : null;
}

// The national twin as OGC API – Features (Part 1: Core, GeoJSON). One
// collection, "subdivisions": the nation's official subdivisions (ISO 3166-2
// shapes, upgraded boundaries where available) with, as properties, the latest
// observed value of each metric true on `datetime` as the twin knows it now.
// Only observations are published; samples and scenarios never are. GIS tools
// (QGIS, ArcGIS, GDAL) read it directly. CRS: WGS 84 longitude/latitude (CRS84).

import { loadCountry, type Admin1Country, type Admin1Province } from '@/lib/geo/admin1';
import { nationIso3 } from '@/lib/nation/registry';
import { listEntities, stateAsOf, listSources } from './register';

export const CONFORMANCE = [
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson',
];
export const COLLECTION = 'subdivisions';
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';
export const MAX_LIMIT = 1000;

type BBox = [number, number, number, number];

function bboxOf(g: Admin1Province['geometry']): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (a: unknown): void => {
    if (Array.isArray(a) && typeof a[0] === 'number') {
      const [x, y] = a as number[];
      if (x! < minX) minX = x!; if (x! > maxX) maxX = x!; if (y! < minY) minY = y!; if (y! > maxY) maxY = y!;
    } else if (Array.isArray(a)) a.forEach(walk);
  };
  walk(g.coordinates);
  return [minX, minY, maxX, maxY];
}
const intersects = (a: BBox, b: BBox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

export function parseBbox(v: string | null): BBox | { error: string } | undefined {
  if (!v) return undefined;
  const n = v.split(',').map(Number);
  if (n.length !== 4 || n.some(x => !Number.isFinite(x)) || n[0]! > n[2]! || n[1]! > n[3]!) return { error: 'bbox must be minLon,minLat,maxLon,maxLat' };
  return n as BBox;
}

/** OGC datetime: an instant (or the end of an interval); default now. */
export function parseDatetime(v: string | null): string | { error: string } {
  if (!v) return new Date().toISOString();
  const end = v.includes('/') ? v.split('/')[1]! : v;
  if (end === '..' || end === '') return new Date().toISOString();
  const t = Date.parse(end);
  return Number.isFinite(t) ? new Date(t).toISOString() : { error: 'datetime must be an RFC 3339 instant or interval' };
}

async function country(): Promise<Admin1Country | null> {
  const iso3 = nationIso3();
  return iso3 ? loadCountry(iso3) : null;
}

export async function collectionInfo(base: string) {
  const c = await country();
  const boxes = (c?.provinces ?? []).map(p => bboxOf(p.geometry));
  const bbox = boxes.length ? [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])), Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))] : undefined;
  return {
    id: COLLECTION,
    title: c ? `${c.name}: official subdivisions` : 'Official subdivisions',
    description: 'ISO 3166-2 subdivisions with the latest observed value of each twin metric true at `datetime` (as known now). Observations only.',
    itemType: 'feature',
    crs: [CRS84],
    ...(bbox ? { extent: { spatial: { bbox: [bbox], crs: CRS84 } } } : {}),
    ...(c?.attribution ? { attribution: `${c.attribution.source} (${c.attribution.licence}${c.attribution.via ? `, via ${c.attribution.via}` : ''})` } : { attribution: 'Natural Earth (public domain)' }),
    links: [
      { href: `${base}/collections/${COLLECTION}`, rel: 'self', type: 'application/json', title: 'This collection' },
      { href: `${base}/collections/${COLLECTION}/items`, rel: 'items', type: 'application/geo+json', title: 'Features' },
    ],
  };
}

function featureOf(p: Admin1Province, entityByCode: Map<string, { id: string; region?: boolean }>, values: Map<string, Record<string, unknown>>) {
  const e = entityByCode.get(p.code);
  return {
    type: 'Feature' as const,
    id: p.code,
    geometry: p.geometry,
    properties: {
      code: p.code,
      name: p.name,
      ...(e ? { twinEntity: e.id, operationalRegion: !!e.region } : {}),
      observations: (e && values.get(e.id)) ?? {},
    },
  };
}

async function features(datetime: string) {
  const c = await country();
  const entities = listEntities('place');
  const entityByCode = new Map(entities.filter(e => e.code).map(e => [e.code!, e]));
  const sourceName = new Map(listSources().map(s => [s.id, s.name]));
  const values = new Map<string, Record<string, unknown>>();
  for (const o of stateAsOf({ asOf: datetime, knownAt: new Date().toISOString() })) {
    const m = values.get(o.entityId) ?? {};
    m[o.metric] = { value: o.value, unit: o.unit, validFrom: o.validFrom, recordedAt: o.recordedAt, source: sourceName.get(o.sourceId) ?? o.sourceId, run: o.runId };
    values.set(o.entityId, m);
  }
  return { provinces: c?.provinces ?? [], make: (p: Admin1Province) => featureOf(p, entityByCode, values) };
}

export async function items(base: string, q: { limit?: string | null; offset?: string | null; bbox?: string | null; datetime?: string | null }) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || 100));
  const offset = Math.max(0, Number(q.offset) || 0);
  const bbox = parseBbox(q.bbox ?? null);
  if (bbox && 'error' in bbox) return bbox;
  const datetime = parseDatetime(q.datetime ?? null);
  if (typeof datetime !== 'string') return datetime;
  const { provinces, make } = await features(datetime);
  const matched = bbox ? provinces.filter(p => intersects(bboxOf(p.geometry), bbox as BBox)) : provinces;
  const page = matched.slice(offset, offset + limit);
  const qs = (o: number) => `?limit=${limit}&offset=${o}${q.bbox ? `&bbox=${encodeURIComponent(q.bbox)}` : ''}${q.datetime ? `&datetime=${encodeURIComponent(q.datetime)}` : ''}`;
  const href = `${base}/collections/${COLLECTION}/items`;
  return {
    type: 'FeatureCollection' as const,
    features: page.map(make),
    numberMatched: matched.length,
    numberReturned: page.length,
    timeStamp: new Date().toISOString(),
    links: [
      { href: href + qs(offset), rel: 'self', type: 'application/geo+json' },
      ...(offset + limit < matched.length ? [{ href: href + qs(offset + limit), rel: 'next', type: 'application/geo+json' }] : []),
      ...(offset > 0 ? [{ href: href + qs(Math.max(0, offset - limit)), rel: 'prev', type: 'application/geo+json' }] : []),
      { href: `${base}/collections/${COLLECTION}`, rel: 'collection', type: 'application/json' },
    ],
  };
}

export async function item(base: string, id: string, datetime: string | null) {
  const dt = parseDatetime(datetime);
  if (typeof dt !== 'string') return dt;
  const { provinces, make } = await features(dt);
  const p = provinces.find(x => x.code === id);
  if (!p) return null;
  return { ...make(p), links: [{ href: `${base}/collections/${COLLECTION}/items/${encodeURIComponent(id)}`, rel: 'self', type: 'application/geo+json' }, { href: `${base}/collections/${COLLECTION}`, rel: 'collection', type: 'application/json' }] };
}

export function landing(base: string, nationName?: string) {
  return {
    title: `${nationName ? `${nationName} · ` : ''}National twin (OGC API – Features)`,
    description: 'The nation\'s official subdivisions with observed values from the national twin.',
    links: [
      { href: base, rel: 'self', type: 'application/json', title: 'This document' },
      { href: new URL('/api/openapi', base).href, rel: 'service-desc', type: 'application/vnd.oai.openapi+json;version=3.1', title: 'API definition' },
      { href: `${base}/conformance`, rel: 'conformance', type: 'application/json', title: 'Conformance' },
      { href: `${base}/collections`, rel: 'data', type: 'application/json', title: 'Collections' },
    ],
  };
}

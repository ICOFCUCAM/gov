// The national twin as OGC API – Features (Part 1: Core, GeoJSON). One
// collection, "subdivisions": the nation's official subdivisions (ISO 3166-2
// shapes, upgraded boundaries where available) with, as properties, the latest
// observed value of each metric true on `datetime` as the twin knows it now.
// Only observations are published; samples and scenarios never are. GIS tools
// (QGIS, ArcGIS, GDAL) read it directly. Stored in WGS 84 longitude/latitude
// (CRS84); served also in EPSG:4326, EPSG:3857 and the nation's national grids
// on request (Part 2, lib/twin/ogc-crs.ts).
//
// Shapes come through loadNationGeography() / loadDistricts() (lib/map/geography),
// as every map reads them: a boundary version the mapping authority has
// published replaces the bundled shapes for its level, and districts installed
// for the nation apply. `level=1` (default) serves the official subdivisions,
// `level=2` the districts.

import type { Geom } from '@/lib/geo/admin1';
import { loadDistricts, loadNationGeography } from '@/lib/map/geography';
import { nationIso3 } from '@/lib/nation/registry';
import { listEntities, stateAsOf, listSources } from './register';
import { QUERYABLES_CONFORMANCE, QUERYABLES_REL, filterQs, matchesFilters, type PropertyFilter } from './ogc-queryables';
import { CQL2_CONFORMANCE, cql2Matches, type ParsedFilter } from './cql2';
import { CRS_CONFORMANCE } from './ogc-crs';

export const CONFORMANCE = [
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson',
  ...QUERYABLES_CONFORMANCE,
  ...CQL2_CONFORMANCE,
  ...CRS_CONFORMANCE,
];
export const COLLECTION = 'subdivisions';
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';
export const MAX_LIMIT = 1000;

export type BBox = [number, number, number, number];

export function bboxOf(g: Geom | { type: string; coordinates: unknown }): BBox {
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
export const intersects = (a: BBox, b: BBox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

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

/** self, next and prev links of a page of items (every paged collection has all three where they apply). */
export function pageLinks(href: string, qs: (offset: number) => string, offset: number, limit: number, matched: number) {
  return [
    { href: href + qs(offset), rel: 'self', type: 'application/geo+json' },
    ...(offset + limit < matched ? [{ href: href + qs(offset + limit), rel: 'next', type: 'application/geo+json' }] : []),
    ...(offset > 0 ? [{ href: href + qs(Math.max(0, offset - limit)), rel: 'prev', type: 'application/geo+json' }] : []),
  ];
}

/** How `datetime` is read, said in every collection's description (an as-of selector, an extension of the OGC temporal filter). */
export const DATETIME_AS_OF = '`datetime` is an as-of selector: an RFC 3339 instant, or the end of an interval (`start/end`, `../end`; an open end means now), picks what was true then as the platform knows it now; it defaults to now.';

export const parseLevel =(v: string | null | undefined): 1 | 2 | { error: string } =>
  (!v || v === '1' ? 1 : v === '2' ? 2 : { error: 'level must be 1 (subdivisions) or 2 (districts)' });

/** A unit as served: its code, name and shape (null while the nation has no shape for it). */
interface Unit { code: string; name: string; geometry: Geom | null; parent?: string }

/** The nation's units for a level, read the way every map reads them. */
async function geography(level: 1 | 2): Promise<{ title?: string; credit: string; units: Unit[] }> {
  const iso3 = nationIso3();
  if (!iso3) return { credit: 'Natural Earth (public domain)', units: [] };
  if (level === 2) {
    const d = await loadDistricts(iso3, undefined, 'full');
    const credit = d?.own ?? (d ? `${d.credit.source}${d.credit.licence ? ` (${d.credit.licence}${d.credit.via ? `, via ${d.credit.via}` : ''})` : ''}` : 'No district shapes');
    return { credit, units: (d?.units ?? []).map(u => ({ code: u.code, name: u.name, geometry: u.geometry, ...(u.parent ? { parent: u.parent } : {}) })) };
  }
  // An empty region list asks for the official subdivisions in their own order.
  const g = await loadNationGeography(iso3, [], 'full');
  return {
    title: g?.name,
    credit: g?.credit ?? 'Natural Earth (public domain)',
    units: (g?.units ?? []).filter(u => u.code).map(u => ({ code: u.code!, name: u.name, geometry: u.geometry ?? null })),
  };
}

export async function collectionInfo(base: string) {
  const g = await geography(1);
  const boxes = g.units.filter(u => u.geometry).map(u => bboxOf(u.geometry!));
  const bbox = boxes.length ? [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])), Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))] : undefined;
  return {
    id: COLLECTION,
    title: g.title ? `${g.title}: official subdivisions` : 'Official subdivisions',
    description: `ISO 3166-2 subdivisions (level=1, the default) or districts (level=2) with the latest observed value of each twin metric true at \`datetime\` (as known now). Shapes are the boundary version in force, as every map draws them. Observations only. ${DATETIME_AS_OF}`,
    itemType: 'feature',
    crs: [CRS84],
    ...(bbox ? { extent: { spatial: { bbox: [bbox], crs: CRS84 } } } : {}),
    attribution: g.credit,
    links: [
      { href: `${base}/collections/${COLLECTION}`, rel: 'self', type: 'application/json', title: 'This collection' },
      { href: `${base}/collections/${COLLECTION}/items`, rel: 'items', type: 'application/geo+json', title: 'Features' },
      { href: `${base}/collections/${COLLECTION}/queryables`, rel: QUERYABLES_REL, type: 'application/schema+json', title: 'Queryables' },
    ],
  };
}

function featureOf(p: Unit, level: 1 | 2, entityByCode: Map<string, { id: string; region?: boolean }>, values: Map<string, Record<string, unknown>>) {
  const e = entityByCode.get(p.code);
  return {
    type: 'Feature' as const,
    id: p.code,
    geometry: p.geometry,
    properties: {
      code: p.code,
      name: p.name,
      level,
      ...(p.parent ? { parent: p.parent } : {}),
      ...(e ? { twinEntity: e.id, operationalRegion: !!e.region } : {}),
      observations: (e && values.get(e.id)) ?? {},
    },
  };
}

async function features(datetime: string, level: 1 | 2) {
  const g = await geography(level);
  const entities = listEntities('place');
  const entityByCode = new Map(entities.filter(e => e.code).map(e => [e.code!, e]));
  const sourceName = new Map(listSources().map(s => [s.id, s.name]));
  const values = new Map<string, Record<string, unknown>>();
  for (const o of stateAsOf({ asOf: datetime, knownAt: new Date().toISOString() })) {
    const m = values.get(o.entityId) ?? {};
    m[o.metric] = { value: o.value, unit: o.unit, validFrom: o.validFrom, recordedAt: o.recordedAt, source: sourceName.get(o.sourceId) ?? o.sourceId, run: o.runId };
    values.set(o.entityId, m);
  }
  return { units: g.units, make: (p: Unit) => featureOf(p, level, entityByCode, values) };
}

export async function items(base: string, q: { limit?: string | null; offset?: string | null; bbox?: string | null; datetime?: string | null; level?: string | null; filters?: PropertyFilter; cql?: ParsedFilter }) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || 100));
  const offset = Math.max(0, Number(q.offset) || 0);
  const bbox = parseBbox(q.bbox ?? null);
  if (bbox && 'error' in bbox) return bbox;
  const datetime = parseDatetime(q.datetime ?? null);
  if (typeof datetime !== 'string') return datetime;
  const { level: lv, ...filters } = q.filters ?? {};
  const level = parseLevel(q.level ?? lv);
  if (typeof level !== 'number') return level;
  const { units, make } = await features(datetime, level);
  const matched = units
    .filter(p => !bbox || (p.geometry && intersects(bboxOf(p.geometry), bbox)))
    .filter(p => matchesFilters({ code: p.code, parent: p.parent, name: p.name }, filters))
    .filter(p => cql2Matches(q.cql, { properties: { code: p.code, parent: p.parent, name: p.name, level }, geometry: p.geometry }));
  const page = matched.slice(offset, offset + limit);
  const qs = (o: number) => `?limit=${limit}&offset=${o}${q.bbox ? `&bbox=${encodeURIComponent(q.bbox)}` : ''}${(q.level ?? lv) ? `&level=${encodeURIComponent((q.level ?? lv)!)}` : ''}${q.datetime ? `&datetime=${encodeURIComponent(q.datetime)}` : ''}${filterQs(filters)}${q.cql?.qs ?? ''}`;
  const href = `${base}/collections/${COLLECTION}/items`;
  return {
    type: 'FeatureCollection' as const,
    features: page.map(make),
    numberMatched: matched.length,
    numberReturned: page.length,
    timeStamp: new Date().toISOString(),
    links: [
      ...pageLinks(href, qs, offset, limit, matched.length),
      { href: `${base}/collections/${COLLECTION}`, rel: 'collection', type: 'application/json' },
    ],
  };
}

/** One unit by its code: a subdivision, or else a district. */
export async function item(base: string, id: string, datetime: string | null) {
  const dt = parseDatetime(datetime);
  if (typeof dt !== 'string') return dt;
  let found: ReturnType<Awaited<ReturnType<typeof features>>['make']> | undefined;
  for (const level of [1, 2] as const) {
    const { units, make } = await features(dt, level);
    const p = units.find(x => x.code === id);
    if (p) { found = make(p); break; }
  }
  if (!found) return null;
  return { ...found, links: [{ href: `${base}/collections/${COLLECTION}/items/${encodeURIComponent(id)}`, rel: 'self', type: 'application/geo+json' }, { href: `${base}/collections/${COLLECTION}`, rel: 'collection', type: 'application/json' }] };
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

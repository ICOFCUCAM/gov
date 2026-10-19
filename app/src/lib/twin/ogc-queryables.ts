// Queryables and simple property filters for the twin's OGC API – Features
// collections (OGC API – Features Part 3: "Queryables" and "Queryables as
// query parameters"). Each collection publishes, at
// /collections/{id}/queryables, a JSON Schema of the properties a client may
// filter on; each of them is accepted as a query parameter on /items with
// equality semantics (`?category=school&regionCode=KE-30`). Any other
// parameter is refused with 400 instead of being ignored, so a client never
// takes an unfiltered answer for a filtered one.

import { FACILITY_CATEGORIES, STATUSES } from '@/lib/data/facilities';

export const QUERYABLES_CONFORMANCE = [
  'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/queryables',
  'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/queryables-query-parameters',
];
export const QUERYABLES_REL = 'http://www.opengis.net/def/rel/ogc/1.0/queryables';

/** The parameters every items request takes (Part 1). */
export const STANDARD_PARAMS = ['limit', 'offset', 'bbox', 'datetime', 'f', 'filter', 'filter-lang', 'filter-crs'] as const;

export interface Queryable { title: string; description: string; type: 'string' | 'integer' | 'number'; enum?: (string | number)[]; pattern?: string; format?: 'date-time' | 'date' }

const CODE = '^[A-Za-z0-9:_.-]{1,80}$';

/** The queryable properties of each collection: each is also a filter parameter on /items. */
export const QUERYABLES: Record<string, Record<string, Queryable>> = {
  subdivisions: {
    level: { title: 'Level', description: '1 for the official subdivisions (default), 2 for districts.', type: 'integer', enum: [1, 2] },
    code: { title: 'Code', description: 'ISO 3166-2 code, or the district\'s stable code.', type: 'string', pattern: CODE },
    parent: { title: 'Parent', description: 'Code of the subdivision a district lies in.', type: 'string', pattern: CODE },
    name: { title: 'Name', description: 'The unit\'s official name.', type: 'string' },
  },
  facilities: {
    category: { title: 'Category', description: 'The kind of site.', type: 'string', enum: FACILITY_CATEGORIES.filter(c => c.suggestedSensitivity !== 'confidential').map(c => c.key) },
    regionCode: { title: 'Region code', description: 'ISO 3166-2 code of the region the position falls in (worked out from the map).', type: 'string', pattern: CODE },
    districtCode: { title: 'District code', description: 'Code of the district the position falls in (not shown for generalised sites).', type: 'string', pattern: CODE },
    status: { title: 'Status', description: 'Operating status.', type: 'string', enum: [...STATUSES] },
    certification: { title: 'Location certification', description: 'Whether the location is certified under the nation\'s policy.', type: 'string', enum: ['awaiting', 'certified', 'rejected'] },
    sensitivity: { title: 'Sensitivity', description: 'public or restricted (restricted sites are generalised for viewers without need).', type: 'string', enum: ['public', 'restricted'] },
    name: { title: 'Name', description: 'The site\'s name.', type: 'string' },
    publishedAt: { title: 'Published', description: 'When the site was published in the register.', type: 'string', format: 'date-time' },
  },
  boundaries: {
    level: { title: 'Level', description: '1 for regions, 2 for districts.', type: 'integer', enum: [1, 2] },
    code: { title: 'Code', description: 'The unit\'s code.', type: 'string', pattern: CODE },
    parent: { title: 'Parent', description: 'Code of the region a district lies in.', type: 'string', pattern: CODE },
    name: { title: 'Name', description: 'The unit\'s name.', type: 'string' },
    version: { title: 'Version', description: 'The published boundary version number.', type: 'integer' },
    validFrom: { title: 'In force from', description: 'The date the version took effect.', type: 'string', format: 'date' },
    publishedAt: { title: 'Published', description: 'When the version was published.', type: 'string', format: 'date-time' },
  },
};

/** The JSON Schema document served at /collections/{id}/queryables. */
export function queryables(base: string, collectionId: string) {
  const q = QUERYABLES[collectionId];
  if (!q) return null;
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${base}/collections/${collectionId}/queryables`,
    type: 'object',
    title: `Queryables of ${collectionId}`,
    description: 'Each property may be given as a query parameter on /items to keep only the features whose property equals it, or used in a CQL2 filter (filter, filter-lang=cql2-text|cql2-json, filter-crs CRS84) with geometry. Other parameters than these and limit, offset, bbox, datetime, f, filter, filter-lang and filter-crs are refused.',
    properties: {
      geometry: { $ref: 'https://geojson.org/schema/Geometry.json', 'x-ogc-role': 'primary-geometry' },
      ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, { title: v.title, description: v.description, type: v.type, ...(v.format ? { format: v.format } : {}), ...(v.enum ? { enum: v.enum } : {}), ...(v.pattern ? { pattern: v.pattern } : {}) }])),
    },
    additionalProperties: false,
  };
}

export type PropertyFilter = Record<string, string>;

/**
 * The property filters of an items request, checked: unknown parameters and
 * values outside a queryable's enumeration or pattern are refused with a reason.
 */
export function readFilters(collectionId: string, params: URLSearchParams | Record<string, string | null | undefined>): PropertyFilter | { error: string } {
  const q = QUERYABLES[collectionId] ?? {};
  const entries: [string, string][] = params instanceof URLSearchParams
    ? [...params.entries()]
    : Object.entries(params).filter((e): e is [string, string] => e[1] != null);
  const out: PropertyFilter = {};
  for (const [k, v] of entries) {
    if ((STANDARD_PARAMS as readonly string[]).includes(k)) continue;
    const def = q[k];
    if (!def) return { error: `Unknown parameter "${k}". This collection takes ${[...STANDARD_PARAMS, ...Object.keys(q)].join(', ')} (see /collections/${collectionId}/queryables).` };
    if (def.enum && !def.enum.map(String).includes(v)) return { error: `${k} must be one of ${def.enum.join(', ')}` };
    if (def.pattern && !new RegExp(def.pattern).test(v)) return { error: `${k} is not a valid ${def.title.toLowerCase()}` };
    out[k] = v;
  }
  return out;
}

/** Whether a feature's properties satisfy every filter (equality, compared as text). */
export function matchesFilters(props: Record<string, unknown>, f: PropertyFilter): boolean {
  for (const [k, v] of Object.entries(f)) if (props[k] == null || String(props[k]) !== v) return false;
  return true;
}

/** The filters as a query-string tail, for next and prev links. */
export const filterQs = (f: PropertyFilter): string => Object.entries(f).map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('');

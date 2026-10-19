// The national twin as OGC SensorThings API v1.1 (read-only), so
// infrastructure and IoT tools read the twin through the standard entry
// point (Things, Datastreams, Observations) instead of a bespoke one.
//
//   Things            twin entities: the nation, its places, its institutions
//                     and published facilities; plus each substrate telemetry
//                     stream's facility (or the stream itself when it has none)
//   Locations         a Thing's position (facilities; restricted sites are
//                     generalised through viewFacility() for viewers without need)
//   Sensors           twin sources (the statistics office's CSV and others) and
//                     telemetry streams
//   ObservedProperties twin metrics, and each telemetry stream's quantity
//   Datastreams       one per thing · metric · source (twin), one per telemetry
//                     stream
//   Observations      every observed value true on a date, as known now (a
//                     correction supersedes the value it corrects), with
//                     phenomenonTime = when it was true and resultTime = when
//                     the platform recorded it; recent telemetry samples
//
// Only observations: samples and scenarios are never served. Telemetry is read
// in-process from the substrate (lib/db/repos/telemetry.ts); without a substrate
// there are no streams and the twin's own observations are still served.
// Query options: $top (default 100, at most 1000), $skip, $count, $orderby
// (one property, asc|desc) and $filter (comparisons eq ne gt ge lt le on a
// property or a path such as properties/kind, joined by and/or). $expand and
// $select are refused rather than ignored.

import { listEntities, listSources, metricsKnown, metricDates, stateAsOf, type Observation, type TwinEntity } from './register';
import { getFacility, viewFacility, type Viewer } from '@/lib/data/facilities';
import { listTelemetryStreamsRows, recentTelemetrySamplesRows } from '@/lib/db/repos/telemetry';
import type { TelemetrySampleRow, TelemetryStreamRow } from '@/lib/db/types';

/** SensorThings unitOfMeasurement from a twin unit: UCUM code as the symbol, its plain name, the UCUM definition. */
export function uom(unit: string): { name: string; symbol: string; definition: string } {
  const name = unit.replace(/^\{(.*)\}$/, '$1') || unit;
  return { name, symbol: unit, definition: `http://unitsofmeasure.org/ucum.html#${encodeURIComponent(unit)}` };
}

export const STA_CONFORMANCE = [
  'http://www.opengis.net/spec/iot_sensing/1.1/req/datamodel',
  'http://www.opengis.net/spec/iot_sensing/1.1/req/resource-path/resource-path-to-entities',
  'http://www.opengis.net/spec/iot_sensing/1.1/req/request-data/top',
  'http://www.opengis.net/spec/iot_sensing/1.1/req/request-data/skip',
  'http://www.opengis.net/spec/iot_sensing/1.1/req/request-data/count',
  'http://www.opengis.net/spec/iot_sensing/1.1/req/request-data/orderby',
  'http://www.opengis.net/spec/iot_sensing/1.1/req/request-data/filter',
];

export const STA_SETS = ['Things', 'Locations', 'Sensors', 'ObservedProperties', 'Datastreams', 'Observations'] as const;
export type StaSet = (typeof STA_SETS)[number];
export const STA_MAX_TOP = 1000;
const MEASUREMENT = 'http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement';

export interface StaDeps {
  streams?: () => Promise<TelemetryStreamRow[]>;
  samples?: (streamId: string, limit: number) => Promise<TelemetrySampleRow[]>;
  now?: Date;
}

type Row = Record<string, unknown> & { '@iot.id': string };
interface Model {
  Things: Row[]; Locations: Row[]; Sensors: Row[]; ObservedProperties: Row[]; Datastreams: Row[]; Observations: Row[];
  /** Relations by set and id: which ids of another set belong to it. */
  rel: Map<string, string[]>;
}

/** An id as it sits in a resource path: quoted, quotes doubled, unsafe characters escaped. */
const quote = (id: string) => `('${id.replace(/'/g, "''").replace(/[^A-Za-z0-9:_.~'|-]/g, c => encodeURIComponent(c))}')`;
const rk = (set: StaSet, id: string, nav: string) => `${set}|${id}|${nav}`;

/** Every observed value true on a date, as known now: the history of each entity and metric. */
function history(nowIso: string): Observation[] {
  const out = new Map<string, Observation>();
  for (const metric of metricsKnown()) {
    for (const day of metricDates(metric)) {
      for (const o of stateAsOf({ asOf: `${day}T00:00:00.000Z`, knownAt: nowIso, metric })) {
        if (o.validFrom === day) out.set(`${o.entityId}|${o.metric}|${o.validFrom}`, o);
      }
    }
  }
  return [...out.values()];
}

async function build(viewer: Viewer, deps: StaDeps): Promise<Model> {
  const nowIso = (deps.now ?? new Date()).toISOString();
  const m: Model = { Things: [], Locations: [], Sensors: [], ObservedProperties: [], Datastreams: [], Observations: [], rel: new Map() };
  const link = (set: StaSet, id: string, nav: string, other: string) => { const k = rk(set, id, nav); const a = m.rel.get(k) ?? []; if (!a.includes(other)) a.push(other); m.rel.set(k, a); };

  // Things and their locations. A facility is shown only while published, at the position the viewer may see.
  const things = new Map<string, TwinEntity>();
  for (const e of listEntities()) {
    let loc = e.location;
    let generalised = false;
    if (e.kind === 'facility') {
      const f = getFacility(e.code ?? e.id.replace(/^facility:/, ''));
      if (!f || f.state !== 'published') continue;
      const seen = viewFacility(f, viewer);
      loc = { lng: seen.location.lng, lat: seen.location.lat };
      generalised = !!seen.generalised;
    }
    things.set(e.id, e);
    m.Things.push({ '@iot.id': e.id, name: e.name, description: `${e.kind}${e.code ? ` ${e.code}` : ''}`, properties: { kind: e.kind, ...(e.code ? { code: e.code } : {}), ...(e.parent ? { parent: e.parent } : {}) } });
    if (loc) {
      const lid = `loc:${e.id}`;
      m.Locations.push({ '@iot.id': lid, name: e.name, description: generalised ? 'Position generalised (restricted site)' : `Position of ${e.name}`, encodingType: 'application/geo+json', location: { type: 'Point', coordinates: [loc.lng, loc.lat] }, ...(generalised ? { properties: { generalised: true } } : {}) });
      link('Things', e.id, 'Locations', lid); link('Locations', lid, 'Things', e.id);
    }
  }

  // Twin sources as sensors, metrics as observed properties, entity · metric · source as datastreams.
  const sources = new Map(listSources().map(s => [s.id, s]));
  for (const s of sources.values()) {
    m.Sensors.push({ '@iot.id': s.id, name: s.name, description: `${s.publisher} (${s.kind === 'csv-url' ? 'published file' : 'uploaded file'}, ${s.schedule})`, encodingType: s.url ? 'text/html' : 'text/plain', metadata: s.url ?? s.publisher, properties: { publisher: s.publisher, kind: s.kind } });
  }
  for (const metric of metricsKnown()) {
    m.ObservedProperties.push({ '@iot.id': metric, name: metric, definition: `urn:civicos:metric:${metric}`, description: `Twin metric ${metric}` });
  }
  const ds = new Map<string, Row & { _obs: Observation[] }>();
  for (const o of history(nowIso)) {
    if (!things.has(o.entityId)) continue;
    const id = `${o.entityId}~${o.metric}~${o.sourceId}`;
    let d = ds.get(id);
    if (!d) {
      const thing = things.get(o.entityId)!;
      d = { '@iot.id': id, name: `${o.metric} of ${thing.name}`, description: `${o.metric} of ${thing.name} from ${sources.get(o.sourceId)?.name ?? o.sourceId}`, unitOfMeasurement: uom(o.unit), observationType: MEASUREMENT, properties: { kind: 'observed', source: sources.get(o.sourceId)?.name ?? o.sourceId }, _obs: [] };
      ds.set(id, d);
      link('Datastreams', id, 'Thing', o.entityId); link('Things', o.entityId, 'Datastreams', id);
      link('Datastreams', id, 'Sensor', o.sourceId); link('Sensors', o.sourceId, 'Datastreams', id);
      link('Datastreams', id, 'ObservedProperty', o.metric); link('ObservedProperties', o.metric, 'Datastreams', id);
    }
    d._obs.push(o);
  }
  for (const d of ds.values()) {
    const obs = d._obs.sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    const { _obs, ...row } = d;
    void _obs;
    m.Datastreams.push({ ...row, phenomenonTime: `${obs[0]!.validFrom}T00:00:00Z/${obs.at(-1)!.validFrom}T00:00:00Z`, resultTime: `${obs.reduce((a, o) => (o.recordedAt < a ? o.recordedAt : a), obs[0]!.recordedAt)}/${obs.reduce((a, o) => (o.recordedAt > a ? o.recordedAt : a), obs[0]!.recordedAt)}` });
    for (const o of obs) {
      const oid = `${d['@iot.id']}~${o.validFrom}`;
      m.Observations.push({ '@iot.id': oid, phenomenonTime: `${o.validFrom}T00:00:00Z`, resultTime: o.recordedAt, result: o.value, parameters: { run: o.runId, kind: 'observed' } });
      link('Datastreams', d['@iot.id'], 'Observations', oid); link('Observations', oid, 'Datastream', d['@iot.id']);
    }
  }

  // Substrate telemetry streams, when the substrate is reachable.
  const streams = await (deps.streams ?? (() => listTelemetryStreamsRows({ activeOnly: true, limit: 500 })))().catch(() => [] as TelemetryStreamRow[]);
  for (const s of streams) {
    const facilityThing = s.facility_id && things.has(`facility:${s.facility_id}`) ? `facility:${s.facility_id}` : null;
    const thingId = facilityThing ?? `stream:${s.stream_id}`;
    if (!facilityThing && !m.Things.some(t => t['@iot.id'] === thingId)) {
      m.Things.push({ '@iot.id': thingId, name: s.label, description: `Telemetry stream of ${s.charter_id}`, properties: { kind: 'telemetry', charter: s.charter_id } });
    }
    const id = `telemetry:${s.stream_id}`;
    m.Sensors.push({ '@iot.id': id, name: s.label, description: `Telemetry stream ${s.stream_id} (${s.aggregation})`, encodingType: 'text/plain', metadata: `aggregation=${s.aggregation}; retention=${s.retention_days} days`, properties: { charter: s.charter_id } });
    m.ObservedProperties.push({ '@iot.id': id, name: s.label, definition: `urn:civicos:telemetry:${s.stream_id}`, description: `Telemetry quantity ${s.label}` });
    const unit = s.unit ?? '';
    const samples = await (deps.samples ?? recentTelemetrySamplesRows)(s.stream_id, STA_MAX_TOP).catch(() => [] as TelemetrySampleRow[]);
    const times = samples.map(x => x.ts).sort();
    m.Datastreams.push({
      '@iot.id': id, name: s.label, description: `Telemetry ${s.label}`, unitOfMeasurement: uom(unit),
      observationType: MEASUREMENT, properties: { kind: 'observed', source: 'telemetry', ...(s.warn_threshold != null ? { warnThreshold: s.warn_threshold } : {}), ...(s.alert_threshold != null ? { alertThreshold: s.alert_threshold } : {}) },
      ...(times.length ? { phenomenonTime: `${times[0]}/${times.at(-1)}` } : {}),
    });
    link('Datastreams', id, 'Thing', thingId); link('Things', thingId, 'Datastreams', id);
    link('Datastreams', id, 'Sensor', id); link('Sensors', id, 'Datastreams', id);
    link('Datastreams', id, 'ObservedProperty', id); link('ObservedProperties', id, 'Datastreams', id);
    for (const x of samples) {
      const oid = `${id}~${x.id}`;
      m.Observations.push({ '@iot.id': oid, phenomenonTime: x.ts, resultTime: x.ts, result: x.value, parameters: { kind: 'observed', ...(x.meta && Object.keys(x.meta).length ? { meta: x.meta } : {}) } });
      link('Datastreams', id, 'Observations', oid); link('Observations', oid, 'Datastream', id);
    }
  }
  return m;
}

// ── Navigation links ───────────────────────────────────────────────────────

const NAV: Record<StaSet, { nav: string; set: StaSet; many: boolean }[]> = {
  Things: [{ nav: 'Locations', set: 'Locations', many: true }, { nav: 'Datastreams', set: 'Datastreams', many: true }],
  Locations: [{ nav: 'Things', set: 'Things', many: true }],
  Sensors: [{ nav: 'Datastreams', set: 'Datastreams', many: true }],
  ObservedProperties: [{ nav: 'Datastreams', set: 'Datastreams', many: true }],
  Datastreams: [{ nav: 'Thing', set: 'Things', many: false }, { nav: 'Sensor', set: 'Sensors', many: false }, { nav: 'ObservedProperty', set: 'ObservedProperties', many: false }, { nav: 'Observations', set: 'Observations', many: true }],
  Observations: [{ nav: 'Datastream', set: 'Datastreams', many: false }],
};

function present(base: string, set: StaSet, r: Row) {
  const self = `${base}/${set}${quote(r['@iot.id'])}`;
  return { '@iot.id': r['@iot.id'], '@iot.selfLink': self, ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== '@iot.id')), ...Object.fromEntries(NAV[set].map(n => [`${n.nav}@iot.navigationLink`, `${self}/${n.nav}`])) };
}

// ── $filter ────────────────────────────────────────────────────────────────

type Cmp = { path: string[]; op: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le'; value: string | number | boolean | null };
type Filter = { all: Cmp[][] }; // OR of ANDs

const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;

export function parseFilter(src: string): Filter | { error: string } {
  const tokens = src.match(/'(?:[^']|'')*'|[^\s()]+/g) ?? [];
  const groups: Cmp[][] = [[]];
  let i = 0;
  while (i < tokens.length) {
    const [p, op, lit] = [tokens[i], tokens[i + 1], tokens[i + 2]];
    if (!p || !op || lit === undefined) return { error: `$filter: expected "property op value" near "${tokens.slice(i).join(' ')}"` };
    if (!/^(eq|ne|gt|ge|lt|le)$/.test(op)) return { error: `$filter: unsupported operator "${op}" (eq, ne, gt, ge, lt, le)` };
    if (!/^[@A-Za-z][\w@.]*(\/[@A-Za-z][\w@.]*)*$/.test(p)) return { error: `$filter: "${p}" is not a property` };
    let value: Cmp['value'];
    if (lit.startsWith("'")) value = lit.slice(1, -1).replace(/''/g, "'");
    else if (lit === 'true' || lit === 'false') value = lit === 'true';
    else if (lit === 'null') value = null;
    else if (ISO.test(lit)) value = lit;
    else if (Number.isFinite(Number(lit))) value = Number(lit);
    else return { error: `$filter: "${lit}" is not a value (quote text, e.g. 'school')` };
    groups.at(-1)!.push({ path: p.split('/'), op: op as Cmp['op'], value });
    i += 3;
    const join = tokens[i];
    if (join === undefined) break;
    if (join === 'and') { i++; continue; }
    if (join === 'or') { groups.push([]); i++; continue; }
    return { error: `$filter: expected "and" or "or", found "${join}"` };
  }
  if (!groups[0]!.length) return { error: '$filter is empty' };
  return { all: groups };
}

function compare(a: unknown, b: Cmp['value']): number | null {
  if (a == null || b == null) return a == b ? 0 : null; // eslint-disable-line eqeqeq
  if (typeof b === 'string' && typeof a === 'string') {
    // Times compare as times (a datastream's interval by its start).
    const ta = Date.parse(a.split('/')[0]!), tb = Date.parse(b);
    if (ISO.test(b) && Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof b === 'number' && typeof a === 'number') return a - b;
  if (typeof b === 'boolean' && typeof a === 'boolean') return a === b ? 0 : 1;
  return String(a) === String(b) ? 0 : null;
}

function matches(r: Record<string, unknown>, f: Filter): boolean {
  return f.all.some(group => group.every(c => {
    const v = c.path.reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), r);
    const d = compare(v, c.value);
    if (d === null) return c.op === 'ne';
    return c.op === 'eq' ? d === 0 : c.op === 'ne' ? d !== 0 : c.op === 'gt' ? d > 0 : c.op === 'ge' ? d >= 0 : c.op === 'lt' ? d < 0 : d <= 0;
  }));
}

// ── Requests ───────────────────────────────────────────────────────────────

export function serviceRoot(base: string) {
  return {
    value: STA_SETS.map(name => ({ name, url: `${base}/${name}` })),
    serverSettings: { conformance: STA_CONFORMANCE },
  };
}

const SEG = /^([A-Za-z]+)(?:\((?:'((?:[^']|'')*)'|(\d+))\))?$/;

/**
 * Answer a SensorThings request: `path` is the resource path after /v1.1
 * (e.g. ["Things('place:KE-30')", "Datastreams"]), `query` the query options.
 */
export async function staRequest(base: string, path: string[], query: URLSearchParams, viewer: Viewer, deps: StaDeps = {}): Promise<{ status: number; body: unknown }> {
  if (!path.length) return { status: 200, body: serviceRoot(base) };
  for (const k of query.keys()) {
    if (k === '$expand' || k === '$select' || k === '$resultFormat') return { status: 400, body: { code: 400, type: 'error', message: `${k} is not supported by this read-only service` } };
    if (k.startsWith('$') && !['$top', '$skip', '$count', '$filter', '$orderby'].includes(k)) return { status: 400, body: { code: 400, type: 'error', message: `Unknown query option ${k}` } };
  }
  const m = await build(viewer, deps);
  // Walk the path: a set, optionally one member, then navigation properties.
  let set: StaSet | null = null;
  let rows: Row[] = [];
  let single = false;
  for (const [i, raw] of path.entries()) {
    const seg = SEG.exec(raw);
    if (!seg) return notFound(raw);
    const [, name, quoted, num] = seg;
    const id = quoted !== undefined ? quoted.replace(/''/g, "'") : num;
    if (i === 0) {
      if (!(STA_SETS as readonly string[]).includes(name!)) return notFound(name!);
      set = name as StaSet;
      rows = m[set];
    } else {
      const from: StaSet = set!;
      const nav: { nav: string; set: StaSet; many: boolean } | undefined = NAV[from].find(n => n.nav === name);
      if (!nav || !single) return notFound(raw);
      const ids = m.rel.get(rk(from, rows[0]!['@iot.id'], nav.nav)) ?? [];
      const to: StaSet = nav.set;
      set = to;
      rows = m[to].filter((r: Row) => ids.includes(r['@iot.id']));
      single = !nav.many;
      if (single && !rows.length) return notFound(raw);
      if (id !== undefined) return notFound(raw);
      continue;
    }
    if (id !== undefined) {
      const r = rows.find(x => x['@iot.id'] === id);
      if (!r) return notFound(raw);
      rows = [r]; single = true;
    }
  }
  if (single) return { status: 200, body: present(base, set!, rows[0]!) };

  let list = rows;
  const filter = query.get('$filter');
  if (filter) {
    const f = parseFilter(filter);
    if ('error' in f) return { status: 400, body: { code: 400, type: 'error', message: f.error } };
    list = list.filter(r => matches(r, f));
  }
  const orderby = query.get('$orderby');
  if (orderby) {
    const [prop, dir = 'asc'] = orderby.trim().split(/\s+/);
    if (!prop || !/^(asc|desc)$/.test(dir)) return { status: 400, body: { code: 400, type: 'error', message: '$orderby takes one property, then asc or desc' } };
    const p = prop.split('/');
    const val = (r: Row) => p.reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), r);
    list = [...list].sort((a, b) => { const d = compare(val(a), val(b) as Cmp['value']) ?? 0; return dir === 'desc' ? -d : d; });
  }
  const top = query.has('$top') ? Number(query.get('$top')) : 100;
  const skip = query.has('$skip') ? Number(query.get('$skip')) : 0;
  if (!Number.isInteger(top) || top < 0 || !Number.isInteger(skip) || skip < 0) return { status: 400, body: { code: 400, type: 'error', message: '$top and $skip take whole numbers' } };
  const n = Math.min(top, STA_MAX_TOP);
  const page = list.slice(skip, skip + n);
  const count = query.get('$count') === 'true';
  let next: string | undefined;
  if (skip + n < list.length) {
    const q = new URLSearchParams(query); q.set('$top', String(n)); q.set('$skip', String(skip + n));
    next = `${base}/${path.join('/')}?${q.toString()}`;
  }
  return { status: 200, body: { ...(count ? { '@iot.count': list.length } : {}), value: page.map(r => present(base, set!, r)), ...(next ? { '@iot.nextLink': next } : {}) } };
}

const notFound = (what: string) => ({ status: 404, body: { code: 404, type: 'error', message: `Nothing at "${what}"` } });

// The national digital twin's core (register §16): who and what the nation is
// made of, where facts about them come from, and every fact with the time it
// was true and the time it was recorded.
//
//   entities      places (the nation and its official subdivisions, keyed by
//                 ISO 3166 codes where they exist), institutions (the ministry
//                 registry) and facilities; each with a stable id
//   keys          a crosswalk: the id each source system uses for an entity
//   sources       registered by a named official: a statistics office CSV on
//                 its own website, or an upload (air-gapped nations)
//   runs          every import: when, by whom, rows read, accepted, rejected
//                 with reasons — the lineage of every observation
//   observations  entity · metric · value · unit · validFrom (when it was
//                 true) · recordedAt (when the platform learnt it) · run
//
// Queries answer "as of" a moment: only what had been recorded by then, and
// was true by then (stateAsOf, signalFor, nationalTotal). Engines read a
// figure through signalFor() and keep their sample when nothing is observed.
// Kept as a server store (persisted by lib/data/persist.ts).

import { createHash } from 'node:crypto';
import { recordAudit, listMinistries, getSovereign, listIntegrations } from '@/lib/data/store';
import { nationIso3, nationRegions } from '@/lib/nation/registry';
import { loadDivisions } from '@/lib/geo/divisions';
import { safeFetchText } from '@/lib/net/safe-fetch';
import { parseCsv } from './csv';
import { twinDb, resetTwinDb, type TwinDb } from './db';
import { twinRepo } from '@/lib/data/repo';
import { archive, archivedRuns, archivedMetrics, archivedObservations, forEachArchived, resetTwinArchive } from './archive';
import { METRIC_ID, getMetric, isKnownMetric, listMetrics, toUcum, sameUnit, type Aggregation } from './metrics';
import { readSdmx, isSdmxFormat, SDMX_MEDIA, SDMX_ROW, type SdmxOptions, type SdmxFormat } from './sdmx';
import type { Signal } from './signal';
import { twinPolicy } from './policy';
import { checkStreamSpec, checkIngestSpec, streamRows, STREAM_ROW, STA_WRITE_SCOPE, type StreamSpec, type StreamLineage, type TelemetryReader, type StreamIngest } from './stream';
import { declarePushedStream, undeclarePushedStream, holdBrokerPassword, hasBrokerPassword } from './readings';

export type EntityKind = 'nation' | 'place' | 'institution' | 'facility';

export interface TwinEntity {
  id: string;
  kind: EntityKind;
  name: string;
  /** ISO 3166-1 alpha-3 for the nation, ISO 3166-2 for subdivisions. */
  code?: string;
  parent?: string;
  /** For places: the nation's operational region (setup) this is. */
  region?: boolean;
  /** Its position in the nation's list of regions (official order). */
  order?: number;
  location?: { lat: number; lng: number };
  /** Its persistent identifier: https://<nation domain>/id/<kind>/<code>, resolved by /id/<kind>/<code> (entityUri). */
  uri?: string;
}

export interface SourceMapping {
  /** Column holding the entity: its code (ISO 3166-2), its name, or the source's own id. */
  entity: string;
  /** Column holding the value. */
  value: string;
  /** Column holding the metric name, or a fixed metric for every row: a registered metric (lib/twin/metrics.ts). */
  metric: { column: string } | { fixed: string };
  /** The unit as the source writes it; for a registered metric it must be that metric's UCUM unit (empty means that unit). */
  unit?: { column: string } | { fixed: string };
  /** Column holding the date or year the value is true for, or one date for the whole file. */
  date?: { column: string } | { fixed: string };
  /** Optional: the date a value stops being true (interval facts, e.g. a budget year); empty means open-ended. */
  validTo?: { column: string } | { fixed: string };
  /** Optional columns for the quality the source states: provisional, final or revised; a standard error; a 95% interval. */
  quality?: { status?: { column: string } | { fixed: string }; stdErr?: { column: string }; ci95Low?: { column: string }; ci95High?: { column: string } };
}

export type QualityStatus = 'provisional' | 'final' | 'revised';
/** The quality a source states for a value. Absent on observations from sources that state none (and on snapshots saved before the field). */
export interface ObservationQuality { status?: QualityStatus; stdErr?: number; ci95?: { low: number; high: number } }

export interface TwinSource {
  id: string;
  name: string;
  /** Who publishes it, e.g. "National Statistics Office". */
  publisher: string;
  /** A CSV at an address or uploaded, or a substrate telemetry stream read as daily aggregates (lib/twin/stream.ts). */
  kind: 'csv-url' | 'csv-upload' | 'stream';
  url?: string;
  /** For a telemetry stream source: the stream, the entity and the daily statistic of each metric. */
  stream?: StreamSpec;
  /** System name used in the crosswalk for this source's own entity ids. */
  system: string;
  mapping: SourceMapping;
  schedule: 'manual' | 'daily' | 'weekly';
  /** The file's format: plain CSV with the mapping above (default), or SDMX-CSV 1.0/2.0, SDMX-JSON 2.0/1.0 or SDMX-ML 2.1 structure-specific data, read by lib/twin/sdmx.ts. */
  format?: 'csv' | SdmxFormat;
  /** For SDMX-CSV: which dimension names the metric, and explicit code → metric and unit mappings. */
  sdmx?: SdmxOptions;
  /** The licence the publisher releases the data under (for the catalogue), when stated. */
  licence?: string;
  registeredBy: string;
  registeredAt: string;
  lastRun?: string;
}

export interface TwinRun {
  id: string;
  sourceId: string;
  at: string;
  by: string;
  status: 'ok' | 'partial' | 'failed';
  rows: number;
  accepted: number;
  rejected: { row: number; reason: string }[];
  error?: string;
  /** Set when an official withdrew the import: its observations are superseded from that moment, never deleted. Under four-eyes, `by` confirmed what `proposedBy` proposed. */
  withdrawn?: { at: string; by: string; reason: string; proposedBy?: string };
  /** A withdrawal proposed and waiting for a different official to confirm it (the nation's twin policy, lib/twin/policy.ts). */
  withdrawalProposed?: { at: string; by: string; reason: string };
  /** SHA-256 of the file as read (UTF-8 text), for provenance; absent on runs recorded before it was kept or that failed before reading. For a stream, of the samples read. */
  sha256?: string;
  /** For a telemetry stream source: the stream and the time read (from inclusive, to exclusive), samples and days aggregated. */
  stream?: StreamLineage;
}

export interface Observation {
  entityId: string;
  metric: string;
  value: number;
  unit: string;
  /** When it was true (ISO date). */
  validFrom: string;
  /** When it stopped being true (ISO date, exclusive), for interval facts; absent = still true until a later value. */
  validTo?: string;
  /** When the platform recorded it (ISO time). */
  recordedAt: string;
  /** What the source states about its quality; absent = not stated. */
  quality?: ObservationQuality;
  sourceId: string;
  runId: string;
  /** When the platform stopped relying on it (its run was withdrawn); as-of queries known before then still see it. */
  supersededAt?: string;
}

const db = twinDb;
/** Changes go through the persistence port (lib/data/repo): memory, or written through to Postgres. */
const repo = () => twinRepo(twinDb);
export type { TwinDb };
export function resetTwin(): void { resetTwinDb(); resetTwinArchive(); }

/**
 * Working limits of the live register. Beyond them the oldest observations
 * and runs move to the history archive (lib/twin/archive.ts), audited; they
 * are never dropped and every query still reads them.
 */
export const LIMITS: { observations: number; runs: number; readonly rejectedShown: number; readonly rows: number } = { observations: 200_000, runs: 500, rejectedShown: 50, rows: 100_000 };
/** Change the live register's working limits (tests; a small server); returns the previous ones. */
export function setTwinLimits(l: Partial<Pick<typeof LIMITS, 'observations' | 'runs'>>): Pick<typeof LIMITS, 'observations' | 'runs'> {
  const prev = { observations: LIMITS.observations, runs: LIMITS.runs };
  if (l.observations !== undefined) LIMITS.observations = Math.max(1, l.observations);
  if (l.runs !== undefined) LIMITS.runs = Math.max(1, l.runs);
  return prev;
}
const METRIC = METRIC_ID;
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const slug = (s: string) => fold(s).replace(/ /g, '-').slice(0, 60);

// ── Entities ──────────────────────────────────────────────────────────────

/**
 * Bring the register in line with the installed nation: the nation, its
 * official subdivisions (ISO 3166-2) and its operational regions, and its
 * institutions. Ids never change once given; entities are added, not removed.
 */
// ── Persistent identifiers ────────────────────────────────────────────────

/** Used until the nation records its own domain (SovereignProfile.domain) or CIVICOS_PUBLIC_URL is set; .invalid never resolves. */
export const PLACEHOLDER_URI_BASE = 'https://twin.invalid';

/** The base of the twin's persistent identifiers: the nation's own domain, else CIVICOS_PUBLIC_URL, else a placeholder. */
export function uriBase(): string {
  let domain: string | undefined;
  try { domain = getSovereign().domain?.trim(); } catch { domain = undefined; }
  if (domain) return `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  const env = process.env.CIVICOS_PUBLIC_URL?.trim();
  return env ? env.replace(/\/+$/, '') : PLACEHOLDER_URI_BASE;
}

/** An entity's kind and code as they appear in its URI and the resolver: nation:KEN → nation / KEN. */
export const uriPath = (id: string): string => {
  const i = id.indexOf(':');
  return `/id/${id.slice(0, i)}/${encodeURIComponent(id.slice(i + 1))}`;
};

/** The entity id a resolver path names (/id/place/KE-30 → place:KE-30). */
export const entityIdFor = (kind: string, code: string): string => `${kind}:${code}`;

/**
 * Give every entity its URI once, and keep it: a URI minted under the
 * placeholder is replaced when the nation's own domain becomes known; one
 * minted under a real domain never changes (entities saved before URIs get
 * theirs here).
 */
function ensureUris(): void {
  const base = uriBase();
  const changed: TwinEntity[] = [];
  for (const e of Object.values(db().entities)) {
    if (!e.uri || (e.uri.startsWith(PLACEHOLDER_URI_BASE) && base !== PLACEHOLDER_URI_BASE)) { e.uri = `${base}${uriPath(e.id)}`; changed.push(e); }
  }
  if (changed.length) repo().putEntities(changed);
}

export async function syncRegister(): Promise<{ entities: number }> {
  const d = db();
  const iso3 = nationIso3();
  const regions = nationRegions();
  const ministries = listMinistries();
  const stamp = `${iso3 ?? '-'}|${regions.join('|')}|${ministries.map(m => m.id).join('|')}`;
  if (d.syncedFor === stamp) { ensureUris(); return { entities: Object.keys(d.entities).length }; }
  const nationId = iso3 ? `nation:${iso3}` : 'nation:reference';
  d.entities[nationId] ??= { id: nationId, kind: 'nation', name: iso3 ?? 'Nation', ...(iso3 ? { code: iso3 } : {}) };
  const divisions = iso3 ? (await loadDivisions(iso3)).flatMap(l => l.units) : [];
  const byName = new Map(divisions.map(u => [fold(u.name), u]));
  for (const u of divisions) {
    const id = `place:${u.code}`;
    d.entities[id] ??= { id, kind: 'place', name: u.name, code: u.code, parent: u.parent ? `place:${u.parent}` : nationId };
  }
  for (const [i, r] of regions.entries()) {
    const match = byName.get(fold(r));
    const id = match ? `place:${match.code}` : `place:${slug(r)}`;
    const e = (d.entities[id] ??= { id, kind: 'place', name: r, parent: nationId });
    e.region = true;
    e.order = i;
  }
  for (const m of ministries) {
    const id = `institution:${m.id}`;
    const uri = d.entities[id]?.uri;
    d.entities[id] = { id, kind: 'institution', name: m.name, parent: nationId, ...(uri ? { uri } : {}) };
  }
  repo().putEntities(Object.values(d.entities));
  d.syncedFor = stamp;
  ensureUris();
  return { entities: Object.keys(d.entities).length };
}

/**
 * A published site of the national facility register (lib/data/facilities.ts)
 * as a twin entity, `facility:<id>`, inside its region, so sources can report
 * observations for it (beds, enrolment, megawatts). Its identifiers go in the
 * crosswalk. Entities are updated, never removed.
 */
export function upsertFacilityEntity(f: { id: string; name: string; location: { lat: number; lng: number }; regionCode?: string; ids: Record<string, string> }): void {
  const d = db();
  const id = `facility:${f.id}`;
  const uri = d.entities[id]?.uri;
  repo().putEntity({ id, kind: 'facility', name: f.name, code: f.id, ...(uri ? { uri } : {}), location: { lat: f.location.lat, lng: f.location.lng }, ...(f.regionCode ? { parent: `place:${f.regionCode}` } : {}) });
  for (const [system, key] of Object.entries(f.ids)) repo().addKey({ entityId: id, system, key });
  ensureUris();
}

export function listEntities(kind?: EntityKind): TwinEntity[] {
  ensureUris();
  return Object.values(db().entities).filter(e => !kind || e.kind === kind);
}

/** The nation's operational regions as twin places. */
export function regionEntities(): TwinEntity[] {
  return listEntities('place').filter(e => e.region).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Find the entity a source means: the source's own id (crosswalk), an ISO code, or the exact name (accents and case ignored). */
export function resolveEntity(ref: string, system?: string): TwinEntity | undefined {
  const d = db();
  const r = ref.trim();
  if (!r) return undefined;
  // The register's own id (place:KE-30, facility:FAC-00012), as stream sources name their entity.
  if (/^(nation|place|institution|facility):/.test(r) && d.entities[r]) return d.entities[r];
  if (system) {
    const k = d.keys.find(x => x.system === system && x.key === r);
    if (k) return d.entities[k.entityId];
  }
  const up = r.toUpperCase();
  const byCode = Object.values(d.entities).find(e => e.code === up);
  if (byCode) return byCode;
  const f = fold(r);
  const named = Object.values(d.entities).filter(e => fold(e.name) === f);
  // Prefer the nation's operational regions when a name is shared across levels.
  return named.find(e => e.region) ?? (named.length === 1 ? named[0] : undefined);
}

/** Record that a source system calls an entity by its own id. */
export function linkKey(entityId: string, system: string, key: string, by: string): { ok: true } | { error: string } {
  const d = db();
  if (!d.entities[entityId]) return { error: 'No such entity' };
  if (!system.trim() || !key.trim()) return { error: 'Give the system and its id' };
  const clash = d.keys.find(x => x.system === system && x.key === key);
  if (clash && clash.entityId !== entityId) return { error: `"${key}" in ${system} already means ${clash.entityId}` };
  if (!clash) repo().addKey({ entityId, system, key });
  recordAudit(by, 'twin.key.link', `Twin:${entityId}`, 'ok', `${system}:${key}`);
  return { ok: true };
}

// ── Sources and runs ──────────────────────────────────────────────────────

export function listSources(): TwinSource[] { return db().sources.map(s => ({ ...s })); }
export function listRuns(sourceId?: string): TwinRun[] { return db().runs.filter(r => !sourceId || r.sourceId === sourceId).map(r => ({ ...r })); }
/** What a source has contributed (current values, withdrawn imports excluded): how many observations, the dates they were true for, the metrics and entities. */
export function sourceCoverage(sourceId: string): { observations: number; from?: string; to?: string; metrics: string[]; entities: number } {
  let n = 0, from: string | undefined, to: string | undefined;
  const metrics = new Set<string>(), entities = new Set<string>();
  const visit = (o: Observation) => {
    if (o.sourceId !== sourceId || o.supersededAt) return;
    n++; metrics.add(o.metric); entities.add(o.entityId);
    if (!from || o.validFrom < from) from = o.validFrom;
    const end = o.validTo ?? o.validFrom;
    if (!to || end > to) to = end;
  };
  forEachArchived(undefined, visit);
  db().observations.forEach(visit);
  return { observations: n, ...(from ? { from, to } : {}), metrics: [...metrics].sort(), entities: entities.size };
}

/** A stable id for an observation: its run, entity, metric and the date it was true for. */
export const observationId = (o: Pick<Observation, 'runId' | 'entityId' | 'metric' | 'validFrom'>): string => `${o.runId}/${o.entityId}/${o.metric}/${o.validFrom}`;

/** The observations an import generated (live register and archive). */
export function runObservations(runId: string): Observation[] {
  const out: Observation[] = [];
  const visit = (o: Observation) => { if (o.runId === runId) out.push({ ...o }); };
  forEachArchived(undefined, visit);
  db().observations.forEach(visit);
  return out;
}

/** One import, from the live register or the history archive. */
export function getRun(id: string): TwinRun | undefined {
  const r = db().runs.find(x => x.id === id) ?? archivedRuns().find(x => x.id === id);
  return r ? { ...r } : undefined;
}

export function registerSource(input: Partial<TwinSource> & { by?: string }): TwinSource | { error: string } {
  const by = (input.by ?? '').trim();
  if (!by) return { error: 'Name the official registering the source' };
  const name = (input.name ?? '').trim(), publisher = (input.publisher ?? '').trim();
  if (!name || !publisher) return { error: 'Give the source a name and its publisher' };
  if (input.kind === 'stream') return registerStreamSource(input, by, name, publisher);
  if (input.kind !== 'csv-url' && input.kind !== 'csv-upload') return { error: 'A source is a CSV at an address, or uploaded' };
  let url: string | undefined;
  if (input.kind === 'csv-url') {
    try { const u = new URL(String(input.url)); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw 0; url = u.href; }
    catch { return { error: 'Give the address of the CSV (http or https)' }; }
  }
  const sdmx = isSdmxFormat(input.format) ? input.format : undefined;
  const m = sdmx ? SDMX_MAPPING : input.mapping;
  if (!m || !m.entity || !m.value || !m.metric) return { error: 'Say which columns hold the entity, the value and the metric' };
  if ('fixed' in m.metric && !METRIC.test(m.metric.fixed)) return { error: 'A metric is lower case letters, digits, dots and underscores, e.g. population or cpi.all_items' };
  // A source names a registered metric (lib/twin/metrics.ts), so its unit and aggregation are known before any row arrives.
  if ('fixed' in m.metric && !isKnownMetric(m.metric.fixed)) return { error: `${m.metric.fixed} is not a registered metric: register it first (its unit and how regions combine)` };
  if ('fixed' in m.metric && m.unit && 'fixed' in m.unit) {
    const def = getMetric(m.metric.fixed)!;
    if (def.origin !== 'observed' && m.unit.fixed.trim() && !sameUnit(m.unit.fixed, def.unit)) return { error: `${m.unit.fixed} is not the unit of ${def.id} (${def.unit})` };
  }
  const d = db();
  const s: TwinSource = {
    id: `SRC-${repo().nextSeq()}`, name: name.slice(0, 120), publisher: publisher.slice(0, 120), kind: input.kind, ...(url ? { url } : {}),
    system: (input.system ?? slug(publisher)).slice(0, 60) || 'source', mapping: m,
    ...(sdmx ? { format: sdmx, ...(input.sdmx ? { sdmx: cleanSdmx(input.sdmx) } : {}) } : {}),
    ...(input.licence?.trim() ? { licence: input.licence.trim().slice(0, 120) } : {}),
    schedule: input.schedule === 'daily' || input.schedule === 'weekly' ? input.schedule : 'manual',
    registeredBy: by, registeredAt: new Date().toISOString(),
  };
  repo().addSource(s);
  recordAudit(by, 'twin.source.register', `Twin:${s.id}`, 'ok', `${s.name} (${s.publisher})${url ? ` ${url}` : ''}`);
  return s;
}

const col = (row: Record<string, string>, spec: { column: string } | { fixed: string } | undefined) =>
  spec === undefined ? undefined : 'fixed' in spec ? spec.fixed : row[spec.column];

/** An ISO date from a date or a year ("2024" → 2024-01-01); undefined if neither. */
export function isoDate(v: string | undefined): string | undefined {
  const s = (v ?? '').trim();
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(s)) return s.length === 7 ? `${s}-01` : s;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : undefined;
}

const STATUS: Record<string, QualityStatus> = { provisional: 'provisional', p: 'provisional', preliminary: 'provisional', final: 'final', f: 'final', revised: 'revised', r: 'revised' };
const num = (v: string | undefined) => { const t = (v ?? '').replace(/[\s,]/g, ''); return t === '' ? undefined : Number(t); };

/** The quality columns of a row, or the reason they cannot be read. Empty cells state nothing. */
function readQuality(row: Record<string, string>, spec: SourceMapping['quality']): ObservationQuality | undefined | string {
  if (!spec) return undefined;
  const q: ObservationQuality = {};
  const rawStatus = (col(row, spec.status) ?? '').trim();
  if (rawStatus) {
    const st = STATUS[rawStatus.toLowerCase()];
    if (!st) return `"${rawStatus}" is not a status (provisional, final or revised)`;
    q.status = st;
  }
  const se = num(spec.stdErr && row[spec.stdErr.column]);
  if (se !== undefined) { if (!Number.isFinite(se) || se < 0) return `"${row[spec.stdErr!.column]}" is not a standard error`; q.stdErr = se; }
  const lo = num(spec.ci95Low && row[spec.ci95Low.column]), hi = num(spec.ci95High && row[spec.ci95High.column]);
  if (lo !== undefined || hi !== undefined) {
    if (lo === undefined || hi === undefined || !Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return 'The 95% interval needs a low and a high bound, low first';
    q.ci95 = { low: lo, high: hi };
  }
  return Object.keys(q).length ? q : undefined;
}

// ── SDMX-CSV ──────────────────────────────────────────────────────────────

const SDMX_MAPPING: SourceMapping = {
  entity: SDMX_ROW.entity, value: SDMX_ROW.value, metric: { column: SDMX_ROW.metric }, unit: { column: SDMX_ROW.unit },
  date: { column: SDMX_ROW.date }, quality: { status: { column: SDMX_ROW.status } },
};

function cleanSdmx(o: SdmxOptions): SdmxOptions {
  const pairs = (r?: Record<string, string>) => r ? Object.fromEntries(Object.entries(r).slice(0, 200).map(([k, v]) => [String(k).trim().slice(0, 64), String(v).trim().slice(0, 64)])) : undefined;
  const codes = pairs(o.codes), units = pairs(o.units);
  return { ...(o.metricDimension?.trim() ? { metricDimension: o.metricDimension.trim().slice(0, 64) } : {}), ...(codes ? { codes } : {}), ...(units ? { units } : {}) };
}

// ── Telemetry streams ────────────────────────────────────────────────────

const STREAM_MAPPING: SourceMapping = {
  entity: STREAM_ROW.entity, value: STREAM_ROW.value, metric: { column: STREAM_ROW.metric }, unit: { column: STREAM_ROW.unit },
  date: { column: STREAM_ROW.date }, validTo: { column: STREAM_ROW.validTo },
};

/** A telemetry stream as a source: checked, daily by default, audited like any registration. */
function registerStreamSource(input: Partial<TwinSource>, by: string, name: string, publisher: string): TwinSource | { error: string } {
  const spec = checkStreamSpec(input.stream);
  if ('error' in spec) return spec;
  if (spec.entity && !resolveEntity(spec.entity)) return { error: `${spec.entity} is not an entity of the register` };
  const bad = spec.ingest ? ingestRefusal(spec, spec.ingest) : null;
  if (bad) return { error: bad };
  const s: TwinSource = {
    id: `SRC-${repo().nextSeq()}`, name: name.slice(0, 120), publisher: publisher.slice(0, 120), kind: 'stream', stream: spec,
    system: (input.system ?? slug(publisher)).slice(0, 60) || 'source', mapping: STREAM_MAPPING,
    ...(input.licence?.trim() ? { licence: input.licence.trim().slice(0, 120) } : {}),
    schedule: input.schedule === 'manual' || input.schedule === 'weekly' ? input.schedule : 'daily',
    registeredBy: by, registeredAt: new Date().toISOString(),
  };
  if (spec.ingest) applyIngest(s, spec.ingest, brokerPasswordIn(input.stream));
  repo().addSource(s);
  recordAudit(by, 'twin.source.register', `Twin:${s.id}`, 'ok', `${s.name} (${s.publisher}) telemetry stream ${spec.streamId}: ${spec.metrics.map(m => `${m.metric}=${m.statistic}`).join(', ')}${spec.ingest ? `; ${ingestWords(s.stream!.ingest!)}` : ''}`);
  return s;
}

/** The password given for a stream's broker, if any (never kept in the source). */
function brokerPasswordIn(stream: unknown): string | undefined {
  const p = (stream as { ingest?: { mqtt?: { password?: unknown } } } | undefined)?.ingest?.mqtt?.password;
  return typeof p === 'string' && p ? p.slice(0, 512) : undefined;
}

/** Why a stream's readings cannot be received this way, or null: the integration exists and holds sta:write; every averaged metric is in the stream's unit. */
function ingestRefusal(spec: StreamSpec, ingest: StreamIngest): string | null {
  if (ingest.integrationId) {
    const c = listIntegrations().find(i => i.id === ingest.integrationId);
    if (!c) return `No integration ${ingest.integrationId}: register the sending system under Connected systems first`;
    if (!c.scopes.includes(STA_WRITE_SCOPE)) return `The integration ${c.name} does not hold the scope ${STA_WRITE_SCOPE}`;
    if (c.status === 'revoked') return `The integration ${c.name} is revoked`;
  }
  for (const m of spec.metrics) {
    if (m.statistic === 'count') continue;
    const def = getMetric(m.metric);
    if (def && def.origin !== 'observed' && !sameUnit(spec.unit, def.unit)) return `Readings in ${spec.unit} cannot record ${m.metric}, counted in ${def.unit}`;
  }
  return null;
}

/**
 * Bind the ingest settings to the source: the stream is declared to the
 * readings store and a broker password sealed there. A password held for
 * another broker or user is never carried over to a new one.
 */
function applyIngest(s: TwinSource, ingest: StreamIngest, password: string | undefined, before?: StreamIngest): void {
  const spec = s.stream!;
  if (ingest.mqtt) {
    const { hasPassword: _claimed, ...mqtt } = ingest.mqtt;
    void _claimed;
    const sameBroker = before?.mqtt?.url === mqtt.url && before?.mqtt?.username === mqtt.username;
    if (password !== undefined) holdBrokerPassword(s.id, password);
    else if (!sameBroker) holdBrokerPassword(s.id, undefined);
    ingest = { ...ingest, mqtt: { ...mqtt, ...(hasBrokerPassword(s.id) ? { hasPassword: true } : {}) } };
  } else holdBrokerPassword(s.id, undefined);
  s.stream = { ...spec, ingest };
  declarePushedStream(spec.streamId, { unit: spec.unit!, label: s.name, sourceId: s.id });
}

const ingestWords = (i: StreamIngest): string => [i.integrationId ? `readings through SensorThings from integration ${i.integrationId}` : '', i.mqtt ? `readings from MQTT ${i.mqtt.url} topic ${i.mqtt.topic}` : ''].filter(Boolean).join(' and ');

/**
 * Change how a stream source receives readings (a named official; audited):
 * bind an integration that may post them through SensorThings, name the
 * nation's own MQTT broker (a password given here is sealed, never kept in the
 * source), or stop receiving them (`ingest: null`). Readings already received
 * stay until they age out.
 */
export function setStreamIngest(sourceId: string, input: { ingest?: unknown; unit?: unknown; by?: string }): TwinSource | { error: string } {
  const by = (input.by ?? '').trim();
  if (!by) return { error: 'Name the official changing how the stream receives readings' };
  const s = db().sources.find(x => x.id === sourceId);
  if (!s) return { error: 'No such source' };
  if (s.kind !== 'stream' || !s.stream) return { error: 'Only a stream source receives readings' };
  if (input.ingest === null) {
    if (!s.stream.ingest) return { ...s };
    const { ingest: _was, ...rest } = s.stream;
    void _was;
    s.stream = rest;
    holdBrokerPassword(s.id, undefined);
    undeclarePushedStream(rest.streamId, s.id);
    repo().saveSource(s);
    recordAudit(by, 'twin.source.ingest', `Twin:${s.id}`, 'ok', 'Stops receiving readings');
    return { ...s };
  }
  const unit = typeof input.unit === 'string' && input.unit.trim() ? input.unit.trim().slice(0, 24) : s.stream.unit;
  const spec = checkStreamSpec({ ...s.stream, unit, ingest: input.ingest });
  if ('error' in spec) return spec;
  const ingest = checkIngestSpec(input.ingest);
  if ('error' in ingest) return ingest;
  const bad = ingestRefusal(spec, ingest);
  if (bad) return { error: bad };
  const before = s.stream.ingest;
  if (before) undeclarePushedStream(s.stream.streamId, s.id);
  s.stream = spec;
  applyIngest(s, ingest, brokerPasswordIn({ ingest: input.ingest }), before);
  repo().saveSource(s);
  recordAudit(by, 'twin.source.ingest', `Twin:${s.id}`, 'ok', ingestWords(s.stream.ingest!));
  return { ...s };
}

/** Where a stream source's next run starts: the end of the latest run that stands (not withdrawn); undefined before the first. */
export function streamResumesAt(sourceId: string): string | undefined {
  let to: string | undefined;
  for (const r of [...db().runs, ...archivedRuns()]) {
    if (r.sourceId !== sourceId || r.withdrawn || !r.stream || r.status === 'failed') continue;
    if (!to || r.stream.to > to) to = r.stream.to;
  }
  return to;
}

/** The registered metric an SDMX code stands for: the one with that SDMX concept, or a metric of that name. */
function sdmxMetric(code: string): string | undefined {
  const c = code.trim();
  const byConcept = listMetrics().find(m => m.sdmxConcept && m.sdmxConcept.toUpperCase() === c.toUpperCase());
  if (byConcept) return byConcept.id;
  const id = c.toLowerCase();
  return METRIC.test(id) && isKnownMetric(id) ? id : undefined;
}

/** SDMX names the nation itself by its ISO 3166-1 alpha-2 code (KE); the register keys it by alpha-3. */
function nationArea(row: Record<string, string>): Record<string, string> {
  const area = row[SDMX_ROW.entity];
  const nation = listEntities('nation')[0];
  if (!area || !nation?.code || area.includes('-')) return row;
  const alpha2 = listEntities('place').find(e => e.code?.includes('-'))?.code?.split('-')[0];
  return area.toUpperCase() === alpha2 ? { ...row, [SDMX_ROW.entity]: nation.code } : row;
}

export interface RunDeps { fetch?: typeof fetch; resolve?: (host: string) => Promise<string[]>; now?: Date; /** Reads telemetry for stream sources (default: the substrate). */ telemetry?: TelemetryReader }

/**
 * Import a source: fetch its CSV (from its own host only, under the platform's
 * fetch rules) or take an uploaded one, check every row, and record what was
 * accepted as observations of this run. Rows that cannot be placed or read are
 * refused with a reason; nothing is guessed.
 */
export async function runSource(sourceId: string, { by, csv, deps = {} }: { by: string; csv?: string; deps?: RunDeps }): Promise<TwinRun | { error: string }> {
  const d = db();
  const s = d.sources.find(x => x.id === sourceId);
  if (!s) return { error: 'No such source' };
  if (!by.trim()) return { error: 'Name the official running the import' };
  await syncRegister();
  const now = deps.now ?? new Date();
  const run: TwinRun = { id: `RUN-${repo().nextSeq()}`, sourceId, at: now.toISOString(), by: by.trim(), status: 'ok', rows: 0, accepted: 0, rejected: [] };
  let text = csv;
  let streamed: Record<string, string>[] | undefined;
  try {
    if (s.kind === 'stream') {
      // Daily aggregates of the telemetry stream since the last run that stands (lib/twin/stream.ts).
      if (!s.stream) throw new Error('This stream source has no stream');
      const r = await streamRows(s.stream, streamResumesAt(s.id), now, deps.telemetry);
      streamed = r.rows; run.sha256 = r.sha256; run.stream = r.lineage; text = '';
    }
    if (text === undefined) {
      if (s.kind !== 'csv-url' || !s.url) throw new Error('This source is uploaded: send its CSV');
      const host = new URL(s.url).host;
      const sdmxAt = isSdmxFormat(s.format) ? SDMX_MEDIA[s.format] : undefined;
      text = (await safeFetchText(s.url, { allow: u => u.host === host, accept: sdmxAt?.accept ?? 'text/csv, text/plain;q=0.8, */*;q=0.1', types: sdmxAt && s.format !== 'sdmx-csv' ? /json|xml|text\/plain|octet-stream/i : /csv|text\/plain|octet-stream|excel/i, maxBytes: 20_000_000, fetch: deps.fetch, resolve: deps.resolve })).text;
    }
    if (text.length > 20_000_000) throw new Error('The CSV is larger than 20 MB');
    const sdmxFile = isSdmxFormat(s.format) ? s.format : undefined;
    const mapping = streamed ? STREAM_MAPPING : sdmxFile ? SDMX_MAPPING : s.mapping;
    run.sha256 ??= createHash('sha256').update(text, 'utf8').digest('hex');
    const rows = streamed ?? (sdmxFile ? readSdmx(sdmxFile, text, sdmxMetric, s.sdmx).map(r => nationArea(r)) : parseCsv(text));
    run.rows = rows.length;
    if (rows.length > LIMITS.rows) throw new Error(`More than ${LIMITS.rows} rows`);
    const fresh: Observation[] = [];
    rows.forEach((row, i) => {
      const reject = (reason: string) => { if (run.rejected.length < LIMITS.rejectedShown) run.rejected.push({ row: i + 2, reason }); };
      if (row[SDMX_ROW.reject]) return reject(row[SDMX_ROW.reject]!);
      const ref = (row[mapping.entity] ?? '').trim();
      const entity = resolveEntity(ref, s.system);
      if (!entity) return reject(ref ? `"${ref}" is not an entity of the register (link it to one with its id)` : 'No entity');
      const metric = (col(row, mapping.metric) ?? '').trim().toLowerCase();
      if (!METRIC.test(metric)) return reject(`"${metric}" is not a metric name`);
      const def = getMetric(metric);
      if (!def) return reject(`"${metric}" is not a registered metric (register it with its unit first)`);
      // A registered metric has one UCUM unit: a row in another unit is refused, never converted or guessed.
      const rawUnit = (col(row, mapping.unit) ?? '').trim();
      let unit = rawUnit.slice(0, 24);
      if (def.origin !== 'observed') {
        if (rawUnit && !toUcum(rawUnit)) return reject(`"${rawUnit}" is not a UCUM unit (${metric} is counted in ${def.unit})`);
        if (rawUnit && !sameUnit(rawUnit, def.unit)) return reject(`"${rawUnit}" is not the unit of ${metric} (${def.unit})`);
        unit = def.unit;
      }
      const rawValue = (row[mapping.value] ?? '').replace(/[\s,]/g, '');
      const value = Number(rawValue);
      if (rawValue === '' || !Number.isFinite(value)) return reject(`"${row[mapping.value] ?? ''}" is not a number`);
      const validFrom = mapping.date ? isoDate(col(row, mapping.date)) : now.toISOString().slice(0, 10);
      if (!validFrom) return reject(`"${col(row, mapping.date)}" is not a date or year`);
      if (validFrom > now.toISOString().slice(0, 10)) return reject(`${validFrom} is in the future`);
      const rawTo = (col(row, mapping.validTo) ?? '').trim();
      const validTo = rawTo ? isoDate(rawTo) : undefined;
      if (rawTo && !validTo) return reject(`"${rawTo}" is not a date for the end of the value's validity`);
      if (validTo && validTo <= validFrom) return reject(`It stops being true (${validTo}) before it starts (${validFrom})`);
      const q = readQuality(row, mapping.quality);
      if (typeof q === 'string') return reject(q);
      fresh.push({ entityId: entity.id, metric, value, unit, validFrom, ...(validTo ? { validTo } : {}), recordedAt: run.at, ...(q ? { quality: q } : {}), sourceId, runId: run.id });
    });
    run.accepted = fresh.length;
    const refused = run.rows - run.accepted;
    run.status = run.accepted === 0 ? 'failed' : refused > 0 ? 'partial' : 'ok';
    // A stream with no complete new day since its last run has nothing to add: not a failure.
    if (streamed && run.rows === 0) run.status = 'ok';
    else if (run.accepted === 0 && !run.error) run.error = 'No row could be accepted';
    repo().addObservations(fresh);
    if (fresh.length) notifyObservations(fresh);
  } catch (e) {
    run.status = 'failed';
    run.error = (e as Error).message;
  }
  s.lastRun = run.at;
  repo().saveSource(s);
  repo().addRun(run);
  // Over the working limits: the oldest move to the history archive, never dropped (audited).
  const oldObs = d.observations.length > LIMITS.observations ? d.observations.splice(0, d.observations.length - LIMITS.observations) : [];
  const oldRuns = d.runs.length > LIMITS.runs ? d.runs.splice(LIMITS.runs).reverse() : [];
  if (oldObs.length || oldRuns.length) {
    const move = archive(oldObs, oldRuns, run.at);
    recordAudit('Twin register', 'twin.archive', `Twin:${s.id}/${run.id}`, 'ok', `${move.observations} observations and ${move.runs} runs moved to the history archive${move.oldestRecordedAt ? ` (recorded ${move.oldestRecordedAt.slice(0, 10)} to ${move.newestRecordedAt!.slice(0, 10)})` : ''}`);
  }
  recordAudit(run.by, 'twin.source.run', `Twin:${s.id}/${run.id}`, run.status === 'failed' ? 'error' : 'ok', run.error ?? `${run.accepted} of ${run.rows} rows`);
  return run;
}

/**
 * Withdraw an import (a correction): its observations are marked superseded
 * from now, never deleted, so "what was known then" still answers with them
 * and every later query does not. A named official with a reason; audited.
 */
export function withdrawRun(runId: string, by: string, reason: string, now = new Date()): { run: TwinRun; superseded: number } | { error: string } {
  const d = db();
  const run = d.runs.find(r => r.id === runId) ?? archivedRuns().find(r => r.id === runId);
  if (!run) return { error: 'No such import' };
  const who = by.trim(), why = reason.trim();
  if (!who) return { error: 'Name the official withdrawing the import' };
  if (why.length < 4) return { error: 'Give the reason for withdrawing it' };
  if (run.withdrawn) return { error: `Already withdrawn on ${run.withdrawn.at.slice(0, 10)} by ${run.withdrawn.by}` };
  const at = now.toISOString();
  const superseded = repo().supersedeRun(runId, at);
  run.withdrawn = { at, by: who, reason: why.slice(0, 500) };
  repo().saveRun(run);
  recordAudit(who, 'twin.run.withdraw', `Twin:${run.sourceId}/${run.id}`, 'ok', `${superseded} observations superseded · ${run.withdrawn.reason}`);
  return { run: { ...run }, superseded };
}

// ── Four-eyes withdrawal ──────────────────────────────────────────────────
// Under the nation's twin policy (lib/twin/policy.ts, on by default) one
// official proposes withdrawing an import with a reason, and a different one
// confirms it (or either cancels it); each step is named and audited. With
// the policy off, a proposal withdraws at once, as before.

const findRun = (runId: string): TwinRun | undefined => db().runs.find(r => r.id === runId) ?? archivedRuns().find(r => r.id === runId);
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export type WithdrawalStep = { run: TwinRun; pending: true } | { run: TwinRun; pending: false; superseded: number };

/** Propose withdrawing an import: waits for a second official under four-eyes, or withdraws at once when the policy is off. */
export function proposeWithdrawal(runId: string, by: string, reason: string, now = new Date()): WithdrawalStep | { error: string } {
  const run = findRun(runId);
  if (!run) return { error: 'No such import' };
  const who = by.trim(), why = reason.trim();
  if (!who) return { error: 'Name the official withdrawing the import' };
  if (why.length < 4) return { error: 'Give the reason for withdrawing it' };
  if (run.withdrawn) return { error: `Already withdrawn on ${run.withdrawn.at.slice(0, 10)} by ${run.withdrawn.by}` };
  if (!twinPolicy().fourEyesWithdrawal) {
    const r = withdrawRun(runId, who, why, now);
    return 'error' in r ? r : { run: r.run, pending: false, superseded: r.superseded };
  }
  if (run.withdrawalProposed) return { error: `${run.withdrawalProposed.by} already proposed withdrawing it on ${run.withdrawalProposed.at.slice(0, 10)}: a different official confirms or cancels it` };
  run.withdrawalProposed = { at: now.toISOString(), by: who, reason: why.slice(0, 500) };
  recordAudit(who, 'twin.run.withdraw.propose', `Twin:${run.sourceId}/${run.id}`, 'ok', `${run.accepted} observations · ${run.withdrawalProposed.reason} · waiting for a second official`);
  return { run: { ...run }, pending: true };
}

/** Confirm a proposed withdrawal: a different official than the one who proposed it. */
export function confirmWithdrawal(runId: string, by: string, now = new Date()): WithdrawalStep | { error: string } {
  const run = findRun(runId);
  if (!run) return { error: 'No such import' };
  const who = by.trim();
  if (!who) return { error: 'Name the official confirming the withdrawal' };
  const p = run.withdrawalProposed;
  if (!p) return { error: run.withdrawn ? `Already withdrawn on ${run.withdrawn.at.slice(0, 10)} by ${run.withdrawn.by}` : 'No withdrawal of this import is waiting to be confirmed' };
  if (sameName(p.by, who)) return { error: 'A different official must confirm the withdrawal they did not propose' };
  const r = withdrawRun(runId, who, p.reason, now);
  if ('error' in r) return r;
  const live = findRun(runId)!;
  live.withdrawn = { ...live.withdrawn!, proposedBy: p.by };
  delete live.withdrawalProposed;
  return { run: { ...live }, pending: false, superseded: r.superseded };
}

/** Cancel a proposed withdrawal (the proposer or another official), with a reason; audited. */
export function cancelWithdrawal(runId: string, by: string, reason: string): { run: TwinRun } | { error: string } {
  const run = findRun(runId);
  if (!run) return { error: 'No such import' };
  const who = by.trim();
  if (!who) return { error: 'Name the official cancelling the proposal' };
  if (!run.withdrawalProposed) return { error: 'No withdrawal of this import is waiting to be confirmed' };
  const p = run.withdrawalProposed;
  delete run.withdrawalProposed;
  recordAudit(who, 'twin.run.withdraw.cancel', `Twin:${run.sourceId}/${run.id}`, 'ok', `Proposal by ${p.by} cancelled${reason.trim() ? ` · ${reason.trim().slice(0, 300)}` : ''}`);
  return { run: { ...run } };
}

// Listeners told when an import adds observations (e.g. scenario calibration,
// lib/twin/scenarios.ts). Named, so a module loaded twice registers once; a
// failing listener never fails the import.
const listeners = new Map<string, (fresh: Observation[]) => void>();
export function onObservations(name: string, fn: (fresh: Observation[]) => void): void { listeners.set(name, fn); }
function notifyObservations(fresh: Observation[]): void {
  for (const fn of listeners.values()) { try { fn(fresh); } catch { /* the import stands; the listener catches up on its next read */ } }
}

/** Sources whose schedule says they are due (for /api/cron/twin-ingest). */
export function dueSources(now = new Date()): TwinSource[] {
  const gap = { daily: 86_400_000, weekly: 7 * 86_400_000 } as const;
  return db().sources.filter(s => (s.kind === 'csv-url' || s.kind === 'stream') && s.schedule !== 'manual' && (!s.lastRun || now.getTime() - Date.parse(s.lastRun) >= gap[s.schedule] - 60_000));
}

// ── As-of queries ─────────────────────────────────────────────────────────

/**
 * The latest value of each entity's metric true by a moment (asOf, valid time)
 * as the platform knew it at knownAt (transaction time; default: the same
 * moment, i.e. "what was known then"). Pass knownAt = now for "what was true
 * then, as known today".
 */
export function stateAsOf({ asOf, knownAt, metric, entityId }: { asOf?: string; knownAt?: string; metric?: string; entityId?: string } = {}): Observation[] {
  const t = asOf ? new Date(asOf) : new Date();
  const day = t.toISOString().slice(0, 10);
  const at = (knownAt ? new Date(knownAt) : t).toISOString();
  const best = new Map<string, Observation>();
  const consider = (o: Observation) => {
    if (metric && o.metric !== metric) return;
    if (entityId && o.entityId !== entityId) return;
    if (o.recordedAt > at || o.validFrom > day) return;
    if (o.supersededAt && o.supersededAt <= at) return;
    if (o.validTo && o.validTo <= day) return;
    const k = `${o.entityId}|${o.metric}`;
    const cur = best.get(k);
    if (!cur || o.validFrom > cur.validFrom || (o.validFrom === cur.validFrom && o.recordedAt > cur.recordedAt)) best.set(k, o);
  };
  // The history archive first (older), then the live register.
  forEachArchived(metric, consider);
  db().observations.forEach(consider);
  return [...best.values()];
}

const sourceName = (id: string) => db().sources.find(s => s.id === id)?.name ?? id;

/** One entity's metric as a signal: observed with its source and date, or null when nothing is known. */
export function signalFor(entityId: string, metric: string, asOf?: string): Signal<number> | null {
  const o = stateAsOf({ asOf, metric, entityId })[0];
  return o ? { value: o.value, unit: o.unit, kind: 'observed', source: sourceName(o.sourceId), asOf: o.validFrom } : null;
}

export interface NationalFigure extends Signal<number> {
  /** Regions with a value, of the nation's operational regions. */
  coverage: { have: number; of: number };
  /** The oldest and newest date the figures combined were true for. */
  vintage?: { oldest: string; newest: string };
  /** How the regions were combined (lib/twin/metrics.ts), or "national" for a figure recorded for the nation itself. */
  aggregation?: Aggregation | 'national';
  /** Why no national figure is shown although regions report: regions missing, units differ, not additive, weights missing. */
  refused?: string;
}

/**
 * A national figure from the nation's operational regions, combined as the
 * metric's definition says (sum, mean or weighted mean; lib/twin/metrics.ts),
 * and only when every region has a value in the same unit. Otherwise the
 * figure comes back without a value and with the reason (a partial sum, a sum
 * of rates or of mixed units is never shown as the nation's). A figure
 * recorded for the nation itself wins. Null when nothing is observed at all.
 */
export function nationalTotal(metric: string, asOf?: string): NationalFigure | null {
  const regions = regionEntities();
  const obs = stateAsOf({ asOf, metric });
  if (!obs.length) return null;
  const national = obs.find(o => db().entities[o.entityId]?.kind === 'nation');
  if (national) {
    return { value: national.value, unit: national.unit, kind: 'observed', source: sourceName(national.sourceId), asOf: national.validFrom,
      coverage: { have: regions.length, of: regions.length }, vintage: { oldest: national.validFrom, newest: national.validFrom }, aggregation: 'national' };
  }
  const def = getMetric(metric);
  const byRegion = regions.map(r => obs.find(o => o.entityId === r.id)).filter((o): o is Observation => !!o);
  const coverage = { have: byRegion.length, of: regions.length };
  const refuse = (refused: string, unit?: string): NationalFigure => ({ value: null, ...(unit ? { unit } : {}), kind: 'unavailable', source: 'Not combined', coverage, ...(def ? { aggregation: def.aggregation } : {}), refused });
  if (!regions.length) return refuse('The nation has no operational regions to combine');
  if (byRegion.length < regions.length) return refuse(`Only ${byRegion.length} of ${regions.length} regions report ${metric}; a national figure needs every region`);
  const units = [...new Set(byRegion.map(o => toUcum(o.unit) ?? o.unit))];
  if (units.length > 1) return refuse(`The regions report ${metric} in different units (${units.join(', ')}); they are not combined`);
  const unit = byRegion[0]!.unit;
  if (!def || def.aggregation === 'none') return refuse(`${def?.label ?? metric} is not registered as combinable across regions: register it with sum, mean or weighted mean`, unit);
  let value: number;
  if (def.aggregation === 'sum') value = byRegion.reduce((s, o) => s + o.value, 0);
  else if (def.aggregation === 'mean') value = byRegion.reduce((s, o) => s + o.value, 0) / byRegion.length;
  else {
    const wm = def.weightMetric ?? '';
    const weights = stateAsOf({ asOf, metric: wm });
    const w = byRegion.map(o => weights.find(x => x.entityId === o.entityId));
    const missing = w.filter(x => !x).length;
    if (missing) return refuse(`${missing} of ${regions.length} regions have no ${wm} to weight ${metric} by`, unit);
    if (new Set(w.map(x => toUcum(x!.unit) ?? x!.unit)).size > 1) return refuse(`The weights (${wm}) are in different units`, unit);
    const total = w.reduce((s, x) => s + x!.value, 0);
    if (!(total > 0)) return refuse(`The weights (${wm}) add up to zero`, unit);
    value = byRegion.reduce((s, o, i) => s + o.value * w[i]!.value, 0) / total;
  }
  const dates = byRegion.map(o => o.validFrom).sort();
  return {
    value, unit, kind: 'observed',
    source: [...new Set(byRegion.map(o => sourceName(o.sourceId)))].join(', '), asOf: dates[0],
    coverage, vintage: { oldest: dates[0]!, newest: dates.at(-1)! }, aggregation: def.aggregation,
  };
}

/** Coverage of a metric across the nation's regions (for the sources page). */
export function regionCoverage(metric: string): { have: number; of: number } {
  const regions = regionEntities();
  const obs = stateAsOf({ metric });
  return { have: regions.filter(r => obs.some(o => o.entityId === r.id)).length, of: regions.length };
}

export function metricsKnown(): string[] {
  return [...new Set([...db().observations.map(o => o.metric), ...archivedMetrics()])].sort();
}

/** The dates a metric has observations for (when they were true), oldest first: the steps of the history view. */
export function metricDates(metric: string): string[] {
  return [...new Set([...archivedObservations(metric), ...db().observations].filter(o => o.metric === metric && !o.supersededAt).map(o => o.validFrom))].sort();
}

/** Every current value recorded for an entity over time (withdrawn imports excluded; live register and archive), oldest first. */
export function entityHistory(entityId: string): Observation[] {
  const out: Observation[] = [];
  const visit = (o: Observation) => { if (o.entityId === entityId && !o.supersededAt) out.push({ ...o }); };
  forEachArchived(undefined, visit);
  db().observations.forEach(visit);
  return out.sort((a, b) => a.validFrom.localeCompare(b.validFrom) || a.recordedAt.localeCompare(b.recordedAt));
}

/** An entity as the register holds it. */
export function getEntity(id: string): TwinEntity | undefined {
  const e = db().entities[id];
  if (e && !e.uri) ensureUris();
  return e ? { ...e } : undefined;
}

/** One entity with its cross-system ids, its latest observations (true now, as known now) and the sources behind them. */
export function entityProfile(id: string): { entity: TwinEntity; keys: { system: string; key: string }[]; observations: Observation[]; sources: { id: string; name: string; publisher: string }[] } | undefined {
  const entity = getEntity(id);
  if (!entity) return undefined;
  const observations = stateAsOf({ entityId: id });
  const used = new Set(observations.map(o => o.sourceId));
  return {
    entity,
    keys: db().keys.filter(k => k.entityId === id).map(k => ({ system: k.system, key: k.key })),
    observations,
    sources: db().sources.filter(s => used.has(s.id)).map(s => ({ id: s.id, name: s.name, publisher: s.publisher })),
  };
}

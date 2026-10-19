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

import { recordAudit, listMinistries } from '@/lib/data/store';
import { nationIso3, nationRegions } from '@/lib/nation/registry';
import { loadDivisions } from '@/lib/geo/divisions';
import { safeFetchText } from '@/lib/net/safe-fetch';
import { parseCsv } from './csv';
import { twinDb, resetTwinDb, type TwinDb } from './db';
import { METRIC_ID } from './metrics';
import type { Signal } from './signal';

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
}

export interface SourceMapping {
  /** Column holding the entity: its code (ISO 3166-2), its name, or the source's own id. */
  entity: string;
  /** Column holding the value. */
  value: string;
  /** Column holding the metric name, or a fixed metric for every row. */
  metric: { column: string } | { fixed: string };
  unit?: { column: string } | { fixed: string };
  /** Column holding the date or year the value is true for, or one date for the whole file. */
  date?: { column: string } | { fixed: string };
}

export interface TwinSource {
  id: string;
  name: string;
  /** Who publishes it, e.g. "National Statistics Office". */
  publisher: string;
  kind: 'csv-url' | 'csv-upload';
  url?: string;
  /** System name used in the crosswalk for this source's own entity ids. */
  system: string;
  mapping: SourceMapping;
  schedule: 'manual' | 'daily' | 'weekly';
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
}

export interface Observation {
  entityId: string;
  metric: string;
  value: number;
  unit: string;
  /** When it was true (ISO date). */
  validFrom: string;
  /** When the platform recorded it (ISO time). */
  recordedAt: string;
  sourceId: string;
  runId: string;
}

const db = twinDb;
export type { TwinDb };
export function resetTwin(): void { resetTwinDb(); }

export const LIMITS = { observations: 200_000, runs: 500, rejectedShown: 50, rows: 100_000 } as const;
const METRIC = METRIC_ID;
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const slug = (s: string) => fold(s).replace(/ /g, '-').slice(0, 60);

// ── Entities ──────────────────────────────────────────────────────────────

/**
 * Bring the register in line with the installed nation: the nation, its
 * official subdivisions (ISO 3166-2) and its operational regions, and its
 * institutions. Ids never change once given; entities are added, not removed.
 */
export async function syncRegister(): Promise<{ entities: number }> {
  const d = db();
  const iso3 = nationIso3();
  const regions = nationRegions();
  const ministries = listMinistries();
  const stamp = `${iso3 ?? '-'}|${regions.join('|')}|${ministries.map(m => m.id).join('|')}`;
  if (d.syncedFor === stamp) return { entities: Object.keys(d.entities).length };
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
    d.entities[id] = { id, kind: 'institution', name: m.name, parent: nationId };
  }
  d.syncedFor = stamp;
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
  d.entities[id] = { id, kind: 'facility', name: f.name, code: f.id, location: { lat: f.location.lat, lng: f.location.lng }, ...(f.regionCode ? { parent: `place:${f.regionCode}` } : {}) };
  for (const [system, key] of Object.entries(f.ids)) {
    if (!d.keys.some(k => k.system === system && k.key === key)) d.keys.push({ entityId: id, system, key });
  }
}

export function listEntities(kind?: EntityKind): TwinEntity[] {
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
  if (!clash) d.keys.push({ entityId, system, key });
  recordAudit(by, 'twin.key.link', `Twin:${entityId}`, 'ok', `${system}:${key}`);
  return { ok: true };
}

// ── Sources and runs ──────────────────────────────────────────────────────

export function listSources(): TwinSource[] { return db().sources.map(s => ({ ...s })); }
export function listRuns(sourceId?: string): TwinRun[] { return db().runs.filter(r => !sourceId || r.sourceId === sourceId).map(r => ({ ...r })); }

export function registerSource(input: Partial<TwinSource> & { by?: string }): TwinSource | { error: string } {
  const by = (input.by ?? '').trim();
  if (!by) return { error: 'Name the official registering the source' };
  const name = (input.name ?? '').trim(), publisher = (input.publisher ?? '').trim();
  if (!name || !publisher) return { error: 'Give the source a name and its publisher' };
  if (input.kind !== 'csv-url' && input.kind !== 'csv-upload') return { error: 'A source is a CSV at an address, or uploaded' };
  let url: string | undefined;
  if (input.kind === 'csv-url') {
    try { const u = new URL(String(input.url)); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw 0; url = u.href; }
    catch { return { error: 'Give the address of the CSV (http or https)' }; }
  }
  const m = input.mapping;
  if (!m || !m.entity || !m.value || !m.metric) return { error: 'Say which columns hold the entity, the value and the metric' };
  if ('fixed' in m.metric && !METRIC.test(m.metric.fixed)) return { error: 'A metric is lower case letters, digits, dots and underscores, e.g. population or cpi.all_items' };
  const d = db();
  const s: TwinSource = {
    id: `SRC-${d.seq++}`, name: name.slice(0, 120), publisher: publisher.slice(0, 120), kind: input.kind, ...(url ? { url } : {}),
    system: (input.system ?? slug(publisher)).slice(0, 60) || 'source', mapping: m,
    schedule: input.schedule === 'daily' || input.schedule === 'weekly' ? input.schedule : 'manual',
    registeredBy: by, registeredAt: new Date().toISOString(),
  };
  d.sources.push(s);
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

export interface RunDeps { fetch?: typeof fetch; resolve?: (host: string) => Promise<string[]>; now?: Date }

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
  const run: TwinRun = { id: `RUN-${d.seq++}`, sourceId, at: now.toISOString(), by: by.trim(), status: 'ok', rows: 0, accepted: 0, rejected: [] };
  let text = csv;
  try {
    if (text === undefined) {
      if (s.kind !== 'csv-url' || !s.url) throw new Error('This source is uploaded: send its CSV');
      const host = new URL(s.url).host;
      text = (await safeFetchText(s.url, { allow: u => u.host === host, accept: 'text/csv, text/plain;q=0.8, */*;q=0.1', types: /csv|text\/plain|octet-stream|excel/i, fetch: deps.fetch, resolve: deps.resolve })).text;
    }
    if (text.length > 20_000_000) throw new Error('The CSV is larger than 20 MB');
    const rows = parseCsv(text);
    run.rows = rows.length;
    if (rows.length > LIMITS.rows) throw new Error(`More than ${LIMITS.rows} rows`);
    const fresh: Observation[] = [];
    rows.forEach((row, i) => {
      const reject = (reason: string) => { if (run.rejected.length < LIMITS.rejectedShown) run.rejected.push({ row: i + 2, reason }); };
      const ref = (row[s.mapping.entity] ?? '').trim();
      const entity = resolveEntity(ref, s.system);
      if (!entity) return reject(ref ? `"${ref}" is not an entity of the register (link it to one with its id)` : 'No entity');
      const metric = (col(row, s.mapping.metric) ?? '').trim().toLowerCase();
      if (!METRIC.test(metric)) return reject(`"${metric}" is not a metric name`);
      const rawValue = (row[s.mapping.value] ?? '').replace(/[\s,]/g, '');
      const value = Number(rawValue);
      if (rawValue === '' || !Number.isFinite(value)) return reject(`"${row[s.mapping.value] ?? ''}" is not a number`);
      const validFrom = s.mapping.date ? isoDate(col(row, s.mapping.date)) : now.toISOString().slice(0, 10);
      if (!validFrom) return reject(`"${col(row, s.mapping.date)}" is not a date or year`);
      if (validFrom > now.toISOString().slice(0, 10)) return reject(`${validFrom} is in the future`);
      fresh.push({ entityId: entity.id, metric, value, unit: (col(row, s.mapping.unit) ?? '').trim().slice(0, 24), validFrom, recordedAt: run.at, sourceId, runId: run.id });
    });
    run.accepted = fresh.length;
    const refused = run.rows - run.accepted;
    run.status = run.accepted === 0 ? 'failed' : refused > 0 ? 'partial' : 'ok';
    if (run.accepted === 0 && !run.error) run.error = 'No row could be accepted';
    d.observations.push(...fresh);
    if (d.observations.length > LIMITS.observations) d.observations.splice(0, d.observations.length - LIMITS.observations);
  } catch (e) {
    run.status = 'failed';
    run.error = (e as Error).message;
  }
  s.lastRun = run.at;
  d.runs.unshift(run);
  d.runs.splice(LIMITS.runs);
  recordAudit(run.by, 'twin.source.run', `Twin:${s.id}/${run.id}`, run.status === 'failed' ? 'error' : 'ok', run.error ?? `${run.accepted} of ${run.rows} rows`);
  return run;
}

/** Sources whose schedule says they are due (for /api/cron/twin-ingest). */
export function dueSources(now = new Date()): TwinSource[] {
  const gap = { daily: 86_400_000, weekly: 7 * 86_400_000 } as const;
  return db().sources.filter(s => s.kind === 'csv-url' && s.schedule !== 'manual' && (!s.lastRun || now.getTime() - Date.parse(s.lastRun) >= gap[s.schedule] - 60_000));
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
  for (const o of db().observations) {
    if (metric && o.metric !== metric) continue;
    if (entityId && o.entityId !== entityId) continue;
    if (o.recordedAt > at || o.validFrom > day) continue;
    const k = `${o.entityId}|${o.metric}`;
    const cur = best.get(k);
    if (!cur || o.validFrom > cur.validFrom || (o.validFrom === cur.validFrom && o.recordedAt > cur.recordedAt)) best.set(k, o);
  }
  return [...best.values()];
}

const sourceName = (id: string) => db().sources.find(s => s.id === id)?.name ?? id;

/** One entity's metric as a signal: observed with its source and date, or null when nothing is known. */
export function signalFor(entityId: string, metric: string, asOf?: string): Signal<number> | null {
  const o = stateAsOf({ asOf, metric, entityId })[0];
  return o ? { value: o.value, unit: o.unit, kind: 'observed', source: sourceName(o.sourceId), asOf: o.validFrom } : null;
}

/**
 * A national figure as the sum over the nation's operational regions, only
 * when every region has a value (otherwise a partial sum would be shown as the
 * nation's); a figure for the nation itself wins when one is recorded.
 */
export function nationalTotal(metric: string, asOf?: string): (Signal<number> & { coverage: { have: number; of: number } }) | null {
  const regions = regionEntities();
  const obs = stateAsOf({ asOf, metric });
  const national = obs.find(o => db().entities[o.entityId]?.kind === 'nation');
  if (national) return { value: national.value, unit: national.unit, kind: 'observed', source: sourceName(national.sourceId), asOf: national.validFrom, coverage: { have: regions.length, of: regions.length } };
  const byRegion = regions.map(r => obs.find(o => o.entityId === r.id)).filter((o): o is Observation => !!o);
  if (!regions.length || byRegion.length < regions.length) return null;
  const oldest = byRegion.reduce((a, o) => (o.validFrom < a ? o.validFrom : a), byRegion[0]!.validFrom);
  return {
    value: byRegion.reduce((s, o) => s + o.value, 0), unit: byRegion[0]!.unit, kind: 'observed',
    source: [...new Set(byRegion.map(o => sourceName(o.sourceId)))].join(', '), asOf: oldest,
    coverage: { have: byRegion.length, of: regions.length },
  };
}

/** Coverage of a metric across the nation's regions (for the sources page). */
export function regionCoverage(metric: string): { have: number; of: number } {
  const regions = regionEntities();
  const obs = stateAsOf({ metric });
  return { have: regions.filter(r => obs.some(o => o.entityId === r.id)).length, of: regions.length };
}

export function metricsKnown(): string[] {
  return [...new Set(db().observations.map(o => o.metric))].sort();
}

/** The dates a metric has observations for (when they were true), oldest first: the steps of the history view. */
export function metricDates(metric: string): string[] {
  return [...new Set(db().observations.filter(o => o.metric === metric).map(o => o.validFrom))].sort();
}

/** An entity as the register holds it. */
export function getEntity(id: string): TwinEntity | undefined {
  const e = db().entities[id];
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

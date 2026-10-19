// Readings pushed to the platform for the twin's stream sources (review I3,
// register 16.3 and 16.19): what SensorThings clients post (POST
// Observations, CreateObservations; lib/twin/sta-write.ts) and what the
// nation's own MQTT broker delivers (lib/twin/mqtt.ts), both through
// lib/twin/stream-ingest.ts. A reading is not an observation: the stream's
// daily run (runSource) reads them beside the substrate's samples
// (PLATFORM_TELEMETRY in lib/twin/stream.ts) and records the day's statistic
// as an observation of that run, with the readings' SHA-256 in its lineage.
//
// One store on globalThis (__civicosStreamReadings), saved and restored by
// lib/data/persist.ts like every store (JSON only). Readings are kept sorted
// by time, one per instant per stream (an MQTT QoS 1 redelivery or a client's
// retry is a duplicate, not a second reading), for 92 days (the aggregation
// reaches back at most 90) and at most READINGS_PER_STREAM per stream.
// MQTT passwords are held here sealed under the key custody of lib/keys
// (lib/crypto/envelope.ts, bound to the source), never in the source record.

import { randomUUID } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import type { TelemetrySampleRow, TelemetryStreamRow } from '@/lib/db/types';
import { withDefaults } from '@/lib/data/defaults';
import { seal, open } from '@/lib/crypto/envelope';

export type ReadingVia = 'sta' | 'mqtt';

export interface Reading {
  id: string;
  /** When the value was measured (ISO time, UTC). */
  ts: string;
  value: number;
  /** When the platform received it. */
  receivedAt: string;
  via: ReadingVia;
  /** The stream source it was posted to. */
  sourceId: string;
  /**
   * Set when its sender withdrew it (SensorThings DELETE, lib/twin/sta-write.ts):
   * it stays on record with who and why, but no read serves it and no run
   * counts it. `run` names the standing run that had already counted its day,
   * whose withdrawal was then proposed to the officials.
   */
  withdrawn?: { at: string; by: string; reason: string; run?: string };
}

// A type alias (not an interface) so withDefaults() takes it as a plain record.
type ReadingsStore = {
  /** Streams that receive readings, declared by their source: unit (UCUM) and label. */
  streams: Record<string, { unit: string; label: string; sourceIds: string[] }>;
  /** Readings by stream id, oldest first. */
  readings: Record<string, Reading[]>;
  /** Sealed MQTT passwords by source id. */
  secrets: Record<string, string>;
};

/** Readings kept per stream at most; further readings are refused until older days fall out of the window. */
export const READINGS_PER_STREAM = 200_000;
/** Days a reading is kept (the daily aggregation reaches back at most 90). */
export const READINGS_KEPT_DAYS = 92;
const DAY = 86_400_000;

const seed = (): ReadingsStore => ({ streams: {}, readings: {}, secrets: {} });
const g = globalThis as unknown as { __civicosStreamReadings?: ReadingsStore };
const store = (): ReadingsStore => touch('__civicosStreamReadings', g.__civicosStreamReadings = withDefaults(g.__civicosStreamReadings ??= seed(), seed(), { opaque: ['streams', 'readings', 'secrets'] }));

export function resetReadings(): void { g.__civicosStreamReadings = undefined; }

/** A stream source that receives readings declares its stream (unit, label); several sources may read one stream. */
export function declarePushedStream(streamId: string, d: { unit: string; label: string; sourceId: string }): void {
  const s = store();
  const cur = s.streams[streamId];
  s.streams[streamId] = { unit: d.unit, label: cur?.label ?? d.label, sourceIds: [...new Set([...(cur?.sourceIds ?? []), d.sourceId])] };
}

/** Forget that a source receives readings for a stream (its readings stay until they age out). */
export function undeclarePushedStream(streamId: string, sourceId: string): void {
  const s = store();
  const cur = s.streams[streamId];
  if (!cur) return;
  cur.sourceIds = cur.sourceIds.filter(x => x !== sourceId);
  if (!cur.sourceIds.length) delete s.streams[streamId];
}

/** A pushed stream as the telemetry reader sees it (no substrate row), or null. */
export function pushedStreamRow(streamId: string): TelemetryStreamRow | null {
  const d = store().streams[streamId];
  if (!d) return null;
  return {
    id: `pushed:${streamId}`, stream_id: streamId, charter_id: 'twin', facility_id: null, label: d.label, unit: d.unit, aggregation: 'instantaneous',
    retention_days: READINGS_KEPT_DAYS, warn_threshold: null, alert_threshold: null, active: true, created_at: '', updated_at: '',
  };
}

/** Every stream that receives readings, as telemetry rows (SensorThings lists them beside the substrate's). */
export function pushedStreams(): TelemetryStreamRow[] {
  return Object.keys(store().streams).sort().map(id => pushedStreamRow(id)!);
}

const asSample = (streamId: string, r: Reading): TelemetrySampleRow => ({ id: r.id, stream_id: streamId, ts: r.ts, value: r.value, facility_id: null, meta: { via: r.via } });

/** First index whose time is >= t (readings are sorted by time). */
function lowerBound(list: Reading[], t: number): number {
  let lo = 0, hi = list.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (Date.parse(list[mid]!.ts) < t) lo = mid + 1; else hi = mid; }
  return lo;
}

/** A stream's pushed readings with from <= ts < to, oldest first, at most `limit` (withdrawn readings are never counted). */
export function pushedReadingsBetween(streamId: string, from: string, to: string, limit: number): TelemetrySampleRow[] {
  const list = store().readings[streamId];
  if (!list?.length) return [];
  const a = lowerBound(list, Date.parse(from)), b = lowerBound(list, Date.parse(to));
  const out: TelemetrySampleRow[] = [];
  for (let i = a; i < b && out.length < limit; i++) if (!list[i]!.withdrawn) out.push(asSample(streamId, list[i]!));
  return out;
}

/** The latest pushed readings of a stream that stand, newest first. */
export function recentPushedReadings(streamId: string, limit: number): TelemetrySampleRow[] {
  const list = store().readings[streamId] ?? [];
  const out: TelemetrySampleRow[] = [];
  for (let i = list.length - 1; i >= 0 && out.length < limit; i--) if (!list[i]!.withdrawn) out.push(asSample(streamId, list[i]!));
  return out;
}

/** How many readings a stream holds that stand, how many were withdrawn, and the newest. */
export function readingsStatus(streamId: string): { readings: number; withdrawn: number; newest?: string } {
  const list = store().readings[streamId] ?? [];
  const standing = list.filter(r => !r.withdrawn);
  return { readings: standing.length, withdrawn: list.length - standing.length, ...(standing.length ? { newest: standing.at(-1)!.ts } : {}) };
}

/** One reading of a stream by its id (withdrawn ones included), or undefined. */
export function getReading(streamId: string, id: string): Reading | undefined {
  const r = store().readings[streamId]?.find(x => x.id === id);
  return r ? { ...r } : undefined;
}

/**
 * Mark a reading withdrawn by its sender (never erased): who, why, when, and
 * the standing run that had already counted its day, if any. Returns the
 * reading as it now stands, or why it cannot be withdrawn.
 */
export function markReadingWithdrawn(streamId: string, id: string, w: { by: string; reason: string; run?: string }, now = new Date()): Reading | { error: string } {
  const r = store().readings[streamId]?.find(x => x.id === id);
  if (!r) return { error: 'No such reading' };
  if (r.withdrawn) return { error: `Already withdrawn on ${r.withdrawn.at.slice(0, 10)} by ${r.withdrawn.by}` };
  r.withdrawn = { at: now.toISOString(), by: w.by.slice(0, 160), reason: w.reason.slice(0, 500), ...(w.run ? { run: w.run } : {}) };
  return { ...r };
}

/**
 * Keep checked readings (the caller has validated each): one per instant, in
 * time order. Returns the readings kept and, by position in `items`, those
 * refused (a duplicate of an instant already held, or the stream full).
 */
export function addReadings(streamId: string, items: { ts: string; value: number }[], meta: { via: ReadingVia; sourceId: string }, now = new Date()): { kept: Reading[]; refused: { index: number; reason: string }[] } {
  const s = store();
  const list = (s.readings[streamId] ??= []);
  // Days outside the window drop out first.
  const oldest = now.getTime() - READINGS_KEPT_DAYS * DAY;
  const out = lowerBound(list, oldest);
  if (out > 0) list.splice(0, out);
  const kept: Reading[] = [];
  const refused: { index: number; reason: string }[] = [];
  const receivedAt = now.toISOString();
  items.forEach((it, index) => {
    const t = Date.parse(it.ts);
    const at = lowerBound(list, t);
    // A withdrawn reading at the same instant does not stand in the way of its correction (a new reading).
    let held: Reading | undefined;
    for (let i = at; i < list.length && Date.parse(list[i]!.ts) === t; i++) if (!list[i]!.withdrawn) { held = list[i]; break; }
    if (held) {
      refused.push({ index, reason: held.value === it.value ? `A reading at ${it.ts} is already held (a repeated delivery)` : `A different reading at ${it.ts} is already held (${held.value}); readings are not overwritten: withdraw it (SensorThings DELETE) and send the correction` });
      return;
    }
    if (list.length >= READINGS_PER_STREAM) { refused.push({ index, reason: `The stream holds ${READINGS_PER_STREAM} readings, the most kept; older days must age out first` }); return; }
    const r: Reading = { id: randomUUID(), ts: new Date(t).toISOString(), value: it.value, receivedAt, via: meta.via, sourceId: meta.sourceId };
    list.splice(at, 0, r);
    kept.push(r);
  });
  return { kept, refused };
}

// ── Broker credentials ────────────────────────────────────────────────────

const aad = (sourceId: string) => `twin.mqtt:${sourceId}`;

/** Hold an MQTT password for a source, sealed (lib/crypto/envelope.ts); an empty one is forgotten. */
export function holdBrokerPassword(sourceId: string, password: string | undefined): void {
  const s = store();
  if (!password) { delete s.secrets[sourceId]; return; }
  s.secrets[sourceId] = seal(password, aad(sourceId));
}

/** The MQTT password held for a source, opened; resealed under the current key when it was sealed under an older one. */
export function brokerPassword(sourceId: string): string | undefined {
  const s = store();
  const stored = s.secrets[sourceId];
  if (!stored) return undefined;
  const o = open(stored, aad(sourceId));
  if ('error' in o) throw new Error(`The broker password for ${sourceId} cannot be opened: ${o.error}`);
  if (o.reseal) s.secrets[sourceId] = seal(o.plain, aad(sourceId));
  return o.plain;
}

export const hasBrokerPassword = (sourceId: string): boolean => !!store().secrets[sourceId];

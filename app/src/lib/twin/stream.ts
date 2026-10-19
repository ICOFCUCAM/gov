// Telemetry streams as a twin source (architecture review I3, register 16.3).
// A source of kind `stream` points at a substrate telemetry stream (by its
// stream id, or by its SensorThings Datastream `telemetry:<stream id>`, the
// same samples as /api/twin/sta serves). On each run, through the same run
// machinery as a file (runSource in lib/twin/register.ts: entity, metric and
// unit checks, refusals with reasons, audit, PROV), every complete UTC day
// since the last one recorded becomes one observation per declared metric:
// the day's mean, minimum, maximum, count or sum of the samples, valid from
// that day to the next. Observed, never modelled; days without samples give
// no value. The due-sources cron (/api/cron/twin-ingest) runs them daily.
//
// The substrate is read in-process (lib/db/repos/telemetry.ts); tests and
// installations without a substrate pass their own reader (TelemetryReader).
//
// A stream source may also receive readings pushed to the platform
// (`ingest`, review I3): through SensorThings (POST Observations or
// CreateObservations on its Datastream, lib/twin/sta-write.ts) with the key of
// the integration bound to it (scope sta:write), and from an MQTT broker of
// the nation's own (lib/twin/mqtt.ts). Both write readings into the platform's
// readings store (lib/twin/readings.ts) through one path
// (lib/twin/stream-ingest.ts); the daily aggregation reads them beside the
// substrate's samples (PLATFORM_TELEMETRY), so they become observations only
// through a run.

import { createHash } from 'node:crypto';
import { telemetryStreamRow, telemetrySamplesBetween } from '@/lib/db/repos/telemetry';
import type { TelemetrySampleRow, TelemetryStreamRow } from '@/lib/db/types';
import { METRIC_ID, isKnownMetric, toUcum } from './metrics';
import { pushedStreamRow, pushedReadingsBetween } from './readings';

export type StreamStatistic = 'mean' | 'min' | 'max' | 'count' | 'sum';
export const STREAM_STATISTICS: readonly StreamStatistic[] = ['mean', 'min', 'max', 'count', 'sum'];

export interface StreamSpec {
  /** The substrate telemetry stream's id (a SensorThings Datastream id `telemetry:<id>` is read as the same stream). */
  streamId: string;
  /** The twin entity the values describe (e.g. facility:FAC-00012, place:KE-30); default: the stream's facility. */
  entity?: string;
  /** Each registered metric and the daily statistic of the samples it records. */
  metrics: { metric: string; statistic: StreamStatistic }[];
  /** The samples' unit as UCUM, when the stream's own unit text is not (e.g. "megawatts" → MW). */
  unit?: string;
  /** Days back the first run aggregates (default 7, at most 90). */
  backfillDays?: number;
  /** Readings pushed to the platform for this stream (SensorThings create, MQTT); needs `unit`. */
  ingest?: StreamIngest;
}

/** SensorThings: the scope an integration needs to post a stream source's readings. */
export const STA_WRITE_SCOPE = 'sta:write';

export interface StreamIngest {
  /** The integration (Connected systems, scope sta:write) whose key may post this stream's readings through SensorThings. */
  integrationId?: string;
  /** An MQTT broker of the nation's own that the platform subscribes to for this stream's readings. */
  mqtt?: MqttSpec;
}

export interface MqttSpec {
  /** mqtts://host[:port] (TLS only; default port 8883). The platform connects only to this host. */
  url: string;
  /** The topic the readings are published on (no wildcards). Subscribed with QoS 1. */
  topic: string;
  username?: string;
  /** Whether a password is held for it: the password itself is kept sealed (lib/crypto/envelope.ts, under the key custody of lib/keys), never in the source. */
  hasPassword?: boolean;
}

const MQTT_TOPIC = /^[^\u0000+#$][^\u0000+#]{0,199}$/;

/** An MQTT broker as a stream source names it, checked; or the reason it cannot be used. */
export function checkMqttSpec(input: unknown): MqttSpec | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'Give the broker\'s address and the topic' };
  const i = input as Partial<MqttSpec>;
  let u: URL;
  try { u = new URL(String(i.url ?? '').trim()); } catch { return { error: 'Give the broker as mqtts://host:port' }; }
  if (u.protocol !== 'mqtts:') return { error: 'The broker must be reached over TLS (mqtts://host:port)' };
  if (u.username || u.password) return { error: 'Do not put credentials in the broker\'s address: give the user name and password separately' };
  if (!u.hostname) return { error: 'The broker\'s address has no host' };
  if ((u.pathname && u.pathname !== '/') || u.search || u.hash) return { error: 'The broker\'s address is mqtts://host:port only (the topic is given separately)' };
  const port = u.port ? Number(u.port) : 8883;
  if (!(port >= 1 && port <= 65535)) return { error: 'The broker\'s port is 1 to 65535' };
  const topic = String(i.topic ?? '').trim();
  if (!MQTT_TOPIC.test(topic)) return { error: 'Give one topic (at most 200 characters, no + or # wildcards, not a $ system topic)' };
  const username = i.username === undefined ? undefined : String(i.username).trim().slice(0, 120);
  return { url: `mqtts://${u.hostname}:${port}`, topic, ...(username ? { username } : {}), ...(i.hasPassword ? { hasPassword: true } : {}) };
}

/** A stream's ingest settings, checked (the password is handled by the caller, never kept here). */
export function checkIngestSpec(input: unknown): StreamIngest | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'Say how readings reach the platform: an integration (SensorThings) or an MQTT broker' };
  const i = input as { integrationId?: unknown; mqtt?: unknown };
  const out: StreamIngest = {};
  if (i.integrationId !== undefined && i.integrationId !== null && i.integrationId !== '') {
    const id = String(i.integrationId).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return { error: 'Name the integration by its id (Connected systems)' };
    out.integrationId = id;
  }
  if (i.mqtt !== undefined && i.mqtt !== null) {
    const m = checkMqttSpec(i.mqtt);
    if ('error' in m) return m;
    out.mqtt = m;
  }
  if (!out.integrationId && !out.mqtt) return { error: 'Say how readings reach the platform: an integration (SensorThings) or an MQTT broker' };
  return out;
}

/** Columns of the plain rows a stream run produces (the mapping runSource applies to them). */
export const STREAM_ROW = { entity: '__entity', value: '__value', metric: '__metric', unit: '__unit', date: '__date', validTo: '__to' } as const;

/** Reads a stream and its samples; the substrate by default. */
export interface TelemetryReader {
  stream: (streamId: string) => Promise<TelemetryStreamRow | null>;
  samples: (streamId: string, from: string, to: string, limit: number) => Promise<TelemetrySampleRow[]>;
}
export const SUBSTRATE_TELEMETRY: TelemetryReader = { stream: telemetryStreamRow, samples: telemetrySamplesBetween };

/**
 * What a stream run reads by default: the substrate's samples and the
 * readings pushed to the platform for the stream (SensorThings, MQTT), merged
 * by time. A stream the substrate does not know is still read when the
 * platform receives readings for it.
 */
export const PLATFORM_TELEMETRY: TelemetryReader = {
  stream: async id => (await telemetryStreamRow(id).catch(() => null)) ?? pushedStreamRow(id),
  samples: async (id, from, to, limit) => {
    const [a, b] = await Promise.all([telemetrySamplesBetween(id, from, to, limit).catch(() => [] as TelemetrySampleRow[]), Promise.resolve(pushedReadingsBetween(id, from, to, limit))]);
    if (!b.length) return a;
    if (!a.length) return b;
    return [...a, ...b].sort((x, y) => Date.parse(x.ts) - Date.parse(y.ts)).slice(0, limit);
  },
};

/** Samples read in one run at most; a run that reaches it stops at the last complete day and the next run continues. */
export const STREAM_SAMPLE_LIMIT = 50_000;

const STREAM_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,119}$/;

/** A stream source's specification, checked; or the reason it cannot be registered. */
export function checkStreamSpec(input: unknown): StreamSpec | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'Say which telemetry stream the source reads and which metrics its daily values record' };
  const i = input as Partial<StreamSpec> & { datastream?: string };
  const raw = String(i.streamId ?? i.datastream ?? '').trim().replace(/^Datastreams\('(.+)'\)$/, '$1').replace(/^telemetry:/, '');
  if (!STREAM_ID.test(raw)) return { error: 'Give the telemetry stream\'s id (or its SensorThings Datastream, telemetry:<id>)' };
  if (!Array.isArray(i.metrics) || !i.metrics.length) return { error: 'Declare at least one metric and the daily statistic it records (mean, min, max, count or sum)' };
  if (i.metrics.length > 10) return { error: 'At most 10 metrics per stream source' };
  const metrics: StreamSpec['metrics'] = [];
  for (const m of i.metrics) {
    const metric = String(m?.metric ?? '').trim().toLowerCase();
    if (!METRIC_ID.test(metric)) return { error: `"${metric}" is not a metric name` };
    if (!isKnownMetric(metric)) return { error: `${metric} is not a registered metric: register it first (its unit and how regions combine)` };
    if (!STREAM_STATISTICS.includes(m.statistic)) return { error: `The statistic for ${metric} must be mean, min, max, count or sum` };
    if (metrics.some(x => x.metric === metric)) return { error: `${metric} is declared twice` };
    metrics.push({ metric, statistic: m.statistic });
  }
  const entity = i.entity?.trim();
  if (entity !== undefined && entity !== '' && !/^(nation|place|institution|facility):[^\s]{1,100}$/.test(entity)) return { error: 'The entity is a twin id such as facility:FAC-00012 or place:KE-30' };
  const backfill = i.backfillDays === undefined ? undefined : Math.trunc(Number(i.backfillDays));
  if (backfill !== undefined && !(backfill >= 1 && backfill <= 90)) return { error: 'Backfill is 1 to 90 days' };
  const unit = i.unit?.trim().slice(0, 24);
  let ingest: StreamIngest | undefined;
  if (i.ingest !== undefined && i.ingest !== null) {
    const r = checkIngestSpec(i.ingest);
    if ('error' in r) return r;
    // Pushed readings carry no unit of their own: the stream declares it, as UCUM.
    if (!unit || !toUcum(unit)) return { error: 'A stream that receives readings declares the unit they are sent in (a UCUM code, e.g. MW or Cel)' };
    if (!entity) return { error: 'A stream that receives readings names the entity they describe (e.g. facility:FAC-00012)' };
    ingest = r;
  }
  return { streamId: raw, ...(entity ? { entity } : {}), metrics, ...(unit ? { unit } : {}), ...(backfill ? { backfillDays: backfill } : {}), ...(ingest ? { ingest } : {}) };
}

const DAY = 86_400_000;
const dayOf = (t: number) => new Date(Math.floor(t / DAY) * DAY).toISOString().slice(0, 10);

/** What a stream run read, for the run's lineage. */
export interface StreamLineage { streamId: string; from: string; to: string; samples: number; days: number; truncated?: boolean }

/**
 * The daily aggregates of a stream from `since` (where the last run that
 * stands stopped; the first
 * run goes back `backfillDays`), up to yesterday (UTC), as plain rows for
 * runSource, with the SHA-256 of the samples read (for provenance).
 */
export async function streamRows(spec: StreamSpec, since: string | undefined, now: Date, reader: TelemetryReader = PLATFORM_TELEMETRY): Promise<{ rows: Record<string, string>[]; sha256: string; lineage: StreamLineage }> {
  const stream = await reader.stream(spec.streamId);
  if (!stream) throw new Error(`Telemetry stream ${spec.streamId} is not reachable (no substrate, or no such stream)`);
  const entity = spec.entity ?? (stream.facility_id ? `facility:${stream.facility_id}` : '');
  if (!entity) throw new Error(`Telemetry stream ${spec.streamId} has no facility: name the entity its values describe`);
  const today = Date.parse(dayOf(now.getTime()));
  const start = since ? Date.parse(since) : today - (spec.backfillDays ?? 7) * DAY;
  const from = new Date(Math.max(start, today - 90 * DAY)).toISOString();
  const to = new Date(today).toISOString();
  const lineage: StreamLineage = { streamId: spec.streamId, from, to, samples: 0, days: 0 };
  if (from >= to) return { rows: [], sha256: createHash('sha256').update('').digest('hex'), lineage };
  const samples = await reader.samples(spec.streamId, from, to, STREAM_SAMPLE_LIMIT);
  // Reaching the limit: the last day read may be incomplete, so it waits for the next run.
  const truncated = samples.length >= STREAM_SAMPLE_LIMIT;
  const lastComplete = truncated ? dayOf(Date.parse(samples[samples.length - 1]!.ts)) : undefined;
  const byDay = new Map<string, number[]>();
  const hash = createHash('sha256');
  for (const s of samples) {
    const t = Date.parse(s.ts);
    if (!Number.isFinite(t) || !Number.isFinite(Number(s.value))) continue;
    const day = dayOf(t);
    if (lastComplete && day >= lastComplete) continue;
    hash.update(`${s.id}|${s.ts}|${s.value}\n`);
    (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(Number(s.value));
  }
  const unit = spec.unit ?? stream.unit ?? '';
  const rows: Record<string, string>[] = [];
  for (const [day, values] of [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const next = new Date(Date.parse(day) + DAY).toISOString().slice(0, 10);
    for (const m of spec.metrics) {
      const v = m.statistic === 'count' ? values.length
        : m.statistic === 'sum' ? values.reduce((a, b) => a + b, 0)
        : m.statistic === 'min' ? Math.min(...values)
        : m.statistic === 'max' ? Math.max(...values)
        : values.reduce((a, b) => a + b, 0) / values.length;
      rows.push({
        [STREAM_ROW.entity]: entity, [STREAM_ROW.metric]: m.metric, [STREAM_ROW.value]: String(Number(v.toPrecision(12))),
        // A count is in the metric's own unit; the other statistics keep the samples' unit (checked against the metric's).
        [STREAM_ROW.unit]: m.statistic === 'count' ? '' : unit,
        [STREAM_ROW.date]: day, [STREAM_ROW.validTo]: next,
      });
    }
  }
  lineage.samples = samples.length;
  lineage.days = byDay.size;
  if (truncated) { lineage.truncated = true; lineage.to = `${lastComplete}T00:00:00.000Z`; }
  return { rows, sha256: hash.digest('hex'), lineage };
}

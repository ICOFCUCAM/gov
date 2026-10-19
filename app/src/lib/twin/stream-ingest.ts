// The one path by which readings pushed to the platform reach a twin stream
// source (review I3): SensorThings create (lib/twin/sta-write.ts) and the
// MQTT subscriber (lib/twin/mqtt.ts) both hand their readings here. Each is
// checked (a number; one instant with its time zone, not in the future, not
// older than the aggregation reaches, not on a day already recorded as
// observations; in the stream's unit when it names one) and refused with a
// reason otherwise; what is kept goes into the readings store
// (lib/twin/readings.ts), and every batch is audited once with the counts and
// the SHA-256 of the readings kept. Readings are never observations: the
// stream's run turns each complete day into one (lib/twin/stream.ts).

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store';
import { streamResumesAt, type TwinSource } from './register';
import { addReadings, type Reading, type ReadingVia } from './readings';
import { sameUnit } from './metrics';

/** A reading as a sender gives it: the SensorThings names (phenomenonTime, result), optionally the unit it is in. */
export interface IncomingReading {
  phenomenonTime?: unknown; result?: unknown; unit?: unknown;
  /** Why the message could not be read as a reading at all (e.g. not JSON): refused with this reason. */
  problem?: string;
}

export interface IngestResult {
  sourceId: string;
  accepted: Reading[];
  /** By position in the batch, with the reason. */
  refused: { index: number; reason: string }[];
  /** SHA-256 over the readings kept (id, time, value), as audited. */
  sha256: string;
}

/** Readings taken in one batch at most. */
export const INGEST_BATCH_LIMIT = 5_000;
/** How far ahead of the platform's clock a reading's time may be (clock skew). */
export const CLOCK_SKEW_MS = 5 * 60_000;
const DAY = 86_400_000;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/;

const VIA: Record<ReadingVia, string> = { sta: 'SensorThings', mqtt: 'MQTT' };

/** Why one reading is refused, or its checked time and value. */
export function checkReading(r: IncomingReading, unit: string | undefined, notBefore: number, now: Date): { ts: string; value: number } | { error: string } {
  if (!r || typeof r !== 'object') return { error: 'A reading is an object with phenomenonTime and result' };
  if (r.problem) return { error: r.problem };
  const value = r.result;
  if (typeof value !== 'number' || !Number.isFinite(value)) return { error: `The result must be a number (got ${JSON.stringify(value ?? null)?.slice(0, 40)})` };
  if (r.phenomenonTime === undefined || r.phenomenonTime === null || r.phenomenonTime === '') return { error: 'Say when the value was measured (phenomenonTime, an ISO 8601 time with its time zone)' };
  const time = String(r.phenomenonTime).trim();
  if (time.includes('/')) return { error: 'Send one instant per reading, not an interval' };
  if (!INSTANT.test(time) || !Number.isFinite(Date.parse(time))) return { error: `"${time.slice(0, 40)}" is not an ISO 8601 time with its time zone (e.g. 2026-10-18T09:30:00Z)` };
  const t = Date.parse(time);
  if (t > now.getTime() + CLOCK_SKEW_MS) return { error: `${time} is in the future` };
  if (t < now.getTime() - 90 * DAY) return { error: `${time} is older than the 90 days a stream is aggregated over` };
  if (t < notBefore) return { error: `${new Date(t).toISOString().slice(0, 10)} is already recorded as observations (up to ${new Date(notBefore).toISOString().slice(0, 10)}); withdraw that run to take later readings into account` };
  if (r.unit !== undefined && r.unit !== null && r.unit !== '') {
    const u = String(r.unit).trim();
    if (!sameUnit(u, unit)) return { error: `"${u.slice(0, 24)}" is not the stream's unit (${unit})` };
  }
  return { ts: new Date(t).toISOString(), value };
}

/**
 * Check and keep a batch of readings for a stream source, and audit it once
 * (or leave the audit to a caller that summarises deliveries, `audit: false`).
 * `by` names who sent them (the integration, or the broker): readings carry no
 * official, the run that aggregates them does.
 */
export function ingestReadings(source: TwinSource, items: IncomingReading[], ctx: { via: ReadingVia; by: string; now?: Date; /** False when the caller audits a summary of several deliveries itself (the MQTT subscriber). */ audit?: boolean }): IngestResult | { error: string } {
  if (source.kind !== 'stream' || !source.stream) return { error: 'Only a stream source receives readings' };
  const spec = source.stream;
  if (!spec.ingest) return { error: `${source.name} does not receive readings: an official names how they arrive first` };
  if (ctx.via === 'mqtt' && !spec.ingest.mqtt) return { error: `${source.name} does not take readings from a broker` };
  if (ctx.via === 'sta' && !spec.ingest.integrationId) return { error: `${source.name} does not take readings through SensorThings` };
  if (!items.length) return { error: 'No readings' };
  if (items.length > INGEST_BATCH_LIMIT) return { error: `At most ${INGEST_BATCH_LIMIT} readings at a time` };
  const now = ctx.now ?? new Date();
  const resume = streamResumesAt(source.id);
  const notBefore = resume ? Date.parse(resume) : -Infinity;
  const refused: { index: number; reason: string }[] = [];
  const good: { ts: string; value: number }[] = [];
  const at: number[] = [];
  items.forEach((it, index) => {
    const c = checkReading(it, spec.unit, notBefore, now);
    if ('error' in c) refused.push({ index, reason: c.error });
    else { good.push(c); at.push(index); }
  });
  const kept = good.length ? addReadings(spec.streamId, good, { via: ctx.via, sourceId: source.id }, now) : { kept: [], refused: [] };
  for (const r of kept.refused) refused.push({ index: at[r.index]!, reason: r.reason });
  refused.sort((a, b) => a.index - b.index);
  const hash = createHash('sha256');
  for (const r of kept.kept) hash.update(`${r.id}|${r.ts}|${r.value}\n`);
  const sha256 = hash.digest('hex');
  const first = refused[0];
  if (ctx.audit !== false) recordAudit(ctx.by.slice(0, 120) || VIA[ctx.via], 'twin.stream.readings', `Twin:${source.id}`, kept.kept.length ? 'ok' : 'error',
    `${kept.kept.length} of ${items.length} readings of stream ${spec.streamId} via ${VIA[ctx.via]}${kept.kept.length ? ` · sha256 ${sha256}` : ''}${first ? ` · ${refused.length} refused, first: ${first.reason}` : ''}`);
  return { sourceId: source.id, accepted: kept.kept, refused, sha256 };
}

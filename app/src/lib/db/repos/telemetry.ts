// lib/db/repos/telemetry — telemetry streams + samples.
//
// Streams declare what's being measured; samples are append-only readings.
// Append-only is enforced at the DB level via a BEFORE UPDATE/DELETE trigger.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { TelemetryStreamRow, TelemetrySampleRow } from '@/lib/db/types';

export interface TelemetryStreamInput {
  streamId: string;
  charterId: string;
  label: string;
  unit?: string | null;
  aggregation?: string;
  retentionDays?: number;
  warnThreshold?: number | null;
  alertThreshold?: number | null;
  facilityId?: string | null;
}

export async function defineTelemetryStreamRow(s: TelemetryStreamInput): Promise<TelemetryStreamRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_define_telemetry_stream', {
    p_stream_id: s.streamId, p_charter_id: s.charterId, p_label: s.label,
    p_unit: s.unit ?? null,
    p_aggregation: s.aggregation ?? 'instantaneous',
    p_retention_days: s.retentionDays ?? 365,
    p_warn_threshold: s.warnThreshold ?? null,
    p_alert_threshold: s.alertThreshold ?? null,
    p_facility_id: s.facilityId ?? null,
  });
  if (error) { console.error('[civicos] define_telemetry_stream failed:', error.message); return null; }
  return (data as TelemetryStreamRow) ?? null;
}

export interface TelemetrySampleInput {
  streamId: string;
  value: number;
  ts?: string | null;
  facilityId?: string | null;
  meta?: Record<string, unknown>;
}

export async function recordTelemetrySampleRow(s: TelemetrySampleInput): Promise<TelemetrySampleRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_record_telemetry_sample', {
    p_stream_id: s.streamId, p_value: s.value,
    p_ts: s.ts ?? null, p_facility_id: s.facilityId ?? null,
    p_meta: s.meta ?? {},
  });
  if (error) { console.error('[civicos] record_telemetry_sample failed:', error.message); return null; }
  return (data as TelemetrySampleRow) ?? null;
}

export async function recentTelemetrySamplesRows(streamId: string, limit = 100): Promise<TelemetrySampleRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.from('civicos_telemetry_samples')
    .select('*').eq('stream_id', streamId)
    .order('ts', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data as TelemetrySampleRow[];
}

export async function listTelemetryStreamsRows(opts: { activeOnly?: boolean; limit?: number } = {}): Promise<TelemetryStreamRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_telemetry_streams').select('*');
  if (opts.activeOnly) q = q.eq('active', true);
  const { data, error } = await q.order('charter_id').limit(opts.limit ?? 50);
  if (error || !data) return [];
  return data as TelemetryStreamRow[];
}

export interface TelemetryStreamStats {
  samples: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
  p95: number | null;
  stddev: number | null;
  latest: number | null;
  latestTs: string | null;
  warnBreaches: number;
  alertBreaches: number;
}

interface TelemetryStreamStatsRow {
  samples: number; min_value: number | null; max_value: number | null;
  avg_value: number | null; median_value: number | null; p95_value: number | null;
  stddev_value: number | null; latest_value: number | null; latest_ts: string | null;
  warn_breaches: number; alert_breaches: number;
}

/** Distribution + breach stats for one telemetry stream over `hours`.
 *  Authenticated-tier (samples are not public). null without a substrate
 *  or when the stream has no samples in the window. */
export async function telemetryStreamStats(streamId: string, hours = 24): Promise<TelemetryStreamStats | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_telemetry_stream_stats', {
    p_stream_id: streamId, p_hours: hours,
  });
  if (error || !data) return null;
  const r = (Array.isArray(data) ? data[0] : data) as TelemetryStreamStatsRow | undefined;
  if (!r || Number(r.samples) === 0) return null;
  return {
    samples: Number(r.samples), min: r.min_value, max: r.max_value, avg: r.avg_value,
    median: r.median_value, p95: r.p95_value, stddev: r.stddev_value,
    latest: r.latest_value, latestTs: r.latest_ts,
    warnBreaches: Number(r.warn_breaches), alertBreaches: Number(r.alert_breaches),
  };
}

export type TelemetryStatus = 'ok' | 'warn' | 'alert' | 'stale';

export interface TelemetryFleetEntry {
  streamId: string;
  charterId: string;
  label: string;
  unit: string | null;
  latestValue: number | null;
  latestTs: string | null;
  ageMinutes: number | null;
  warnThreshold: number | null;
  alertThreshold: number | null;
  status: TelemetryStatus;
}

interface TelemetryFleetRow {
  stream_id: string; charter_id: string; label: string; unit: string | null;
  latest_value: number | null; latest_ts: string | null; age_minutes: number | null;
  warn_threshold: number | null; alert_threshold: number | null; status: TelemetryStatus;
}

/** Live status of every active stream (alert/warn/stale/ok), worst-first.
 *  Authenticated-tier. [] without a substrate. */
export async function telemetryFleetStatus(opts: { charterId?: string; staleMinutes?: number } = {}): Promise<TelemetryFleetEntry[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_telemetry_fleet_status', {
    p_charter_id: opts.charterId ?? null, p_stale_minutes: opts.staleMinutes ?? 60,
  });
  if (error || !data) return [];
  return (data as TelemetryFleetRow[]).map(r => ({
    streamId: r.stream_id, charterId: r.charter_id, label: r.label, unit: r.unit,
    latestValue: r.latest_value, latestTs: r.latest_ts, ageMinutes: r.age_minutes,
    warnThreshold: r.warn_threshold, alertThreshold: r.alert_threshold, status: r.status,
  }));
}

export { substrateAvailable };

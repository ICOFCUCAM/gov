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

export { substrateAvailable };

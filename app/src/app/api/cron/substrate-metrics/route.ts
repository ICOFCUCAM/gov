// Substrate self-metrics emitter. Defines (idempotent) a small set of
// substrate-level telemetry streams and appends a sample to each on
// every invocation. Hit periodically by a scheduler — counts become
// time-series in the substrate's own telemetry tables, visible on
// /gov/telemetry. Threshold breaches auto-escalate via the existing
// telemetry → escalation trigger.

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

interface MetricDef {
  streamId: string;
  label: string;
  unit: string;
  warn: number | null;
  alert: number | null;
  view: string;
  countFilter?: { column: string; op: 'eq' | 'is'; value: unknown };
}

const METRICS: MetricDef[] = [
  { streamId: 'substrate.work_items.open',     label: 'Open work items',        unit: 'items', warn: 100, alert: 250, view: 'civicos_work_items',       countFilter: { column: 'closed', op: 'eq', value: false } },
  { streamId: 'substrate.escalations.open',    label: 'Open escalations',       unit: 'rows',  warn: 20,  alert: 60,  view: 'civicos_escalations',      countFilter: { column: 'resolved_at', op: 'is', value: null } },
  { streamId: 'substrate.dispatches.open',     label: 'Open dispatches',        unit: 'rows',  warn: 50,  alert: 150, view: 'civicos_dispatches',       countFilter: { column: 'closed_at', op: 'is', value: null } },
  { streamId: 'substrate.requests.unacked',    label: 'Unacked service requests', unit: 'rows', warn: 30, alert: 100, view: 'civicos_service_requests', countFilter: { column: 'acknowledged_at', op: 'is', value: null } },
  { streamId: 'substrate.audit_entries.total', label: 'Total audit entries',    unit: 'rows',  warn: null, alert: null, view: 'civicos_audit_entries' },
  { streamId: 'substrate.federation.total',    label: 'Total federation events',unit: 'rows',  warn: null, alert: null, view: 'civicos_federation_events' },
];

function authorized(req: Request): boolean {
  const expected = process.env.CIVICOS_CRON_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  const token = url.searchParams.get('token')
    ?? (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return token.length > 0 && token === expected;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });
  }

  const results: { stream_id: string; value: number; defined: boolean; sampled: boolean }[] = [];

  for (const m of METRICS) {
    // Idempotent stream definition.
    const { error: defErr } = await sb.rpc('civicos_define_telemetry_stream', {
      p_stream_id: m.streamId, p_charter_id: 'platform', p_label: m.label,
      p_unit: m.unit, p_aggregation: 'instantaneous', p_retention_days: 90,
      p_warn_threshold: m.warn, p_alert_threshold: m.alert, p_facility_id: null,
    });

    // Count via head request.
    let query = sb.from(m.view).select('id', { head: true, count: 'exact' });
    if (m.countFilter) {
      if (m.countFilter.op === 'eq') {
        query = query.eq(m.countFilter.column, m.countFilter.value as never);
      } else {
        query = query.is(m.countFilter.column, m.countFilter.value as never);
      }
    }
    const { count, error: cntErr } = await query;
    const value = cntErr ? -1 : (count ?? 0);

    if (value < 0) {
      results.push({ stream_id: m.streamId, value, defined: !defErr, sampled: false });
      continue;
    }

    const { error: sampleErr } = await sb.rpc('civicos_record_telemetry_sample', {
      p_stream_id: m.streamId, p_value: value, p_ts: null, p_facility_id: null, p_meta: {},
    });
    results.push({ stream_id: m.streamId, value, defined: !defErr, sampled: !sampleErr });
  }

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    samples: results,
  });
}

export const POST = GET;

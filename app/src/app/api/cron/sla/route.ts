// Periodic SLA worker — call civicos.escalate_stale_service_requests
// to surface citizen requests that have been ignored too long. Designed
// to be hit by a scheduler (cron, Vercel Cron, Supabase scheduled
// function, etc.) at a regular cadence.
//
// Protection: requires a shared secret in the CIVICOS_CRON_SECRET env
// var, presented either via ?token=… or Authorization: Bearer. The
// secret never reaches the client bundle (server-only route).

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const expected = process.env.CIVICOS_CRON_SECRET;
  if (!expected) return false; // refuse to run unconfigured
  const url = new URL(req.url);
  const token = url.searchParams.get('token')
    ?? (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return token.length > 0 && token === expected;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });
  }
  const url = new URL(req.url);
  const thresholdHours = Math.max(1, Number(url.searchParams.get('hours') ?? '48') | 0);
  const { data, error } = await sb.rpc('civicos_escalate_stale_service_requests', {
    p_threshold_hours: thresholdHours,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Emit a self-telemetry sample so CronStatus can detect staleness.
  // Idempotent stream definition; sample value = number escalated.
  await sb.rpc('civicos_define_telemetry_stream', {
    p_stream_id: 'substrate.sla.escalated', p_charter_id: 'platform',
    p_label: 'SLA escalations recorded per run', p_unit: 'rows',
    p_aggregation: 'instantaneous', p_retention_days: 90,
    p_warn_threshold: null, p_alert_threshold: null, p_facility_id: null,
  });
  await sb.rpc('civicos_record_telemetry_sample', {
    p_stream_id: 'substrate.sla.escalated',
    p_value: typeof data === 'number' ? data : 0,
    p_ts: null, p_facility_id: null,
    p_meta: { threshold_hours: thresholdHours },
  });

  return NextResponse.json({
    ok: true,
    escalated: data,
    threshold_hours: thresholdHours,
    at: new Date().toISOString(),
  });
}

// Allow GET for cron systems that don't POST (Vercel Cron defaults to GET).
export const GET = POST;

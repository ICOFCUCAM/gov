// Periodic silent-sensor worker — call
// civicos.escalate_stale_telemetry_streams to surface active telemetry
// streams that have stopped reporting. A sensor going silent emits no
// sample to trip the threshold trigger, so this is the only path by which
// a blind spot becomes a visible escalation. Designed for a scheduler
// (Vercel Cron, Supabase scheduled function, etc.).
//
// Protection: shared CIVICOS_CRON_SECRET as Authorization:
// Bearer. The secret never reaches the client bundle (server-only route).

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

/** The cron secret, compared in constant time (lib/platform-auth.ts). */
const authorized = (req: Request): boolean => cronAuthorized(req);

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });
  }
  const url = new URL(req.url);
  const staleMinutes = Math.max(1, Number(url.searchParams.get('minutes') ?? '120') | 0);
  const { data, error } = await sb.rpc('civicos_escalate_stale_telemetry_streams', {
    p_stale_minutes: staleMinutes,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Self-telemetry so CronStatus can detect this worker going stale too.
  await sb.rpc('civicos_define_telemetry_stream', {
    p_stream_id: 'substrate.telemetry.stale_escalated', p_charter_id: 'platform',
    p_label: 'Stale telemetry streams escalated per run', p_unit: 'rows',
    p_aggregation: 'instantaneous', p_retention_days: 90,
    p_warn_threshold: null, p_alert_threshold: null, p_facility_id: null,
  });
  await sb.rpc('civicos_record_telemetry_sample', {
    p_stream_id: 'substrate.telemetry.stale_escalated',
    p_value: typeof data === 'number' ? data : 0,
    p_ts: null, p_facility_id: null,
    p_meta: { stale_minutes: staleMinutes },
  });

  return NextResponse.json({
    ok: true,
    escalated: data,
    stale_minutes: staleMinutes,
    at: new Date().toISOString(),
  });
}

export const GET = POST;

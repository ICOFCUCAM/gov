// Periodic directive-promotion worker — call
// civicos.promote_due_directives to flip any directive signed for a future
// effective date to 'effective' once that date arrives. Without this a
// future-dated directive stays 'signed' forever. Designed for a scheduler
// (Vercel Cron, Supabase scheduled function, etc.).
//
// Protection: shared CIVICOS_CRON_SECRET via ?token=… or Authorization:
// Bearer. The secret never reaches the client bundle (server-only route).

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const expected = process.env.CIVICOS_CRON_SECRET;
  if (!expected) return false;
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
  const { data, error } = await sb.rpc('civicos_promote_due_directives');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Self-telemetry so CronStatus can detect this worker going stale.
  await sb.rpc('civicos_define_telemetry_stream', {
    p_stream_id: 'substrate.directives.promoted', p_charter_id: 'platform',
    p_label: 'Directives promoted to effective per run', p_unit: 'rows',
    p_aggregation: 'instantaneous', p_retention_days: 90,
    p_warn_threshold: null, p_alert_threshold: null, p_facility_id: null,
  });
  await sb.rpc('civicos_record_telemetry_sample', {
    p_stream_id: 'substrate.directives.promoted',
    p_value: typeof data === 'number' ? data : 0,
    p_ts: null, p_facility_id: null, p_meta: {},
  });

  return NextResponse.json({
    ok: true,
    promoted: data,
    at: new Date().toISOString(),
  });
}

export const GET = POST;

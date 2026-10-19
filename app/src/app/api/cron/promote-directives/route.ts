// Periodic directive-promotion worker — call
// civicos.promote_due_directives to flip any directive signed for a future
// effective date to 'effective' once that date arrives. Without this a
// future-dated directive stays 'signed' forever. Designed for a scheduler
// (Vercel Cron, Supabase scheduled function, etc.).
//
// Protection: shared CIVICOS_CRON_SECRET via ?token=… or Authorization:
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

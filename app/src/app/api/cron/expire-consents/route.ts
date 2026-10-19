// Periodic consent auto-expiry. Citizens grant time-bound consents
// (`expires_at` in the future); past expiry they should flip to
// 'expired' so officer-side surfaces see them as no-longer-valid and
// the citizen's wallet doesn't show them as live.
//
// civicos.expire_due_consents performs the flip and writes one
// audit-chain entry per expired consent on the citizen's scope, so the
// citizen can trace exactly which consent expired and when.
//
// Auth: CIVICOS_CRON_SECRET via ?token=… or Authorization: Bearer.
// Cadence: recommended hourly.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

/** The cron secret, compared in constant time (lib/platform-auth.ts). */
const authorized = (req: Request): boolean => cronAuthorized(req);

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  const { data, error } = await sb.rpc('civicos_expire_due_consents');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data as { consent_id: string; citizen_id: string; target_charter_id: string; expired_at: string }[]) ?? [];

  // Emit a self-telemetry sample so CronStatus can detect staleness.
  await sb.rpc('civicos_define_telemetry_stream', {
    p_stream_id: 'substrate.consents.expired', p_charter_id: 'platform',
    p_label: 'Consents auto-expired per run', p_unit: 'rows',
    p_aggregation: 'instantaneous', p_retention_days: 90,
    p_warn_threshold: null, p_alert_threshold: null, p_facility_id: null,
  });
  await sb.rpc('civicos_record_telemetry_sample', {
    p_stream_id: 'substrate.consents.expired',
    p_value: rows.length, p_ts: null, p_facility_id: null,
    p_meta: {},
  });

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    expired_count: rows.length,
    rows,
  });
}

export const POST = GET;

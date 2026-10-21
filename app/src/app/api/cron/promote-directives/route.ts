// Periodic directive-promotion worker. Directives are the platform's register
// (lib/data/directives.ts, architecture review D8): this flips every directive
// signed for a future effective date to 'effective' once that date arrives
// (reads settle them too; this makes it happen without one), then, with the
// substrate connected, re-copies the platform's directives and institutions
// to their substrate mirrors (lib/db/mirror.ts: retries anything a write
// after a change could not copy). Designed for a scheduler (pg_cron in
// supabase/cron/schedule.sql, Vercel Cron, …). The substrate's own
// civicos_promote_due_directives is no longer called: its table is a mirror.
//
// Protection: shared CIVICOS_CRON_SECRET as Authorization:
// Bearer. The secret never reaches the client bundle (server-only route).

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { cronRoute } from '@/lib/ops/cron-runs';
import { serverClient } from '@/lib/db/client';
import { settleDirectives } from '@/lib/data/directives';
import { adoptSubstrateDirectives, queueMirror, reconcileMirror } from '@/lib/db/mirror';

export const dynamic = 'force-dynamic';

/** The cron secret, compared in constant time (lib/platform-auth.ts). */
const authorized = (req: Request): boolean => cronAuthorized(req);

async function runJob(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = serverClient();
  if (sb) await adoptSubstrateDirectives();
  const promoted = settleDirectives();
  if (!sb) {
    return NextResponse.json({ ok: true, promoted: promoted.length, refs: promoted, substrate: 'not configured', at: new Date().toISOString() });
  }
  for (const ref of promoted) queueMirror('directive', ref);
  const mirror = await reconcileMirror();

  // Self-telemetry so CronStatus can detect this worker going stale.
  await sb.rpc('civicos_define_telemetry_stream', {
    p_stream_id: 'substrate.directives.promoted', p_charter_id: 'platform',
    p_label: 'Directives promoted to effective per run', p_unit: 'rows',
    p_aggregation: 'instantaneous', p_retention_days: 90,
    p_warn_threshold: null, p_alert_threshold: null, p_facility_id: null,
  });
  await sb.rpc('civicos_record_telemetry_sample', {
    p_stream_id: 'substrate.directives.promoted',
    p_value: promoted.length,
    p_ts: null, p_facility_id: null, p_meta: {},
  });

  const body = {
    ok: mirror.pending === 0,
    promoted: promoted.length,
    refs: promoted,
    mirror: { pending: mirror.pending, written: mirror.written, failed: mirror.failed, lastError: mirror.lastError },
    at: new Date().toISOString(),
  };
  // Records the substrate refused stay queued and are named; the platform's change stands.
  return NextResponse.json(mirror.pending ? { ...body, error: `the substrate mirror refused ${mirror.pending} record(s): ${mirror.lastError ?? 'unknown'}` } : body, { status: mirror.pending ? 502 : 200 });
}

// Run recorded, deduplicated, retried and alerted on by lib/ops/cron-runs.ts (register 18.39).
export const POST = cronRoute('promote-directives', runJob);
export const GET = POST;

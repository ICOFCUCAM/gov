// Twin ingest cron — hourly (supabase/cron/schedule.sql). Imports every
// registered source whose schedule (daily, weekly) says it is due: files at an
// address, and telemetry streams (their complete days since the last run, as
// daily aggregates; lib/twin/stream.ts). Manual and uploaded sources are never
// fetched here. Then the platform's own registers' counts (the civil
// register's births, deaths and marriages, lib/civil/twin.ts), when they changed.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …` (header only),
// like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { dueSources, runSource } from '@/lib/twin/register';
import { publishCivilCounts } from '@/lib/civil/twin';
import { publishStandingCounts } from '@/lib/organisations/twin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const runs = [];
  for (const s of dueSources()) {
    const r = await runSource(s.id, { by: 'scheduler' });
    runs.push('error' in r ? { source: s.id, error: r.error } : { source: s.id, status: r.status, accepted: r.accepted, rows: r.rows });
  }
  const civil = await publishCivilCounts('scheduler');
  const organisations = await publishStandingCounts('scheduler');
  return NextResponse.json({ ok: true, runs, civil, organisations });
}

export const POST = GET;

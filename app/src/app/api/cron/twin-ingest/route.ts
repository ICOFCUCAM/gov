// Twin ingest cron — hourly (supabase/cron/schedule.sql). Imports every
// registered source whose schedule (daily, weekly) says it is due. Manual and
// uploaded sources are never fetched here.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …` (or ?token=),
// like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { dueSources, runSource } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const runs = [];
  for (const s of dueSources()) {
    const r = await runSource(s.id, { by: 'scheduler' });
    runs.push('error' in r ? { source: s.id, error: r.error } : { source: s.id, status: r.status, accepted: r.accepted, rows: r.rows });
  }
  return NextResponse.json({ ok: true, runs });
}

export const POST = GET;

// Twin ingest cron — hourly (supabase/cron/schedule.sql). Imports every
// registered source whose schedule (daily, weekly) says it is due: files at an
// address, and telemetry streams (their complete days since the last run, as
// daily aggregates; lib/twin/stream.ts). Manual and uploaded sources are never
// fetched here. Then the platform's own registers' counts (the civil
// register's births, deaths and marriages, lib/civil/twin.ts), when they changed,
// and the values of approved indicator definitions (lib/indicators/twin.ts).
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …` (header only),
// like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { cronRoute } from '@/lib/ops/cron-runs';
import { dueSources, runSource } from '@/lib/twin/register';
import { publishCivilCounts } from '@/lib/civil/twin';
import { publishStandingCounts } from '@/lib/organisations/twin';
import { publishCaseCounts } from '@/lib/casework/twin';
import { publishEducationReturns } from '@/lib/education/twin';
import { publishHealthCapacity } from '@/lib/health/twin';
import { publishProgrammeReturns } from '@/lib/health/programmes/twin';
import { publishWorkforceCounts } from '@/lib/professions/workforce';
import { publishIndicators } from '@/lib/indicators/twin';

export const dynamic = 'force-dynamic';

async function runJob(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const runs = [];
  for (const s of dueSources()) {
    const r = await runSource(s.id, { by: 'scheduler' });
    runs.push('error' in r ? { source: s.id, error: r.error } : { source: s.id, status: r.status, accepted: r.accepted, rows: r.rows });
  }
  const civil = await publishCivilCounts('scheduler');
  const organisations = await publishStandingCounts('scheduler');
  const cases = await publishCaseCounts('scheduler');
  const education = await publishEducationReturns('scheduler');
  const health = await publishHealthCapacity('scheduler');
  const programmes = await publishProgrammeReturns('scheduler');
  const workforce = await publishWorkforceCounts('scheduler');
  // Approved indicator definitions' values, computed from the records (lib/indicators/twin.ts).
  const indicators = await publishIndicators('scheduler');
  return NextResponse.json({ ok: true, runs, civil, organisations, cases, education, health, programmes, workforce, indicators });
}

// Run recorded, deduplicated, retried and alerted on by lib/ops/cron-runs.ts (register 18.39).
export const GET = cronRoute('twin-ingest', runJob);
export const POST = GET;

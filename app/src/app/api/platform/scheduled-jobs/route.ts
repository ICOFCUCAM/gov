// The platform's scheduled jobs (register 18.39; lib/ops/cron-runs.ts). GET:
// each job under /api/cron with its schedule, whether this installation runs
// it, the last run and its outcome, the next expected run, the failures in a
// row and retry state, and its recent run history (newest first). Read-only:
// the jobs themselves are called by the scheduler (pg_cron, the self-host
// scheduler or the Helm chart) with CIVICOS_CRON_SECRET.
import { NextResponse } from 'next/server';
import { cronOverview, scheduledJobsHealthy } from '@/lib/ops/cron-runs';
import { serverless } from '@/lib/data/persist';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    at: new Date().toISOString(),
    jobs: cronOverview(),
    healthy: scheduledJobsHealthy(),
    scheduler: serverless() ? 'This server is serverless: the database scheduler (Supabase pg_cron) must call the jobs; see docs/DISASTER_RECOVERY.md' : null,
  });
}

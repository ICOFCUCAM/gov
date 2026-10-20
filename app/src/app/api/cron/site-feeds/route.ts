// Site feeds cron — every 30 minutes (supabase/cron/schedule.sql).
//
// Refreshes the news of every public site whose ministry keeps an existing
// website with a feed (Link, Embed or Migrate mode). A site whose website is
// unreachable keeps its last good copy and records the error.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …` (header only),
// like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { cronRoute } from '@/lib/ops/cron-runs';
import { syncAllFeeds } from '@/lib/data/site-settings';

export const dynamic = 'force-dynamic';

async function runJob(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, sites: await syncAllFeeds('scheduler') });
}

// Run recorded, deduplicated, retried and alerted on by lib/ops/cron-runs.ts (register 18.39).
export const GET = cronRoute('site-feeds', runJob);
export const POST = GET;

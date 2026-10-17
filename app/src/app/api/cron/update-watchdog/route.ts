// Update watchdog cron — every minute (supabase/cron/schedule.sql).
//
// Concludes due probations for every nation: passes a release whose window
// ended healthy, records overdue health reports as missing, and on a
// confirmed failure either switches the software back to the last known
// good release or leaves it waiting for the nation's decision (ask-first,
// or a release that is not backward compatible).
//
// It never installs anything: it can only conclude probations and switch
// back to the last known good release. The same evaluation also runs when
// the chamber, a release, the publisher console or the health endpoint is
// read, as a fallback if the schedule stops.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …` (or ?token=),
// like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { superviseProbations } from '@/lib/data/updates';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, summary: superviseProbations() });
}

export const POST = GET;

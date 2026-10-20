// Case deadlines cron — every 15 minutes (supabase/cron/schedule.sql).
//
// Marks legal deadlines of cases that have passed (lib/casework/engine.ts
// lapseDeadlines()): escalates where the procedure says so, writes one audit
// entry per lapsed deadline (case reference, deadline, effect; never personal
// fields) and alerts the responsible institution's subscribed officials.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …`, like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { lapseDeadlines } from '@/lib/casework/engine';
import { expireStandings } from '@/lib/organisations/register';
import { expireGrants } from '@/lib/immigration/register';
import { watchAccess } from '@/lib/records/access-watch';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const lapsed = lapseDeadlines();
  const expired = expireStandings();
  const immigration = expireGrants();
  const access = watchAccess();
  return NextResponse.json({ ok: true, lapsed: lapsed.length, cases: lapsed.map(l => ({ ref: l.ref, deadline: l.deadline, onLapse: l.onLapse })), expired, immigrationExpired: immigration.length, unusualAccessRaised: access.raised });
}

export const POST = GET;

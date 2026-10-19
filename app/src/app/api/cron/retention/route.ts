// Retention sweep cron — hourly (supabase/cron/schedule.sql).
//
// Deletes unconfirmed email-update requests whose link has expired (with
// their messages), expires sign-in lockout counters, writes the summaries of
// aggregated refusals to the audit chain, and applies the nation's confirmed
// retention rules for permits and cases (keep unless set; lib/data/retention.ts).
// One audit entry with counts when anything was removed; never names.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …` (or ?token=),
// like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { runRetention } from '@/lib/data/retention';
import { reverifyAuditChain } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const run = runRetention();
  // The full audit-chain check, off any public request path (go-live review M-8); chunked, it yields to requests.
  void reverifyAuditChain();
  return NextResponse.json({ ok: true, run });
}

export const POST = GET;

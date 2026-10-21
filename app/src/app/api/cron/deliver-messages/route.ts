// Sends the platform's email and SMS outbox (lib/messaging/outbox.ts) through
// the providers the nation connected (lib/messaging/deliver.ts): retries with
// growing waits, dead letters with their reason, rate limits per provider.
// Without a provider messages stay queued (counted as waiting).
//
// Auth: CIVICOS_CRON_SECRET (Authorization: Bearer). Cadence: every minute.
import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { cronRoute } from '@/lib/ops/cron-runs';
import { deliverMessages } from '@/lib/messaging/deliver';

export const dynamic = 'force-dynamic';

async function runJob(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const run = await deliverMessages();
  return NextResponse.json({ ok: run.dead === 0, ...run });
}

// Run recorded, deduplicated, retried and alerted on by lib/ops/cron-runs.ts (register 18.39).
export const GET = cronRoute('deliver-messages', runJob);
export const POST = GET;

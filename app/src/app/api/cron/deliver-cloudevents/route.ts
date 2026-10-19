// Delivers the platform's event outbox (lib/events/outbox.ts) to its webhook
// subscribers as CloudEvents 1.0, structured mode, HMAC-SHA256 signed
// (lib/events/deliver.ts). The substrate's own federation events keep their
// worker (/api/cron/deliver-events).
//
// Auth: CIVICOS_CRON_SECRET (Authorization: Bearer). Cadence: every 1–5 minutes.
import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { deliverOutbox } from '@/lib/events/deliver';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const runs = await deliverOutbox();
  return NextResponse.json({
    ok: runs.every(r => !r.failed),
    at: new Date().toISOString(),
    webhooks_processed: runs.length,
    total_delivered: runs.reduce((s, r) => s + r.delivered, 0),
    results: runs,
  });
}

export const POST = GET;

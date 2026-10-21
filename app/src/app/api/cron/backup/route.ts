// Backup schedule cron — hourly (supabase/cron/schedule.sql, or the nation's
// own scheduler). Takes a backup when the newest is older than the policy's
// interval (default daily), verifies it (read back, decrypted, every part's
// hash checked, dry-run restore), then applies the retention policy, and
// reports whether the recovery point objective is met. Never restores.
// `?now` takes a backup at once whatever the newest's age (the operator's
// `npm run self-host -- backup`, scripts/self-host.mjs), verified the same way
// and recorded as an on-demand run.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …` (header only),
// like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { cronRoute } from '@/lib/ops/cron-runs';
import { runScheduled } from '@/lib/data/backups';

export const dynamic = 'force-dynamic';
// On a serverless host (Vercel) the function may run this long: capture, seal,
// upload, read back and dry-run restore in one invocation (60 s fits every plan).
export const maxDuration = 60;

async function runJob(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const summary = await runScheduled(new Date(), { now: new URL(req.url).searchParams.has('now') });
  // A backup taken but not verified protects nothing: the run fails (and is retried and alerted on).
  const unverified = !!summary.took && !summary.verified;
  const failed = !!summary.error || unverified;
  return NextResponse.json({ ok: !failed, summary, ...(unverified ? { error: `Backup ${summary.took} was taken but did not verify` } : {}) }, { status: failed ? 503 : 200 });
}

// Run recorded, deduplicated, retried and alerted on by lib/ops/cron-runs.ts (register 18.39).
export const GET = cronRoute('backup', runJob);
export const POST = GET;

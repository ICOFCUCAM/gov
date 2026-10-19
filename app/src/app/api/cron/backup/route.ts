// Backup schedule cron — hourly (supabase/cron/schedule.sql, or the nation's
// own scheduler). Takes a backup when the newest is older than the policy's
// interval (default daily), verifies it (read back, decrypted, every part's
// hash checked, dry-run restore), then applies the retention policy, and
// reports whether the recovery point objective is met. Never restores.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …` (or ?token=),
// like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { runScheduled } from '@/lib/data/backups';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const summary = await runScheduled();
  return NextResponse.json({ ok: !summary.error, summary }, { status: summary.error ? 503 : 200 });
}

export const POST = GET;

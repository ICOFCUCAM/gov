// GET /api/events/outbox — the event outbox at a glance (lib/events/overview.ts):
// per webhook subscription its cursor, events waiting, delivery attempts and
// last result; the restore epoch and events voided by a data restore
// (docs/DISASTER_RECOVERY.md). Events by type, time and sequence only (never
// actor, subject or detail). ?limit= (≤ 200) for the recent lists. Read only:
// delivery and its retries are the scheduled job's (/api/cron/deliver-cloudevents).
import { NextRequest, NextResponse } from 'next/server';
import { outboxOverview } from '@/lib/events/overview';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50) || 50;
  return NextResponse.json({ ...outboxOverview(limit), at: new Date().toISOString() });
}

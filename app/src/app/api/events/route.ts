// The platform's event outbox (lib/events/outbox.ts): the most recent
// CloudEvents and webhook delivery attempts, newest first. ?limit= (≤ 200).
import { NextRequest, NextResponse } from 'next/server';
import { recentEvents, recentDeliveries } from '@/lib/events/outbox';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') ?? 50) || 50, 1), 200);
  return NextResponse.json({ events: recentEvents(limit), deliveries: recentDeliveries(limit) });
}

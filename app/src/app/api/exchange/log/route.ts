// The platform's side of the exchange log (lib/exchange/log.ts): recent
// requests from connected systems and federation partners, newest first.
// ?channel=case-feed|site-feed|federation &feedId= &ministry= &limit= (≤ 500).
import { NextRequest, NextResponse } from 'next/server';
import { listExchanges, type ExchangeChannel } from '@/lib/exchange/log';

export const dynamic = 'force-dynamic';
const CHANNELS = new Set<ExchangeChannel>(['case-feed', 'site-feed', 'federation']);

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const channel = q.get('channel') as ExchangeChannel | null;
  if (channel && !CHANNELS.has(channel)) return NextResponse.json({ error: 'channel must be case-feed, site-feed or federation' }, { status: 422 });
  return NextResponse.json({
    exchanges: listExchanges({ channel: channel ?? undefined, feedId: q.get('feedId') ?? undefined, ministryId: q.get('ministry') ?? undefined, limit: Number(q.get('limit') ?? 50) || 50 }),
  });
}

// /api/releases/publisher/hosting — the publisher's queue of hosting
// assessment requests from every nation.
import { NextRequest, NextResponse } from 'next/server';
import { hostingQueue } from '@/lib/data/hosting';
import { publisherOverview } from '@/lib/data/updates';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const names = Object.fromEntries(publisherOverview().nations.map(n => [n.id, n.name]));
  return NextResponse.json({ requests: hostingQueue(), nations: names });
}

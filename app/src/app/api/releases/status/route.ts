// /api/releases/status — this nation's status page: hosted service health,
// incidents, fallback incidents and maintenance.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor } from '@/lib/updates/access';
import { statusPage } from '@/lib/data/status';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const s = statusPage(n.id);
  if ('error' in s) return NextResponse.json({ error: s.error }, { status: 404 });
  return NextResponse.json({ status: s });
}

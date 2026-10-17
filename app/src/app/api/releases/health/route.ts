// /api/releases/health — the nation's deployment agent reports health for
// the release on probation. A critical failure, a sustained threshold
// breach, or silence ends probation and falls back to the last known good
// release (or waits for the nation, if it asked to decide).
import { NextRequest, NextResponse } from 'next/server';
import { reportHealth, HEALTH_CHECKS } from '@/lib/data/updates';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ checks: HEALTH_CHECKS });
}

export async function POST(req: NextRequest) {
  const r = await chamberBody<{ checks?: unknown }>(req);
  if (r instanceof NextResponse) return r;
  const out = reportHealth(r.nation.id, { checks: r.b.checks });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}

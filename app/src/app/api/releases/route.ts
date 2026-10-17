// /api/releases — the nation's update chamber: global releases plus this
// nation's own builds, its installed version, upgrade path and requests.
import { NextRequest, NextResponse } from 'next/server';
import { getChamber, superviseProbations } from '@/lib/data/updates';
import { nationFor } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  // The watchdog concludes due probations (pass, or fall back to last known good). It never installs anything newer.
  superviseProbations();
  const chamber = getChamber(n.id);
  if ('error' in chamber) return NextResponse.json(chamber, { status: 404 });
  return NextResponse.json({ chamber });
}

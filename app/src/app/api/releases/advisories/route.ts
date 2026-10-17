// /api/releases/advisories — the security advisory feed as this nation
// sees it: its status per advisory (affected / not affected / fixed / under
// investigation), the fix release, and the publisher's patch commitments.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor } from '@/lib/updates/access';
import { getChamber, publisherOverview } from '@/lib/data/updates';
import { commitments, exposure, PATCH_COMMITMENTS } from '@/lib/data/advisories';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const c = getChamber(n.id);
  if ('error' in c) return NextResponse.json(c, { status: 404 });
  return NextResponse.json({ exposure: exposure(n, c.releases), commitments: commitments(publisherOverview().releases), policy: PATCH_COMMITMENTS });
}

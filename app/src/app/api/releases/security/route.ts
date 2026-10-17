// /api/releases/security — the nation's security store: catalogue with its
// prices, orders and licences, bring-your-own tooling, its own software,
// definitions and the security posture.
import { NextRequest, NextResponse } from 'next/server';
import { securityCenter } from '@/lib/data/security-store';
import { securityAdvisories } from '@/lib/data/updates';
import { nationFor } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  return NextResponse.json({ security: securityCenter(n, securityAdvisories(n.id)) });
}

// /api/releases/lifecycle — the support lifecycle of every release line this
// nation can see (active, security-only, end of life), the policy, notices
// and the warning for the line it runs.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor } from '@/lib/updates/access';
import { allReleases, visibleTo } from '@/lib/data/updates';
import { issueDueNotices, lifecycleLines, lifecyclePolicy, lifecycleWarning, lineOf } from '@/lib/data/lifecycle';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  issueDueNotices(allReleases());
  const visible = allReleases().filter(r => visibleTo(r, n.id));
  return NextResponse.json({ lines: lifecycleLines(visible), policy: lifecyclePolicy(), warning: lifecycleWarning(n, visible) ?? null, installedLine: lineOf(n.installedVersion) });
}

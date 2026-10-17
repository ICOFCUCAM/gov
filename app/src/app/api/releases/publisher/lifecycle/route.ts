// /api/releases/publisher/lifecycle — the publisher's support lifecycle
// policy: window lengths for LTS and standard lines, which lines are LTS,
// and when end-of-life notices go out. Every change is audited.
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { allReleases, publisherOverview } from '@/lib/data/updates';
import { issueDueNotices, lifecycleLines, lifecyclePolicy, lineOf, setLifecyclePolicy } from '@/lib/data/lifecycle';
import type { LifecyclePolicy } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  issueDueNotices(allReleases());
  const lines = lifecycleLines(allReleases());
  const nations = publisherOverview().nations;
  const onLine = Object.fromEntries(lines.map(l => [l.line, nations.filter(n => lineOf(n.installedVersion) === l.line).map(n => n.name)]));
  return NextResponse.json({ lines, policy: lifecyclePolicy(), nationsOnLine: onLine });
}

export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: Partial<LifecyclePolicy> & { by?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const out = setLifecyclePolicy(b, lifecycleLines(allReleases()).map(l => l.line));
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ policy: out, lines: lifecycleLines(allReleases()) });
}

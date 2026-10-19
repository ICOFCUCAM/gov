// /api/releases/publisher/advisories/dependencies — the dependency audit's
// report (scripts/audit-deps.mjs --json) becomes advisories in the feed, so
// the patch-time commitments cover third-party code (lib/data/advisories.ts).
// Publisher only: the publisher session or the CI job's automation bearer.
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { importDependencyFindings } from '@/lib/data/advisories';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Parameters<typeof importDependencyFindings>[0] & { by?: string };
  const r = importDependencyFindings(b, b.by ?? 'dependency audit (CI)');
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
}

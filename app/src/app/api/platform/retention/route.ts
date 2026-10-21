// The nation's retention rules for personal data in permits and cases
// (lib/data/retention.ts, go-live review M-13). GET: the rules in force
// (keep by default), proposals, the last sweeps. POST { category: permits |
// cases, action: keep | anonymise | delete, days?, basis?, reason }: an
// administrator proposes a rule; anonymise and delete wait for a different
// administrator (/api/platform/retention/{id}); keep applies at once.
// Administrators only (ADMIN_ONLY in lib/auth/roles.ts: /api/platform). Audited.
import { NextRequest, NextResponse } from 'next/server';
import { withOfficial, officialId } from '@/lib/auth/official';
import { MAX_DAYS, MIN_DAYS, RETENTION_CATEGORIES, proposeRetention, retentionChanges, retentionRules, retentionRuns } from '@/lib/data/retention';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ rules: retentionRules(), categories: RETENTION_CATEGORIES, changes: retentionChanges(), runs: retentionRuns(), minDays: MIN_DAYS, maxDays: MAX_DAYS });
}

/** @example request {"category":"permits","action":"anonymise","days":2555,"basis":"Records Act, schedule 4","reason":"Adopted records schedule"} */
export async function POST(req: NextRequest) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { category?: unknown; action?: unknown; days?: unknown; basis?: unknown; reason?: unknown; by?: string };
  const r = proposeRetention(b, typeof b.by === 'string' ? b.by : '', Date.now(), await officialId());
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ change: r }, { status: 201 });
}

// /api/twin/conflicts — values two sources disagree on (lib/twin/conflicts.ts,
// design §9.4). GET lists them (?metric=&entity=) with any decision taken.
// POST { entityId, metric, validFrom, chosenSource, reason } records which
// source stands: those who can sign at the statistics authority
// (canResolveTwinConflict()), named and audited.
import { NextRequest, NextResponse } from 'next/server';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canResolveTwinConflict } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { twinConflicts } from '@/lib/twin/register';
import { resolveConflict } from '@/lib/twin/conflicts';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  return NextResponse.json({ conflicts: twinConflicts({ metric: q.get('metric') ?? undefined, entityId: q.get('entity') ?? undefined }) });
}

export async function POST(req: NextRequest) {
  const refused = await refusal(s => canResolveTwinConflict(s, authorityFor('statistics')));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { entityId?: string; metric?: string; validFrom?: string; chosenSource?: string; reason?: string; by?: string };
  const r = resolveConflict({ entityId: String(b.entityId ?? ''), metric: String(b.metric ?? ''), validFrom: String(b.validFrom ?? ''), chosenSource: String(b.chosenSource ?? ''), reason: String(b.reason ?? '') }, twinConflicts({ metric: b.metric }), b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ resolution: r });
}

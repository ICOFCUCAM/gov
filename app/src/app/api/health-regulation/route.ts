// /api/health-regulation — capacity returns of licensed health facilities
// (lib/health/register.ts): aggregate counts only, never patients.
// GET ?organisation= a facility's returns (any signed-in official: they are
// institutional figures); with none, counts. POST { organisation, period,
// counts, note? } records what the facility reported (a new version when the
// period was reported before): the health regulator's officials only.
// Licences are decided in cases (/api/cases); who is licensed is public at
// /api/registers/check.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canRecordHealthReturn } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { routeActor } from '@/lib/casework/actor';
import { capacityOf, recordCapacity, healthCounts } from '@/lib/health/register';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const organisation = req.nextUrl.searchParams.get('organisation');
  return NextResponse.json({ counts: healthCounts(), ...(organisation ? { returns: capacityOf(organisation) } : {}) });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { organisation?: string; period?: string; counts?: Record<string, unknown>; note?: string; by?: string };
  const s = await caseScope();
  if (s) {
    const why = canRecordHealthReturn(s, authorityFor('healthRegulation'));
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const actor = await routeActor(b.by);
  const r = recordCapacity({ organisation: String(b.organisation ?? ''), period: String(b.period ?? ''), counts: b.counts ?? {}, ...(b.note ? { note: b.note } : {}) }, actor.name);
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ return: r }, { status: 201 });
}

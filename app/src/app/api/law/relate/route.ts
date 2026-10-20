// POST /api/law/relate — record that one instrument amends, repeals,
// replaces, implements, cites or depends on another (lib/law/register.ts).
// Officials of the law-register authority (canRecordLaw()).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope, refusal } from '@/lib/auth/official';
import { canRecordLaw } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { relate, type RelationKind } from '@/lib/law/register';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const refused = await refusal(s => canRecordLaw(s, authorityFor('lawRegister')));
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { instrument?: string; kind?: RelationKind; target?: string; at?: string; by?: string };
  const who = await caseScope();
  const r = relate(String(b.instrument ?? ''), b.kind as RelationKind, String(b.target ?? ''), who?.label ?? b.by ?? 'Unverified official', b.at);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ instrument: r });
}

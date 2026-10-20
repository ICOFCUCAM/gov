// /api/education — the education register (lib/education/register.ts) for
// the education authority's officials and auditors with a purpose.
// GET ?organisation= an institution's inspections and returns;
// ?qualification= one qualification with every version; ?holder= a holder's
// qualifications (personal); with none of them, counts only. Every search and
// read, allowed or refused, is written to the access log.
// POST { organisation, period, counts, note? } records the counts an
// institution reported (a new version when the period was reported before).
// Inspections and qualifications change only through decided cases.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadEducation, canRecordEducationReturn } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { routeActor } from '@/lib/casework/actor';
import { inspectionsOf, returnsOf, getAward, awardsOf, recordReturn, educationCounts } from '@/lib/education/register';
import { recordAccess } from '@/lib/records/access-log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const organisation = q.get('organisation') ?? undefined, qualification = q.get('qualification') ?? undefined, holder = q.get('holder') ?? undefined;
  const purpose = q.get('purpose') ?? undefined;
  const s = await caseScope();
  if (s) {
    const why = canReadEducation(s, authorityFor('education'), purpose);
    const id = qualification ?? organisation;
    if (id || holder || why) recordAccess({ by: { id: s.id, name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, record: { register: 'education', ...(id ? { id } : { query: holder ? 'holder=…' : '(counts)' }) }, action: why ? 'refused' : id ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const counts = educationCounts();
  if (organisation) return NextResponse.json({ counts, inspections: inspectionsOf(organisation), returns: returnsOf(organisation), awarded: awardsOf({ awardingBody: organisation }).length });
  if (qualification) { const a = getAward(qualification); return a ? NextResponse.json({ counts, awards: [a] }) : NextResponse.json({ error: 'No such qualification' }, { status: 404 }); }
  if (holder) return NextResponse.json({ counts, awards: awardsOf({ holderRef: holder }) });
  return NextResponse.json({ counts });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { organisation?: string; period?: string; counts?: Record<string, unknown>; note?: string; by?: string };
  const s = await caseScope();
  if (s) {
    const why = canRecordEducationReturn(s, authorityFor('education'));
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const actor = await routeActor(b.by);
  const r = recordReturn({ organisation: String(b.organisation ?? ''), period: String(b.period ?? ''), counts: b.counts ?? {}, ...(b.note ? { note: b.note } : {}) }, actor.name);
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ return: r }, { status: 201 });
}

// GET /api/customs — customs declarations (lib/customs/register.ts) for the
// customs authority's officials and auditors with a purpose (commercial
// confidentiality): ?number= one declaration with every version of its goods
// lines, channel, inspections, duty and release; ?declarant= a declarant's
// declarations; with neither, counts only. Every search and read, allowed or
// refused, is written to the access log. Changes happen only through decided
// customs cases (/api/cases).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadCustoms } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { getDeclaration, declarationsOf, customsCounts } from '@/lib/customs/register';
import { recordAccess } from '@/lib/records/access-log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const number = q.get('number') ?? undefined, declarant = q.get('declarant') ?? undefined;
  const purpose = q.get('purpose') ?? undefined;
  const s = await caseScope();
  if (s) {
    const why = canReadCustoms(s, authorityFor('customs'), purpose);
    if (number || declarant || why) recordAccess({ by: { id: s.id, name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, record: { register: 'customs', ...(number ? { id: number } : { query: declarant ? 'declarant=…' : '(counts)' }) }, action: why ? 'refused' : number ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const counts = customsCounts();
  if (number) { const d = getDeclaration(number); return d ? NextResponse.json({ counts, declarations: [d] }) : NextResponse.json({ error: 'No such declaration' }, { status: 404 }); }
  if (declarant) return NextResponse.json({ counts, declarations: declarationsOf(declarant) });
  return NextResponse.json({ counts, declarations: [] });
}

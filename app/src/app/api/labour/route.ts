// GET /api/labour — the labour and employment register (lib/labour/register.ts;
// plan step I6) for the labour authority's officials, and auditors with a
// purpose. Without a search: counts only (employers, employments, vacancies,
// jobseekers, inspections open and closed, outstanding corrective orders,
// injury notifications, mediations, notices; no person, no employer named).
// ?employer= (labour register or organisation number): the employer with its
// workplaces, inspections (findings by version, orders, responses,
// verification), injury notifications and vacancies; ?case=: the records a case
// made. Every search and read, allowed or refused, is written to the access log.
// Changes only through decided labour cases (/api/cases); other institutions
// check an employer's standing through the exchange (employer.standing).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadLabour } from '@/lib/auth/roles';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { findLabour, labourCounts } from '@/lib/labour/register';
import { LABOUR_PROCEDURES } from '@/lib/labour/procedures';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const employer = q.get('employer')?.trim() || undefined, caseId = q.get('case')?.trim() || undefined, purpose = q.get('purpose')?.trim() || undefined;
  const searching = !!employer || !!caseId;
  const authority = authorityFor('labour');
  const s = await caseScope();
  if (s) {
    const why = canReadLabour(s, authority, purpose);
    if (searching || why) recordAccess({ ...accessBy(s), record: { register: 'labour', ...(employer ? { id: employer } : { query: caseId ? `case ${caseId}` : '(counts)' }) }, action: why ? 'refused' : employer ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const meta = { authority: authority ? { id: authority, name: getMinistry(authority)?.name ?? authority } : null, procedures: LABOUR_PROCEDURES.map(p => ({ key: p.key, title: p.title })) };
  if (!searching) return NextResponse.json({ ...meta, counts: labourCounts(), found: null });
  return NextResponse.json({ ...meta, counts: labourCounts(), found: findLabour({ employer, case: caseId }) });
}

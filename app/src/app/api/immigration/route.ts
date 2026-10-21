// GET /api/immigration — visas and residence permits (lib/immigration/register.ts)
// for the immigration authority's officials, and auditors with a purpose:
// ?number= or ?nationality=&documentNumber= finds grants with their holder
// and every step; with neither, counts by kind, category and state (no
// holder data). Every search and read, allowed or refused, is written to the
// access log. Changes happen only through decided immigration cases
// (/api/cases); other institutions check status through the exchange
// service immigration.status, never this file.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadImmigration } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { findGrants, grantCounts } from '@/lib/immigration/register';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const number = q.get('number') ?? undefined;
  const nationality = q.get('nationality') ?? undefined, documentNumber = q.get('documentNumber') ?? undefined;
  const searching = !!number || !!(nationality && documentNumber);
  const s = await caseScope();
  const purpose = q.get('purpose') ?? undefined;
  if (s) {
    const why = canReadImmigration(s, authorityFor('immigration'), purpose);
    if (searching || why) recordAccess({ ...accessBy(s), record: { register: 'immigration', ...(number ? { id: number } : { query: nationality ? `nationality=${nationality}&document=…` : '(counts)' }) }, action: why ? 'refused' : number ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  if (!searching) return NextResponse.json({ counts: grantCounts(), grants: [] });
  return NextResponse.json({ counts: grantCounts(), grants: findGrants({ number, nationality, documentNumber }) });
}

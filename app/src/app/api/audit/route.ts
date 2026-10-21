// The platform audit chain, newest first, one page at a time (go-live review
// M-8): ?limit= (default 200, at most 1000) and ?before=<seq> for the page
// after; `total` is the chain's length and `nextBefore` the cursor for the
// next page (absent on the last one).
//
// Read by auditors and the data-protection authority's officials
// (canReadAuditChain() in lib/auth/roles.ts; step I0.1): the chain names who
// acted in every institution, independent ones included, and carries no
// institution to filter by. Each read is written to the access log as a
// search of register `audit` (repeats of the same page within a minute once),
// and a refusal as `refused`. The chain's integrity check stays public
// (/api/audit/verify).
import { NextRequest, NextResponse } from 'next/server';
import { listAuditPage, authorityFor } from '@/lib/data/store';
import { readRefusal, caseScope } from '@/lib/auth/official';
import { canReadAuditChain } from '@/lib/auth/roles';
import { recordSearch } from '@/lib/records/access-search';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const refused = await readRefusal(s => canReadAuditChain(s, authorityFor('dataProtection')), { register: 'audit' });
  if (refused) return refused;
  const q = req.nextUrl.searchParams;
  const num = (k: string) => { const v = q.get(k); return v === null || v === '' ? undefined : Number(v); };
  const page = listAuditPage({ before: num('before'), limit: num('limit') });
  const s = await caseScope();
  if (s) recordSearch(s, 'audit', q.toString() || '(latest)', page.events.length, 'oversight read (canReadAuditChain)');
  return NextResponse.json(page);
}

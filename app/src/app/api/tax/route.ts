// GET /api/tax — the tax register (lib/tax/register.ts) for the tax
// authority's officials and auditors with a purpose (tax secrecy):
// ?tin= opens a taxpayer with returns, assessments and accounts; ?party=
// finds by register reference; with neither, counts only. Every search and
// read, allowed or refused, is written to the access log. Changes happen only
// through decided tax cases (/api/cases).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadTax } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { findTaxpayers, returnsOf, assessmentsOf, account, taxCounts } from '@/lib/tax/register';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const tin = q.get('tin') ?? undefined, party = q.get('party') ?? undefined;
  const purpose = q.get('purpose') ?? undefined;
  const s = await caseScope();
  if (s) {
    const why = canReadTax(s, authorityFor('tax'), purpose);
    if (tin || party || why) recordAccess({ ...accessBy(s), record: { register: 'tax', ...(tin ? { id: tin } : { query: party ? 'party=…' : '(counts)' }) }, action: why ? 'refused' : tin ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  if (!tin && !party) return NextResponse.json({ counts: taxCounts(), taxpayers: [] });
  const taxpayers = findTaxpayers({ tin, party }).map(t => ({
    ...t, returns: returnsOf(t.id), assessments: assessmentsOf(t.id),
    accounts: Object.fromEntries(t.taxTypes.map(type => [type, account(t.id, type)])),
  }));
  return NextResponse.json({ counts: taxCounts(), taxpayers });
}

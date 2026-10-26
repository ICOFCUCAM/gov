// GET /api/passports — passports and travel documents (lib/passports/register.ts;
// plan step I6) for the travel document authority's officials, and auditors
// with a purpose. Without a search: counts (by state and type, reviews), the
// production reconciliation by batch (numbers only) and whether the authority
// and the fee schedule are in place. ?number= (register or document number)
// or ?identity= (the holder's identity record): the documents with their
// production, quality, custody, delivery and status history. Document numbers
// are not searchable without a stated purpose (field series Part 4 §5.2); every
// search and read, allowed or refused, is written to the access log. Changes
// only through decided passport cases (/api/cases); others check status through
// the exchange (travel-document.status).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadTravelDocuments } from '@/lib/auth/roles';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { ruleInForce } from '@/lib/law/rules';
import { findTravelDocuments, passportCounts, productionReconciliation, DOCUMENT_STATE_LABEL, APPLICATION_KINDS, ICAO_ELEMENTS, FEE_RULE } from '@/lib/passports/register';
import { PASSPORT_PROCEDURES } from '@/lib/passports/procedures';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const number = q.get('number')?.trim() || undefined, identity = q.get('identity')?.trim() || undefined, purpose = q.get('purpose')?.trim() || undefined;
  const searching = !!number || !!identity;
  const authority = authorityFor('travelDocuments');
  const s = await caseScope();
  if (s) {
    let why = canReadTravelDocuments(s, authority, purpose);
    if (!why && searching && !purpose) why = 'Say why you need this travel document record (a specific authorised purpose)';
    if (searching || why) recordAccess({ ...accessBy(s), record: { register: 'travel-documents', ...(number ? { id: number } : { query: identity ? 'holder\'s identity record' : '(counts)' }) }, action: why ? 'refused' : number ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const fee = ruleInForce(FEE_RULE);
  const meta = {
    authority: authority ? { id: authority, name: getMinistry(authority)?.name ?? authority } : null,
    feeSchedule: fee ? { key: fee.key, version: fee.version, lines: fee.amounts?.length ?? 0, effectiveFrom: fee.effectiveFrom } : null,
    procedures: PASSPORT_PROCEDURES.map(p => ({ key: p.key, title: p.title })),
    labels: { states: DOCUMENT_STATE_LABEL, kinds: APPLICATION_KINDS, icao: ICAO_ELEMENTS },
  };
  if (!searching) return NextResponse.json({ ...meta, counts: passportCounts(), reconciliation: productionReconciliation(), documents: [] });
  return NextResponse.json({ ...meta, counts: passportCounts(), documents: findTravelDocuments({ number, identity }) });
}

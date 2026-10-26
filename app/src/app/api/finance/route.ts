// GET /api/finance — the public finance register (plan step I5,
// lib/finance/register.ts): budget calls, ceilings, bids, appropriations with
// their balance computed from the records (released, committed, paid,
// reconciled, available), commitments, payment orders with each step's
// official, payee accounts (masked), cash forecasts (reported). The finance
// authority's officials read every institution's records; another
// institution's officials their own; whole-government officials where
// whole-government reach goes; auditors with a purpose (canReadFinance(),
// lib/auth/roles.ts). Reading payment orders and payee accounts is written to
// the access log. Also: the finance authority the nation named, the
// procedures and their state, the approval-tiers rule (approved or not).
// Nothing is changed here: the records change only through decided cases
// (/api/cases) under the budget and treasury procedures.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadFinance } from '@/lib/auth/roles';
import { authorityFor, getMinistry, listMinistries } from '@/lib/data/store';
import { listPackages } from '@/lib/casework/packages';
import { ruleInForce } from '@/lib/law/rules';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { financeRecords, financeCounts, REVISION_KINDS } from '@/lib/finance/register';
import { FINANCE_PROCEDURES, PAYMENT_TIERS_RULE } from '@/lib/finance/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const purpose = req.nextUrl.searchParams.get('purpose') ?? undefined;
  const s = await caseScope();
  const finance = authorityFor('finance');
  let institutions: string[] | undefined;
  if (s) {
    // Every institution this official may read the finance records of (all of them for the finance authority).
    const readable = listMinistries().map(m => m.id).filter(id => !canReadFinance(s, id, finance, purpose));
    if (!readable.length) {
      const why = canReadFinance(s, undefined, finance, purpose)!;
      recordAccess({ ...accessBy(s), record: { register: 'finance', query: '(records)' }, action: 'refused', result: 'refused', rule: why, ...(purpose ? { purpose } : {}) });
      return NextResponse.json({ error: why }, { status: 403 });
    }
    institutions = finance && s.institution === finance ? undefined : readable;
  }
  const records = financeRecords(institutions);
  // Payment orders and payee accounts are restricted: the read is logged (allowed), with what it covered.
  if (s && (records.payments.length || records.payees.length)) {
    recordAccess({ ...accessBy(s), record: { register: 'finance-payments', query: institutions ? `${institutions.length} institution(s)` : 'all institutions' }, action: 'search', result: 'allowed', rule: 'canReadFinance(): payment orders and payee accounts', ...(purpose ? { purpose } : {}) });
  }
  const packages = listPackages();
  return NextResponse.json({
    authority: finance ? { id: finance, name: getMinistry(finance)?.name ?? finance } : null,
    procedures: FINANCE_PROCEDURES.map(p => {
      const v = packages.filter(x => x.key === p.key && x.state !== 'superseded').sort((a, b) => b.version - a.version);
      const approved = v.find(x => x.state === 'approved');
      return { key: p.key, title: p.title, state: approved ? 'approved' : v[0] ? 'draft' : 'not-installed', ...(approved ?? v[0] ? { version: (approved ?? v[0])!.version } : {}) };
    }),
    rules: { paymentTiers: ruleInForce(PAYMENT_TIERS_RULE) ? 'approved' : 'not approved (ships unset)' },
    names: Object.fromEntries(listMinistries().map(m => [m.id, m.name])),
    revisionKinds: REVISION_KINDS,
    counts: financeCounts(),
    ...records,
  });
}

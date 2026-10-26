// /api/procurement — public procurement (plan step I5, lib/procurement). Each
// procuring institution's plans, tenders and contracts run through
// /api/cases under its own adopted procedures (proc.<template>.<institution>);
// complaints under the review body's own (procurement-review.complaint). This
// route carries what a case cannot carry without breaking a seal or putting a
// person's statement about themselves in the procuring institution's case.
//
// GET: the records the signed-in official may read (canReadProcurement():
// the procuring institution its own, the review body the tenders a complaint
// before it concerns, auditors with a purpose), bids sealed until the opening
// (receipt time and manifest hash only), declarations' details only within
// the procuring institution; ?ocds=<tender> the tender as an OCDS release
// (what a public notice carries, no bid content); the templates and whether
// each institution adopted them; the method thresholds rule (approved or not).
//
// POST (signed-in officials; checked here against the record):
//   { op: 'adopt', institution }                         an administrator or one who can sign there drafts its procurement procedures
//   { op: 'receive-bid', tender, supplier, priceMinor, summary, documents? }  an official of the procuring institution records a sealed bid
//   { op: 'withdraw-bid', bid, reason }                  the supplier's withdrawal before the deadline
//   { op: 'declare', tender, interest: 'none'|'declared', details? }  a committee member declares their own interests
//   { op: 'manage-conflict', tender, member: { id, name }, outcome: 'recused'|'may-participate', reasons }  an official who can sign, independent of the committee
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadProcurement, roleOf } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { authorityFor, getMinistry, listMinistries } from '@/lib/data/store';
import { listPackages } from '@/lib/casework/packages';
import { ruleInForce } from '@/lib/law/rules';
import { getOrganisation, current } from '@/lib/organisations/register';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { procurementRecords, procurementCounts, ocdsRelease, getTender, receiveBid, withdrawBid, declareInterest, manageInterest, bidsOf } from '@/lib/procurement/register';
import { PROCUREMENT_PROCEDURES, REFERENCE_PROCUREMENT_COMPLAINT, METHOD_THRESHOLDS_RULE, installProcurementProcedures, procurementKey } from '@/lib/procurement/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const purpose = q.get('purpose') ?? undefined;
  const s = await caseScope();
  const review = authorityFor('procurementReview');
  const ocds = q.get('ocds');
  if (ocds) {
    const t = getTender(ocds);
    if (!t) return NextResponse.json({ error: 'No such tender' }, { status: 404 });
    const why = s ? canReadProcurement(s, t.institution, review, purpose) : null;
    if (why) return NextResponse.json({ error: why }, { status: 403 });
    return NextResponse.json(ocdsRelease(t.ref) ?? { error: 'A tender is released only once published' });
  }
  let institutions: string[] | undefined;
  if (s) {
    const readable = listMinistries().map(m => m.id).filter(id => !canReadProcurement(s, id, review, purpose));
    if (!readable.length) {
      const why = canReadProcurement(s, '', review, purpose)!;
      recordAccess({ ...accessBy(s), record: { register: 'procurement', query: '(records)' }, action: 'refused', result: 'refused', rule: why, ...(purpose ? { purpose } : {}) });
      return NextResponse.json({ error: why }, { status: 403 });
    }
    institutions = readable;
  }
  // A declaration's details are read only within the procuring institution (or without sign-in, in demonstrations).
  const records = procurementRecords(institutions, { restricted: !s });
  if (s) {
    const own = procurementRecords([s.institution ?? ''], { restricted: true });
    records.tenders = records.tenders.map(t => own.tenders.find(x => x.id === t.id) ?? t);
    // The review body reads another institution's procurement only for a complaint before it.
    if (review && s.institution === review && !purpose) {
      const before = (t: { institution: string; challenges: { body: string }[] }) => t.institution === review || t.challenges.some(c => c.body === review);
      records.tenders = records.tenders.filter(before);
      records.plans = records.plans.filter(p => p.institution === review);
      records.contracts = records.contracts.filter(k => k.institution === review || records.tenders.some(t => t.ref === k.tender));
    }
    recordAccess({ ...accessBy(s), record: { register: 'procurement', query: `${institutions!.length} institution(s)` }, action: 'search', result: 'allowed', rule: 'canReadProcurement()', ...(purpose ? { purpose } : {}) });
  }
  const packages = listPackages();
  return NextResponse.json({
    reviewBody: review ? { id: review, name: getMinistry(review)?.name ?? review } : null,
    templates: PROCUREMENT_PROCEDURES.map(t => ({ key: t.key, title: t.title, forms: t.forms, adoptedBy: packages.filter(p => p.key.startsWith(`${t.key}.`) && p.state !== 'superseded').map(p => ({ key: p.key, institution: p.owner, state: p.state, version: p.version })) })),
    review: (() => { const v = packages.filter(p => p.key === REFERENCE_PROCUREMENT_COMPLAINT.key && p.state !== 'superseded'); return { key: REFERENCE_PROCUREMENT_COMPLAINT.key, state: v.some(p => p.state === 'approved') ? 'approved' : v.length ? 'draft' : 'not-installed' }; })(),
    rules: { methodThresholds: ruleInForce(METHOD_THRESHOLDS_RULE) ? 'approved' : 'not approved (ships unset)' },
    names: Object.fromEntries(listMinistries().map(m => [m.id, m.name])),
    counts: procurementCounts(),
    ...records,
  });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = await caseScope();
  const who = await routeActor(b.by);
  const me = { ...(who.id ? { id: who.id } : {}), name: who.name };
  const now = new Date().toISOString();
  const op = str(b.op, 40);
  if (op === 'adopt') {
    const inst = str(b.institution, 120);
    if (!getMinistry(inst)) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
    if (s && (s.institution !== inst || !['administrator', 'signatory'].includes(roleOf(s)))) return NextResponse.json({ error: 'An administrator or an official who can sign at the institution drafts its own procurement procedures' }, { status: 403 });
    const r = installProcurementProcedures(inst, me.name, me.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ ...r, keys: PROCUREMENT_PROCEDURES.map(t => procurementKey(t.key, inst)) });
  }
  if (op === 'receive-bid') {
    const t = getTender(str(b.tender, 60));
    if (!t) return NextResponse.json({ error: 'No such tender' }, { status: 404 });
    if (s && s.institution !== t.institution) return NextResponse.json({ error: 'A bid is received by an official of the procuring institution' }, { status: 403 });
    const o = getOrganisation(str(b.supplier, 60));
    if (!o) return NextResponse.json({ error: 'The bidder is an organisation of the organisations register (its number)' }, { status: 422 });
    const r = receiveBid({ tender: t.ref, supplier: { number: o.number, name: current(o).name }, priceMinor: Number(b.priceMinor), summary: str(b.summary, 20000), documents: Array.isArray(b.documents) ? b.documents.map(String) : [], by: me, at: now });
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ bid: r });
  }
  if (op === 'withdraw-bid') {
    const bid = str(b.bid, 60);
    const t = getTender(bidsOf(str(b.tender, 60)).find(x => x.ref === bid)?.tender ?? str(b.tender, 60));
    if (s && t && s.institution !== t.institution) return NextResponse.json({ error: 'A withdrawal is recorded by an official of the procuring institution' }, { status: 403 });
    const r = withdrawBid(bid, str(b.reason, 500), me, now);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ bid: r });
  }
  if (op === 'declare') {
    const interest = b.interest === 'declared' ? 'declared' : b.interest === 'none' ? 'none' : null;
    if (!interest) return NextResponse.json({ error: 'interest is none or declared' }, { status: 422 });
    const r = declareInterest(str(b.tender, 60), me, interest, str(b.details, 4000), now);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ declaration: { member: r.member.name, interest: r.interest, at: r.at } });
  }
  if (op === 'manage-conflict') {
    const t = getTender(str(b.tender, 60));
    if (!t) return NextResponse.json({ error: 'No such tender' }, { status: 404 });
    if (s && (s.institution !== t.institution || !['signatory', 'administrator'].includes(roleOf(s)))) return NextResponse.json({ error: 'A declared interest is managed by an official who can sign at the procuring institution' }, { status: 403 });
    const m = (b.member ?? {}) as { id?: unknown; name?: unknown };
    const outcome = b.outcome === 'recused' ? 'recused' : b.outcome === 'may-participate' ? 'may-participate' : null;
    if (!outcome) return NextResponse.json({ error: 'outcome is recused or may-participate' }, { status: 422 });
    const r = manageInterest(t.ref, { ...(str(m.id, 120) ? { id: str(m.id, 120) } : {}), name: str(m.name, 120) }, outcome, str(b.reasons, 2000), me, now);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ declaration: { member: r.member.name, managed: r.managed } });
  }
  return NextResponse.json({ error: 'op must be adopt, receive-bid, withdraw-bid, declare or manage-conflict' }, { status: 422 });
}

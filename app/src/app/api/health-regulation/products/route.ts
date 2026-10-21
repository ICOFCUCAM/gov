// /api/health-regulation/products — the register of authorised medicines and
// medical devices (lib/health/products/register.ts).
//
// GET: anyone's list of decided products, each as publicProductView() under
// the nation's approved public information classification (?kind=, ?q= a
// register number, or a name where the classification publishes names);
// ?number= one product's public view; the classification in force and its
// waiting proposal; counts. ?number=…&full=1 is the full record (dossier
// versions, assessment, grounds, recall completions): the medicines
// authority's officials only (canReadProduct()), and every read, allowed or
// refused, goes to the access log; ?search=1 is the regulator's own list
// (numbers, names and states, applications included), logged as a search.
// POST (administrators): what the public check shows, by two officials citing
// the law: { op: 'propose-disclosure', fields, legalBasis: [{ instrument,
// eId }] }, then { op: 'confirm-disclosure' } by a different official, or
// { op: 'withdraw-disclosure' }. Products change only through decided cases
// (/api/cases).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadProduct } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { routeActor } from '@/lib/casework/actor';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import {
  getProduct, publicProduct, listPublicProducts, productCounts, findProducts, publicClassification, productDisclosureChanges, productRecord,
  proposeProductDisclosure, confirmProductDisclosure, withdrawProductDisclosure, PUBLISHABLE_ATTRIBUTES, ATTRIBUTE_CLASS, STATE_LABEL,
} from '@/lib/health/products/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const number = q.get('number')?.trim() ?? '';
  const kind = q.get('kind') === 'device' ? 'device' : q.get('kind') === 'medicine' ? 'medicine' : undefined;
  if (q.get('full') === '1' || q.get('search') === '1') {
    const s = await caseScope();
    if (!s) return NextResponse.json({ error: 'Sign in as an official of the medicines authority to read full product records' }, { status: 401 });
    const why = canReadProduct(s, authorityFor('medicinesRegulation'));
    const search = q.get('search') === '1';
    recordAccess({ ...accessBy(s), record: { register: 'products', ...(search ? { query: kind ? `kind=${kind}` : '(all)' } : { id: number || '(none)' }) }, action: why ? 'refused' : search ? 'search' : 'view', result: why ? 'refused' : 'allowed', rule: why ?? 'canReadProduct' });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
    if (search) return NextResponse.json({ products: findProducts({ ...(kind ? { kind } : {}) }), labels: STATE_LABEL });
    const p = getProduct(number);
    if (!p) return NextResponse.json({ error: 'No such product' }, { status: 404 });
    return NextResponse.json({ product: p, record: productRecord(p), public: publicProduct(p), classes: ATTRIBUTE_CLASS, labels: STATE_LABEL });
  }
  const common = { classification: publicClassification(), changes: productDisclosureChanges(), publishable: PUBLISHABLE_ATTRIBUTES, counts: productCounts(), authorityNamed: !!authorityFor('medicinesRegulation') };
  if (number) {
    const one = listPublicProducts({ q: number }).find(p => p.productId === number);
    return one ? NextResponse.json({ ...common, products: [one] }) : NextResponse.json({ ...common, products: [], error: 'Not on the public register' }, { status: 404 });
  }
  return NextResponse.json({ ...common, products: listPublicProducts({ ...(kind ? { kind } : {}), ...(q.get('q') ? { q: q.get('q')! } : {}) }) });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = await routeActor(b.by);
  const dc = dualControlPolicy();
  const r = b.op === 'propose-disclosure' ? proposeProductDisclosure(b.fields, b.legalBasis, actor.name, actor.id, new Date(), dc.pendingHours)
    : b.op === 'confirm-disclosure' ? confirmProductDisclosure(actor.name, actor.id, new Date(), dc.requireIdentityBinding)
    : b.op === 'withdraw-disclosure' ? withdrawProductDisclosure(actor.name, typeof b.reason === 'string' ? b.reason : undefined)
    : { error: 'op is propose-disclosure, confirm-disclosure or withdraw-disclosure' };
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, classification: publicClassification(), changes: productDisclosureChanges() });
}

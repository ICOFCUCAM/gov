// /api/payments — bills and receipts. GET: the bills the signed-in official
// may see (general bills, and the bills of liabilities their own institution
// issued: tax and customs bills are confidential to their issuer) with their
// receipts; a read that returns bills naming a payer is written to the access
// log as one search with the count. POST { billId, rail? }: the platform's stand-in payment
// (integration register 1.8), which moves no money: only in demonstration and
// training installations, never for a tax or customs liability; in
// production payments arrive from the payment provider or bank.
import { NextRequest, NextResponse } from 'next/server';
import { getBill, payBill, billsFor, receiptsVisibleTo } from '@/lib/data/store/payments';
import { caseScope } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { samplesAllowed } from '@/lib/ops/mode';
import { nationPaymentRail } from '@/lib/nation/registry';
import { recordSearch } from '@/lib/records/access-search';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await caseScope();
  const viewer = s ? { ...(s.institution ? { institution: s.institution } : {}) } : null;
  const bills = billsFor(viewer);
  // Bills naming a payer (a tax or customs liability, shown only to its issuer) are personal data: one search entry with the count.
  const named = bills.filter(b => b.payer).length;
  if (s && named) recordSearch(s, 'bills', 'bills naming a payer', named, 'issuing institution (billsFor)');
  return NextResponse.json({ bills, receipts: receiptsVisibleTo(viewer) });
}

export async function POST(req: NextRequest) {
  let body: { billId?: string; rail?: string; by?: string };
  try {
    body = (await req.json()) as { billId?: string; rail?: string; by?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.billId) {
    return NextResponse.json({ error: 'billId is required' }, { status: 422 });
  }
  if (!samplesAllowed()) return NextResponse.json({ error: 'No payment provider is connected: payments are recorded from the payment provider or bank, never marked paid here' }, { status: 409 });
  if (getBill(body.billId)?.payer) return NextResponse.json({ error: 'A tax or customs bill is settled only by a payment from the payment provider or bank' }, { status: 409 });
  const actor = await routeActor(body.by ?? 'citizen');
  const result = payBill(body.billId, body.rail ?? nationPaymentRail(), actor.name);
  if ('error' in result) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json({ receipt: result }, { status: 201 });
}

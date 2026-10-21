// GET /api/tax/services — the tax services (plan step I5, forms batch 6):
// each tax procedure with its state in this installation's package register
// (not installed, draft, approved), the permit type each decision rests on
// and whether its mapping is approved, its periods (set by the nation or
// not), and the catalogue forms it carries by identity with their
// procedure-link state; the forms still waiting for a procedure, with why.
// Configuration only: no taxpayer, return, assessment, balance or refund is
// read here (the tax register is /api/tax, under canReadTax(), every read in
// the access log). Nothing is changed here: procedures are drafted and
// approved at /api/case-packages, mappings at /api/permit-authorities.
import { NextResponse } from 'next/server';
import { taxServicesView } from '@/lib/tax/services-view';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(taxServicesView());
}

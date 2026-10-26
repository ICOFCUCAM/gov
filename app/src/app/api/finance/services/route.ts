// GET /api/finance/services?group=finance|procurement|cabinet — the economic
// group's services (plan step I5): each procedure (or template, with the
// institutions that adopted it) and its state in this installation's package
// register, the permit type each decision rests on and whether its mapping is
// approved, its periods (set by the nation or not), the rules it reads
// (approved or shipped unset), and the catalogue forms it carries by identity
// with their procedure-link state; the forms still waiting for a procedure,
// with why. Configuration only: no amount, payee, bid or paper is read here.
// Nothing is changed here: procedures are approved at /api/case-packages,
// mappings at /api/permit-authorities, rules at /api/rules.
import { NextRequest, NextResponse } from 'next/server';
import { economicServicesView, type EconomicGroup } from '@/lib/finance/services-view';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = req.nextUrl.searchParams.get('group') ?? 'finance';
  if (!['finance', 'procurement', 'cabinet'].includes(g)) return NextResponse.json({ error: 'group is finance, procurement or cabinet' }, { status: 422 });
  return NextResponse.json(economicServicesView(g as EconomicGroup));
}

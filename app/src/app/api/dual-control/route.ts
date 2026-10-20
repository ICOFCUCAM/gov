// /api/dual-control — the two-official rules for decisions
// (lib/casework/dual-control-policy.ts). GET: the platform's minimum (fixed
// in code), the country's rules with their legal basis, a proposal waiting
// for its second official and every earlier version. POST (administrators):
// { op: 'propose' (the default), extra?, requireIdentityBinding?,
// pendingHours?, legalBasis: [{ instrument, eId }] } proposes the country's
// rules, values left out keeping their current setting, the basis cited from
// the laws register; { op: 'confirm' } is a different official adopting it;
// { op: 'withdraw', reason? }. The minimum cannot be lowered here. Who acted
// comes from the sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { dualControlPolicy, proposeDualControlPolicy, confirmDualControlPolicy, withdrawDualControlPolicy } from '@/lib/casework/dual-control-policy';

export const dynamic = 'force-dynamic';

const MINIMUM = [
  'A tax assessment or its variation',
  'A customs duty assessment',
  'Issuing, renewing, suspending, reinstating, revoking or correcting a regulated credential or register standing',
  'Approving an authority mapping or an operational rule; confirming, reviewing or lifting an emergency suspension; approving a procedure; confirming a law; a data restore',
  'Loading an existing organisations register; changing these rules or the suspension periods',
];

export function GET() {
  return NextResponse.json({ minimum: MINIMUM, policy: dualControlPolicy() });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = await routeActor(b.by);
  const out = (r: object) => ('error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, policy: dualControlPolicy() }));
  const op = b.op ?? 'propose';
  if (op === 'propose') return out(proposeDualControlPolicy({ extra: b.extra, requireIdentityBinding: b.requireIdentityBinding, pendingHours: b.pendingHours, legalBasis: b.legalBasis }, actor.name, actor.id));
  if (op === 'confirm') return out(confirmDualControlPolicy(actor.name, actor.id));
  if (op === 'withdraw') return out(withdrawDualControlPolicy(actor.name, typeof b.reason === 'string' ? b.reason : undefined));
  return NextResponse.json({ error: 'op must be propose, confirm or withdraw' }, { status: 422 });
}

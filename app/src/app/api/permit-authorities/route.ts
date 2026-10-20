// /api/permit-authorities — which authority the law designates for each
// permit, licence and register type (lib/permits/authority.ts). GET: every
// version, with the one in force today. POST (administrators, the structure
// of government): { op: 'draft', mapping } writes the next version;
// { op: 'approve', permitType, version } approves a draft (a different
// official; needs its legal basis); { op: 'withdraw', permitType, version,
// reason } withdraws a draft; { op: 'install-proposals' } drafts the defaults
// CivicOS proposes, which govern nothing until approved. Emergency
// suspension: { op: 'suspend', permitType, version, reason, reviewBy? },
// { op: 'confirm-suspension' | 'lift-suspension' | 'review-suspension', … }
// (each a different official from the one who suspended); who may suspend
// is the country's rule (any administrator, or government-wide ones only).
// The suspension rules change by two officials, citing the law:
// { op: 'suspension-policy', confirmWithinHours?, reviewWithinDays?,
// suspendBy?, legalBasis: [{ instrument, eId }] } proposes (values left out
// keep their setting); { op: 'confirm-suspension-policy' } is a different
// official adopting it; { op: 'withdraw-suspension-policy', reason? }.
// Who acted comes from the sign-in, never the request.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { draftMapping, approveMapping, withdrawMapping, listMappings, mappingInForce, installProposedDefaults, PROPOSED_DEFAULTS, suspendMapping, confirmSuspension, reviewSuspension, liftSuspension, proposeSuspensionPolicy, confirmSuspensionPolicy, withdrawSuspensionPolicy, suspenderRefusal, suspensionPolicy, suspensionInForce } from '@/lib/permits/authority';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const permitType = req.nextUrl.searchParams.get('permitType') ?? undefined;
  const mappings = listMappings(permitType);
  const types = [...new Set(mappings.map(m => m.permitType))];
  return NextResponse.json({ mappings, inForce: Object.fromEntries(types.map(t => [t, mappingInForce(t)?.version ?? null])), suspended: Object.fromEntries(types.flatMap(t => { const s = suspensionInForce(t); return s ? [[t, s]] : []; })), suspensionPolicy: suspensionPolicy(), proposals: PROPOSED_DEFAULTS.length });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; mapping?: Record<string, unknown>; permitType?: string; version?: number; reason?: string; reviewBy?: string; confirmWithinHours?: number; reviewWithinDays?: number; suspendBy?: string; legalBasis?: unknown; by?: string };
  const actor = await routeActor(b.by);
  if (b.op === 'draft') {
    const r = draftMapping(b.mapping ?? {}, actor.name, actor.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ mapping: r }, { status: 201 });
  }
  if (b.op === 'approve') {
    const r = approveMapping(String(b.permitType ?? ''), Number(b.version), actor.name, actor.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ mapping: r });
  }
  if (b.op === 'withdraw') {
    const r = withdrawMapping(String(b.permitType ?? ''), Number(b.version), String(b.reason ?? ''), actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ mapping: r });
  }
  if (b.op === 'install-proposals') return NextResponse.json(installProposedDefaults(actor.name));
  const pt = String(b.permitType ?? ''), v = Number(b.version);
  const out = (r: unknown) => (r && typeof r === 'object' && 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r));
  if (b.op === 'suspend') {
    const why = suspenderRefusal(actor.scope);
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  if (b.op === 'suspend') return out(suspendMapping(pt, v, { reason: b.reason, reviewBy: b.reviewBy }, actor.name, actor.id));
  if (b.op === 'confirm-suspension') return out(confirmSuspension(pt, v, actor.name, actor.id));
  if (b.op === 'review-suspension') return out(reviewSuspension(pt, v, { reason: b.reason, reviewBy: b.reviewBy }, actor.name, actor.id));
  if (b.op === 'lift-suspension') return out(liftSuspension(pt, v, b.reason, actor.name, actor.id));
  const dc = dualControlPolicy();
  if (b.op === 'suspension-policy') return out(proposeSuspensionPolicy({ confirmWithinHours: b.confirmWithinHours, reviewWithinDays: b.reviewWithinDays, suspendBy: b.suspendBy, legalBasis: b.legalBasis }, actor.name, actor.id, new Date(), dc.pendingHours));
  if (b.op === 'confirm-suspension-policy') return out(confirmSuspensionPolicy(actor.name, actor.id, new Date(), dc.requireIdentityBinding));
  if (b.op === 'withdraw-suspension-policy') return out(withdrawSuspensionPolicy(actor.name, b.reason));
  return NextResponse.json({ error: 'op must be draft, approve, withdraw, install-proposals, suspend, confirm-suspension, review-suspension, lift-suspension, suspension-policy, confirm-suspension-policy or withdraw-suspension-policy' }, { status: 422 });
}

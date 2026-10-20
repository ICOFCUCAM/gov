// /api/permit-authorities — which authority the law designates for each
// permit, licence and register type (lib/permits/authority.ts). GET: every
// version, with the one in force today. POST (administrators, the structure
// of government): { op: 'draft', mapping } writes the next version;
// { op: 'approve', permitType, version } approves a draft (a different
// official; needs its legal basis); { op: 'withdraw', permitType, version,
// reason } withdraws a draft; { op: 'install-proposals' } drafts the defaults
// CivicOS proposes, which govern nothing until approved. Who acted comes from
// the sign-in, never the request.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { draftMapping, approveMapping, withdrawMapping, listMappings, mappingInForce, installProposedDefaults, PROPOSED_DEFAULTS } from '@/lib/permits/authority';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const permitType = req.nextUrl.searchParams.get('permitType') ?? undefined;
  const mappings = listMappings(permitType);
  const types = [...new Set(mappings.map(m => m.permitType))];
  return NextResponse.json({ mappings, inForce: Object.fromEntries(types.map(t => [t, mappingInForce(t)?.version ?? null])), proposals: PROPOSED_DEFAULTS.length });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; mapping?: Record<string, unknown>; permitType?: string; version?: number; reason?: string; by?: string };
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
  return NextResponse.json({ error: 'op must be draft, approve, withdraw or install-proposals' }, { status: 422 });
}

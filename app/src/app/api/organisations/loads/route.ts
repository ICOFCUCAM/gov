// /api/organisations/loads — loading an existing register into the
// organisations register (lib/organisations/import.ts). GET: the loads, with
// their refused rows. POST { op: 'load', register, csv } checks a file and
// proposes it; { op: 'confirm', id } is a different official confirming it,
// when its rows enter the register; { op: 'withdraw', id } withdraws a load.
// Only officials of the institution that keeps the register type
// (deployment profile or the type's own institution); administrators have no
// domain authority here (acceptance hardening). Confirming needs "Can sign".
// Who acted comes from the sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { authorityFor } from '@/lib/data/store';
import { ownerInstitution } from '@/lib/casework/packages';
import { routeActor } from '@/lib/casework/actor';
import { registerType } from '@/lib/organisations/register';
import { loadOrganisations, confirmLoad, withdrawLoad, listLoads, ORG_COLUMNS } from '@/lib/organisations/import';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ loads: listLoads(), columns: ORG_COLUMNS });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; register?: string; csv?: string; id?: string; by?: string };
  const actor = await routeActor(b.by);
  const s = await caseScope();
  const byLoad = b.op === 'withdraw' || b.op === 'confirm';
  const register = byLoad ? listLoads().find(l => l.id === b.id)?.register : b.register;
  const t = register ? registerType(register) : undefined;
  if (!t) return NextResponse.json({ error: byLoad ? 'No such load' : `No register ${b.register ?? ''}` }, { status: 404 });
  if (s) {
    const keeper = ownerInstitution(t.authority, authorityFor);
    if (!keeper || s.institution !== keeper) return NextResponse.json({ error: `${t.title} is loaded only by officials of the authority that keeps it` }, { status: 403 });
    if (b.op === 'confirm' && s.role !== 'signatory') return NextResponse.json({ error: 'Confirming a load enters standings in the register: it needs an official who can sign' }, { status: 403 });
  }
  if (b.op === 'load') {
    const r = loadOrganisations({ register: t.key, csv: String(b.csv ?? '') }, actor.name, new Date(), actor.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ load: r }, { status: 201 });
  }
  if (b.op === 'confirm') {
    const r = confirmLoad(String(b.id), actor.name, new Date(), actor.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ load: r });
  }
  if (b.op === 'withdraw') {
    const r = withdrawLoad(String(b.id), actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ load: r });
  }
  return NextResponse.json({ error: 'op must be load, confirm or withdraw' }, { status: 422 });
}

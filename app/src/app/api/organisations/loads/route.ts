// /api/organisations/loads — loading an existing register into the
// organisations register (lib/organisations/import.ts). GET: the loads, with
// their refused rows. POST { op: 'load', register, csv } checks and loads a
// file; { op: 'withdraw', id } withdraws a load. Officials of the institution
// that keeps the register type (deployment profile or the type's own
// institution), or administrators; who loaded comes from the sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { ownerInstitution } from '@/lib/casework/packages';
import { routeActor } from '@/lib/casework/actor';
import { registerType } from '@/lib/organisations/register';
import { loadOrganisations, withdrawLoad, listLoads, ORG_COLUMNS } from '@/lib/organisations/import';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ loads: listLoads(), columns: ORG_COLUMNS });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; register?: string; csv?: string; id?: string; by?: string };
  const actor = await routeActor(b.by);
  const s = await caseScope();
  const register = b.op === 'withdraw' ? listLoads().find(l => l.id === b.id)?.register : b.register;
  const t = register ? registerType(register) : undefined;
  if (!t) return NextResponse.json({ error: b.op === 'withdraw' ? 'No such load' : `No register ${b.register ?? ''}` }, { status: 404 });
  if (s) {
    const keeper = ownerInstitution(t.authority, authorityFor);
    const why = keeper && s.institution === keeper ? null : adminOnly(s);
    if (why) return NextResponse.json({ error: `${t.title} is loaded by the authority that keeps it: ${why}` }, { status: 403 });
  }
  if (b.op === 'load') {
    const r = loadOrganisations({ register: t.key, csv: String(b.csv ?? '') }, actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ load: r }, { status: 201 });
  }
  if (b.op === 'withdraw') {
    const r = withdrawLoad(String(b.id), actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ load: r });
  }
  return NextResponse.json({ error: 'op must be load or withdraw' }, { status: 422 });
}

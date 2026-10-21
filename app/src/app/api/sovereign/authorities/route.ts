// /api/sovereign/authorities — who is responsible for each register and power,
// once setup is complete (lib/data/store/sovereign.ts; plan phase 2, audit D).
// During first-run setup the deployment profile is saved through
// /api/sovereign as before; afterwards a direct change there is refused and
// goes through here, the country's change process (lib/law/policy-change.ts).
// GET: who is named now, a proposal waiting for its second official and every
// earlier version. POST (administrators, ADMIN_ONLY under /api/sovereign):
//   { op: 'propose' (default), authorities: { register: institution id | "" }, legalBasis: [{ instrument, eId }] }
//     by an administrator serving the whole government; registers left out keep their institution;
//   { op: 'confirm' } a different administrator adopts it;
//   { op: 'withdraw', reason? }.
// Who acted comes from the sign-in; every step is audited.
import { NextRequest, NextResponse } from 'next/server';
import { refusal } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { adminOnly, installationAdmin } from '@/lib/auth/roles';
import { authorityChanges, lapseAuthorities, proposeAuthorities, confirmAuthorities, withdrawAuthorities, getSovereign, getSetup } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  lapseAuthorities();
  return NextResponse.json({ authorities: getSovereign().deployment?.authorities ?? {}, changes: authorityChanges(), setupComplete: getSetup() !== null });
}

/** @example request {"op":"propose","authorities":{"judiciary":"fed-justice"},"legalBasis":[{"instrument":"/eli/x/act/2026/1","eId":"sec_4"}]} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; authorities?: unknown; legalBasis?: unknown; reason?: string; by?: string };
  const op = b.op ?? 'propose';
  const refused = await refusal(op === 'propose' ? installationAdmin : adminOnly);
  if (refused) return refused;
  const actor = await routeActor(b.by);
  const who = { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) };
  const out = (r: object) => ('error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, authorities: getSovereign().deployment?.authorities ?? {}, changes: authorityChanges() }));
  if (op === 'propose') return out(proposeAuthorities({ authorities: b.authorities, legalBasis: b.legalBasis }, who));
  if (op === 'confirm') return out(confirmAuthorities(who));
  if (op === 'withdraw') return out(withdrawAuthorities(actor.name, typeof b.reason === 'string' ? b.reason : undefined));
  return NextResponse.json({ error: 'op must be propose, confirm or withdraw' }, { status: 422 });
}

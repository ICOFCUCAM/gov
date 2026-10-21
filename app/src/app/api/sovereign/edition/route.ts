// /api/sovereign/edition — the Institutional Edition this installation runs as
// (spec Part 5 D; Health I4 standalone-and-pilot; lib/nation/edition.ts).
// During first-run setup it is saved with the deployment profile through
// /api/sovereign; afterwards a direct change there is refused and goes through
// here, the country's change process (lib/law/policy-change.ts). None ships.
// GET: the edition in force, what it names (institutions, modules, registers,
// procedures, what is not connected), a proposal waiting for its second
// official and every earlier version. POST (administrators, ADMIN_ONLY under
// /api/sovereign):
//   { op: 'propose' (default), edition: { label, institutions, modules } | null, legalBasis: [{ instrument, eId }] }
//     by an administrator serving the whole government;
//   { op: 'confirm' } a different administrator adopts it;
//   { op: 'withdraw', reason? }.
// Who acted comes from the sign-in; every step is audited.
import { NextRequest, NextResponse } from 'next/server';
import { refusal } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { adminOnly, installationAdmin } from '@/lib/auth/roles';
import { editionChanges, lapseEdition, proposeEdition, confirmEdition, withdrawEdition, getSetup } from '@/lib/data/store';
import { editionScope } from '@/lib/nation/edition';

export const dynamic = 'force-dynamic';

export function GET() {
  lapseEdition();
  return NextResponse.json({ scope: editionScope(), changes: editionChanges(), setupComplete: getSetup() !== null });
}

/** @example request {"op":"propose","edition":{"label":"Health regulation","institutions":["min-health"],"modules":["health","professions"]},"legalBasis":[{"instrument":"/eli/x/act/2026/1","eId":"sec_4"}]} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; edition?: unknown; legalBasis?: unknown; reason?: string; by?: string };
  const op = b.op ?? 'propose';
  const refused = await refusal(op === 'propose' ? installationAdmin : adminOnly);
  if (refused) return refused;
  const actor = await routeActor(b.by);
  const who = { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) };
  const out = (r: object) => ('error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, scope: editionScope(), changes: editionChanges() }));
  if (op === 'propose') return out(proposeEdition({ edition: b.edition, legalBasis: b.legalBasis }, who));
  if (op === 'confirm') return out(confirmEdition(who));
  if (op === 'withdraw') return out(withdrawEdition(actor.name, typeof b.reason === 'string' ? b.reason : undefined));
  return NextResponse.json({ error: 'op must be propose, confirm or withdraw' }, { status: 422 });
}

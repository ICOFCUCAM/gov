// /api/sovereign/classification — the state's classification (forms of state
// and government, territorial arrangements, legal traditions, authority types,
// style; guidance §1.2) once setup is complete (lib/data/store/sovereign.ts;
// plan phase 5). During first-run setup it is saved through /api/sovereign as
// before; afterwards a direct change there is refused (409) and goes through
// here, the country's change process (lib/law/policy-change.ts).
// GET: the classification in force (recorded, or derived from the form of
// state), a proposal waiting for its second official and every earlier version.
// POST (administrators, ADMIN_ONLY under /api/sovereign):
//   { op: 'propose' (default), classification: { … } | null, legalBasis: [{ instrument, eId }] }
//     null returns to the classification derived from the form of state;
//   { op: 'confirm' } a different administrator adopts it;
//   { op: 'withdraw', reason? }.
// A dispute over the constitutional profile freezes it (proposals and confirmations refused).
// Who acted comes from the sign-in; every step is audited.
import { NextRequest, NextResponse } from 'next/server';
import { refusal } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { adminOnly } from '@/lib/auth/roles';
import { classificationChanges, lapseClassification, proposeClassification, confirmClassification, withdrawClassification, getSovereign, getSetup } from '@/lib/data/store';
import { classificationOf } from '@/lib/nation/classification';

export const dynamic = 'force-dynamic';

export function GET() {
  lapseClassification();
  return NextResponse.json({ classification: classificationOf(getSovereign()), changes: classificationChanges(), setupComplete: getSetup() !== null });
}

/** @example request {"op":"propose","classification":{"stateForms":["republic"],"governmentForms":["parliamentary"],"territorialArrangements":["unitary"],"legalTraditions":["common_law"],"authorityTypes":["constitutional"]},"legalBasis":[{"instrument":"/eli/x/act/2026/1","eId":"sec_1"}]} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; classification?: unknown; legalBasis?: unknown; reason?: string; by?: string };
  const op = b.op ?? 'propose';
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const actor = await routeActor(b.by);
  const who = { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) };
  const out = (r: object) => ('error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, classification: classificationOf(getSovereign()), changes: classificationChanges() }));
  if (op === 'propose') return out(proposeClassification({ classification: b.classification, legalBasis: b.legalBasis }, who));
  if (op === 'confirm') return out(confirmClassification(who));
  if (op === 'withdraw') return out(withdrawClassification(actor.name, typeof b.reason === 'string' ? b.reason : undefined));
  return NextResponse.json({ error: 'op must be propose, confirm or withdraw' }, { status: 422 });
}

// /api/legislature/procedure — the nation's legislative procedure
// (lib/legislature/register.ts; plan phase 7): stages, how votes are counted
// and named, whether assent is needed and what the public sees. The reference
// shipped with the platform is never approved as it stands.
// GET: every version (the reference first), the one in force, the legislature
// and head of state named, the choices.
// POST { op }:
//   'draft'    an official of the legislature { fromReference?, title?, chambers?, stages?, votes?, assent?, publicRecord?, legalBasis? }
//   'approve'  { version, activeFrom? } a different official who can sign at the legislature;
//   'withdraw' { version, reason? } an official of the legislature.
// Who acted comes from the sign-in; every step is audited and every version kept.
import { NextRequest, NextResponse } from 'next/server';
import { refusal } from '@/lib/auth/official';
import { legislativeRecordRefusal } from '@/lib/auth/roles';
import { authorityFor, getMinistry } from '@/lib/data/store';
import {
  listProcedures, activeProcedure, draftProcedure, approveProcedure, withdrawProcedure, legislatureId, legislatureName,
  STAGE_KINDS, MAJORITIES, type LegislativeProcedure,
} from '@/lib/legislature/register';
import { legislativeActor, answer } from '@/lib/legislature/route-actor';

export const dynamic = 'force-dynamic';

export function GET() {
  const head = authorityFor('headOfState');
  const leg = legislatureId();
  return NextResponse.json({
    procedures: listProcedures(), active: activeProcedure() ?? null,
    legislature: leg ? { id: leg, name: legislatureName() } : null,
    headOfState: head ? { id: head, name: getMinistry(head)?.name ?? head } : null,
    choices: { stageKinds: STAGE_KINDS, majorities: MAJORITIES },
  });
}

/** @example request {"op":"draft","fromReference":true,"title":"Standing orders of the National Assembly","chambers":["National Assembly"]} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Partial<LegislativeProcedure> & { op?: string; by?: string; version?: unknown; activeFrom?: unknown; reason?: unknown; legalBasis?: unknown; fromReference?: unknown };
  const op = b.op ?? 'draft';
  const refused = await refusal(s => legislativeRecordRefusal(s, legislatureId(), op === 'approve' ? 'sign' : 'record'));
  if (refused) return refused;
  const a = await legislativeActor(b.by);
  const version = Number(b.version);
  if (op === 'draft') {
    const input = { fromReference: b.fromReference, title: b.title, chambers: b.chambers, stages: b.stages, votes: b.votes, assent: b.assent, publicRecord: b.publicRecord, legalBasis: b.legalBasis };
    return answer(wrap(draftProcedure(input, a)), 201);
  }
  if (op === 'approve') return answer(wrap(approveProcedure(version, a, typeof b.activeFrom === 'string' ? b.activeFrom : undefined)));
  if (op === 'withdraw') return answer(wrap(withdrawProcedure(version, typeof b.reason === 'string' ? b.reason : '', a)));
  return NextResponse.json({ error: 'op must be draft, approve or withdraw' }, { status: 422 });
}

const wrap = (r: LegislativeProcedure | { error: string }) => ('error' in r ? r : { procedure: r });

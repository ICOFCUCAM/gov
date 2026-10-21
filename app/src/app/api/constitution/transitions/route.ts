// /api/constitution/transitions — transitions and emergencies as recorded
// legal events (lib/transitions; plan phase 6; guidance §4): taking up office,
// acting appointments, delegations, successions, caretaker periods,
// dissolutions, the seven stages of impeachment, courts' rulings on a law or
// decision, states of emergency, transfers of powers between national and
// regional institutions, and declarations of conflicts of interest. Each is
// recorded by one official citing the laws register and confirmed by a
// different person; every version is kept. The platform records the nation's
// legal events; it never decides one.
// GET: every transition with its versions, what is in force (caretaker periods, emergencies, rulings, transferred
// powers), the country's rules, warnings (nothing the nation has not set is ever restricted), decisions flagged by a
// ruling, holdings past their term.
// POST { op } (OFFICIAL_WORK in lib/auth/roles.ts; who may take each step is checked in lib/transitions/events.ts):
//   'propose'  { kind, effectiveFrom?, effectiveTo?, institution?, actingInstitution?, office?, person?, delegator?, powers?,
//              regions?, competence?, direction?, target?, decisions?, effect?, finality?, reference?, cases?, interest?,
//              renews?, trigger?, suspensions?, arrangements?, reason?, legalBasis: [{ instrument, eId }] };
//   'advance'  { id, stage, outcome, effectiveFrom?, reason?, reference?, legalBasis }  the next impeachment stage, in order;
//   'end'      { id, reason, effectiveTo?, legalBasis }  ends it early (revoke, lift, discontinue): a new version;
//   'confirm'  { id }  a different person (never the person the record names);
//   'withdraw' { id, reason? }  the proposer or an administrator (never a declaration of interest);
//   'rules-propose' { caretakerProcedures?, caretakerDecisions?, caretakerDirectives?, impeachmentStages?, emergencyMaxDays?,
//              emergencyDeclarers?, legalBasis }  an administrator; 'rules-confirm' a different administrator; 'rules-withdraw' { reason? }.
// Who acted comes from the sign-in; every step is audited.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { roleOf } from '@/lib/auth/roles';
import {
  transitionsOverview, getTransition, proposeTransition, advanceImpeachment, endTransition, confirmTransition, withdrawTransition,
  proposeTransitionRules, confirmTransitionRules, withdrawTransitionRules, type TransitionActor,
} from '@/lib/transitions/events';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const t = getTransition(id);
    return t ? NextResponse.json({ transition: t }) : NextResponse.json({ error: 'No such transition' }, { status: 404 });
  }
  return NextResponse.json(transitionsOverview());
}

/** Refusals about who may act are 403; everything else the request got wrong is 422. */
const FORBIDDEN = /^(An administrator|An official|Auditors|The delegating official|The official concerned|The person the record names|The proposer|.* is independent: an official who can sign there)/;

/** @example request {"op":"propose","kind":"acting","office":"minister-of-health","person":"acc-123","effectiveFrom":"2026-11-01","effectiveTo":"2026-11-30","reason":"Minister abroad","legalBasis":[{"instrument":"/eli/x/act/2026/1","eId":"sec_12"}]} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown> & { op?: string };
  const s = await caseScope();
  const a = await routeActor(b.by);
  const actor: TransitionActor = { by: a.name, ...(a.id ? { byId: a.id } : {}), ...(s ? { role: roleOf(s), ...(s.institution ? { institution: s.institution } : {}) } : {}) };
  const id = typeof b.id === 'string' ? b.id : '';
  const reason = typeof b.reason === 'string' ? b.reason : undefined;
  const out = (r: object) => ('error' in r
    ? NextResponse.json(r, { status: /^No such/.test((r as { error: string }).error) ? 404 : FORBIDDEN.test((r as { error: string }).error) ? 403 : 422 })
    : NextResponse.json({ result: r }));
  const admin = () => (s && roleOf(s) !== 'administrator' ? NextResponse.json({ error: 'An administrator changes the nation\'s rules for transitions' }, { status: 403 }) : null);
  switch (b.op) {
    case 'propose': return out(proposeTransition(b, actor));
    case 'advance': return out(advanceImpeachment(id, b, actor));
    case 'end': return out(endTransition(id, b, actor));
    case 'confirm': return out(confirmTransition(id, actor));
    case 'withdraw': return out(withdrawTransition(id, actor, reason));
    case 'rules-propose': return admin() ?? out(proposeTransitionRules(b, actor));
    case 'rules-confirm': return admin() ?? out(confirmTransitionRules(actor));
    case 'rules-withdraw': return admin() ?? out(withdrawTransitionRules(actor, reason));
    default: return NextResponse.json({ error: 'op must be propose, advance, end, confirm, withdraw, rules-propose, rules-confirm or rules-withdraw' }, { status: 422 });
  }
}

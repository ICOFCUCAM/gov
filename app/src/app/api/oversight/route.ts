// /api/oversight — independent oversight (plan step I8; lib/oversight): the
// ombudsman, the human rights institution, the anti-corruption commission,
// the public audit office and the data-protection authority. Their cases run
// through /api/cases under their own approved procedures; this route carries
// what sits around them.
//
// GET: the bodies the nation named (each slot, empty by default) and, for the
// signed-in official, the oversight records they may see (oversightView():
// their own body's findings, evidence requests, referrals and controller
// requests; a finding, request or controller request that concerns their own
// institution once it is sent to it), with counts. ?case=<id>: one case's
// findings, evidence requests, referrals, controller requests and protected
// identity markers (the role and whether the person is anonymous; never the
// identity), for those the case rules let read the case (the read logged).
//
// POST (signed-in officials; checked again here against the record):
//   { op: 'receive', procedure, fields, identity: { anonymous, name, contact, consentToShare, protections } }
//       open a complaint, disclosure or data-protection case with the person's identity kept apart;
//   { op: 'read-identity', id, purpose }  the assigned or authorised official reads a protected identity (logged);
//   { op: 'authorise-reader', id, official: { id, name } }  one who can sign there authorises a colleague (logged);
//   { op: 'respond', finding, position, text, action?, evidence? }  the institution a finding concerns answers it;
//   { op: 'submit-evidence', request, description, document?, sha256? }  the institution asked submits evidence;
//   { op: 'answer-controller', request, outcome, reasons }  the controller answers the data-protection authority;
//   { op: 'access-history', case }  the data-protection authority's access-log read for the records its case names (logged).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { caseReadRefusal } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { getCase, caseFacts } from '@/lib/casework/engine';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { AUTHORITIES } from '@/lib/nation/deployment';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import {
  OVERSIGHT_SLOTS, oversightView, oversightCounts, findingsOfCase, evidenceOfCase, referralsOfCase, controllerRequestsOfCase,
  respondToFinding, submitEvidence, answerControllerRequest, FINDING_STAGE_LABEL, POSITIONS, FOLLOW_UP_STATES, ANSWER_OUTCOMES,
} from '@/lib/oversight/register';
import { identityMarkers, readProtectedIdentity, authoriseIdentityReader, PROTECTED_ROLES } from '@/lib/oversight/protected-identity';
import { receiveProtected, investigationAccess, PROTECTED_INTAKE } from '@/lib/oversight/intake';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const bodies = () => OVERSIGHT_SLOTS.map(s => {
  const id = authorityFor(s.slot);
  return { slot: s.slot, label: AUTHORITIES.find(a => a.key === s.slot)?.label ?? s.label, institution: id ?? null, name: id ? getMinistry(id)?.name ?? id : null };
});
const labels = { stages: FINDING_STAGE_LABEL, positions: POSITIONS, followUp: FOLLOW_UP_STATES, outcomes: ANSWER_OUTCOMES, roles: PROTECTED_ROLES, intake: PROTECTED_INTAKE };

export async function GET(req: NextRequest) {
  const s = await caseScope();
  const id = req.nextUrl.searchParams.get('case')?.trim();
  if (id) {
    const c = getCase(id);
    if (!c) return NextResponse.json({ error: 'No such case' }, { status: 404 });
    if (s) {
      const why = caseReadRefusal(s, caseFacts(c));
      recordAccess({ ...accessBy(s), record: { register: 'cases', id: c.ref }, action: why ? 'refused' : 'view', result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : { rule: 'Oversight records of the case' }) });
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    return NextResponse.json({
      case: { id: c.id, ref: c.ref, owner: c.owner, stage: c.stage, procedure: c.package.key, ...(c.assignee ? { assignee: c.assignee.name } : {}), ...(c.source === 'sample' ? { sample: true } : {}) },
      findings: findingsOfCase(c.id), evidence: evidenceOfCase(c.id), referrals: referralsOfCase(c.id), controller: controllerRequestsOfCase(c.id),
      // That the person who raised it is protected, their role and whether they are anonymous: never who they are.
      identities: identityMarkers(c.id), labels,
    });
  }
  // Without a signed-in official (sign-in not enforced: demonstrations and tests) every record is listed, as the case list does.
  const view = s ? oversightView(s) : unscoped();
  return NextResponse.json({ bodies: bodies(), ...view, counts: oversightCounts(s ? s.institution : undefined), labels, names: names(view) });
}

/** Every body's records (only where sign-in is not enforced). */
function unscoped(): ReturnType<typeof oversightView> {
  const out: ReturnType<typeof oversightView> = { findings: [], evidence: [], referrals: [], controller: [] };
  for (const b of bodies()) if (b.institution) {
    const v = oversightView({ institution: b.institution });
    out.findings.push(...v.findings.filter(f => f.body === b.institution)); out.evidence.push(...v.evidence.filter(e => e.body === b.institution));
    out.referrals.push(...v.referrals.filter(r => r.body === b.institution)); out.controller.push(...v.controller.filter(r => r.body === b.institution));
  }
  return out;
}
/** The names of the institutions the records shown name. */
function names(v: ReturnType<typeof oversightView>): Record<string, string> {
  const ids = new Set<string>([...bodies().flatMap(b => (b.institution ? [b.institution] : [])), ...v.findings.flatMap(f => [f.body, f.concerns]), ...v.evidence.flatMap(e => [e.body, e.to]), ...v.referrals.flatMap(r => [r.body, r.to]), ...v.controller.flatMap(r => [r.body, r.controller])]);
  return Object.fromEntries([...ids].map(id => [id, getMinistry(id)?.name ?? id]));
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = await caseScope();
  const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const done = <T,>(r: T | { error: string }, status = 200) => (r && typeof r === 'object' && 'error' in r ? NextResponse.json(r, { status: /only|Sign in|Auditors|assigned|authorised|independent/.test((r as { error: string }).error) ? 403 : 422 }) : NextResponse.json({ result: r }, { status }));
  switch (b.op) {
    case 'receive': {
      const actor = await routeActor(b.by);
      const r = receiveProtected({ procedure: str(b.procedure, 80), fields: (b.fields ?? {}) as Record<string, unknown>, identity: (b.identity ?? {}) as never, ...(str(b.idempotencyKey, 100) ? { idempotencyKey: str(b.idempotencyKey, 100) } : {}) }, actor);
      return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ case: { id: r.case.id, ref: r.case.ref, stage: r.case.stage }, identity: r.identity }, { status: 201 });
    }
    case 'read-identity': return done(readProtectedIdentity(str(b.id, 40), s, str(b.purpose, 500) || undefined));
    case 'authorise-reader': return done(authoriseIdentityReader(str(b.id, 40), (b.official ?? {}) as never, s));
    case 'respond': return done(respondToFinding(str(b.finding, 40), b as never, s));
    case 'submit-evidence': return done(submitEvidence(str(b.request, 40), b as never, s));
    case 'answer-controller': return done(answerControllerRequest(str(b.request, 40), b as never, s));
    case 'access-history': return done(investigationAccess(str(b.case, 80), s));
    default: return NextResponse.json({ error: 'op is receive, read-identity, authorise-reader, respond, submit-evidence, answer-controller or access-history' }, { status: 400 });
  }
}

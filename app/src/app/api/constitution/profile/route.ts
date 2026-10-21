// /api/constitution/profile — the constitutional profile as a versioned,
// governed package (lib/constitution/profile.ts; plan phase 5; guidance §7.4).
// It bundles, by reference and SHA-256 digest, the parts kept on their own
// (classification, institutions' standing, who is responsible, offices,
// relationships, the country's dual-control and suspension rules); each part
// keeps its own change process. This records the nation's legal process; it
// does not replace it.
// GET: the version in force, the parts as they stand with their digest, the
// parts changed since it was approved, every version with its steps and who
// took each, disputes and the frozen parts, the nation's own steps.
// POST { op } (OFFICIAL_WORK in lib/auth/roles.ts; who may take each step is checked in the store):
//   'draft'    { title, effectiveFrom?, consult?: [institution id], constraints?, note? }  an administrator serving the whole government;
//   'refresh'  { id }  capture the parts again before approval (the steps start over);
//   'submit'   { id, legalBasis: [{ instrument, eId }], consult?, constraints? }  draft → legal review;
//   'review'   { id, outcome: cleared | returned, note? }  a different person from the drafter;
//   'consult'  { id, response: agree | object | no-comment, note? }  an official of a consulted institution;
//   'validate' { id }  security validation, an administrator other than the drafter;
//   'approve'  { id, authorisedBy, note? }  each approver a different person (two at least), naming the act that authorises it;
//   'withdraw' { id, reason? }  the drafter or an administrator, before it is active;
//   'dispute'  { id, grounds }  freezes the parts it touches; the status quo stays in force;
//   'resolve'  { id, outcome: upheld | set-aside, reference, note? }  the recorded decision, by a different person;
//   'process-propose' { consultation?, approvals?, legalReviewInstitution?, legalBasis }  the nation's own steps (an administrator);
//   'process-confirm' a different administrator; 'process-withdraw' { reason? }.
// Who acted comes from the sign-in; every step is audited.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { roleOf } from '@/lib/auth/roles';
import { listMinistries } from '@/lib/data/store';
import {
  constitutionOverview, draftProfile, refreshProfile, submitProfile, reviewProfile, consultOnProfile, validateProfile, approveProfile,
  withdrawProfile, disputeProfile, resolveDispute, proposeProcess, confirmProcess, withdrawProcess, type ProfileOfficial,
} from '@/lib/constitution/profile';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ...constitutionOverview(),
    institutions: listMinistries().filter(m => m.status === 'active').map(m => ({ id: m.id, name: m.name })),
  });
}

/** Refusals about who may act are 403; everything else the request got wrong is 422. */
const FORBIDDEN = /^(An administrator|An official of|The drafter|Each approval is by|An approver is|The legal review is by|Security validation is by|The decision is recorded by|The nation names)/;

/** @example request {"op":"draft","title":"Constitution (Amendment) Act 2026","effectiveFrom":"2026-12-01"} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown> & { op?: string };
  const s = await caseScope();
  const a = await routeActor(b.by);
  const actor: ProfileOfficial = { by: a.name, ...(a.id ? { byId: a.id } : {}), ...(s ? { role: roleOf(s), ...(s.institution ? { institution: s.institution } : {}) } : (typeof b.institution === 'string' && b.institution ? { institution: b.institution } : {})) };
  const id = typeof b.id === 'string' ? b.id : '';
  const out = (r: object) => ('error' in r
    ? NextResponse.json(r, { status: (r as { error: string }).error === 'No such profile' ? 404 : FORBIDDEN.test((r as { error: string }).error) ? 403 : 422 })
    : NextResponse.json({ result: r, ...constitutionOverview() }));
  const admin = () => (s && roleOf(s) !== 'administrator' ? NextResponse.json({ error: 'An administrator changes the nation\'s steps for a constitutional profile' }, { status: 403 }) : null);
  switch (b.op) {
    case 'draft': return out(draftProfile({ title: b.title, effectiveFrom: b.effectiveFrom, consult: b.consult, constraints: b.constraints, note: b.note }, actor));
    case 'refresh': return out(refreshProfile(id, actor));
    case 'submit': return out(submitProfile(id, { legalBasis: b.legalBasis, consult: b.consult, constraints: b.constraints }, actor));
    case 'review': return out(reviewProfile(id, { outcome: b.outcome, note: b.note }, actor));
    case 'consult': return out(consultOnProfile(id, { response: b.response, note: b.note, institution: b.institution }, actor));
    case 'validate': return out(validateProfile(id, actor));
    case 'approve': return out(approveProfile(id, { authorisedBy: b.authorisedBy, note: b.note }, actor));
    case 'withdraw': return out(withdrawProfile(id, { reason: b.reason }, actor));
    case 'dispute': return out(disputeProfile(id, { grounds: b.grounds }, actor));
    case 'resolve': return out(resolveDispute(id, { outcome: b.outcome, reference: b.reference, note: b.note }, actor));
    case 'process-propose': return admin() ?? out(proposeProcess({ consultation: b.consultation, approvals: b.approvals, legalReviewInstitution: b.legalReviewInstitution, legalBasis: b.legalBasis }, actor));
    case 'process-confirm': return admin() ?? out(confirmProcess(actor));
    case 'process-withdraw': return admin() ?? out(withdrawProcess(actor.by, typeof b.reason === 'string' ? b.reason : undefined));
    default: return NextResponse.json({ error: 'op must be draft, refresh, submit, review, consult, validate, approve, withdraw, dispute, resolve, process-propose, process-confirm or process-withdraw' }, { status: 422 });
  }
}

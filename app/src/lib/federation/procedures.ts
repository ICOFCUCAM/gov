// Cross-institution workflow (plan I9; catalogue Part 12 §2.2 "Whole-of-
// government correspondence and workflow", GOV-WF-002 … 006, 009 … 015;
// docs/forms-catalogue/PARTS-12-13.md: "Cross-institution tasks must not
// silently become binding orders. Every workflow must distinguish a request,
// a consultation, a referral, an agreement, a directive and a legally binding
// decision").
//
// Templates each institution adopts as its own (xi.<template>.<institution>,
// installCrossInstitutionProcedures()), drafted by one of its officials and
// approved by another: the owner is the institution itself. The case lives
// with the institution that RECEIVES the request (as a referral does,
// lib/casework/referral.ts): the requesting official opens it from one of
// their own cases (engine refer(), linked both ways), or the receiving
// institution records one that came by letter. Its own officials work it.
//
//   xi.information-request  an information request: scope and purpose named, answered or declined with reasons
//   xi.consultation         a request for input within a defined scope; the requester decides
//   xi.handover             a proposed transfer of responsibility for a service, accepted by two officials;
//                           who is responsible changes only through Who is responsible (/api/sovereign/authorities)
//   xi.task                 a task asked of the institution: accepted or declined, then reported on
//   xi.decision-request     a request that the competent institution decide, in its own procedure
//   xi.dependency           a service dependency between institutions and who is responsible on each side
//   xi.dispute              a dispute between institutions, referred to the body the parties name as authorised to resolve it
//   xi.agreement            an inter-agency agreement registered, reviewed, amended or terminated (two officials)
//   xi.onboarding           an institution onboarded to a shared service after its acceptance test
//   xi.access               a request for access to a shared service, within a scope
//   xi.exception            an exception to a cross-institution workflow, with its justification and expiry
//
// None of them is an order. Every case records its nature when it is
// accepted (xi.check-parties): an instruction only where an approved
// `instruct` relationship from the requester covers it (lib/auth/roles.ts
// directiveTargetRefusal(), read from the relationship register); otherwise a
// request the institution may decline with reasons. None grants a power: an
// exchange needs an `exchange` relationship, a read an `audit` or
// `request_information` relationship, a change of who is responsible the
// change process for it; an agreement or an access approval records that, and
// says what else is needed. No day count ships.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { getMinistry } from '@/lib/data/store/ministries';
import { institutionBounds } from '@/lib/data/store/institutions';
import { directiveTargetRefusal } from '@/lib/auth/roles';
import { touch } from '@/lib/data/repo/track';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const nameOf = (id: string) => getMinistry(id)?.name ?? id;

/** The nature of what the requester asks: an instruction only under an approved `instruct` relationship in force; else a request. */
export const natureOf = (from: string, to: string, now = new Date()): { nature: 'instruction' | 'request'; why: string } => {
  const bounds = institutionBounds(now);
  const refused = directiveTargetRefusal(bounds, { id: from, name: nameOf(from) }, 'instruction', [{ id: to, name: nameOf(to) }]);
  if (refused) return { nature: 'request', why: `A request, not binding: ${refused}` };
  const g = bounds.relationships?.find(x => x.type === 'instruct' && x.from === from && x.to === to);
  return { nature: 'instruction', why: g ? `An instruction under relationship ${g.id} version ${g.version}` : 'An instruction within the requester\'s reach' };
};

function parties(c: Case, field = 'fromInstitution'): { from: string } | { error: string } {
  const from = str(c.fields[field]);
  if (!from || !getMinistry(from)) return { error: 'Name the requesting institution by its id in the register' };
  if (from === c.owner) return { error: 'A cross-institution request comes from another institution' };
  return { from };
}

// The nature each case was given when it was taken in, by case id: written only by the effect below.
interface NatureRecord { case: string; ref: string; from: string; to: string; nature: 'instruction' | 'request'; why: string; at: string }
const gx = globalThis as unknown as { __civicosCrossInstitution?: { natures: Record<string, NatureRecord> } };
const xdb = () => { const d = touch('__civicosCrossInstitution', gx.__civicosCrossInstitution ??= { natures: {} }); d.natures ??= {}; return d; };
export const resetCrossInstitution = (): void => { gx.__civicosCrossInstitution = undefined; };
/** The nature a cross-institution case was given when it was taken in (request or instruction), with the reason. */
export const natureOfCase = (caseId: string): NatureRecord | undefined => { const n = xdb().natures[caseId]; return n ? { ...n } : undefined; };

registerEffect('xi.check-parties', ({ case: c, now }: EffectContext) => {
  const p = parties(c);
  if ('error' in p) return p;
  const n = natureOf(p.from, c.owner, now);
  return {
    facts: { from: p.from, nature: n.nature, natureWhy: n.why.slice(0, 300) },
    after: () => { xdb().natures[c.id] = { case: c.id, ref: c.ref, from: p.from, to: c.owner, nature: n.nature, why: n.why.slice(0, 400), at: now.toISOString() }; },
  };
});

registerEffect('xi.handover', ({ case: c }: EffectContext) => {
  const p = parties(c);
  if ('error' in p) return p;
  if (!str(c.fields.serviceConcerned)) return { error: 'Name the service whose responsibility is handed over' };
  // Accepting records the institutions' agreement; who is responsible for a slot changes only through its own change process.
  return { facts: { from: p.from, service: str(c.fields.serviceConcerned), effectiveFrom: str(c.fields.effectiveFrom), responsibility: 'changes only through Who is responsible (/api/sovereign/authorities), never by this case' } };
});

registerEffect('xi.check-resolver', ({ case: c }: EffectContext) => {
  const p = parties(c);
  if ('error' in p) return p;
  const body = str(c.fields.resolvingBody);
  if (!body || !getMinistry(body)) return { error: 'Name the body authorised to resolve the dispute by its id in the register' };
  if (body === p.from || body === c.owner) return { error: 'The resolving body is neither party to the dispute' };
  return { facts: { from: p.from, resolvingBody: body, binding: 'only the resolving body\'s own decision, in its own procedure' } };
});

registerEffect('xi.agreement', ({ case: c }: EffectContext) => {
  const p = parties(c);
  if ('error' in p) return p;
  const from = str(c.fields.validFrom), until = str(c.fields.validUntil);
  if (!from) return { error: 'Say from when the agreement is valid' };
  if (until && until < from) return { error: 'An agreement cannot end before it starts' };
  return { facts: { from: p.from, validFrom: from, ...(until ? { validUntil: until } : {}), grantsPower: 'no: exchanges, reads and instructions need an approved relationship in the relationship register' } };
});

registerEffect('xi.access', ({ case: c }: EffectContext) => {
  const p = parties(c);
  if ('error' in p) return p;
  if (!str(c.fields.serviceConcerned)) return { error: 'Name the shared service' };
  return { facts: { from: p.from, service: str(c.fields.serviceConcerned), effective: 'only once an exchange relationship and the integration\'s approval (two officials each) are in force' } };
});

registerEffect('xi.exception', ({ case: c, now }: EffectContext) => {
  const p = parties(c);
  if ('error' in p) return p;
  const until = str(c.fields.expiresOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return { error: 'An exception has an expiry date (YYYY-MM-DD)' };
  if (until <= now.toISOString().slice(0, 10)) return { error: 'The expiry date is in the future' };
  return { facts: { from: p.from, expiresOn: until, waives: 'a step of the cross-institution workflow only; never a requirement of law' } };
});

registerEffect('xi.dependency', ({ case: c }: EffectContext) => {
  const p = parties(c);
  if ('error' in p) return p;
  if (!str(c.fields.serviceConcerned)) return { error: 'Name the service that depends on the other' };
  return { facts: { from: p.from, service: str(c.fields.serviceConcerned) } };
});

// ── Templates ────────────────────────────────────────────────────────────────

const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], owner: 'institution', sensitivity: 'normal' as const, retention: 'inter-institution-record' };
const from = adm('fromInstitution', 'Requesting institution (its id in the register)');
const requesting = adm('requestingCase', 'The requesting institution\'s own case (its reference), where there is one');
const scope = adm('scope', 'What is asked, and within which scope', 'longtext');
const purpose = adm('purpose', 'The purpose stated by the requester');
const basisNote = adm('legalBasisNote', 'The provision the requester relies on, as cited');
const respondBy = adm('respondBy', 'Response asked for by', 'date');
const service = adm('serviceConcerned', 'The service concerned');
const request = [from, requesting, scope, purpose, basisNote, respondBy];

type T = Ref & { forms: string[] };
export const CROSS_INSTITUTION_PROCEDURES: T[] = [
  {
    ...base, key: 'xi.information-request', version: 1, title: 'Information request from another institution', refPrefix: 'XINF', forms: ['GOV-WF-002'],
    fields: [...request, adm('recordsAsked', 'The records or facts asked for (types, never "all records")', 'longtext')],
    documents: [{ class: 'information-response', label: 'The response, with only the information the scope covers', required: false }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'assessed', label: 'Scope, purpose and basis assessed' }, { key: 'answered', label: 'Answered', terminal: true }, { key: 'declined', label: 'Declined with reasons', terminal: true }],
    actions: [
      { key: 'assess', label: 'Assess the scope, purpose and legal basis', from: ['received'], to: 'assessed', needs: { role: 'officer' }, requires: { fields: ['fromInstitution', 'scope', 'purpose', 'recordsAsked'] }, effects: ['xi.check-parties'] },
      { key: 'answer', label: 'Answer within the scope', from: ['assessed'], to: 'answered', needs: { role: 'signatory' }, requires: { documents: ['information-response'], reasons: true } },
      { key: 'decline', label: 'Decline, with reasons', from: ['received', 'assessed'], to: 'declined', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'assessed and answered', steps: [{ action: 'assess', expect: 'refused' }, { action: 'assess', fields: { fromInstitution: 'x', scope: 'x', purpose: 'x', recordsAsked: 'x' }, expect: 'assessed' }, { action: 'answer', expect: 'refused' }, { action: 'answer', documents: ['information-response'], expect: 'answered' }] }],
  },
  {
    ...base, key: 'xi.consultation', version: 1, title: 'Consultation from another institution', refPrefix: 'XCON', forms: ['GOV-WF-006'],
    fields: [...request, adm('questions', 'The questions asked', 'longtext')],
    documents: [{ class: 'consultation-response', label: 'The institution\'s input', required: false }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'in-hand', label: 'In hand' }, { key: 'responded', label: 'Input given', terminal: true }, { key: 'declined', label: 'Declined with reasons', terminal: true }],
    actions: [
      { key: 'accept', label: 'Take it in hand', from: ['received'], to: 'in-hand', needs: { role: 'officer' }, requires: { fields: ['fromInstitution', 'scope', 'questions'] }, effects: ['xi.check-parties'] },
      { key: 'respond', label: 'Give the input (the requester decides)', from: ['in-hand'], to: 'responded', needs: { role: 'officer' }, requires: { documents: ['consultation-response'], reasons: true } },
      { key: 'decline', label: 'Decline, with reasons', from: ['received', 'in-hand'], to: 'declined', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'responded', steps: [{ action: 'accept', fields: { fromInstitution: 'x', scope: 'x', questions: 'x' }, expect: 'in-hand' }, { action: 'respond', documents: ['consultation-response'], expect: 'responded' }] }],
  },
  {
    ...base, key: 'xi.handover', version: 1, title: 'Handover of a service from another institution', refPrefix: 'XHND', forms: ['GOV-WF-003'],
    fields: [from, requesting, service, adm('effectiveFrom', 'Proposed effective date', 'date'), adm('obligations', 'Records, open cases and obligations transferred', 'longtext'), basisNote],
    documents: [{ class: 'handover-plan', label: 'The handover plan (records, open cases, staff, systems)', required: false }],
    stages: [{ key: 'proposed', label: 'Proposed' }, { key: 'assessed', label: 'Assessed' }, { key: 'accepted', label: 'Accepted by two officials', terminal: true }, { key: 'refused', label: 'Not accepted, with reasons', terminal: true }],
    actions: [
      { key: 'assess', label: 'Assess the handover plan', from: ['proposed'], to: 'assessed', needs: { role: 'officer' }, requires: { fields: ['fromInstitution', 'serviceConcerned', 'obligations'], documents: ['handover-plan'] }, effects: ['xi.check-parties'] },
      { key: 'accept', label: 'Accept the transfer of responsibility (a second official confirms)', from: ['assessed'], to: 'accepted', decision: 'accept-handover', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['effectiveFrom'], reasons: true }, effects: ['xi.handover'] },
      { key: 'refuse', label: 'Do not accept, with reasons', from: ['proposed', 'assessed'], to: 'refused', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'accepted', steps: [{ action: 'assess', fields: { fromInstitution: 'x', serviceConcerned: 'x', obligations: 'x' }, documents: ['handover-plan'], expect: 'assessed' }, { action: 'accept', expect: 'refused' }, { action: 'accept', fields: { effectiveFrom: '2030-01-01' }, expect: 'accepted' }] }],
  },
  {
    ...base, key: 'xi.task', version: 1, title: 'Task asked by another institution', refPrefix: 'XTSK', forms: ['GOV-WF-004'],
    fields: [...request, adm('taskOwner', 'Who in the institution owns the task (office or unit)')],
    documents: [{ class: 'task-report', label: 'Report on the task', required: false }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'accepted', label: 'Accepted, owner named' }, { key: 'completed', label: 'Completed and reported', terminal: true }, { key: 'declined', label: 'Declined with reasons', terminal: true }],
    actions: [
      { key: 'accept', label: 'Accept and name the owner: its nature (request or instruction) is recorded', from: ['received'], to: 'accepted', needs: { role: 'officer' }, requires: { fields: ['fromInstitution', 'scope', 'taskOwner'] }, effects: ['xi.check-parties'] },
      { key: 'complete', label: 'Report the task done', from: ['accepted'], to: 'completed', needs: { role: 'officer' }, requires: { documents: ['task-report'], reasons: true } },
      { key: 'decline', label: 'Decline, with reasons (a request may be declined)', from: ['received', 'accepted'], to: 'declined', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'accepted and completed', steps: [{ action: 'accept', fields: { fromInstitution: 'x', scope: 'x', taskOwner: 'x' }, expect: 'accepted' }, { action: 'complete', documents: ['task-report'], expect: 'completed' }] }],
  },
  {
    ...base, key: 'xi.decision-request', version: 1, title: 'Request for a decision by this institution', refPrefix: 'XDRQ', forms: ['GOV-WF-005'],
    fields: [...request, adm('decisionAsked', 'The decision asked for', 'longtext'), adm('ownCase', 'This institution\'s own case where it decides (its reference)')],
    documents: [],
    stages: [{ key: 'received', label: 'Received' }, { key: 'assessed', label: 'Competence assessed' }, { key: 'taken-up', label: 'Taken up in the institution\'s own procedure', terminal: true }, { key: 'declined', label: 'Declined with reasons', terminal: true }],
    actions: [
      { key: 'assess', label: 'Assess whether the institution is competent', from: ['received'], to: 'assessed', needs: { role: 'officer' }, requires: { fields: ['fromInstitution', 'decisionAsked'] }, effects: ['xi.check-parties'] },
      { key: 'take-up', label: 'Take it up in the institution\'s own procedure (it decides there, not here)', from: ['assessed'], to: 'taken-up', needs: { role: 'officer' }, requires: { fields: ['ownCase'], reasons: true } },
      { key: 'decline', label: 'Decline, with reasons (not competent, or no basis)', from: ['received', 'assessed'], to: 'declined', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'taken up', steps: [{ action: 'assess', fields: { fromInstitution: 'x', decisionAsked: 'x' }, expect: 'assessed' }, { action: 'take-up', expect: 'refused' }, { action: 'take-up', fields: { ownCase: 'x' }, expect: 'taken-up' }] }],
  },
  {
    ...base, key: 'xi.dependency', version: 1, title: 'Service dependency between institutions', refPrefix: 'XDEP', forms: ['GOV-WF-009'],
    fields: [from, service, adm('dependsOn', 'What it depends on (the other institution\'s service)'), adm('responsibleParties', 'Who is responsible on each side (offices)', 'longtext'), adm('fallback', 'What happens when the dependency is unavailable (declared degraded state)', 'longtext')],
    documents: [],
    stages: [{ key: 'declared', label: 'Declared' }, { key: 'confirmed', label: 'Confirmed by two officials', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true }],
    actions: [
      { key: 'confirm', label: 'Confirm the dependency and who is responsible (a second official confirms)', from: ['declared'], to: 'confirmed', decision: 'record-dependency', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['fromInstitution', 'serviceConcerned', 'dependsOn', 'responsibleParties', 'fallback'], reasons: true }, effects: ['xi.dependency'] },
      { key: 'withdraw', label: 'Withdraw', from: ['declared'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'confirmed', steps: [{ action: 'confirm', expect: 'refused' }, { action: 'confirm', fields: { fromInstitution: 'x', serviceConcerned: 'x', dependsOn: 'x', responsibleParties: 'x', fallback: 'x' }, expect: 'confirmed' }] }],
  },
  {
    ...base, key: 'xi.dispute', version: 1, title: 'Dispute between institutions', refPrefix: 'XDSP', forms: ['GOV-WF-010'],
    fields: [from, requesting, adm('issue', 'The issue in dispute', 'longtext'), adm('resolvingBody', 'The body authorised to resolve it (its id in the register)'), basisNote, adm('outcome', 'Outcome as the resolving body recorded it', 'longtext')],
    documents: [{ class: 'dispute-file', label: 'The positions of both institutions', required: false }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'referred', label: 'Referred to the resolving body' }, { key: 'closed', label: 'Closed: the resolving body\'s outcome recorded', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true }],
    actions: [
      { key: 'refer', label: 'Refer to the body authorised to resolve it', from: ['received'], to: 'referred', needs: { role: 'signatory' }, requires: { fields: ['fromInstitution', 'issue', 'resolvingBody'], documents: ['dispute-file'], reasons: true }, effects: ['xi.check-resolver'] },
      { key: 'close', label: 'Record the resolving body\'s outcome', from: ['referred'], to: 'closed', needs: { role: 'officer' }, requires: { fields: ['outcome'], reasons: true } },
      { key: 'withdraw', label: 'Withdrawn by agreement', from: ['received', 'referred'], to: 'withdrawn', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'referred and closed', steps: [{ action: 'refer', fields: { fromInstitution: 'x', issue: 'x', resolvingBody: 'y' }, documents: ['dispute-file'], expect: 'referred' }, { action: 'close', fields: { outcome: 'x' }, expect: 'closed' }] }],
  },
  {
    ...base, key: 'xi.agreement', version: 1, title: 'Inter-agency agreement', refPrefix: 'XAGR', forms: ['GOV-WF-011', 'GOV-WF-012'],
    fields: [from, scope, adm('signatories', 'Signatories (offices of each institution)', 'longtext'), adm('validFrom', 'Valid from', 'date'), adm('validUntil', 'Valid until', 'date'), basisNote, adm('reviewNote', 'What the review found or changes', 'longtext')],
    documents: [{ class: 'signed-agreement', label: 'The agreement as signed', required: false }],
    stages: [
      { key: 'draft', label: 'Draft' }, { key: 'registered', label: 'Registered' }, { key: 'under-review', label: 'Under review' },
      { key: 'terminated', label: 'Terminated', terminal: true }, { key: 'withdrawn', label: 'Withdrawn before registration', terminal: true },
    ],
    actions: [
      { key: 'register', label: 'Register the agreement: scope, signatories, validity (a second official confirms)', from: ['draft'], to: 'registered', decision: 'register-agreement', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['fromInstitution', 'scope', 'signatories', 'validFrom'], documents: ['signed-agreement'], reasons: true }, effects: ['xi.agreement'] },
      { key: 'review', label: 'Open a review', from: ['registered'], to: 'under-review', needs: { role: 'officer' }, requires: { reasons: true } },
      { key: 'amend', label: 'Register the amended agreement (a second official confirms)', from: ['under-review'], to: 'registered', decision: 'amend-agreement', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewNote'], reasons: true }, effects: ['xi.agreement'] },
      { key: 'terminate', label: 'Terminate (a second official confirms)', from: ['registered', 'under-review'], to: 'terminated', decision: 'terminate-agreement', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
      { key: 'withdraw', label: 'Withdraw the draft', from: ['draft'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'registered, reviewed, amended, terminated', steps: [
      { action: 'register', expect: 'refused' },
      { action: 'register', fields: { fromInstitution: 'x', scope: 'x', signatories: 'x', validFrom: '2030-01-01' }, documents: ['signed-agreement'], expect: 'registered' },
      { action: 'review', expect: 'under-review' }, { action: 'amend', fields: { reviewNote: 'x' }, expect: 'registered' }, { action: 'terminate', expect: 'terminated' },
    ] }],
  },
  {
    ...base, key: 'xi.onboarding', version: 1, title: 'Onboarding an institution to a shared service', refPrefix: 'XONB', forms: ['GOV-WF-013'],
    fields: [from, service, adm('integrationRef', 'The integration\'s id (Connected systems)'), adm('testSummary', 'What the acceptance test covered', 'longtext')],
    documents: [{ class: 'acceptance-test-report', label: 'The acceptance test report', required: false }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'tested', label: 'Acceptance tested' }, { key: 'accepted', label: 'Accepted by two officials', terminal: true }, { key: 'refused', label: 'Not accepted, with reasons', terminal: true }],
    actions: [
      { key: 'test', label: 'Record the acceptance test', from: ['received'], to: 'tested', needs: { role: 'officer' }, requires: { fields: ['fromInstitution', 'serviceConcerned', 'testSummary'], documents: ['acceptance-test-report'] }, effects: ['xi.check-parties'] },
      { key: 'accept', label: 'Accept the institution onto the service (a second official confirms)', from: ['tested'], to: 'accepted', decision: 'accept-onboarding', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['xi.access'] },
      { key: 'refuse', label: 'Do not accept, with reasons', from: ['received', 'tested'], to: 'refused', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'tested and accepted', steps: [{ action: 'test', fields: { fromInstitution: 'x', serviceConcerned: 'x', testSummary: 'x' }, documents: ['acceptance-test-report'], expect: 'tested' }, { action: 'accept', expect: 'accepted' }] }],
  },
  {
    ...base, key: 'xi.access', version: 1, title: 'Access to a shared service', refPrefix: 'XACC', forms: ['GOV-WF-014'],
    fields: [from, service, scope, purpose, basisNote],
    documents: [],
    stages: [{ key: 'received', label: 'Received' }, { key: 'approved', label: 'Approved within a scope', terminal: true }, { key: 'refused', label: 'Refused with reasons', terminal: true }],
    actions: [
      { key: 'approve', label: 'Approve access within the scope (a second official confirms; effective only under a relationship and the integration\'s approval)', from: ['received'], to: 'approved', decision: 'approve-access', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['fromInstitution', 'serviceConcerned', 'scope', 'purpose'], reasons: true }, effects: ['xi.access'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['received'], to: 'refused', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'approved', steps: [{ action: 'approve', expect: 'refused' }, { action: 'approve', fields: { fromInstitution: 'x', serviceConcerned: 'x', scope: 'x', purpose: 'x' }, expect: 'approved' }] }],
  },
  {
    ...base, key: 'xi.exception', version: 1, title: 'Exception to a cross-institution workflow', refPrefix: 'XEXC', forms: ['GOV-WF-015'],
    fields: [from, requesting, adm('stepConcerned', 'The workflow step it concerns'), adm('justification', 'Justification', 'longtext'), adm('expiresOn', 'Expires on', 'date'), adm('controls', 'Compensating controls', 'longtext')],
    documents: [],
    stages: [{ key: 'received', label: 'Received' }, { key: 'granted', label: 'Granted until its expiry', terminal: true }, { key: 'refused', label: 'Refused with reasons', terminal: true }],
    actions: [
      { key: 'grant', label: 'Grant until the expiry date (a second official confirms; never waives the law)', from: ['received'], to: 'granted', decision: 'grant-exception', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['fromInstitution', 'stepConcerned', 'justification', 'expiresOn'], reasons: true }, effects: ['xi.exception'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['received'], to: 'refused', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'granted', steps: [{ action: 'grant', expect: 'refused' }, { action: 'grant', fields: { fromInstitution: 'x', stepConcerned: 'x', justification: 'x', expiresOn: '2030-01-01' }, expect: 'granted' }] }],
  },
];

/** The key of an institution's own adopted procedure: xi.<template>.<institution>. */
export const crossKey = (template: string, institution: string) => `${template}.${institution.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 60);

/** An institution adopts the templates as its own drafts (a different official of it approves each). */
export function installCrossInstitutionProcedures(institution: string, by: string, byId?: string): { drafted: string[]; present: string[] } | { error: string } {
  const m = getMinistry(institution);
  if (!m) return { error: 'No such institution' };
  const drafted: string[] = [], present: string[] = [];
  for (const t of CROSS_INSTITUTION_PROCEDURES) {
    const key = crossKey(t.key, institution);
    if (listPackages({ key }).length) { present.push(key); continue; }
    const { forms: _f, ...pkg } = t;
    void _f;
    const d = draftPackage({ ...pkg, key, owner: institution, title: `${t.title} (${m.name})` }, by, byId, registeredEffects());
    if ('error' in d) return { error: `${key}: ${d.error}` };
    drafted.push(key);
  }
  return { drafted, present };
}

/** How far each institution has adopted them (drafted, approved). */
export const adoptionOf = (institution: string): { template: string; key: string; state: 'none' | 'draft' | 'approved' }[] =>
  CROSS_INSTITUTION_PROCEDURES.map(t => {
    const key = crossKey(t.key, institution);
    const state = listPackages({ key, state: 'approved' }).length ? 'approved' : listPackages({ key }).length ? 'draft' : 'none';
    return { template: t.key, key, state };
  });

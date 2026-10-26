// Cabinet and executive correspondence on the workflow foundation (plan step
// I5; institutional specification Part 1 §3.3–3.5; field series Part 2 §2.1
// Department A and §2.2 Department A). Reference procedures, drafts for the
// cabinet office the nation names (slot `cabinetOffice`, shipped empty):
//
//   cabinet.decision        the specification's example procedure (§3.5), step by step:
//                           1 submit (sponsor, decision requested, legal basis, classification, conflicts)
//                           2 validate (completeness; legal review and fiscal review by different officials;
//                             incomplete papers returned)
//                           3 circulate (the approved version to the participants the record names)
//                           4 decide (the meeting's quorum and vote checked against the nation's adopted rules)
//                           5 confirm (a second official authenticates the decision record: sealed)
//                           6 publish or notify (the disclosure recorded with reasons; distribution logged)
//                           7 implement (actions assigned to responsible institutions; an independent
//                             institution, or another institution without an approved instruct
//                             relationship, receives a request, never an instruction; no power transfers)
//                           8 close (completion evidence and unresolved exceptions recorded)
//                           and corrections as new versions, the earlier text kept
//   exec.correspondence     petitions and correspondence to the executive office: received, acknowledged,
//                           routed or referred to the responsible institution, the response drafted and
//                           approved, the submitter notified; restricted (personal data, read by the
//                           handling office only); anonymous where the nation allows it
//
// Decisions are classified (lib/permits/decisions.ts, CABINET_PERMITS) under
// mappings CivicOS proposes, lead the cabinet office slot, none approved.
// Quorum, the decision rule and the members counted come only from the
// nation's adopted Cabinet rules (lib/cabinet/register.ts, a country rule set
// changed through lib/law/policy-change.ts; shipped unset). Every period is
// the nation's (deadlines ship without days).

import { registerEffect, registeredEffects, sampleMark, type EffectContext, type EffectResult } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { authorityFor, getMinistry, institutionBounds } from '@/lib/data/store';
import { samplesAllowed } from '@/lib/ops/mode';
import { citeBasis } from '@/lib/law/policy-change';
import { judicialRefusal } from '@/lib/transitions/restrictions';
import { directiveTargetRefusal, EXECUTIVE_OFFICE } from '@/lib/auth/roles';
import {
  registerSubmission, reviewSubmission, setSubmissionState, getSubmission, checkVote, recordCabinetDecision, attachCabinetDecision, correctCabinetDecision,
  distribute, setDisclosure, assignAction, getCabinetDecision, actionsOf, CLASSIFICATIONS, type Who,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);
const fail = <T extends object>(x: T | { error: string }): x is { error: string } => 'error' in x;
const who = (ctx: EffectContext): Who => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name });
const at = (ctx: EffectContext) => ctx.now.toISOString();
const reasonOf = (ctx: EffectContext) => ctx.case.pending?.reason ?? ctx.case.history[ctx.case.history.length - 1]?.reason ?? `${ctx.action.label} (${ctx.case.ref})`;
const isYes = (v: unknown) => v === true || v === 'true' || v === 'yes';

/** The permit type each Cabinet procedure's decisions rest on (lead: the cabinet office slot; proposed, unapproved). */
export const CABINET_PERMITS: Record<string, string> = { 'cabinet.decision': 'cabinet-decision-record', 'exec.correspondence': 'executive-correspondence-response' };

const keeper = (c: Case): string | null => (authorityFor('cabinetOffice') === c.owner ? null : 'Cabinet records are kept by the cabinet office named under Who is responsible');
const institutionList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : str(v).split(/[,;\n]+/)).map(x => x.trim()).filter(Boolean).slice(0, 60);
/** The provision a paper or decision cites (fields lawInstrument, lawProvision), or none where the nation's rules let a paper go without one. */
function basisOf(c: Case, now: Date) {
  const instrument = str(c.fields.lawInstrument), eId = str(c.fields.lawProvision);
  if (!instrument && !eId) return samplesAllowed() ? [] : { error: 'Cite the legal authority from the laws register (the law and provision the paper rests on)' };
  const b = citeBasis([{ instrument, eId }], now.toISOString().slice(0, 10), `Cabinet paper (${c.ref})`);
  if (fail(b)) return b;
  const ruled = judicialRefusal(b, now);
  return ruled ? { error: ruled } : b;
}

// ── Effects: cabinet.decision ────────────────────────────────────────────────

registerEffect('cabinet.register', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const sponsor = str(c.fields.sponsor);
  if (!getMinistry(sponsor)) return { error: 'The sponsoring institution is one of the registry\'s institutions (its id)' };
  const basis = basisOf(c, ctx.now);
  if (fail(basis)) return basis;
  const r = registerSubmission({ sponsor, title: str(c.fields.title), decisionRequested: str(c.fields.decisionRequested), classification: str(c.fields.classification), basis, fiscal: str(c.fields.fiscalImpact), conflicts: str(c.fields.conflicts), case: c.id, by: ctx.actor.name, at: at(ctx), ...sampleMark(c) });
  return fail(r) ? r : { facts: { paper: r.ref, classification: r.classification } };
});
registerEffect('cabinet.legalReview', (ctx: EffectContext): EffectResult => { const r = reviewSubmission(ctx.case.id, 'legal', str(ctx.case.fields.legalReview), who(ctx), at(ctx)); return fail(r) ? r : { facts: { paper: r.ref, legalReview: true } }; });
registerEffect('cabinet.fiscalReview', (ctx: EffectContext): EffectResult => { const r = reviewSubmission(ctx.case.id, 'fiscal', str(ctx.case.fields.fiscalReview), who(ctx), at(ctx)); return fail(r) ? r : { facts: { paper: r.ref, fiscalReview: true } }; });
registerEffect('cabinet.return', (ctx: EffectContext): EffectResult => { const r = setSubmissionState(ctx.case.id, 'returned', reasonOf(ctx), ctx.actor.name, at(ctx)); return fail(r) ? r : { facts: { paper: r.ref, returned: true } }; });
registerEffect('cabinet.resubmit', (ctx: EffectContext): EffectResult => { const r = setSubmissionState(ctx.case.id, 'submitted', reasonOf(ctx), ctx.actor.name, at(ctx)); return fail(r) ? r : { facts: { paper: r.ref, version: r.versions.length } }; });
registerEffect('cabinet.circulate', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const s = getSubmission(c.id);
  if (!s?.legalReview || !s.fiscalReview) return { error: 'The legal and fiscal reviews are recorded before the paper is circulated' };
  const to = institutionList(c.fields.participants);
  if (!to.length) return { error: 'Name the participants the paper goes to (their institutions)' };
  const unknown = to.find(x => !getMinistry(x));
  if (unknown) return { error: `No institution ${unknown}` };
  const r = setSubmissionState(c.id, 'circulated', `Circulated to ${to.length}`, ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { paper: r.ref, circulatedTo: to.length } };
});
/** The meeting's quorum and vote, checked against the adopted rules (production refuses without them). */
function voteOf(c: Case) {
  const v = checkVote({ present: int(c.fields.membersPresent), consensus: isYes(c.fields.consensus), ...(c.fields.votesFor !== undefined && c.fields.votesFor !== '' ? { for: int(c.fields.votesFor), against: int(c.fields.votesAgainst), abstain: Number.isInteger(int(c.fields.votesAbstain)) ? int(c.fields.votesAbstain) : 0 } : {}) });
  if ('error' in v) return v;
  if ('notAdopted' in v && !samplesAllowed()) return { error: `${v.notAdopted}: a production installation records no Cabinet decision without them` };
  if ('met' in v && !v.met) return { error: v.present < v.quorum ? `No quorum: ${v.present} present, ${v.quorum} needed under the nation's rules` : 'The vote does not carry the decision under the nation\'s rules' };
  return v;
}
registerEffect('cabinet.checkMeeting', (ctx: EffectContext): EffectResult => {
  const v = voteOf(ctx.case);
  if (fail(v)) return v;
  return { facts: 'met' in v ? { present: v.present, quorum: v.quorum, rule: v.rule } : { rules: 'not adopted (demonstration)' } };
});
registerEffect('cabinet.confirmDecision', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const v = voteOf(c);
  if (fail(v)) return v;
  const s = getSubmission(c.id);
  const proposer = c.pending?.by;
  const r = recordCabinetDecision({ case: c.id, text: str(c.fields.decisionText), legalCategory: str(c.fields.legalCategory), basis: s?.basis ?? [], meetingDate: str(c.fields.meetingDate), vote: v,
    ...(str(c.fields.effectiveDate) ? { effectiveDate: str(c.fields.effectiveDate) } : {}), ...(str(c.fields.implementationOwner) ? { implementationOwner: str(c.fields.implementationOwner) } : {}),
    by: proposer ? { ...(proposer.id ? { id: proposer.id } : {}), name: proposer.name } : who(ctx), ...(proposer ? { confirmedBy: who(ctx) } : {}), at: at(ctx), ...sampleMark(c) });
  return fail(r) ? r : { facts: { decision: r.ref, legalCategory: r.legalCategory, ...('met' in r.vote ? { quorum: r.vote.quorum, present: r.vote.present } : {}) }, after: (d?: { id: string }) => { if (d) attachCabinetDecision(c.id, d.id); } };
});
registerEffect('cabinet.correct', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const proposer = c.pending?.by;
  const r = correctCabinetDecision(c.id, str(c.fields.correctedText), reasonOf(ctx), proposer ? { ...(proposer.id ? { id: proposer.id } : {}), name: proposer.name } : who(ctx), proposer ? who(ctx) : undefined, at(ctx));
  return fail(r) ? r : { facts: { decision: r.ref, version: r.versions.length }, after: (d?: { id: string }) => { if (d) attachCabinetDecision(c.id, d.id); } };
});
registerEffect('cabinet.publish', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const state = str(c.fields.disclosure) === 'published' ? 'published' : 'withheld';
  const r = setDisclosure(c.id, state, str(c.fields.disclosureReasons) || reasonOf(ctx), who(ctx), at(ctx));
  if (fail(r)) return r;
  const to = institutionList(c.fields.distribution);
  const unknown = to.find(x => !getMinistry(x));
  if (unknown) return { error: `No institution ${unknown}` };
  const dr = distribute(c.id, to, ctx.actor.name, at(ctx));
  return fail(dr) ? dr : { facts: { decision: r.ref, disclosure: state, distributedTo: to.length } };
});
/** Actions, one per line: "institution; what is to be done; deadline (YYYY-MM-DD, optional)". */
registerEffect('cabinet.assign', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const lines = str(c.fields.actions).split('\n').map(l => l.split(';').map(x => x.trim())).filter(x => x[0]);
  if (!lines.length) return { error: 'List the actions: one per line, "institution; what is to be done; deadline (optional)"' };
  const decision = getCabinetDecision(c.id);
  if (!decision) return { error: 'The decision is confirmed before actions are assigned' };
  const bounds = institutionBounds(ctx.now);
  const out: string[] = [];
  for (const [inst, description, due] of lines) {
    const m = getMinistry(inst!);
    if (!m) return { error: `No institution ${inst}` };
    // An instruction only where the whole government may instruct that institution (or an approved instruct relationship lets it);
    // otherwise the action is a request, and the receiving institution's own powers stay its own.
    const kind = directiveTargetRefusal(bounds, { id: EXECUTIVE_OFFICE, name: 'the executive office' }, 'instruction', [{ id: m.id, name: m.name }]) ? 'request' : 'instruction';
    const r = assignAction(c.id, { institution: m.id, description: description ?? '', ...(due ? { due } : {}), kind, by: ctx.actor.name, at: at(ctx), ...sampleMark(c) });
    if (fail(r)) return r;
    out.push(`${r.ref} ${kind}`);
  }
  return { facts: { decision: decision.ref, actions: out.join(', ') } };
});
registerEffect('cabinet.close', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const decision = getCabinetDecision(c.id);
  if (!decision) return { error: 'No decision on this case' };
  const open = actionsOf(decision.ref).filter(a => a.state !== 'closed');
  if (open.length && !str(c.fields.exceptions)) return { error: `${open.length} action(s) are not closed: record them as unresolved exceptions, with reasons, to close the case` };
  return { facts: { decision: decision.ref, openActions: open.length } };
});

// ── Effects: exec.correspondence ─────────────────────────────────────────────

const handler = (c: Case): string | null => (authorityFor('cabinetOffice') === c.owner ? null : 'Executive correspondence is handled by the cabinet office named under Who is responsible');
registerEffect('correspondence.route', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = handler(c);
  if (why) return { error: why };
  const to = str(c.fields.referTo);
  if (to && !getMinistry(to)) return { error: `No institution ${to}` };
  return { facts: { routedTo: to ? (getMinistry(to)?.name ?? to) : 'the office itself' } };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const F = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const RF = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => F(key, label, type, { personalDataClass: 'restricted', ...extra });

export const REFERENCE_CABINET_DECISION: Ref = {
  key: 'cabinet.decision', version: 1, owner: 'cabinetOffice', title: 'Cabinet submission and decision', refPrefix: 'CBD', reference: true, citations: [], notifications: [], retention: 'cabinet-record-permanent', sensitivity: 'restricted',
  fields: [
    F('sponsor', 'Sponsoring institution (its id in the ministry registry)', 'text', { required: true }),
    F('title', 'Title of the Cabinet paper', 'text', { required: true }),
    RF('decisionRequested', 'Decision requested', 'longtext', { required: true }),
    RF('policyContext', 'Background, options considered and the public outcome sought', 'longtext', { required: true }),
    F('lawInstrument', 'Legal authority: the law (its id in the laws register)'),
    F('lawProvision', 'Legal authority: the provision (its eId)'),
    RF('fiscalImpact', 'Fiscal impact (an approved estimate\'s reference, or why none applies)', 'longtext'),
    RF('risks', 'Risks and alternatives', 'longtext', { required: true }),
    F('classification', 'Classification of the paper', 'choice', { required: true, options: CLASSIFICATIONS }),
    RF('conflicts', 'Interests declared by the sponsor and those who prepared the paper (or none)', 'longtext', { required: true }),
    RF('legalReview', 'Legal and authority review: what was checked', 'longtext', { audience: 'officer' }),
    RF('fiscalReview', 'Fiscal implications review: what was checked', 'longtext', { audience: 'officer' }),
    F('participants', 'Participants the paper is circulated to (institution ids, separated by commas)', 'text', { audience: 'officer' }),
    F('meetingDate', 'Date of the meeting', 'date', { audience: 'officer' }),
    F('membersPresent', 'Members present', 'number', { audience: 'officer' }),
    F('consensus', 'Decided by consensus (no vote taken)', 'boolean', { audience: 'officer' }),
    F('votesFor', 'Votes for (where a vote was taken)', 'number', { audience: 'officer' }),
    F('votesAgainst', 'Votes against', 'number', { audience: 'officer' }),
    F('votesAbstain', 'Abstentions', 'number', { audience: 'officer' }),
    RF('decisionText', 'The exact text of the decision', 'longtext', { audience: 'officer' }),
    F('legalCategory', 'Legal category of the decision under the nation\'s law (a policy decision, approval of a bill for the legislature, an instruction to ministries …)', 'text', { audience: 'officer' }),
    F('effectiveDate', 'Effective date', 'date', { audience: 'officer' }),
    F('implementationOwner', 'Implementation owner (institution id)', 'text', { audience: 'officer' }),
    F('disclosure', 'Disclosure', 'choice', { audience: 'officer', options: ['published', 'withheld'] }),
    F('disclosureReasons', 'Why it is published or withheld (the nation\'s disclosure rule)', 'longtext', { audience: 'officer' }),
    F('distribution', 'Distributed to (institution ids, separated by commas)', 'text', { audience: 'officer' }),
    F('actions', 'Actions, one per line: "institution id; what is to be done; deadline (optional)"', 'longtext', { audience: 'officer' }),
    RF('correctedText', 'Corrected text (a correction)', 'longtext', { audience: 'officer' }),
    F('exceptions', 'Unresolved exceptions at closure, with reasons', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'paper', label: 'The Cabinet paper as submitted', required: true }, { class: 'supporting', label: 'Supporting documents', required: false }, { class: 'minutes', label: 'The authorised minutes extract', required: false }],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'validation', label: 'Validation' }, { key: 'legal-reviewed', label: 'Legal review recorded' }, { key: 'returned', label: 'Returned to the sponsor' },
    { key: 'ready', label: 'Reviewed' }, { key: 'circulated', label: 'Circulated' }, { key: 'pending-confirmation', label: 'Decision recorded: confirmation' },
    { key: 'decided', label: 'Decided' }, { key: 'notified', label: 'Published or notified' }, { key: 'implementation', label: 'Implementation' },
    { key: 'closed', label: 'Closed', terminal: true }, { key: 'not-decided', label: 'Not decided', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'register', label: '1 · Register the submission', from: ['submitted'], to: 'validation', needs: { role: 'officer' }, requires: { documents: ['paper'], fields: ['sponsor', 'title', 'decisionRequested', 'policyContext', 'risks', 'classification', 'conflicts'] }, effects: ['cabinet.register'] },
    { key: 'legal-review', label: '2 · Record the legal and authority review', from: ['validation'], to: 'legal-reviewed', needs: { role: 'officer' }, requires: { fields: ['legalReview'] }, effects: ['cabinet.legalReview'] },
    { key: 'fiscal-review', label: '2 · Record the fiscal review (a different official)', from: ['legal-reviewed'], to: 'ready', needs: { role: 'officer', distinctFrom: ['legal-review'] }, requires: { fields: ['fiscalReview'] }, effects: ['cabinet.fiscalReview'] },
    { key: 'return', label: '2 · Return the incomplete paper, with reasons', from: ['validation', 'legal-reviewed', 'ready'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['cabinet.return'] },
    { key: 'resubmit', label: 'Revised paper received', from: ['returned'], to: 'validation', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['cabinet.resubmit'] },
    { key: 'circulate', label: '3 · Circulate the approved version', from: ['ready'], to: 'circulated', needs: { role: 'officer' }, requires: { fields: ['participants'] }, effects: ['cabinet.circulate'] },
    { key: 'record-decision', label: '4 · Record the meeting and the decision (quorum and vote checked)', from: ['circulated'], to: 'pending-confirmation', needs: { role: 'officer' }, requires: { fields: ['meetingDate', 'membersPresent', 'decisionText', 'legalCategory'] }, effects: ['cabinet.checkMeeting'] },
    { key: 'confirm', label: '5 · Confirm the decision record', from: ['pending-confirmation'], to: 'decided', decision: 'record-decision', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['cabinet.confirmDecision'] },
    { key: 'not-decided', label: 'Record that Cabinet did not decide (deferred or rejected)', from: ['circulated', 'pending-confirmation'], to: 'not-decided', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'publish', label: '6 · Publish or notify under the disclosure rules', from: ['decided'], to: 'notified', needs: { role: 'officer' }, requires: { fields: ['disclosure', 'disclosureReasons', 'distribution'] }, effects: ['cabinet.publish'] },
    { key: 'correct', label: 'Correct the decision record (a new version)', from: ['decided', 'notified', 'implementation'], to: 'notified', decision: 'correct', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['correctedText'] }, effects: ['cabinet.correct'] },
    { key: 'assign-actions', label: '7 · Assign the actions to the responsible institutions', from: ['notified'], to: 'implementation', needs: { role: 'signatory' }, requires: { fields: ['actions'] }, effects: ['cabinet.assign'] },
    { key: 'close', label: '8 · Close: completion evidence and unresolved exceptions recorded', from: ['implementation'], to: 'closed', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['cabinet.close'] },
    { key: 'withdraw', label: 'Record the sponsor\'s withdrawal', from: ['validation', 'legal-reviewed', 'returned', 'ready', 'circulated'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'actions', label: 'Time the responsible institutions have to report (the decision\'s deadlines; overdue actions escalated)', from: 'implementation', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
  tests: [{ name: 'decided and implemented', steps: [
    { action: 'register', fields: { sponsor: 'min-health', title: 'National immunisation week', decisionRequested: 'Approve a national immunisation week in May.', policyContext: 'Coverage fell.', risks: 'Cost', classification: 'restricted', conflicts: 'None' }, documents: ['paper'], expect: 'validation' },
    { action: 'legal-review', fields: { legalReview: 'Within the Public Health Act' }, expect: 'legal-reviewed' }, { action: 'fiscal-review', fields: { fiscalReview: 'Within the appropriation' }, expect: 'ready' },
    { action: 'circulate', fields: { participants: 'min-health, min-finance' }, expect: 'circulated' },
    { action: 'record-decision', fields: { meetingDate: '2027-02-01', membersPresent: 12, consensus: true, decisionText: 'Cabinet approves the week.', legalCategory: 'policy decision' }, expect: 'pending-confirmation' },
    { action: 'confirm', expect: 'decided' }, { action: 'publish', fields: { disclosure: 'withheld', disclosureReasons: 'Restricted until announced', distribution: 'min-health' }, expect: 'notified' },
    { action: 'assign-actions', fields: { actions: 'min-health; Plan the week; 2027-04-01' }, expect: 'implementation' }, { action: 'close', expect: 'closed' },
  ] }],
};

export const REFERENCE_CORRESPONDENCE: Ref = {
  key: 'exec.correspondence', version: 1, owner: 'cabinetOffice', title: 'Petition or correspondence to the executive office', refPrefix: 'ECR', reference: true, citations: [], notifications: [], retention: 'executive-correspondence', sensitivity: 'restricted',
  fields: [
    RF('subject', 'Subject', 'text', { required: true }),
    RF('message', 'The petition or message', 'longtext', { required: true }),
    F('topic', 'Topic (as the office\'s list names it)', 'text', { required: true }),
    RF('requestedOutcome', 'What the submitter asks for', 'longtext'),
    RF('relatedCase', 'An existing case the submitter refers to', 'text'),
    RF('contact', 'How to reply (only the channel needed for the response)', 'text'),
    F('anonymous', 'Submitted anonymously (where the nation accepts it)', 'boolean'),
    F('referTo', 'Responsible institution it is referred to (its id), where the office does not answer it itself', 'text', { audience: 'officer' }),
    RF('response', 'The approved response', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'correspondence', label: 'The petition or correspondence as received', required: true }, { class: 'acknowledgement', label: 'Acknowledgement sent', required: false }, { class: 'response-letter', label: 'The response letter', required: false }, { class: 'referral', label: 'The referral', required: false }],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'acknowledged', label: 'Acknowledged' }, { key: 'routed', label: 'Routed' }, { key: 'pending-approval', label: 'Response for approval' },
    { key: 'responded', label: 'Responded', terminal: true }, { key: 'referred', label: 'Referred to the responsible institution', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'acknowledge', label: 'Register and acknowledge', from: ['received'], to: 'acknowledged', needs: { role: 'officer' }, requires: { documents: ['correspondence'], fields: ['subject', 'message', 'topic'] } },
    { key: 'route', label: 'Route it (answered here, or referred)', from: ['acknowledged'], to: 'routed', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['correspondence.route'] },
    { key: 'refer', label: 'Refer it to the responsible institution', from: ['routed'], to: 'referred', decision: 'refer', needs: { role: 'signatory' }, requires: { reasons: true, fields: ['referTo'], documents: ['referral'] }, effects: ['correspondence.route'] },
    { key: 'draft', label: 'Draft the response', from: ['routed'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['response'] } },
    { key: 'respond', label: 'Approve the response and notify the submitter', from: ['pending-approval'], to: 'responded', decision: 'respond', needs: { role: 'signatory', distinctFrom: ['draft'] }, requires: { reasons: true, documents: ['response-letter'] } },
    { key: 'withdraw', label: 'Record the submitter\'s withdrawal', from: ['received', 'acknowledged', 'routed'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'response', label: 'Time to respond (the nation\'s rule)', from: 'acknowledged', sampleDays: 30, calendar: 'working', onLapse: 'escalate' }],
  appeal: { sampleDays: 30, body: 'the administrative review or the ombudsman the nation names', suspensive: false },
  tests: [
    { name: 'responded', steps: [{ action: 'acknowledge', fields: { subject: 'Road', message: 'Please repair the road.', topic: 'infrastructure' }, documents: ['correspondence'], expect: 'acknowledged' }, { action: 'route', expect: 'routed' }, { action: 'draft', fields: { response: 'Referred to works' }, expect: 'pending-approval' }, { action: 'respond', documents: ['response-letter'], expect: 'responded' }] },
    { name: 'referred', steps: [{ action: 'acknowledge', fields: { subject: 'S', message: 'M', topic: 't' }, documents: ['correspondence'], expect: 'acknowledged' }, { action: 'route', expect: 'routed' }, { action: 'refer', fields: { referTo: 'min-works' }, documents: ['referral'], expect: 'referred' }] },
  ],
};

export const CABINET_PROCEDURES: Ref[] = [REFERENCE_CABINET_DECISION, REFERENCE_CORRESPONDENCE];

export function installCabinetProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of CABINET_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}

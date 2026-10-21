// Independent oversight procedures (Institutional specification Part 4 §C.3
// to §C.7; catalogue Part 12 §2.4 DEM-CON-012, 013, 014, 018, 019, 020 and
// §2.5 DEM-PUB-009; plan step I8). Reference procedures, drafts the nation
// adapts and a second official approves; none is approved and none of the
// bodies is named: each belongs to a slot of the deployment profile
// (ombudsman, humanRights, anticorruption, supremeAudit, dataProtection),
// empty until the nation names its body under Who is responsible.
//
//   ombudsman.complaint              a complaint about public administration (DEM-CON-012)
//   human-rights.complaint           a rights-related complaint (DEM-CON-013)
//   integrity.disclosure             a protected disclosure or public integrity complaint (DEM-CON-019, DEM-PUB-009)
//   audit.engagement                 a public audit engagement, its findings and report (DEM-CON-014, DEM-CON-020)
//   data-protection.rights-request   a person's request about their data, handled with the controller (DEM-CON-018)
//   data-protection.investigation    suspected unauthorised access or other misuse of personal data
//
// What they share:
//   - The body's officials alone work the cases: the bodies are independent
//     (lib/nation/deployment.ts INDEPENDENT_SLOTS), so whole-government scope,
//     auditors and administrators stop at them (caseActRefusal(),
//     caseReadRefusal()).
//   - The complainant, the person making a disclosure, a protected witness or
//     the data subject is never a field of the case: their identity is kept
//     apart (lib/oversight/protected-identity.ts), read only by the assigned
//     official or one specifically authorised, every read logged.
//   - The allegation, the evidence, the finding and the recommendation are
//     kept apart: the complaint is what was alleged; evidence comes through
//     requests under an approved relationship (request_information or audit,
//     the relationship register) and the institution's own submissions; the
//     finding is the body's, with its criteria, condition, cause, effect,
//     evidence and reasons (lib/oversight/register.ts); a recommendation is
//     never an order and never an automatic decision. AI decides nothing here.
//   - The institution concerned answers through its own response beside the
//     finding (respondToFinding()); it never changes the finding.
//   - A referral to a prosecution, a court or another body carries the case
//     reference and the reason only: no case is opened there and nothing of the
//     file passes (prosecution referrals stay under legal review, plan I11).
//     No field records a suspect.
//   - Every decision (admissibility, the issued finding and recommendation, the
//     approved audit report, the data-protection authority's decision) is
//     classified under a proposed, unapproved authority mapping
//     (lib/permits/decisions.ts, OVERSIGHT_PERMITS): refused in production
//     until the nation approves its own.
//   - No day count ships: deadlines are the nation's law.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { relationshipGrants, purposeKey } from '@/lib/data/store/relationships';
import { READ_RELATIONSHIPS } from '@/lib/auth/roles';
import {
  OVERSIGHT_SLOTS, checkFinding, recordFinding, advanceFindings, recordFollowUp, requestEvidence, recordReferral, askController,
  findingsOfCase, controllerRequestsOfCase, REFERRAL_KINDS, REQUEST_KINDS, FOLLOW_UP_STATES, type OversightSlot, type Actor,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const lines = (v: unknown): string[] => str(v).split(/\n|;|,/).map(x => x.trim()).filter(Boolean);

/** The permit type whose approved mapping governs each family's decisions (lib/permits/decisions.ts reads it). */
export const OVERSIGHT_PERMITS: Record<string, string> = {
  'ombudsman.': 'ombudsman-recommendation',
  'human-rights.': 'human-rights-recommendation',
  'integrity.': 'integrity-finding',
  'audit.': 'public-audit-report',
  'data-protection.': 'data-protection-decision',
};

const slotOf = (key: string) => OVERSIGHT_SLOTS.find(s => key.startsWith(s.prefix));
/** The body that keeps this procedure must be the case's institution: the one named for its slot. */
function keeper(c: Case): { slot: OversightSlot; label: string } | { error: string } {
  const s = slotOf(c.package.key);
  if (!s) return { error: `${c.package.key} is not an oversight procedure` };
  return ownerInstitution(s.slot, authorityFor) === c.owner ? { slot: s.slot, label: s.label } : { error: `${s.label}: these cases are kept by the body named for it under Who is responsible` };
}
/** A registered institution other than the body itself. */
function institution(c: Case, id: string, what: string): string | { error: string } {
  if (!id) return { error: `Name ${what} (its id in the institution register)` };
  const m = getMinistry(id);
  if (!m) return { error: `${id} is not a registered institution` };
  if (m.id === c.owner) return { error: `${what} is another institution than this body` };
  return m.id;
}
const actorOf = (ctx: EffectContext): Actor => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name, ...(ctx.actor.scope?.institution ?? ctx.actor.institution ? { institution: ctx.actor.scope?.institution ?? ctx.actor.institution } : {}) });
const reasonOf = (c: Case, fallback: string) => c.history.at(-1)?.reason ?? fallback;
const sample = (c: Case) => c.source === 'sample';
/** The institution a matter concerns: the complaint's, the audited institution, or the controller. */
const concernsOf = (c: Case) => str(c.fields.findingConcerns) || str(c.fields.concerns) || str(c.fields.auditee) || str(c.fields.controller);

/**
 * The approved relationship in force that lets the body ask `to` for records
 * of these types for this purpose: an audit or request-information
 * relationship from the body (plan phase 3). Never inferred from the body's
 * standing.
 */
function grantFor(from: string, to: string, recordTypes: string[], purpose: string, now: Date) {
  const p = purposeKey(purpose);
  return relationshipGrants(now).find(g => g.from === from && g.to === to && READ_RELATIONSHIPS.includes(g.type)
    && recordTypes.every(t => g.recordTypes.includes(t)) && g.purposes.includes(p));
}
const noGrant = (to: string, recordTypes: string[], purpose: string) =>
  `No approved relationship lets this body ask ${getMinistry(to)?.name ?? to} for ${recordTypes.join(', ')} records for "${purpose}": an audit or request-information relationship is recorded in the relationship register (proposed citing the law, confirmed by a different official and by each independent end)`;

// ── Effects ──────────────────────────────────────────────────────────────────

registerEffect('oversight.register', ({ case: c }: EffectContext) => {
  const k = keeper(c);
  if ('error' in k) return k;
  const who = concernsOf(c);
  if (who) { const i = institution(c, who, 'The institution concerned'); if (typeof i !== 'string') return i; }
  return { facts: { received: true } };
});

registerEffect('oversight.admit', ({ case: c }: EffectContext) => {
  const k = keeper(c);
  if ('error' in k) return k;
  const i = institution(c, concernsOf(c), 'The institution concerned');
  if (typeof i !== 'string') return i;
  return { facts: { concerns: i } };
});

registerEffect('oversight.request-evidence', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const to = institution(c, str(c.fields.evidenceTo), 'The institution asked for evidence');
  if (typeof to !== 'string') return to;
  const purpose = str(c.fields.evidencePurpose), requested = str(c.fields.evidenceRequested);
  if (!purpose || !requested) return { error: 'Say what evidence is requested and for what purpose' };
  const recordTypes = lines(c.fields.evidenceRecordTypes).length ? lines(c.fields.evidenceRecordTypes) : ['cases'];
  const g = grantFor(c.owner, to, recordTypes, purpose, now);
  if (!g) return { error: noGrant(to, recordTypes, purpose) };
  const due = str(c.fields.evidenceDue);
  return {
    facts: { evidenceRequestedFrom: to },
    after: () => { requestEvidence({ body: c.owner, case: { id: c.id, ref: c.ref }, to, relationship: { id: g.id, version: g.version, type: g.type }, purpose, recordTypes, requested, ...(due ? { due } : {}), by: actorOf(ctx), sample: sample(c) }, now); },
  };
});

registerEffect('oversight.record-finding', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const concerns = institution(c, concernsOf(c), 'The institution the finding concerns');
  if (typeof concerns !== 'string') return concerns;
  const terms = checkFinding({ criteria: c.fields.findingCriteria, condition: c.fields.findingCondition, cause: c.fields.findingCause, effect: c.fields.findingEffect, evidence: c.fields.findingEvidence, recommendation: c.fields.findingRecommendation });
  if ('error' in terms) return terms;
  return {
    facts: { findingFor: concerns },
    after: (_d, done) => { recordFinding({ body: c.owner, slot: k.slot, case: { id: c.id, ref: c.ref }, concerns, terms, reason: reasonOf(done, 'Finding recorded'), by: actorOf(ctx), sample: sample(c) }, now); },
  };
});

registerEffect('oversight.communicate', (ctx: EffectContext) => {
  const { case: c } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  if (!findingsOfCase(c.id).some(f => f.stage === 'draft')) return { error: 'Record the findings before sending them for a response' };
  return { facts: { communicated: true }, after: () => { advanceFindings(c.id, 'communicated', actorOf(ctx)); } };
});

registerEffect('oversight.issue', (ctx: EffectContext) => {
  const { case: c } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const open = findingsOfCase(c.id).filter(f => f.stage !== 'issued');
  if (!open.length) return { error: 'There is no finding to issue: record the findings first' };
  return { facts: { findings: open.length }, after: d => { advanceFindings(c.id, 'issued', actorOf(ctx), d?.id); } };
});

registerEffect('oversight.follow-up', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const number = str(c.fields.followUpFinding);
  const f = findingsOfCase(c.id).find(x => x.number === number);
  if (!f) return { error: 'Name a finding of this case' };
  if (f.stage !== 'issued') return { error: 'Follow-up is recorded once the finding is issued' };
  if (!FOLLOW_UP_STATES.includes(str(c.fields.followUpStatus) as never)) return { error: `The follow-up status is one of ${FOLLOW_UP_STATES.join(', ')}` };
  return { facts: { followedUp: number }, after: () => { recordFollowUp(number, str(c.fields.followUpStatus), str(c.fields.followUpNote), actorOf(ctx), now); } };
});

registerEffect('oversight.refer', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const to = institution(c, str(c.fields.referTo), 'The institution referred to');
  if (typeof to !== 'string') return to;
  const kind = str(c.fields.referralKind);
  if (!REFERRAL_KINDS.includes(kind as never)) return { error: `The referral is one of ${REFERRAL_KINDS.join(', ')}` };
  // A reference only: no case is opened at the receiving institution and nothing of the file passes.
  return {
    facts: { referredTo: to, referral: kind },
    after: (_d, done) => { recordReferral({ body: c.owner, case: { id: c.id, ref: c.ref }, to, kind: kind as never, reason: reasonOf(done, 'Referred'), by: actorOf(ctx), sample: sample(c) }, now); },
  };
});

/** Records named as `register:reference`, one per line. */
function recordsOf(c: Case): { register: string; id: string }[] | { error: string } {
  const out: { register: string; id: string }[] = [];
  for (const l of lines(c.fields.records)) {
    const [register, ...rest] = l.split(':');
    const id = rest.join(':').trim();
    if (!register?.trim() || !id) return { error: `Name each record as register:reference (for example cases:CIV-2026-000012); "${l}" is not` };
    out.push({ register: register.trim(), id });
  }
  return out.length ? out : { error: 'Name the records concerned (register:reference, one per line)' };
}

registerEffect('oversight.ask-controller', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const controller = institution(c, str(c.fields.controller) || str(c.fields.concerns), 'The institution that controls the records');
  if (typeof controller !== 'string') return controller;
  const records = recordsOf(c);
  if ('error' in records) return records;
  const kind = str(c.fields.requestKind) || 'investigation';
  if (!REQUEST_KINDS.includes(kind as never)) return { error: `The request is one of ${REQUEST_KINDS.join(', ')}` };
  const purpose = str(c.fields.dpPurpose), asked = str(c.fields.dpAsked);
  if (!purpose || !asked) return { error: 'Say what the controller is asked and for what purpose' };
  const types = [...new Set(records.map(r => r.register))];
  const g = grantFor(c.owner, controller, types, purpose, now);
  if (!g) return { error: noGrant(controller, types, purpose) };
  return {
    facts: { askedController: controller },
    after: () => { askController({ body: c.owner, case: { id: c.id, ref: c.ref }, controller, relationship: { id: g.id, version: g.version, type: g.type }, kind: kind as never, records, purpose, asked, by: actorOf(ctx), sample: sample(c) }, now); },
  };
});

registerEffect('oversight.controller-answered', ({ case: c }: EffectContext) => {
  const k = keeper(c);
  if ('error' in k) return k;
  const rs = controllerRequestsOfCase(c.id);
  if (!rs.length) return { error: 'No request has been sent to the controller' };
  if (rs.some(r => !r.answer)) return { error: 'The controller has not answered yet' };
  return { facts: { answers: rs.length } };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const configured = (key: string, label: string, list: string, what: string): FieldSpec => ({ key, label, type: 'enum', valuesSource: { kind: 'configured', list }, personalDataClass: 'restricted', countryDecision: `The nation's ${what}; none ship` });
const HINT = 'Say what happened and when. Do not name anyone who is not needed: the body asks for what it needs. The person who raised it is recorded apart, never here.';

const EVIDENCE_FIELDS: FieldSpec[] = [
  adm('evidenceTo', 'Institution asked for evidence (its id in the institution register)'),
  adm('evidencePurpose', 'Purpose of the request (one the relationship lists)'),
  adm('evidenceRecordTypes', 'Kinds of record asked for (as the relationship lists them; cases when left empty)'),
  r('evidenceRequested', 'What evidence is requested', 'longtext'),
  adm('evidenceDue', 'Asked for by (the date this body sets)', 'date'),
];
const FINDING_FIELDS: FieldSpec[] = [
  adm('findingConcerns', 'Institution the finding concerns (its id; the institution complained about when left empty)'),
  r('findingCriteria', 'Criteria: the rule or standard the matter is measured against', 'longtext'),
  r('findingCondition', 'Condition: what was found', 'longtext'),
  r('findingCause', 'Cause', 'longtext'),
  r('findingEffect', 'Effect', 'longtext'),
  r('findingEvidence', 'Evidence relied on (documents of the case or items described, one per line)', 'longtext'),
  r('findingRecommendation', 'Recommendation: what the institution is asked to do (never an order)', 'longtext'),
];
const FOLLOW_UP_FIELDS: FieldSpec[] = [
  adm('followUpFinding', 'Finding followed up (its number)'),
  adm('followUpStatus', 'Follow-up status', 'choice', { options: FOLLOW_UP_STATES }),
  r('followUpNote', 'What the follow-up found', 'longtext'),
];
const REFERRAL_FIELDS: FieldSpec[] = [
  adm('referTo', 'Institution referred to (its id; the referral carries this case\'s reference only)'),
  adm('referralKind', 'Kind of referral', 'choice', { options: REFERRAL_KINDS }),
];
const CLOSURE_FIELDS: FieldSpec[] = [
  adm('closureReason', 'Why the case is closed', 'choice', { options: ['resolved', 'recommendations-followed', 'not-upheld', 'outside-mandate', 'withdrawn', 'referred-elsewhere', 'other'] }),
  adm('reviewRoute', 'Review route open to the person (as the nation\'s law gives it)'),
];

const base = { reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'oversight-case-file', sensitivity: 'restricted' as const };

/** A complaint or disclosure procedure: intake, jurisdiction and admissibility, investigation, findings, the response of the institution concerned, follow-up. */
function complaintProcedure(p: { key: string; title: string; refPrefix: string; owner: OversightSlot; intake: FieldSpec[]; intakeRequired: string[]; decision: { admit: string; issue: string }; complaintDoc: string }): Ref {
  return {
    ...base, owner: p.owner, key: p.key, version: 1, title: p.title, refPrefix: p.refPrefix,
    fields: [
      adm('concerns', 'Institution concerned (its id in the institution register)'),
      ...p.intake,
      r('accessibilitySupport', 'Accessibility support the person needs to take part'),
      r('earlyResolution', 'How it was resolved early, or why it was not', 'longtext'),
      ...EVIDENCE_FIELDS, ...FINDING_FIELDS, ...FOLLOW_UP_FIELDS, ...REFERRAL_FIELDS, ...CLOSURE_FIELDS,
    ],
    documents: [
      { class: p.complaintDoc, label: 'The complaint or disclosure as received (form, letter or message)', required: true },
      { class: 'evidence', label: 'Evidence received or gathered', required: false, multiple: true },
      { class: 'interview-record', label: 'Record of a confidential interview (restricted)', required: false, multiple: true },
      { class: 'findings-report', label: 'Findings and recommendations, with reasons', required: true },
    ],
    stages: [
      { key: 'received', label: 'Received' }, { key: 'jurisdiction', label: 'Jurisdiction and admissibility' },
      { key: 'investigation', label: 'Investigation' }, { key: 'response', label: 'Sent for the response of the institution concerned' },
      { key: 'monitoring', label: 'Recommendations issued; response monitored' },
      { key: 'inadmissible', label: 'Not admitted, with reasons', terminal: true }, { key: 'resolved', label: 'Resolved early', terminal: true },
      { key: 'referred', label: 'Referred (reference only)', terminal: true }, { key: 'closed', label: 'Closed with reasons', terminal: true },
    ],
    actions: [
      { key: 'register', label: 'Register and assign for the jurisdiction review', from: ['received'], to: 'jurisdiction', needs: { role: 'officer' }, requires: { fields: p.intakeRequired, documents: [p.complaintDoc] }, effects: ['oversight.register'] },
      { key: 'admit', label: 'Admit: within the mandate, with reasons', from: ['jurisdiction'], to: 'investigation', decision: p.decision.admit, needs: { role: 'signatory' }, requires: { fields: ['concerns'], reasons: true }, effects: ['oversight.admit'] },
      { key: 'decline', label: 'Do not admit: outside the mandate or inadmissible, with reasons and the review route', from: ['jurisdiction'], to: 'inadmissible', decision: 'decline', needs: { role: 'signatory' }, requires: { reasons: true } },
      { key: 'resolve-early', label: 'Resolved early, with reasons', from: ['jurisdiction'], to: 'resolved', needs: { role: 'signatory' }, requires: { fields: ['earlyResolution'], reasons: true } },
      { key: 'request-evidence', label: 'Request evidence from an institution (under an approved relationship)', from: ['investigation'], to: 'investigation', needs: { role: 'officer', assigned: true }, requires: { fields: ['evidenceTo', 'evidencePurpose', 'evidenceRequested'], reasons: true }, effects: ['oversight.request-evidence'] },
      { key: 'record-finding', label: 'Record a finding and its recommendation, with reasons', from: ['investigation'], to: 'investigation', needs: { role: 'officer', assigned: true }, requires: { fields: ['findingCondition', 'findingRecommendation'], reasons: true }, effects: ['oversight.record-finding'] },
      { key: 'communicate', label: 'Send the findings to the institution concerned for its response', from: ['investigation'], to: 'response', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['oversight.communicate'] },
      { key: 'issue', label: 'Issue the findings and recommendations', from: ['response'], to: 'monitoring', decision: p.decision.issue, needs: { role: 'signatory', fourEyes: true }, requires: { documents: ['findings-report'], reasons: true }, effects: ['oversight.issue'] },
      { key: 'follow-up', label: 'Record how a recommendation is followed up', from: ['monitoring'], to: 'monitoring', needs: { role: 'officer' }, requires: { fields: ['followUpFinding', 'followUpStatus', 'followUpNote'], reasons: true }, effects: ['oversight.follow-up'] },
      { key: 'refer', label: 'Refer to another institution (the case reference only)', from: ['jurisdiction', 'investigation', 'monitoring'], to: 'referred', needs: { role: 'signatory' }, requires: { fields: ['referTo', 'referralKind'], reasons: true }, effects: ['oversight.refer'] },
      { key: 'close', label: 'Close, with reasons and the review route', from: ['monitoring'], to: 'closed', needs: { role: 'signatory' }, requires: { fields: ['closureReason'], reasons: true } },
    ],
    tests: [
      { name: 'investigated, found, answered and followed up', steps: [
        { action: 'register', expect: 'refused' },
        { action: 'register', fields: Object.fromEntries(p.intakeRequired.map(k => [k, 'x'])), documents: [p.complaintDoc], expect: 'jurisdiction' },
        { action: 'admit', fields: { concerns: 'x' }, expect: 'investigation' },
        { action: 'record-finding', fields: { findingCondition: 'x', findingRecommendation: 'x' }, expect: 'investigation' },
        { action: 'communicate', expect: 'response' },
        { action: 'issue', expect: 'refused' },
        { action: 'issue', documents: ['findings-report'], expect: 'monitoring' },
        { action: 'follow-up', fields: { followUpFinding: 'x', followUpStatus: 'implemented', followUpNote: 'x' }, expect: 'monitoring' },
        { action: 'close', fields: { closureReason: 'recommendations-followed' }, expect: 'closed' },
      ] },
      { name: 'not admitted', steps: [{ action: 'register', fields: Object.fromEntries(p.intakeRequired.map(k => [k, 'x'])), documents: [p.complaintDoc], expect: 'jurisdiction' }, { action: 'decline', expect: 'inadmissible' }] },
      { name: 'referred', steps: [{ action: 'register', fields: Object.fromEntries(p.intakeRequired.map(k => [k, 'x'])), documents: [p.complaintDoc], expect: 'jurisdiction' }, { action: 'refer', fields: { referTo: 'x', referralKind: 'other' }, expect: 'referred' }] },
    ],
  };
}

export const REFERENCE_OMBUDSMAN_COMPLAINT: Ref = complaintProcedure({
  key: 'ombudsman.complaint', title: 'Complaint about public administration (ombudsman)', refPrefix: 'OMB', owner: 'ombudsman', complaintDoc: 'complaint',
  decision: { admit: 'admit', issue: 'recommend' }, intakeRequired: ['allegedAction', 'description'],
  intake: [
    configured('issueCategory', 'Kind of issue', 'oversight.country.ombudsman_issue_kinds', 'kinds of issue within the ombudsman\'s mandate'),
    r('allegedAction', 'The administrative action or failure complained of', 'longtext'),
    r('affectedDecision', 'The decision or case concerned, if any (its reference)'),
    r('description', 'What happened (restricted)', 'longtext', { hint: HINT }),
    r('when', 'When it happened', 'dateRange', { allowSingle: true }),
    r('confidentialityConcerns', 'Confidentiality or safety concerns', 'longtext'),
  ],
});

export const REFERENCE_HUMAN_RIGHTS_COMPLAINT: Ref = complaintProcedure({
  key: 'human-rights.complaint', title: 'Rights-related complaint (human rights institution)', refPrefix: 'HRC', owner: 'humanRights', complaintDoc: 'complaint',
  decision: { admit: 'admit', issue: 'recommend' }, intakeRequired: ['rightsCategory', 'description'],
  intake: [
    configured('rightsCategory', 'Rights concerned', 'oversight.country.rights_categories', 'categories of rights within the institution\'s mandate'),
    r('description', 'What happened (restricted)', 'longtext', { hint: HINT }),
    r('when', 'When it happened', 'dateRange', { allowSingle: true }),
    r('vulnerablePerson', 'A vulnerable person is concerned (heightened restriction)', 'boolean'),
    r('confidentialityConcerns', 'Confidentiality or safety concerns, and whether the person fears reprisal', 'longtext'),
  ],
});

export const REFERENCE_PROTECTED_DISCLOSURE: Ref = complaintProcedure({
  key: 'integrity.disclosure', title: 'Protected disclosure or public integrity complaint (anti-corruption commission)', refPrefix: 'ACD', owner: 'anticorruption', complaintDoc: 'disclosure',
  decision: { admit: 'admit', issue: 'finding' }, intakeRequired: ['allegation'],
  intake: [
    configured('allegationKind', 'Kind of concern', 'oversight.country.integrity_concern_kinds', 'kinds of integrity concern within the commission\'s mandate'),
    r('allegation', 'What is alleged (restricted: an allegation, never a finding)', 'longtext', { hint: 'Describe the conduct and the public function concerned. A report is not proof of corruption: the commission assesses it.' }),
    r('when', 'When it happened', 'dateRange', { allowSingle: true }),
    r('protectionNeeds', 'Immediate protection needs of the person who reported it', 'longtext'),
    r('custodyNote', 'Evidence received and its chain of custody', 'longtext'),
  ],
});

export const REFERENCE_AUDIT_ENGAGEMENT: Ref = {
  ...base, owner: 'supremeAudit', key: 'audit.engagement', version: 1, title: 'Public audit engagement', refPrefix: 'AUD',
  fields: [
    adm('auditee', 'Audited institution (its id in the institution register)'),
    adm('auditKind', 'Kind of audit', 'choice', { options: ['financial', 'compliance', 'performance'] }),
    adm('auditScope', 'Scope', 'longtext'),
    adm('auditObjectives', 'Objectives', 'longtext'),
    adm('auditPeriod', 'Period audited', 'dateRange'),
    adm('auditTeam', 'Audit team (names and roles)', 'longtext'),
    adm('mandate', 'Authority for the audit (the provision of the nation\'s law)'),
    ...EVIDENCE_FIELDS, ...FINDING_FIELDS, ...FOLLOW_UP_FIELDS,
    adm('publication', 'How the report is published or submitted (as the nation\'s law provides)', 'longtext'),
  ],
  documents: [
    { class: 'audit-plan', label: 'Approved audit plan', required: true },
    { class: 'engagement-letter', label: 'Notice to the audited institution', required: true },
    { class: 'working-paper', label: 'Working papers and audit tests (procedure, sample or population, result, reviewer)', required: false, multiple: true },
    { class: 'audit-report', label: 'Audit report (the approved version)', required: true },
  ],
  stages: [
    { key: 'planning', label: 'Planning' }, { key: 'approved', label: 'Mandate, scope and team approved' }, { key: 'fieldwork', label: 'Fieldwork' },
    { key: 'response', label: 'Draft findings with the audited institution for its response' }, { key: 'reported', label: 'Report approved' },
    { key: 'follow-up', label: 'Published; recommendations followed up' }, { key: 'closed', label: 'Closed', terminal: true },
    { key: 'withdrawn', label: 'Withdrawn, with reasons', terminal: true },
  ],
  actions: [
    { key: 'approve-plan', label: 'Approve the mandate, scope and team', from: ['planning'], to: 'approved', decision: 'approve-plan', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['auditee', 'auditScope', 'auditObjectives'], documents: ['audit-plan'], reasons: true }, effects: ['oversight.admit'] },
    { key: 'notify', label: 'Notify the audited institution', from: ['approved'], to: 'fieldwork', needs: { role: 'officer' }, requires: { documents: ['engagement-letter'] } },
    { key: 'request-evidence', label: 'Request evidence (under an approved relationship)', from: ['fieldwork'], to: 'fieldwork', needs: { role: 'officer' }, requires: { fields: ['evidenceTo', 'evidencePurpose', 'evidenceRequested'], reasons: true }, effects: ['oversight.request-evidence'] },
    { key: 'record-finding', label: 'Record a finding: criteria, condition, cause, effect, evidence and recommendation', from: ['fieldwork'], to: 'fieldwork', needs: { role: 'officer' }, requires: { fields: ['findingCondition', 'findingRecommendation'], reasons: true }, effects: ['oversight.record-finding'] },
    { key: 'communicate', label: 'Send the draft findings to the audited institution for its response', from: ['fieldwork'], to: 'response', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['oversight.communicate'] },
    { key: 'approve-report', label: 'Approve the report (the audit office\'s own governance)', from: ['response'], to: 'reported', decision: 'approve-report', needs: { role: 'signatory', fourEyes: true }, requires: { documents: ['audit-report'], reasons: true }, effects: ['oversight.issue'] },
    { key: 'publish', label: 'Publish or submit the report as the law provides', from: ['reported'], to: 'follow-up', needs: { role: 'signatory' }, requires: { fields: ['publication'], reasons: true } },
    { key: 'follow-up', label: 'Record how a recommendation is followed up', from: ['follow-up'], to: 'follow-up', needs: { role: 'officer' }, requires: { fields: ['followUpFinding', 'followUpStatus', 'followUpNote'], reasons: true }, effects: ['oversight.follow-up'] },
    { key: 'close', label: 'Close the engagement', from: ['follow-up'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'withdraw', label: 'Withdraw the engagement, with reasons', from: ['planning', 'approved', 'fieldwork'], to: 'withdrawn', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'planned, audited, answered, reported and followed up', steps: [
      { action: 'approve-plan', expect: 'refused' },
      { action: 'approve-plan', fields: { auditee: 'x', auditScope: 'x', auditObjectives: 'x' }, documents: ['audit-plan'], expect: 'approved' },
      { action: 'notify', documents: ['engagement-letter'], expect: 'fieldwork' },
      { action: 'request-evidence', fields: { evidenceTo: 'x', evidencePurpose: 'x', evidenceRequested: 'x' }, expect: 'fieldwork' },
      { action: 'record-finding', fields: { findingCondition: 'x', findingRecommendation: 'x' }, expect: 'fieldwork' },
      { action: 'communicate', expect: 'response' },
      { action: 'approve-report', documents: ['audit-report'], expect: 'reported' },
      { action: 'publish', fields: { publication: 'x' }, expect: 'follow-up' },
      { action: 'follow-up', fields: { followUpFinding: 'x', followUpStatus: 'open', followUpNote: 'x' }, expect: 'follow-up' },
      { action: 'close', expect: 'closed' },
    ] },
    { name: 'withdrawn', steps: [{ action: 'withdraw', expect: 'withdrawn' }] },
  ],
};

/** The data-protection authority's procedures: a person's request, or an investigation; the controller answers, the authority decides. */
function dataProtectionProcedure(p: { key: string; title: string; refPrefix: string; intake: FieldSpec[]; intakeRequired: string[] }): Ref {
  return {
    ...base, owner: 'dataProtection', key: p.key, version: 1, title: p.title, refPrefix: p.refPrefix,
    fields: [
      adm('controller', 'Institution that controls the records (its id in the institution register)'),
      ...p.intake,
      adm('records', 'Records concerned, as register:reference, one per line (never their content)', 'longtext'),
      adm('dpPurpose', 'Purpose of the request to the controller (one the relationship lists)'),
      r('dpAsked', 'What the controller is asked', 'longtext'),
      ...FINDING_FIELDS, ...FOLLOW_UP_FIELDS, ...CLOSURE_FIELDS,
    ],
    documents: [
      { class: 'request', label: 'The request or complaint as received', required: true },
      { class: 'evidence', label: 'Evidence received', required: false, multiple: true },
      { class: 'decision-report', label: 'Findings and decision, with reasons', required: true },
    ],
    stages: [
      { key: 'received', label: 'Received' }, { key: 'assessment', label: 'Jurisdiction and powers' }, { key: 'with-controller', label: 'With the controller' },
      { key: 'review', label: 'Review of the controller\'s answer' }, { key: 'decided', label: 'Decided; compliance followed up' },
      { key: 'declined', label: 'Not taken up, with reasons', terminal: true }, { key: 'closed', label: 'Closed', terminal: true },
    ],
    actions: [
      { key: 'register', label: 'Register and assign', from: ['received'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['controller', ...p.intakeRequired], documents: ['request'] }, effects: ['oversight.register'] },
      { key: 'decline', label: 'Not taken up: outside the authority\'s powers, with reasons', from: ['assessment'], to: 'declined', decision: 'decline', needs: { role: 'signatory' }, requires: { reasons: true } },
      { key: 'ask-controller', label: 'Ask the controller (under an approved relationship): never a direct read', from: ['assessment'], to: 'with-controller', needs: { role: 'officer', assigned: true }, requires: { fields: ['controller', 'records', 'dpPurpose', 'dpAsked'], reasons: true }, effects: ['oversight.ask-controller'] },
      { key: 'review', label: 'Review the controller\'s answer', from: ['with-controller'], to: 'review', needs: { role: 'officer', assigned: true }, effects: ['oversight.controller-answered'] },
      { key: 'record-finding', label: 'Record a finding, separately from the allegation', from: ['review'], to: 'review', needs: { role: 'officer', assigned: true }, requires: { fields: ['findingCondition', 'findingRecommendation'], reasons: true }, effects: ['oversight.record-finding'] },
      { key: 'decide', label: 'Decide: recommendation, order or other outcome within the authority\'s powers', from: ['review'], to: 'decided', decision: 'decide', needs: { role: 'signatory', fourEyes: true }, requires: { documents: ['decision-report'], reasons: true }, effects: ['oversight.issue'] },
      { key: 'follow-up', label: 'Record compliance with the decision', from: ['decided'], to: 'decided', needs: { role: 'officer' }, requires: { fields: ['followUpFinding', 'followUpStatus', 'followUpNote'], reasons: true }, effects: ['oversight.follow-up'] },
      { key: 'close', label: 'Close, with reasons and the review route', from: ['decided'], to: 'closed', needs: { role: 'signatory' }, requires: { fields: ['closureReason'], reasons: true } },
    ],
    tests: [
      { name: 'asked, answered, decided and followed up', steps: [
        { action: 'register', expect: 'refused' },
        { action: 'register', fields: Object.fromEntries(['controller', ...p.intakeRequired].map(k => [k, 'x'])), documents: ['request'], expect: 'assessment' },
        { action: 'ask-controller', fields: { records: 'cases:x', dpPurpose: 'x', dpAsked: 'x' }, expect: 'with-controller' },
        { action: 'review', expect: 'review' },
        { action: 'record-finding', fields: { findingCondition: 'x', findingRecommendation: 'x' }, expect: 'review' },
        { action: 'decide', documents: ['decision-report'], expect: 'decided' },
        { action: 'follow-up', fields: { followUpFinding: 'x', followUpStatus: 'implemented', followUpNote: 'x' }, expect: 'decided' },
        { action: 'close', fields: { closureReason: 'resolved' }, expect: 'closed' },
      ] },
      { name: 'not taken up', steps: [{ action: 'register', fields: Object.fromEntries(['controller', ...p.intakeRequired].map(k => [k, 'x'])), documents: ['request'], expect: 'assessment' }, { action: 'decline', expect: 'declined' }] },
    ],
  };
}

export const REFERENCE_RIGHTS_REQUEST: Ref = dataProtectionProcedure({
  key: 'data-protection.rights-request', title: 'Personal data rights request (data-protection authority)', refPrefix: 'DPR', intakeRequired: ['requestKind', 'description'],
  intake: [
    adm('requestKind', 'What the person asks', 'choice', { options: ['access', 'correction', 'erasure', 'restriction', 'objection'] }),
    r('description', 'The request, in the person\'s words (restricted)', 'longtext', { hint: 'Which records, and what is wrong with them or what is asked. The person is recorded apart, never here.' }),
  ],
});

export const REFERENCE_PRIVACY_INVESTIGATION: Ref = dataProtectionProcedure({
  key: 'data-protection.investigation', title: 'Investigation of suspected unauthorised access or misuse of personal data', refPrefix: 'DPI', intakeRequired: ['trigger', 'allegation'],
  intake: [
    adm('trigger', 'What started it', 'choice', { options: ['complaint', 'access-log-alert', 'breach-notification', 'referral', 'own-initiative'] }),
    r('allegation', 'What is alleged or was observed (kept apart from any finding)', 'longtext'),
    adm('processing', 'Processing activity concerned (data categories and purposes)', 'longtext'),
  ],
});

export const INDEPENDENT_OVERSIGHT_PROCEDURES: Ref[] = [REFERENCE_OMBUDSMAN_COMPLAINT, REFERENCE_HUMAN_RIGHTS_COMPLAINT, REFERENCE_PROTECTED_DISCLOSURE, REFERENCE_AUDIT_ENGAGEMENT, REFERENCE_RIGHTS_REQUEST, REFERENCE_PRIVACY_INVESTIGATION];

export function installOversightProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of INDEPENDENT_OVERSIGHT_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const d = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(p.key);
  }
  return { drafted, present };
}

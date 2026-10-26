// Security governance and resilience on the workflow foundation (plan step
// I12; catalogue Part 11 §2.3, §2.4, §4, §5, §6). Reference procedures, drafts
// the nation adapts and a second official approves, kept by the institution
// the nation names for each slot (never assumed; all ship empty):
//
//   cyberAuthority
//     cyber.incident          a national cyber incident: report, triage with reasons and severity on the nation's
//                             scale, escalation and coordination with restricted recipients, containment, evidence
//                             preservation, recovery, post-incident review, closure (SEC-CYB-001, 002, 008, 009, 010, 014)
//     cyber.vulnerability     a vulnerability reported in confidence: triage, coordination with restricted recipients,
//                             remediation plan and attestation, a disclosure date the officials set (SEC-CYB-003, 004, 017)
//     cyber.supplier          a supplier security assessment and its decision (SEC-CYB-011)
//     cyber.exception         a time-limited security exception, approved by two officials, renewed or revoked
//                             (SEC-CYB-012, 013)
//     cyber.exercise          a national cyber exercise: plan approved by two officials, held, findings with owners
//                             (SEC-CYB-015, 016)
//   criticalInfrastructure
//     ci.designation          designation of critical infrastructure under the nation's law and approved criteria,
//                             citing the law, by two officials (SEC-INF-001)
//     ci.dependency           an essential-service dependency record with its provenance, confirmed by a second
//                             official (SEC-INF-002)
//     ci.risk                 a risk assessment that keeps hazard, vulnerability, incident, estimate, consequence,
//                             residual risk and corrective action apart; risk acceptance only by two named officials
//                             (SEC-INF-003, 014, 015)
//     ci.resilience-plan      a resilience plan approved by two officials; continuity exercises authorised and
//                             evaluated (SEC-INF-004, 005, 006)
//     ci.incident             an incident affecting designated infrastructure, notified by its operator or found by the
//                             authority: triage with reasons, coordination with restricted recipients, containment,
//                             recovery with verification, closure by two officials (SEC-INF-007, CIP-INC-010). No
//                             attribution and no cause of a person is recorded; a cyber incident goes through cyber.incident
//     ci.disruption           an essential service disruption: reported, updated, restoration recorded, closed by two
//                             officials (SEC-INF-009)
//     ci.exception            a time-limited resilience exception, approved and renewed by two officials until a date they
//                             choose, refused or revoked (SEC-INF-013)
//     ci.release              review of a release of critical infrastructure information to a named institution: what is
//                             released and what withheld, decided by two officials; the records are shared with it as a
//                             restricted recipient (recipient view only); the public learns only through approved
//                             indicators, never a release (SEC-INF-016)
//   securityAccreditation
//     security.clearance      a security clearance decision as metadata: level, scope, validity, by two officials of
//                             the competent authority; renewal, variation, suspension, withdrawal (SEC-INT-007, 008).
//                             Vetting itself stays with the competent authority: only its reference is recorded.
//
// What they share:
//   - Metadata only: every record's marking is checked against the
//     installation's accreditation when the case registers it
//     (markingRefusal()); anything above stays in an accredited system, with
//     only its reference recorded.
//   - No field records a source, a collection method, a target, surveillance,
//     an attacker or an attribution, and nothing computes a score about a
//     person. Severity is the officials' choice on the nation's scale, with
//     reasons; a risk estimate is the assessor's, under a named methodology
//     version; no step is decided by a model. AI never attributes an attack
//     and never accepts a risk: acceptance is a decision step of two named
//     officials.
//   - Restricted cases (assigned officials and those who can sign); the
//     records are read through lib/security/access.ts (need to know, purpose,
//     action, clearance for a marked record), every read logged.
//   - Every decision is classified under a proposed, unapproved authority
//     mapping (SECURITY_PERMITS, lib/permits/decisions.ts): refused in
//     production until the nation approves its own.
//   - No day count, severity scale, threshold or period ships.

import { registerEffect, registeredEffects, sampleMark, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { getOrganisation } from '@/lib/organisations/register';
import { getFacility } from '@/lib/data/facilities';
import { markingRefusal, rankOf } from './classification';
import { openSecurityRecord, updateSecurityRecord, shareSecurityRecord, securityRecordOfCase, securityRecordRaw, type SecurityKind, type TermValue, type Actor } from './register';
import type { Case, CasePackage, FieldSpec, ActionSpec } from '@/lib/casework/types';
import type { AuthorityKey } from '@/lib/nation/deployment';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const lines = (v: unknown): string[] => (Array.isArray(v) ? v.map(str) : str(v).split(/[\n;,]/)).map(x => x.trim()).filter(Boolean);
const reasonOf = (c: Case, fallback: string) => c.history.at(-1)?.reason ?? fallback;
const day = (now: Date) => now.toISOString().slice(0, 10);

/** The permit type whose approved mapping governs each family's decisions (lib/permits/decisions.ts reads it). */
export const SECURITY_PERMITS: Record<string, string> = {
  'cyber.incident': 'cyber-incident-closure',
  'cyber.vulnerability': 'vulnerability-disclosure',
  'cyber.supplier': 'supplier-security-decision',
  'cyber.exception': 'security-exception',
  'cyber.exercise': 'cyber-exercise-approval',
  'ci.designation': 'critical-infrastructure-designation',
  'ci.risk': 'infrastructure-risk-acceptance',
  'ci.resilience-plan': 'resilience-plan-approval',
  'security.clearance': 'security-clearance',
  // leftovers (plan I12): infrastructure incidents and disruptions, resilience exceptions, information release.
  'ci.incident': 'infrastructure-incident-closure',
  'ci.disruption': 'essential-service-disruption-closure',
  'ci.exception': 'resilience-exception',
  'ci.release': 'infrastructure-information-release',
};

/** Each procedure: its kind of record, its slot, and the status each step leaves the record in. */
const FAMILY: Record<string, { kind: SecurityKind; slot: AuthorityKey; status: Record<string, string> }> = {
  'cyber.incident': { kind: 'incident', slot: 'cyberAuthority', status: { register: 'reported', triage: 'triaged', 'not-incident': 'not-an-incident', escalate: 'coordinating', 'approve-containment': 'contained', 'preserve-evidence': 'evidence-preserved', recover: 'recovered', review: 'reviewed', close: 'closed' } },
  'cyber.vulnerability': { kind: 'vulnerability', slot: 'cyberAuthority', status: { register: 'received', triage: 'triaged', reject: 'not-accepted', coordinate: 'coordinating', 'plan-remediation': 'remediating', attest: 'remediation-attested', 'set-disclosure': 'disclosure-set', disclose: 'disclosed', close: 'closed' } },
  'cyber.supplier': { kind: 'supplier', slot: 'cyberAuthority', status: { register: 'received', 'record-findings': 'assessed', decide: 'decided' } },
  'cyber.exception': { kind: 'exception', slot: 'cyberAuthority', status: { register: 'requested', approve: 'approved', refuse: 'refused', renew: 'renewed', revoke: 'revoked' } },
  'cyber.exercise': { kind: 'exercise', slot: 'cyberAuthority', status: { register: 'planned', approve: 'approved', 'record-held': 'held', 'record-findings': 'findings-recorded', close: 'closed', withdraw: 'withdrawn' } },
  'ci.designation': { kind: 'designation', slot: 'criticalInfrastructure', status: { register: 'proposed', designate: 'designated', decline: 'not-designated', revoke: 'revoked' } },
  'ci.dependency': { kind: 'dependency', slot: 'criticalInfrastructure', status: { register: 'recorded', confirm: 'confirmed', update: 'under-review', withdraw: 'withdrawn' } },
  'ci.risk': { kind: 'risk', slot: 'criticalInfrastructure', status: { register: 'assessed', treat: 'in-treatment', 'accept-risk': 'accepted', review: 'under-review', close: 'closed' } },
  'ci.resilience-plan': { kind: 'plan', slot: 'criticalInfrastructure', status: { register: 'drafted', approve: 'approved', 'authorise-exercise': 'exercise-authorised', 'evaluate-exercise': 'exercise-evaluated', revise: 'under-revision', close: 'closed' } },
  'security.clearance': { kind: 'clearance', slot: 'securityAccreditation', status: { register: 'applied', 'record-assessment': 'assessed', grant: 'granted', refuse: 'refused', renew: 'renewed', vary: 'varied', suspend: 'suspended', reinstate: 'granted', withdraw: 'withdrawn' } },
  'ci.incident': { kind: 'infra-incident', slot: 'criticalInfrastructure', status: { register: 'notified', triage: 'triaged', escalate: 'coordinating', 'record-containment': 'contained', recover: 'recovered', close: 'closed', 'not-incident': 'not-an-incident' } },
  'ci.disruption': { kind: 'disruption', slot: 'criticalInfrastructure', status: { register: 'reported', update: 'ongoing', restore: 'restored', close: 'closed' } },
  'ci.exception': { kind: 'resilience-exception', slot: 'criticalInfrastructure', status: { register: 'requested', approve: 'approved', refuse: 'refused', renew: 'renewed', revoke: 'revoked' } },
  'ci.release': { kind: 'release', slot: 'criticalInfrastructure', status: { register: 'requested', release: 'released', refuse: 'refused' } },
};
/** Fields that are the record's envelope, not its terms. */
const ENVELOPE = ['summary', 'marking', 'caveats', 'recipients'];

const familyOf = (c: Case) => FAMILY[c.package.key];
/** The body that keeps this procedure must be the case's institution: the one named for its slot. */
function keeper(c: Case): { kind: SecurityKind; slot: AuthorityKey } | { error: string } {
  const f = familyOf(c);
  if (!f) return { error: `${c.package.key} is not a security procedure` };
  return ownerInstitution(f.slot, authorityFor) === c.owner ? f : { error: 'These cases are kept by the body the nation names for this area under Who is responsible' };
}
const actorOf = (ctx: EffectContext): Actor => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name, ...(ctx.actor.scope?.institution ?? ctx.actor.institution ? { institution: ctx.actor.scope?.institution ?? ctx.actor.institution } : {}) });
/** The record's terms from the case's fields: every field of the procedure but the envelope. */
function termsOf(ctx: EffectContext): Record<string, TermValue> {
  const out: Record<string, TermValue> = {};
  for (const f of ctx.package.fields) {
    if (ENVELOPE.includes(f.key)) continue;
    const v = ctx.case.fields[f.key];
    if (typeof v === 'boolean') out[f.key] = v;
    else if (Array.isArray(v)) out[f.key] = v.map(String).slice(0, 100);
    else if (v !== undefined && v !== null && String(v).trim()) out[f.key] = String(v).trim().slice(0, 8000);
  }
  return out;
}

// ── Effects ──────────────────────────────────────────────────────────────────

/** Register: the marking checked against the accreditation, the references checked, the record opened (after the step). */
registerEffect('security.open', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const marking = str(c.fields.marking).toLowerCase();
  const caveats = lines(c.fields.caveats);
  const why = markingRefusal(marking, caveats);
  if (why) return { error: why };
  const summary = str(c.fields.summary);
  if (!summary) return { error: 'Give a summary that carries no exploitable detail (what a recipient and a list may see)' };
  { const n = str(c.fields.supplier); if (n && !getOrganisation(n)) return { error: `${n} is not in the organisations register (the supplier is an organisation of that register, by its number)` }; }
  // An operator is an organisation of the register or, for a service the state runs itself, a registered institution.
  { const n = str(c.fields.operator); if (n && !getOrganisation(n) && !getMinistry(n)) return { error: `${n} is neither in the organisations register nor a registered institution` }; }
  for (const key of ['requestingInstitution', 'sponsoringInstitution', 'reportingInstitution']) { const n = str(c.fields[key]); if (n && !getMinistry(n)) return { error: `${n} is not a registered institution` }; }
  const facility = str(c.fields.facility);
  if (facility && !getFacility(facility)) return { error: `${facility} is not a site of the national facility register` };
  // leftovers (plan I12): infrastructure incidents, disruptions and resilience exceptions concern a designation the keeper made.
  if (['infra-incident', 'disruption', 'resilience-exception'].includes(k.kind)) {
    const n = str(c.fields.designation);
    const d = n ? securityRecordRaw(n) : undefined;
    if (!d || d.kind !== 'designation' || d.owner !== c.owner) return { error: `${n || 'The designation'} is not a critical infrastructure designation of this authority (its record number, CID-…)` };
  }
  if (k.kind === 'clearance') {
    const level = str(c.fields.levelRequested).toLowerCase();
    if (rankOf(level) <= 0) return { error: 'The level asked for is a level of the nation\'s adopted classification scheme (none is adopted, or this is not one of its levels)' };
    if (!str(c.fields.subjectOfficial)) return { error: 'Name the official the clearance is for (their account id)' };
  }
  const subject = str(c.fields.supplier) || str(c.fields.operator) || str(c.fields.subjectOfficial) || undefined;
  return {
    facts: { registered: true },
    after: (_d, done) => { openSecurityRecord({ kind: k.kind, owner: c.owner, case: { id: c.id, ref: c.ref }, summary, marking, caveats, status: FAMILY[c.package.key]!.status.register!, terms: termsOf({ ...ctx, case: done }), ...(subject ? { subject } : {}), ...(done.assignee ? { assignee: done.assignee } : {}), by: actorOf(ctx), reason: reasonOf(done, 'Registered'), sample: !!sampleMark(c).sample }, now); },
  };
});

/** Any later step: the record's status and terms as they now stand, a new version; a decision's sealed id attached. */
registerEffect('security.step', (ctx: EffectContext) => {
  const { case: c, action, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const rec = securityRecordOfCase(c.id);
  if (!rec) return { error: 'The record is opened by the register step first' };
  const status = FAMILY[c.package.key]!.status[action.key] ?? action.key;
  const validity = VALIDITY_STEPS.includes(`${c.package.key}:${action.key}`);
  return {
    facts: { record: rec.number, status },
    after: (d, done) => { updateSecurityRecord(rec.number, { step: action.key, status, terms: termsOf({ ...ctx, case: done }), reason: reasonOf(done, action.label), ...(validity ? { validUntil: str(done.fields.validUntil) } : {}), ...(d ? { decision: d.id } : {}) }, actorOf(ctx), now); },
  };
});

/** Steps whose decision sets the record's validity: an exception's expiry, a clearance's end, a risk acceptance's review. */
const VALIDITY_STEPS = ['cyber.exception:approve', 'cyber.exception:renew', 'security.clearance:grant', 'security.clearance:renew', 'ci.risk:accept-risk', 'ci.exception:approve', 'ci.exception:renew'];
/** A date the deciding officials choose, in the future; never a default period. */
registerEffect('security.validity', ({ case: c, now }: EffectContext) => {
  const until = str(c.fields.validUntil);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return { error: 'Give the date it ends (the deciding officials choose it; no period ships)' };
  if (until <= day(now)) return { error: 'The end date is after today' };
  return { facts: { validUntil: until } };
});

/** A clearance's level is a level of the adopted scheme (the level label itself is not classified content). */
registerEffect('security.clearance-level', ({ case: c }: EffectContext) => {
  const level = str(c.fields.levelGranted).toLowerCase();
  if (rankOf(level) <= 0) return { error: 'The level granted is a level of the nation\'s adopted classification scheme' };
  return { facts: { level } };
});

/** Restricted recipients: registered institutions other than the keeper, recorded with the step's reasons. */
registerEffect('security.share', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const rec = securityRecordOfCase(c.id);
  if (!rec) return { error: 'The record is opened by the register step first' };
  const ids = lines(c.fields.recipients);
  if (!ids.length) return { error: 'Name the recipient institutions (their ids in the institution register), one per line' };
  for (const id of ids) { if (!getMinistry(id)) return { error: `${id} is not a registered institution` }; if (id === c.owner) return { error: 'The keeping institution is not its own recipient' }; }
  return { facts: { recipients: ids.length }, after: (_d, done) => { shareSecurityRecord(rec.number, ids, reasonOf(done, 'Shared'), actorOf(ctx), now); } };
});

/** The disclosure date and the public summary the officials set (the summary carries no exploitable detail). */
registerEffect('security.set-disclosure', ({ case: c }: EffectContext) => {
  const date = str(c.fields.disclosureDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Give the disclosure date the officials set' };
  if (!str(c.fields.publicSummary)) return { error: 'Write the public summary (no exploitable detail)' };
  return { facts: { disclosureDate: date } };
});
/** Published only once the disclosure date has come; the public view shows only the public summary. */
registerEffect('security.disclose', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const rec = securityRecordOfCase(c.id);
  if (!rec) return { error: 'The record is opened by the register step first' };
  const date = str(c.fields.disclosureDate), summary = str(c.fields.publicSummary);
  if (!date || !summary) return { error: 'Set the disclosure date and the public summary first' };
  if (date > day(now)) return { error: `The disclosure date (${date}) has not come` };
  return { facts: { disclosed: date }, after: (d, done) => { updateSecurityRecord(rec.number, { step: 'publish', status: 'disclosed', reason: reasonOf(done, 'Disclosed'), disclosure: { date, publicSummary: summary, published: now.toISOString() }, ...(d ? { decision: d.id } : {}) }, actorOf(ctx), now); } };
});

/**
 * A release of critical infrastructure information (SEC-INF-016): to a named
 * registered institution only, of records this authority keeps, each shared
 * with it as a restricted recipient (it sees the recipient view only). The
 * public learns about critical infrastructure only through approved
 * indicators (lib/indicators/), never through a release.
 */
registerEffect('security.release', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if ('error' in k) return k;
  const recipient = str(c.fields.recipient);
  if (!recipient) return { error: 'A release goes to a named institution (its id in the institution register): the public learns about critical infrastructure only through approved indicators' };
  if (!getMinistry(recipient)) return { error: `${recipient} is not a registered institution` };
  if (recipient === c.owner) return { error: 'The keeping institution is not its own recipient' };
  if (!str(c.fields.withheld)) return { error: 'Say what is withheld (exploitable detail, dependencies, recovery procedures)' };
  const numbers = lines(c.fields.records);
  if (!numbers.length) return { error: 'Name the records released (their numbers), one per line' };
  for (const n of numbers) { const r = securityRecordRaw(n); if (!r || r.owner !== c.owner) return { error: `${n} is not a security record this authority keeps` }; }
  return { facts: { released: numbers.length, recipient }, after: (_d, done) => { for (const n of numbers) shareSecurityRecord(n, [recipient], reasonOf(done, 'Released'), actorOf(ctx), now); } };
});

// ── Fields ───────────────────────────────────────────────────────────────────

const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const configured = (key: string, label: string, list: string, what: string): FieldSpec => ({ key, label, type: 'enum', valuesSource: { kind: 'configured', list }, personalDataClass: 'restricted', countryDecision: `The nation's ${what}; none ship` });
/** Every security record's envelope: its summary, its marking and caveats (checked against the accreditation). */
const ENVELOPE_FIELDS: FieldSpec[] = [
  adm('summary', 'Summary that carries no exploitable detail (what a recipient and a list see)', 'longtext'),
  adm('marking', 'Security marking (a level of the nation\'s scheme; leave empty when not classified). Above the installation\'s accreditation it is refused'),
  adm('caveats', 'Handling caveats of the scheme, one per line', 'longtext'),
];
const RECIPIENTS: FieldSpec = adm('recipients', 'Restricted recipients (institution ids, one per line): they see the recipient view only', 'longtext');
const VALID_UNTIL: FieldSpec = adm('validUntil', 'Ends on (the deciding officials choose the date)', 'date');

const base = { reference: true as const, citations: [], notifications: [], deadlines: [], sensitivity: 'restricted' as const };
const open = (fields: string[]): ActionSpec => ({ key: 'register', label: 'Register (the marking checked against the installation\'s accreditation)', from: ['received'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['summary', ...fields] }, effects: ['security.open'] });
const tests = (steps: Ref['tests'][number]['steps']): Ref['tests'] => [{ name: 'worked to its end', steps }];
const x = (keys: string[]) => Object.fromEntries(keys.map(k => [k, 'x']));

export const REFERENCE_CYBER_INCIDENT: Ref = {
  ...base, owner: 'cyberAuthority', key: 'cyber.incident', version: 1, title: 'National cyber incident', refPrefix: 'CYI', retention: 'security-incident',
  fields: [
    ...ENVELOPE_FIELDS,
    adm('reportingInstitution', 'Reporting institution, where one reports (its id in the institution register)'),
    adm('reportingOrganisation', 'Reporting organisation (its number in the organisations register, or its name where unregistered)'),
    r('affectedServices', 'Affected services and systems, one per line', 'longtext'),
    r('discoveredAt', 'When it was discovered', 'timestamp'),
    r('occurredAt', 'When it happened, if known', 'timestamp'),
    r('initialImpact', 'Initial impact on availability, integrity, confidentiality and the service', 'longtext'),
    r('evidenceSource', 'Where the first evidence comes from (logs, reports): their reference, never their content', 'longtext'),
    configured('incidentCategory', 'Category in the nation\'s incident taxonomy', 'security.country.cyber_incident_categories', 'incident taxonomy (CFG-SEC-009)'),
    configured('severity', 'Severity on the nation\'s scale (the officials\' choice, with reasons; nothing computes it)', 'security.country.cyber_severity_scale', 'severity scale and its methodology (CFG-SEC-009)'),
    r('notificationsDue', 'Notifications the nation\'s law requires (recipient, legal basis, deadline as the law sets it)', 'longtext'),
    RECIPIENTS,
    r('coordinationActions', 'Coordination asked of each recipient', 'longtext'),
    r('notifications', 'Notifications made (recipient, when, delivery)', 'longtext'),
    r('containmentActions', 'Containment actions, their operational risks and who approved them', 'longtext'),
    r('evidenceManifest', 'Evidence preserved: reference, how acquired, integrity hash and custody (never the evidence itself)', 'longtext'),
    r('serviceStatus', 'Service status after recovery', 'longtext'),
    r('recoveryVerification', 'How integrity was verified before the service was declared operational', 'longtext'),
    r('rootCause', 'Root-cause findings (facts, kept apart from indicators and assessments)', 'longtext'),
    r('correctiveActions', 'Corrective actions, owners and how closure is verified', 'longtext'),
    r('residualRisk', 'Residual risks at closure', 'longtext'),
  ],
  documents: [
    { class: 'incident-report', label: 'The report as received', required: true },
    { class: 'review-report', label: 'Post-incident review', required: false },
  ],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'assessment', label: 'Triage' }, { key: 'coordinating', label: 'Coordination and containment' },
    { key: 'contained', label: 'Contained' }, { key: 'recovered', label: 'Recovered and verified' }, { key: 'reviewed', label: 'Reviewed' },
    { key: 'closed', label: 'Closed with reasons', terminal: true }, { key: 'not-incident', label: 'Not an incident, with reasons', terminal: true },
  ],
  actions: [
    { ...open(['affectedServices', 'discoveredAt']), requires: { fields: ['summary', 'affectedServices', 'discoveredAt'], documents: ['incident-report'] } },
    { key: 'triage', label: 'Triage: category and severity on the nation\'s scale, with reasons', from: ['assessment'], to: 'coordinating', needs: { role: 'officer', assigned: true }, requires: { fields: ['incidentCategory', 'severity'], reasons: true }, effects: ['security.step'] },
    { key: 'not-incident', label: 'Not an incident, with reasons', from: ['assessment'], to: 'not-incident', decision: 'not-incident', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'escalate', label: 'Escalate and coordinate with restricted recipients (SEC-CYB-002)', from: ['coordinating', 'contained'], to: 'coordinating', needs: { role: 'signatory' }, requires: { fields: ['recipients', 'coordinationActions'], reasons: true }, effects: ['security.share', 'security.step'] },
    { key: 'approve-containment', label: 'Approve and record containment (SEC-CYB-008): never on a reporter\'s word alone', from: ['coordinating'], to: 'contained', needs: { role: 'signatory' }, requires: { fields: ['containmentActions'], reasons: true }, effects: ['security.step'] },
    { key: 'preserve-evidence', label: 'Record evidence preserved and its custody (SEC-CYB-010)', from: ['coordinating', 'contained'], to: 'contained', needs: { role: 'officer', assigned: true }, requires: { fields: ['evidenceManifest'], reasons: true }, effects: ['security.step'] },
    { key: 'recover', label: 'Record recovery and how integrity was verified (SEC-CYB-009)', from: ['contained'], to: 'recovered', needs: { role: 'officer' }, requires: { fields: ['serviceStatus', 'recoveryVerification'], reasons: true }, effects: ['security.step'] },
    { key: 'review', label: 'Post-incident review: root cause and corrective actions (SEC-CYB-014)', from: ['recovered'], to: 'reviewed', needs: { role: 'officer' }, requires: { fields: ['rootCause', 'correctiveActions'], reasons: true }, effects: ['security.step'] },
    { key: 'close', label: 'Close: residual risks recorded and closure authorised', from: ['reviewed'], to: 'closed', decision: 'close-incident', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['residualRisk'], reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', expect: 'refused' },
    { action: 'register', fields: x(['summary', 'affectedServices', 'discoveredAt']), documents: ['incident-report'], expect: 'assessment' },
    { action: 'triage', fields: x(['incidentCategory', 'severity']), expect: 'coordinating' },
    { action: 'escalate', fields: x(['recipients', 'coordinationActions']), expect: 'coordinating' },
    { action: 'approve-containment', fields: x(['containmentActions']), expect: 'contained' },
    { action: 'preserve-evidence', fields: x(['evidenceManifest']), expect: 'contained' },
    { action: 'recover', fields: x(['serviceStatus', 'recoveryVerification']), expect: 'recovered' },
    { action: 'review', fields: x(['rootCause', 'correctiveActions']), expect: 'reviewed' },
    { action: 'close', fields: x(['residualRisk']), expect: 'closed' },
  ]),
};

export const REFERENCE_VULNERABILITY: Ref = {
  ...base, owner: 'cyberAuthority', key: 'cyber.vulnerability', version: 1, title: 'Vulnerability coordination', refPrefix: 'VUL', retention: 'security-vulnerability',
  fields: [
    ...ENVELOPE_FIELDS,
    adm('reportingOrganisation', 'Who reported it (an organisation\'s number, or a name; a person reporting in confidence may stay anonymous)'),
    r('affectedProduct', 'Affected product, service or system and versions', 'longtext'),
    r('technicalDetail', 'Technical detail (restricted: never in a list, a recipient view or a public page)', 'longtext'),
    configured('severity', 'Severity on the nation\'s scale (the officials\' choice, with reasons; nothing computes it)', 'security.country.cyber_severity_scale', 'severity scale and its methodology (CFG-SEC-010)'),
    adm('advisoryReference', 'Reference of a published advisory it relates to, if any (e.g. a CSAF or CVE identifier)'),
    RECIPIENTS,
    r('remediationActions', 'Remediation actions and who owns each (SEC-CYB-004)', 'longtext'),
    r('remediationDue', 'Remediation due by (the date agreed with the supplier)', 'date'),
    r('attestation', 'Remediation attestation: what was verified and how (SEC-CYB-017)', 'longtext'),
    adm('disclosureDate', 'Disclosure date the officials set', 'date'),
    adm('publicSummary', 'Public summary (published on the disclosure date; no exploitable detail)', 'longtext'),
  ],
  documents: [{ class: 'vulnerability-report', label: 'The report as received (restricted)', required: true }],
  stages: [
    { key: 'received', label: 'Received in confidence' }, { key: 'assessment', label: 'Triage' }, { key: 'coordinating', label: 'Coordination with restricted recipients' },
    { key: 'remediating', label: 'Remediation' }, { key: 'disclosed', label: 'Disclosed', terminal: true }, { key: 'closed', label: 'Closed without public disclosure, with reasons', terminal: true },
    { key: 'not-accepted', label: 'Not accepted, with reasons', terminal: true },
  ],
  actions: [
    { ...open(['affectedProduct']), requires: { fields: ['summary', 'affectedProduct'], documents: ['vulnerability-report'] } },
    { key: 'triage', label: 'Triage: severity on the nation\'s scale, with reasons', from: ['assessment'], to: 'coordinating', needs: { role: 'officer', assigned: true }, requires: { fields: ['severity'], reasons: true }, effects: ['security.step'] },
    { key: 'reject', label: 'Not accepted, with reasons', from: ['assessment'], to: 'not-accepted', decision: 'not-accepted', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'coordinate', label: 'Coordinate with restricted recipients (the supplier, affected institutions)', from: ['coordinating', 'remediating'], to: 'coordinating', needs: { role: 'signatory' }, requires: { fields: ['recipients'], reasons: true }, effects: ['security.share', 'security.step'] },
    { key: 'plan-remediation', label: 'Record the remediation plan (SEC-CYB-004)', from: ['coordinating'], to: 'remediating', needs: { role: 'officer' }, requires: { fields: ['remediationActions', 'remediationDue'], reasons: true }, effects: ['security.step'] },
    { key: 'attest', label: 'Record the remediation attestation (SEC-CYB-017)', from: ['remediating'], to: 'remediating', needs: { role: 'officer' }, requires: { fields: ['attestation'], reasons: true }, effects: ['security.step'] },
    { key: 'set-disclosure', label: 'Set the disclosure date and the public summary', from: ['remediating'], to: 'remediating', needs: { role: 'signatory' }, requires: { fields: ['disclosureDate', 'publicSummary'], reasons: true }, effects: ['security.set-disclosure', 'security.step'] },
    { key: 'disclose', label: 'Publish the public summary (on or after the disclosure date)', from: ['remediating'], to: 'disclosed', decision: 'disclose', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['disclosureDate', 'publicSummary'], reasons: true }, effects: ['security.disclose'] },
    { key: 'close', label: 'Close without public disclosure, with reasons', from: ['remediating'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'affectedProduct']), documents: ['vulnerability-report'], expect: 'assessment' },
    { action: 'triage', fields: x(['severity']), expect: 'coordinating' },
    { action: 'coordinate', fields: x(['recipients']), expect: 'coordinating' },
    { action: 'plan-remediation', fields: x(['remediationActions', 'remediationDue']), expect: 'remediating' },
    { action: 'attest', fields: x(['attestation']), expect: 'remediating' },
    { action: 'set-disclosure', fields: x(['disclosureDate', 'publicSummary']), expect: 'remediating' },
    { action: 'disclose', expect: 'disclosed' },
  ]),
};

export const REFERENCE_SUPPLIER: Ref = {
  ...base, owner: 'cyberAuthority', key: 'cyber.supplier', version: 1, title: 'Supplier security assessment', refPrefix: 'SUP', retention: 'security-supplier',
  fields: [
    ...ENVELOPE_FIELDS,
    adm('supplier', 'Supplier (its number in the organisations register)'),
    r('assessmentScope', 'Scope: the products, services and dependencies assessed', 'longtext'),
    r('findings', 'Findings, each with its evidence reference', 'longtext'),
    adm('supplierOutcome', 'Outcome', 'choice', { options: ['acceptable', 'acceptable-with-conditions', 'remediation-required', 'not-acceptable'] }),
    r('correctiveActions', 'Corrective actions and their deadlines as agreed', 'longtext'),
  ],
  documents: [{ class: 'assessment-report', label: 'Assessment report', required: true }],
  stages: [{ key: 'received', label: 'Received' }, { key: 'assessment', label: 'Assessment' }, { key: 'decided', label: 'Decided', terminal: true }],
  actions: [
    open(['supplier', 'assessmentScope']),
    { key: 'record-findings', label: 'Record findings with their evidence', from: ['assessment'], to: 'assessment', needs: { role: 'officer', assigned: true }, requires: { fields: ['findings'], documents: ['assessment-report'], reasons: true }, effects: ['security.step'] },
    { key: 'decide', label: 'Decide the outcome and corrective actions', from: ['assessment'], to: 'decided', decision: 'supplier-decision', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['findings', 'supplierOutcome'], reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'supplier', 'assessmentScope']), expect: 'assessment' },
    { action: 'record-findings', fields: x(['findings']), documents: ['assessment-report'], expect: 'assessment' },
    { action: 'decide', fields: { supplierOutcome: 'acceptable' }, expect: 'decided' },
  ]),
};

export const REFERENCE_EXCEPTION: Ref = {
  ...base, owner: 'cyberAuthority', key: 'cyber.exception', version: 1, title: 'Security exception', refPrefix: 'SEX', retention: 'security-exception',
  fields: [
    ...ENVELOPE_FIELDS,
    adm('requestingInstitution', 'Institution asking for the exception (its id in the institution register)'),
    r('control', 'The security control excepted', 'longtext'),
    r('justification', 'Why the control cannot be met now', 'longtext'),
    r('compensatingControls', 'Compensating controls', 'longtext'),
    adm('requestedUntil', 'Asked for until', 'date'),
    VALID_UNTIL,
  ],
  documents: [{ class: 'exception-request', label: 'The request', required: true }],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'assessment', label: 'Review' }, { key: 'in-force', label: 'In force until its date' },
    { key: 'refused', label: 'Refused, with reasons', terminal: true }, { key: 'ended', label: 'Revoked, with reasons', terminal: true },
  ],
  actions: [
    { ...open(['requestingInstitution', 'control', 'justification', 'compensatingControls', 'requestedUntil']), requires: { fields: ['summary', 'requestingInstitution', 'control', 'justification', 'compensatingControls', 'requestedUntil'], documents: ['exception-request'] } },
    { key: 'approve', label: 'Approve until a date (two officials)', from: ['assessment'], to: 'in-force', decision: 'approve-exception', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['validUntil'], reasons: true }, effects: ['security.validity', 'security.step'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['assessment'], to: 'refused', decision: 'refuse-exception', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'renew', label: 'Renew until a new date (SEC-CYB-013; two officials)', from: ['in-force'], to: 'in-force', decision: 'renew', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['validUntil'], reasons: true }, effects: ['security.validity', 'security.step'] },
    { key: 'revoke', label: 'Revoke (SEC-CYB-013; two officials)', from: ['in-force'], to: 'ended', decision: 'revoke', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'requestingInstitution', 'control', 'justification', 'compensatingControls', 'requestedUntil']), documents: ['exception-request'], expect: 'assessment' },
    { action: 'approve', fields: x(['validUntil']), expect: 'in-force' },
    { action: 'renew', expect: 'in-force' },
    { action: 'revoke', expect: 'ended' },
  ]),
};

export const REFERENCE_EXERCISE: Ref = {
  ...base, owner: 'cyberAuthority', key: 'cyber.exercise', version: 1, title: 'National cyber exercise', refPrefix: 'CEX', retention: 'security-exercise',
  fields: [
    ...ENVELOPE_FIELDS,
    r('exerciseScope', 'Scope, objectives and scenario (no live production systems unless the plan names the safeguards)', 'longtext'),
    adm('participants', 'Participating institutions and organisations, one per line', 'longtext'),
    r('safeguards', 'Safeguards: what may not be touched, who can stop the exercise', 'longtext'),
    adm('plannedFor', 'Planned for', 'dateRange'),
    adm('heldOn', 'Held on', 'date'),
    r('findings', 'Findings and lessons (SEC-CYB-016)', 'longtext'),
    adm('findingsOwners', 'Owner and completion tracking of each finding', 'longtext'),
  ],
  documents: [{ class: 'exercise-plan', label: 'Exercise plan', required: true }],
  stages: [
    { key: 'received', label: 'Planned' }, { key: 'assessment', label: 'Plan under review' }, { key: 'approved', label: 'Approved' }, { key: 'held', label: 'Held' },
    { key: 'closed', label: 'Closed', terminal: true }, { key: 'withdrawn', label: 'Withdrawn, with reasons', terminal: true },
  ],
  actions: [
    { ...open(['exerciseScope', 'participants', 'safeguards']), requires: { fields: ['summary', 'exerciseScope', 'participants', 'safeguards'], documents: ['exercise-plan'] } },
    { key: 'approve', label: 'Approve the plan, its scope and safeguards (two officials; SEC-CYB-015)', from: ['assessment'], to: 'approved', decision: 'approve-exercise', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'record-held', label: 'Record that it was held', from: ['approved'], to: 'held', needs: { role: 'officer' }, requires: { fields: ['heldOn'] }, effects: ['security.step'] },
    { key: 'record-findings', label: 'Record findings and their owners (SEC-CYB-016)', from: ['held'], to: 'held', needs: { role: 'officer' }, requires: { fields: ['findings', 'findingsOwners'], reasons: true }, effects: ['security.step'] },
    { key: 'close', label: 'Close once the findings are tracked', from: ['held'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'withdraw', label: 'Withdraw, with reasons', from: ['assessment', 'approved'], to: 'withdrawn', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'exerciseScope', 'participants', 'safeguards']), documents: ['exercise-plan'], expect: 'assessment' },
    { action: 'approve', expect: 'approved' },
    { action: 'record-held', fields: x(['heldOn']), expect: 'held' },
    { action: 'record-findings', fields: x(['findings', 'findingsOwners']), expect: 'held' },
    { action: 'close', expect: 'closed' },
  ]),
};

export const REFERENCE_DESIGNATION: Ref = {
  ...base, owner: 'criticalInfrastructure', key: 'ci.designation', version: 1, title: 'Critical infrastructure designation', refPrefix: 'CID', retention: 'critical-infrastructure',
  fields: [
    ...ENVELOPE_FIELDS,
    configured('sector', 'Sector', 'security.country.infrastructure_sectors', 'infrastructure sectors'),
    r('service', 'The essential service or asset', 'longtext'),
    adm('operator', 'Operator (its number in the organisations register, or the id of the public institution that runs it)'),
    adm('facility', 'Site, where one (its id in the national facility register; shown to others only generalised)'),
    adm('criteriaVersion', 'Designation criteria applied, and their version (CFG-SEC-011)'),
    r('assessment', 'Assessment against each criterion, with its evidence', 'longtext'),
  ],
  documents: [{ class: 'designation-assessment', label: 'Designation assessment', required: true }],
  stages: [
    { key: 'received', label: 'Proposed' }, { key: 'assessment', label: 'Assessment against the approved criteria' }, { key: 'designated', label: 'Designated' },
    { key: 'not-designated', label: 'Not designated, with reasons', terminal: true }, { key: 'revoked', label: 'Designation revoked', terminal: true },
  ],
  actions: [
    open(['sector', 'service', 'criteriaVersion']),
    { key: 'designate', label: 'Designate, citing the law and the criteria (two officials)', from: ['assessment'], to: 'designated', decision: 'designate', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['operator', 'assessment'], documents: ['designation-assessment'], reasons: true, citations: true }, effects: ['security.step'] },
    { key: 'decline', label: 'Do not designate, with reasons', from: ['assessment'], to: 'not-designated', decision: 'decline-designation', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'revoke', label: 'Revoke the designation, citing the law (two officials)', from: ['designated'], to: 'revoked', decision: 'revoke', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, citations: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'sector', 'service', 'criteriaVersion']), expect: 'assessment' },
    { action: 'designate', fields: x(['operator', 'assessment']), documents: ['designation-assessment'], expect: 'designated' },
    { action: 'revoke', expect: 'revoked' },
  ]),
};

export const REFERENCE_DEPENDENCY: Ref = {
  ...base, owner: 'criticalInfrastructure', key: 'ci.dependency', version: 1, title: 'Essential service dependency record', refPrefix: 'DEP', retention: 'critical-infrastructure',
  fields: [
    ...ENVELOPE_FIELDS,
    adm('designation', 'Designated service or asset (its record number)'),
    r('service', 'Service or asset identifier and its responsible operator', 'longtext'),
    r('upstream', 'Upstream dependencies, one per line', 'longtext'),
    r('downstream', 'Downstream services, one per line', 'longtext'),
    r('coverage', 'Geographic coverage at the authorised level of detail', 'longtext'),
    r('failureScenarios', 'Failure scenarios and potential consequences (restricted)', 'longtext'),
    r('safeguards', 'Existing safeguards and recovery options', 'longtext'),
    r('recoveryObjectives', 'Recovery objectives where formally established', 'longtext'),
    adm('provenance', 'Where the record comes from (the operator\'s return, an inspection, a study)'),
    adm('lastVerified', 'Last verified on', 'date'),
    adm('confidence', 'Confidence in the record', 'choice', { options: ['confirmed', 'reported', 'estimated'] }),
  ],
  documents: [],
  stages: [{ key: 'received', label: 'Recorded' }, { key: 'assessment', label: 'Under review' }, { key: 'confirmed', label: 'Confirmed' }, { key: 'withdrawn', label: 'Withdrawn, with reasons', terminal: true }],
  actions: [
    open(['service', 'upstream', 'downstream', 'provenance', 'lastVerified', 'confidence']),
    { key: 'confirm', label: 'Confirm the record (a second official)', from: ['assessment'], to: 'confirmed', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'update', label: 'Update after a change or verification', from: ['confirmed'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['lastVerified'], reasons: true }, effects: ['security.step'] },
    { key: 'withdraw', label: 'Withdraw, with reasons', from: ['assessment', 'confirmed'], to: 'withdrawn', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'service', 'upstream', 'downstream', 'provenance', 'lastVerified', 'confidence']), expect: 'assessment' },
    { action: 'confirm', expect: 'confirmed' },
    { action: 'update', expect: 'assessment' },
    { action: 'withdraw', expect: 'withdrawn' },
  ]),
};

export const REFERENCE_RISK: Ref = {
  ...base, owner: 'criticalInfrastructure', key: 'ci.risk', version: 1, title: 'Critical infrastructure risk assessment', refPrefix: 'RSK', retention: 'critical-infrastructure',
  fields: [
    ...ENVELOPE_FIELDS,
    adm('designation', 'Designated service or asset (its record number)'),
    adm('methodologyVersion', 'Assessment methodology and its version (an analytical aid, never a legal finding)'),
    // Kept apart, as catalogue Part 11 §6.2 asks.
    r('threatHypothesis', 'Hazard or threat hypothesis', 'longtext'),
    r('identifiedVulnerability', 'Identified vulnerability (restricted)', 'longtext'),
    r('observedIncident', 'Observed incident, if any (its record number)', 'longtext'),
    r('estimate', 'Estimated likelihood or impact, as the methodology states it', 'longtext'),
    r('verifiedConsequence', 'Verified consequence, if any', 'longtext'),
    r('correctiveActions', 'Corrective actions and their completion evidence', 'longtext'),
    r('residualRisk', 'Residual risk proposed for acceptance', 'longtext'),
    r('acceptanceScope', 'Scope and conditions of the acceptance', 'longtext'),
    VALID_UNTIL,
    r('reviewNote', 'Reassessment (SEC-INF-015)', 'longtext'),
  ],
  documents: [{ class: 'risk-assessment', label: 'Risk assessment', required: true }],
  stages: [
    { key: 'received', label: 'Drafted' }, { key: 'assessment', label: 'Assessed' }, { key: 'treatment', label: 'In treatment' }, { key: 'accepted', label: 'Residual risk accepted until review' },
    { key: 'closed', label: 'Closed', terminal: true },
  ],
  actions: [
    { ...open(['designation', 'methodologyVersion', 'threatHypothesis', 'estimate']), requires: { fields: ['summary', 'designation', 'methodologyVersion', 'threatHypothesis', 'estimate'], documents: ['risk-assessment'] } },
    { key: 'treat', label: 'Record the corrective actions', from: ['assessment', 'accepted'], to: 'treatment', needs: { role: 'officer' }, requires: { fields: ['correctiveActions'], reasons: true }, effects: ['security.step'] },
    { key: 'accept-risk', label: 'Accept the residual risk, scoped and until a review date (two named officials; never automatic; SEC-INF-014)', from: ['assessment', 'treatment'], to: 'accepted', decision: 'accept-risk', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['residualRisk', 'acceptanceScope', 'validUntil'], reasons: true }, effects: ['security.validity', 'security.step'] },
    { key: 'review', label: 'Reassess (SEC-INF-015)', from: ['accepted', 'treatment'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['reviewNote'], reasons: true }, effects: ['security.step'] },
    { key: 'close', label: 'Close, with reasons', from: ['treatment', 'accepted'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'designation', 'methodologyVersion', 'threatHypothesis', 'estimate']), documents: ['risk-assessment'], expect: 'assessment' },
    { action: 'accept-risk', fields: x(['residualRisk', 'acceptanceScope', 'validUntil']), expect: 'accepted' },
    { action: 'review', fields: x(['reviewNote']), expect: 'assessment' },
    { action: 'treat', fields: x(['correctiveActions']), expect: 'treatment' },
    { action: 'close', expect: 'closed' },
  ]),
};

export const REFERENCE_RESILIENCE_PLAN: Ref = {
  ...base, owner: 'criticalInfrastructure', key: 'ci.resilience-plan', version: 1, title: 'Infrastructure resilience plan', refPrefix: 'RPL', retention: 'critical-infrastructure',
  fields: [
    ...ENVELOPE_FIELDS,
    adm('designation', 'Designated service or asset (its record number)'),
    r('essentialServices', 'Essential services and responsible operators', 'longtext'),
    r('singlePointsOfFailure', 'Dependencies and single points of failure (restricted)', 'longtext'),
    r('prevention', 'Prevention and detection measures', 'longtext'),
    r('continuityArrangements', 'Continuity arrangements and fallback procedures (restricted)', 'longtext'),
    r('recoveryPriorities', 'Recovery priorities and responsible decision-makers', 'longtext'),
    r('resources', 'Resources, supplier arrangements and communication channels', 'longtext'),
    adm('exerciseSchedule', 'Exercise schedule and evaluation criteria', 'longtext'),
    adm('residualRiskOwner', 'The official authorised to accept residual risks (an office or role, as the nation names it)'),
    r('reviewTriggers', 'Review triggers (significant changes, incidents)', 'longtext'),
    r('exerciseScope', 'Continuity exercise: scope and safeguards (SEC-INF-005)', 'longtext'),
    r('exerciseFindings', 'Continuity exercise: findings (SEC-INF-006)', 'longtext'),
    r('correctiveActions', 'Corrective actions, deadlines and verification evidence', 'longtext'),
  ],
  documents: [{ class: 'resilience-plan', label: 'Resilience plan (the version approved)', required: true }],
  stages: [{ key: 'received', label: 'Drafted' }, { key: 'assessment', label: 'Under review' }, { key: 'approved', label: 'Approved' }, { key: 'closed', label: 'Closed', terminal: true }],
  actions: [
    { ...open(['designation', 'essentialServices', 'continuityArrangements', 'recoveryPriorities', 'residualRiskOwner', 'reviewTriggers']), requires: { fields: ['summary', 'designation', 'essentialServices', 'continuityArrangements', 'recoveryPriorities', 'residualRiskOwner', 'reviewTriggers'], documents: ['resilience-plan'] } },
    { key: 'approve', label: 'Approve the plan (two officials)', from: ['assessment'], to: 'approved', decision: 'approve-plan', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'authorise-exercise', label: 'Authorise a continuity exercise (SEC-INF-005)', from: ['approved'], to: 'approved', needs: { role: 'signatory' }, requires: { fields: ['exerciseScope'], reasons: true }, effects: ['security.step'] },
    { key: 'evaluate-exercise', label: 'Evaluate the exercise: findings and corrective actions (SEC-INF-006)', from: ['approved'], to: 'approved', needs: { role: 'officer' }, requires: { fields: ['exerciseFindings', 'correctiveActions'], reasons: true }, effects: ['security.step'] },
    { key: 'revise', label: 'Revise (a review trigger occurred)', from: ['approved'], to: 'assessment', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'close', label: 'Close, with reasons', from: ['approved'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'designation', 'essentialServices', 'continuityArrangements', 'recoveryPriorities', 'residualRiskOwner', 'reviewTriggers']), documents: ['resilience-plan'], expect: 'assessment' },
    { action: 'approve', expect: 'approved' },
    { action: 'authorise-exercise', fields: x(['exerciseScope']), expect: 'approved' },
    { action: 'evaluate-exercise', fields: x(['exerciseFindings', 'correctiveActions']), expect: 'approved' },
    { action: 'close', expect: 'closed' },
  ]),
};

export const REFERENCE_CLEARANCE: Ref = {
  ...base, owner: 'securityAccreditation', key: 'security.clearance', version: 1, title: 'Security clearance decision (metadata)', refPrefix: 'CLR', retention: 'security-clearance',
  fields: [
    ...ENVELOPE_FIELDS,
    { key: 'subjectOfficial', label: 'The official the clearance is for (their account id)', type: 'text', personalDataClass: 'personal' },
    adm('sponsoringInstitution', 'Sponsoring institution (its id in the institution register)'),
    adm('levelRequested', 'Level asked for (a level of the nation\'s scheme)'),
    adm('clearancePurpose', 'Why the post needs it'),
    r('vettingReference', 'Reference of the vetting file in the competent authority\'s own system (never its content)'),
    adm('levelGranted', 'Level granted (a level of the nation\'s scheme)'),
    r('restrictions', 'Scope and restrictions', 'longtext'),
    VALID_UNTIL,
  ],
  documents: [{ class: 'sponsorship', label: 'Sponsorship by the institution', required: true }],
  stages: [
    { key: 'received', label: 'Applied' }, { key: 'assessment', label: 'Assessment by the competent authority' }, { key: 'granted', label: 'Granted' },
    { key: 'suspended', label: 'Suspended' }, { key: 'refused', label: 'Refused, with reasons', terminal: true }, { key: 'withdrawn', label: 'Withdrawn, with reasons', terminal: true },
  ],
  actions: [
    { ...open(['subjectOfficial', 'sponsoringInstitution', 'levelRequested', 'clearancePurpose']), requires: { fields: ['summary', 'subjectOfficial', 'sponsoringInstitution', 'levelRequested', 'clearancePurpose'], documents: ['sponsorship'] } },
    { key: 'record-assessment', label: 'Record that the assessment is complete (its reference only)', from: ['assessment'], to: 'assessment', needs: { role: 'officer', assigned: true }, requires: { fields: ['vettingReference'], reasons: true }, effects: ['security.step'] },
    { key: 'grant', label: 'Grant: level, restrictions and end date (two officials of the competent authority)', from: ['assessment'], to: 'granted', decision: 'grant', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['vettingReference', 'levelGranted', 'validUntil'], reasons: true }, effects: ['security.clearance-level', 'security.validity', 'security.step'] },
    { key: 'refuse', label: 'Refuse, with reasons and the review route', from: ['assessment'], to: 'refused', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'renew', label: 'Renew until a new date (SEC-INT-008)', from: ['granted'], to: 'granted', decision: 'renew', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['validUntil'], reasons: true }, effects: ['security.validity', 'security.step'] },
    { key: 'vary', label: 'Vary the level or restrictions (SEC-INT-008)', from: ['granted'], to: 'granted', decision: 'vary', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['levelGranted'], reasons: true }, effects: ['security.clearance-level', 'security.step'] },
    { key: 'suspend', label: 'Suspend (SEC-INT-008)', from: ['granted'], to: 'suspended', decision: 'suspend', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'reinstate', label: 'Reinstate (two officials)', from: ['suspended'], to: 'granted', decision: 'reinstate', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'withdraw', label: 'Withdraw, with reasons and the review route (SEC-INT-008)', from: ['granted', 'suspended'], to: 'withdrawn', decision: 'withdraw', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'subjectOfficial', 'sponsoringInstitution', 'levelRequested', 'clearancePurpose']), documents: ['sponsorship'], expect: 'assessment' },
    { action: 'record-assessment', fields: x(['vettingReference']), expect: 'assessment' },
    { action: 'grant', fields: x(['levelGranted', 'validUntil']), expect: 'granted' },
    { action: 'suspend', expect: 'suspended' },
    { action: 'reinstate', expect: 'granted' },
    { action: 'withdraw', expect: 'withdrawn' },
  ]),
};

// ── leftovers (plan I12): infrastructure incidents and disruptions, resilience exceptions, information release ──
const DESIGNATION: FieldSpec = adm('designation', 'Designated service or asset (its record number, CID-…)');

export const REFERENCE_INFRA_INCIDENT: Ref = {
  ...base, owner: 'criticalInfrastructure', key: 'ci.incident', version: 1, title: 'Critical infrastructure incident', refPrefix: 'CII', retention: 'critical-infrastructure',
  fields: [
    ...ENVELOPE_FIELDS,
    DESIGNATION,
    adm('operator', 'Reporting operator (its number in the organisations register, or the id of the public institution that runs it)'),
    r('occurredAt', 'When it happened', 'timestamp'),
    configured('incidentType', 'Incident type in the nation\'s list', 'security.country.infrastructure_incident_types', 'infrastructure incident types (CFG-SEC-012)'),
    r('serviceImpact', 'Service impact and its extent', 'longtext'),
    r('actionsSoFar', 'Actions taken so far', 'longtext'),
    RECIPIENTS,
    r('coordinationActions', 'Coordination asked of each recipient', 'longtext'),
    r('containmentActions', 'Containment actions, one per line, and who approved them', 'longtext'),
    r('serviceStatus', 'Service status after recovery', 'longtext'),
    r('recoveryVerification', 'How continuity of the essential service was verified', 'longtext'),
    r('correctiveActions', 'Corrective actions, owners and how closure is verified', 'longtext'),
  ],
  documents: [
    { class: 'incident-notification', label: 'The notification as received', required: true },
    { class: 'regulatory-notification', label: 'A regulatory notification made, if any', required: false },
  ],
  stages: [
    { key: 'received', label: 'Notified' }, { key: 'assessment', label: 'Triage' }, { key: 'coordinating', label: 'Coordination and containment' },
    { key: 'contained', label: 'Contained' }, { key: 'recovered', label: 'Recovered and verified' },
    { key: 'closed', label: 'Closed with reasons', terminal: true }, { key: 'not-incident', label: 'Not an incident, with reasons', terminal: true },
  ],
  actions: [
    { ...open(['designation', 'occurredAt', 'serviceImpact']), requires: { fields: ['summary', 'designation', 'occurredAt', 'serviceImpact'], documents: ['incident-notification'] } },
    { key: 'triage', label: 'Triage: incident type, with reasons', from: ['assessment'], to: 'coordinating', needs: { role: 'officer', assigned: true }, requires: { fields: ['incidentType'], reasons: true }, effects: ['security.step'] },
    { key: 'not-incident', label: 'Not an incident, with reasons', from: ['assessment'], to: 'not-incident', decision: 'not-incident', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'escalate', label: 'Coordinate with restricted recipients', from: ['coordinating', 'contained'], to: 'coordinating', needs: { role: 'signatory' }, requires: { fields: ['recipients', 'coordinationActions'], reasons: true }, effects: ['security.share', 'security.step'] },
    { key: 'record-containment', label: 'Record containment and who approved it', from: ['coordinating'], to: 'contained', needs: { role: 'signatory' }, requires: { fields: ['containmentActions'], reasons: true }, effects: ['security.step'] },
    { key: 'recover', label: 'Record recovery and how continuity was verified', from: ['contained'], to: 'recovered', needs: { role: 'officer' }, requires: { fields: ['serviceStatus', 'recoveryVerification'], reasons: true }, effects: ['security.step'] },
    { key: 'close', label: 'Close: corrective actions recorded (two officials)', from: ['recovered'], to: 'closed', decision: 'close-incident', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['correctiveActions'], reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', expect: 'refused' },
    { action: 'register', fields: x(['summary', 'designation', 'occurredAt', 'serviceImpact']), documents: ['incident-notification'], expect: 'assessment' },
    { action: 'triage', fields: x(['incidentType']), expect: 'coordinating' },
    { action: 'escalate', fields: x(['recipients', 'coordinationActions']), expect: 'coordinating' },
    { action: 'record-containment', fields: x(['containmentActions']), expect: 'contained' },
    { action: 'recover', fields: x(['serviceStatus', 'recoveryVerification']), expect: 'recovered' },
    { action: 'close', fields: x(['correctiveActions']), expect: 'closed' },
  ]),
};

export const REFERENCE_DISRUPTION: Ref = {
  ...base, owner: 'criticalInfrastructure', key: 'ci.disruption', version: 1, title: 'Essential service disruption', refPrefix: 'DIS', retention: 'critical-infrastructure',
  fields: [
    ...ENVELOPE_FIELDS,
    DESIGNATION,
    r('impact', 'Service impact', 'longtext'),
    adm('period', 'From and until when', 'dateRange'),
    r('restoration', 'Restoration status', 'longtext'),
  ],
  documents: [],
  stages: [{ key: 'received', label: 'Reported' }, { key: 'assessment', label: 'Ongoing' }, { key: 'restored', label: 'Restored' }, { key: 'closed', label: 'Closed', terminal: true }],
  actions: [
    open(['designation', 'impact', 'period', 'restoration']),
    { key: 'update', label: 'Record an update on restoration', from: ['assessment'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['restoration'], reasons: true }, effects: ['security.step'] },
    { key: 'restore', label: 'Record that the service is restored', from: ['assessment'], to: 'restored', needs: { role: 'officer' }, requires: { fields: ['restoration', 'period'], reasons: true }, effects: ['security.step'] },
    { key: 'close', label: 'Close (two officials)', from: ['restored'], to: 'closed', decision: 'close-disruption', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'designation', 'impact', 'period', 'restoration']), expect: 'assessment' },
    { action: 'update', expect: 'assessment' },
    { action: 'restore', expect: 'restored' },
    { action: 'close', expect: 'closed' },
  ]),
};

export const REFERENCE_RESILIENCE_EXCEPTION: Ref = {
  ...base, owner: 'criticalInfrastructure', key: 'ci.exception', version: 1, title: 'Resilience exception', refPrefix: 'REX', retention: 'critical-infrastructure',
  fields: [
    ...ENVELOPE_FIELDS,
    DESIGNATION,
    r('requirement', 'The requirement excepted', 'longtext'),
    r('justification', 'Why it cannot be met now', 'longtext'),
    r('compensatingMeasures', 'Compensating measures', 'longtext'),
    adm('requestedUntil', 'Asked for until', 'date'),
    VALID_UNTIL,
  ],
  documents: [{ class: 'exception-request', label: 'The request', required: true }],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'assessment', label: 'Review' }, { key: 'in-force', label: 'In force until its date' },
    { key: 'refused', label: 'Refused, with reasons', terminal: true }, { key: 'ended', label: 'Revoked, with reasons', terminal: true },
  ],
  actions: [
    { ...open(['designation', 'requirement', 'justification', 'compensatingMeasures', 'requestedUntil']), requires: { fields: ['summary', 'designation', 'requirement', 'justification', 'compensatingMeasures', 'requestedUntil'], documents: ['exception-request'] } },
    { key: 'approve', label: 'Approve until a date (two officials)', from: ['assessment'], to: 'in-force', decision: 'approve-exception', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['validUntil'], reasons: true }, effects: ['security.validity', 'security.step'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['assessment'], to: 'refused', decision: 'refuse-exception', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
    { key: 'renew', label: 'Renew until a new date (two officials)', from: ['in-force'], to: 'in-force', decision: 'renew', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['validUntil'], reasons: true }, effects: ['security.validity', 'security.step'] },
    { key: 'revoke', label: 'Revoke (two officials)', from: ['in-force'], to: 'ended', decision: 'revoke', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'designation', 'requirement', 'justification', 'compensatingMeasures', 'requestedUntil']), documents: ['exception-request'], expect: 'assessment' },
    { action: 'approve', fields: x(['validUntil']), expect: 'in-force' },
    { action: 'renew', expect: 'in-force' },
    { action: 'revoke', expect: 'ended' },
  ]),
};

export const REFERENCE_INFORMATION_RELEASE: Ref = {
  ...base, owner: 'criticalInfrastructure', key: 'ci.release', version: 1, title: 'Release of critical infrastructure information', refPrefix: 'REL', retention: 'critical-infrastructure',
  fields: [
    ...ENVELOPE_FIELDS,
    adm('records', 'Records concerned (their numbers), one per line', 'longtext'),
    adm('recipient', 'Recipient institution (its id in the institution register)'),
    r('purpose', 'Purpose of the release', 'longtext'),
    r('withheld', 'What must be withheld (exploitable detail, dependencies, recovery procedures)', 'longtext'),
    adm('receivedAt', 'Request received at', 'timestamp'),
  ],
  documents: [],
  stages: [{ key: 'received', label: 'Requested' }, { key: 'assessment', label: 'Review' }, { key: 'released', label: 'Released to the recipient', terminal: true }, { key: 'refused', label: 'Refused, with reasons', terminal: true }],
  actions: [
    open(['records', 'purpose', 'withheld']),
    { key: 'release', label: 'Release to the named institution, withholding what is listed (two officials)', from: ['assessment'], to: 'released', decision: 'release', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['records', 'recipient', 'withheld'], reasons: true }, effects: ['security.release', 'security.step'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['assessment'], to: 'refused', decision: 'refuse-release', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['security.step'] },
  ],
  tests: tests([
    { action: 'register', fields: x(['summary', 'records', 'purpose', 'withheld']), expect: 'assessment' },
    { action: 'release', fields: x(['recipient']), expect: 'released' },
  ]),
};

export const SECURITY_PROCEDURES: Ref[] = [REFERENCE_CYBER_INCIDENT, REFERENCE_VULNERABILITY, REFERENCE_SUPPLIER, REFERENCE_EXCEPTION, REFERENCE_EXERCISE, REFERENCE_DESIGNATION, REFERENCE_DEPENDENCY, REFERENCE_RISK, REFERENCE_RESILIENCE_PLAN, REFERENCE_CLEARANCE,
  // leftovers (plan I12)
  REFERENCE_INFRA_INCIDENT, REFERENCE_DISRUPTION, REFERENCE_RESILIENCE_EXCEPTION, REFERENCE_INFORMATION_RELEASE];
/** The slot each procedure belongs to. */
export const SECURITY_SLOT_OF: Record<string, AuthorityKey> = Object.fromEntries(Object.entries(FAMILY).map(([k, f]) => [k, f.slot]));

export function installSecurityProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of SECURITY_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const d = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(p.key);
  }
  return { drafted, present };
}

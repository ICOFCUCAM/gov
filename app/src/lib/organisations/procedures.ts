// Business registration, licensing and accreditation on the workflow
// foundation (directions 16.5, 16.6; Gate 4). One set of effects serves every
// register type: a register (licensed pharmacies, accredited universities...)
// is a configured type of the organisations register, and its authority runs
// the shared procedures under its own approved versions. An effect refuses
// to change a standing in a register the case's institution does not keep,
// so one authority's procedure can never grant another's licence.
//
// Reference procedures arrive as drafts (like the civil ones): company
// registration, a licence, accreditation (inspection, expert review,
// committee), and for licences and accreditations a renewal, a suspension
// (with reinstatement) and a revocation. Four-eyes on registration, grants,
// suspensions, reinstatements and revocations.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';
import { getFacility } from '@/lib/data/facilities';
import { issueCertificate } from '@/lib/records/certificates';
import { createOrganisation, checkNewOrganisation, getOrganisation, setStanding, registerType, attachStandingDecision, attachCertificate, linkFacilities, listOrganisations, current, type StandingState } from './register';
import type { Case, CasePackage } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown) => str(v).split(/[;\n]/).map(x => x.trim()).filter(Boolean).slice(0, 30);

/** The register a reference procedure acts on when the case names none; a nation's own procedures name it in the register field. */
function defaultRegister(c: Case): string | undefined {
  const k = c.package.key;
  if (k === 'org.registration') return 'companies';
  if (k.startsWith('org.accreditation')) return 'higher-education';
  if (k.startsWith('org.licence')) return 'business-licences';
  return undefined;
}

/** The register a case acts on, if its institution keeps it. */
function registerFor(c: Case): { key: string; title: string } | { error: string } {
  const key = str(c.fields.register) || defaultRegister(c);
  if (!key) return { error: 'Name the register this case is about (the register field)' };
  const t = registerType(key);
  if (!t) return { error: `No register ${key}` };
  if (ownerInstitution(t.authority, authorityFor) !== c.owner) return { error: `${t.title} is kept by another authority: this institution cannot change standings in it` };
  return { key, title: t.title };
}

function orgOf(c: Case) {
  const o = getOrganisation(str(c.fields.organisation));
  return o ?? null;
}

/** Change a standing from a case; the sealed decision is attached once it exists. */
function change(ctx: EffectContext, state: StandingState, opts: { conditions?: boolean } = {}) {
  const { case: c, actor, now } = ctx;
  const r = registerFor(c);
  if ('error' in r) return r;
  const o = orgOf(c);
  if (!o) return { error: `No organisation ${str(c.fields.organisation) || '(none given)'} in the register` };
  const reason = c.pending?.reason ?? `${ctx.action.label} (${c.ref})`;
  const s = setStanding(o.id, { register: r.key, state, reason, case: c.id, ...(opts.conditions && str(c.fields.conditions) ? { conditions: list(c.fields.conditions) } : {}) }, actor.name, now);
  if ('error' in s) return s;
  return {
    facts: { organisation: o.number, register: r.key, standing: s.state, ...(s.validUntil ? { validUntil: s.validUntil } : {}) },
    after: (d?: { id: string }) => { if (d) attachStandingDecision(o.id, r.key, d.id); },
  };
}

registerEffect('org.checkName', ({ case: c }: EffectContext) => {
  const ok = checkNewOrganisation({ name: c.fields.orgName, kind: c.fields.orgKind });
  if ('error' in ok) return { error: ok.error };
  const same = getOrganisation(str(c.fields.orgName));
  if (same) return { error: `${current(same).name} is already registered as ${same.number}` };
});

registerEffect('org.register', (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const r = registerFor(c);
  if ('error' in r) return r;
  const f = c.fields;
  const o = createOrganisation({ name: f.orgName, kind: f.orgKind, region: f.region, address: f.address, representative: { name: f.representativeName, role: f.representativeRole } }, c.id, actor.name, now);
  if ('error' in o) return o;
  const s = setStanding(o.id, { register: r.key, state: 'granted', reason: c.pending?.reason ?? `Registered (${c.ref})`, case: c.id }, actor.name, now);
  if ('error' in s) return s;
  return { facts: { organisation: o.number, register: r.key, standing: 'granted' }, after: (d?: { id: string }) => { if (d) attachStandingDecision(o.id, r.key, d.id); } };
});

registerEffect('org.apply', ctx => {
  const o = orgOf(ctx.case);
  const r = registerFor(ctx.case);
  if (!o || 'error' in r) return change(ctx, 'applied');
  // An organisation already holding a standing in the register applies again only once it was refused.
  const held = o.standings.find(s => s.register === r.key);
  if (held && held.state !== 'refused') return { facts: { organisation: o.number, register: r.key, standing: held.state } };
  return change(ctx, 'applied');
});
registerEffect('org.grant', ctx => change(ctx, 'granted', { conditions: true }));
registerEffect('org.refuse', ctx => change(ctx, 'refused'));
registerEffect('org.renew', ctx => change(ctx, 'granted', { conditions: true }));
registerEffect('org.suspend', ctx => change(ctx, 'suspended'));
registerEffect('org.reinstate', ctx => change(ctx, 'granted'));
registerEffect('org.revoke', ctx => change(ctx, 'revoked'));

registerEffect('org.linkCampuses', ({ case: c, actor }: EffectContext) => {
  const o = orgOf(c);
  if (!o) return { error: 'Name the organisation by its register number' };
  const ids = str(c.fields.campuses).split(/[,\s]+/).filter(Boolean);
  for (const id of ids) {
    const f = getFacility(id);
    if (!f || f.state !== 'published') return { error: `Campus ${id} is not a published registered site (Sites register)` };
  }
  const r = linkFacilities(o.id, ids, c.id, actor.name);
  if ('error' in r) return r;
  return { facts: { campuses: ids.length } };
});

registerEffect('org.issueCertificate', ({ case: c, actor }: EffectContext) => {
  const number = str(c.fields.organisation) || undefined;
  const o = number ? getOrganisation(number) : listByCase(c.id);
  const decision = c.decisions[c.decisions.length - 1];
  if (!o || !decision) return { error: 'The standing must be decided before its certificate is issued' };
  const standing = o.standings.find(s => s.history.some(h => h.case === c.id));
  if (!standing || standing.state !== 'granted') return { error: 'Only a granted standing has a certificate' };
  const t = registerType(standing.register);
  const cert = issueCertificate({
    kind: t?.kind === 'accreditation' ? 'accreditation' : t?.kind === 'licence' ? 'licence' : 'organisation-registration',
    title: t?.title ?? 'Certificate',
    decision,
    publicFacts: { 'Organisation': current(o).name, 'Register number': o.number, 'Register': t?.title ?? standing.register, 'Standing': 'granted', ...(standing.validUntil ? { 'Valid until': standing.validUntil } : {}), ...(standing.conditions.length ? { 'Conditions': standing.conditions.join('; ') } : {}) },
  }, actor.name);
  if ('error' in cert) return { error: cert.error };
  attachCertificate(o.id, standing.register, cert.code);
  return { facts: { certificate: cert.code } };
});

/** The organisation a registration case created. */
function listByCase(caseId: string) {
  return listOrganisations({ limit: 2000 }).find(o => o.versions[0]?.case === caseId) ?? null;
}

// ── Reference procedures ─────────────────────────────────────────────────────

const ORG_FIELD = { key: 'organisation', label: 'Organisation (register number)', type: 'organisation' as const, required: true };
const registerField = (fallback: string) => ({ key: 'register', label: `Register (default ${fallback})`, type: 'text' as const });
const conditionsField = { key: 'conditions', label: 'Conditions (one per line)', type: 'longtext' as const };
const decisionSteps = (done: string, decision: string, effect: string): CasePackage['actions'] => [
  { key: decision, label: `${decision[0]!.toUpperCase()}${decision.slice(1)}`, from: ['pending-approval'], to: done, decision, needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: [effect] },
];

/** Company (or other organisation) registration. */
export const REFERENCE_ORG_REGISTRATION: Ref = {
  key: 'org.registration', version: 1, owner: 'businessRegister', title: 'Registration of a company or organisation', refPrefix: 'ORR', reference: true, citations: [],
  fields: [
    { key: 'orgName', label: 'Registered name', type: 'text', required: true },
    { key: 'orgKind', label: 'Kind', type: 'choice', options: ['company', 'partnership', 'cooperative', 'ngo', 'association', 'university', 'college', 'school', 'hospital', 'clinic', 'pharmacy', 'professional-practice', 'other'], required: true },
    { key: 'region', label: 'Region', type: 'text' },
    { key: 'address', label: 'Registered address', type: 'text' },
    { key: 'representativeName', label: 'Representative', type: 'text', required: true, personal: true },
    { key: 'representativeRole', label: 'Representative\'s role', type: 'text' },
    registerField('companies'),
  ],
  documents: [
    { class: 'constitution', label: 'Constitution, articles or statutes', required: true },
    { class: 'representative-identity', label: 'Representative\'s identity document', required: true },
    { class: 'fee-receipt', label: 'Receipt for the registration fee', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verification' }, { key: 'returned', label: 'Returned for correction' },
    { key: 'pending-approval', label: 'Pending approval' }, { key: 'registered', label: 'Registered' },
    { key: 'certificate-issued', label: 'Certificate issued', terminal: true }, { key: 'rejected', label: 'Rejected', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Check the documents', from: ['submitted'], to: 'verification', needs: { role: 'officer' }, requires: { documents: ['constitution', 'representative-identity'], fields: ['orgName', 'orgKind', 'representativeName'] } },
    { key: 'return', label: 'Return for correction', from: ['verification'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'resubmit', label: 'Corrected: check again', from: ['returned'], to: 'verification', needs: { role: 'officer' } },
    { key: 'verify', label: 'Name and documents verified: propose', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' }, effects: ['org.checkName'] },
    ...decisionSteps('registered', 'register', 'org.register'),
    { key: 'reject', label: 'Reject', from: ['pending-approval'], to: 'rejected', decision: 'reject', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'issue', label: 'Issue the certificate', from: ['registered'], to: 'certificate-issued', needs: { role: 'officer' }, effects: ['org.issueCertificate'] },
  ],
  deadlines: [{ key: 'decide', label: 'Decide within 10 working days', from: 'opened', days: 10, calendar: 'working', onLapse: 'escalate' }],
  notifications: [], appeal: { days: 30, body: 'the business register appeals authority', suspensive: false },
  retention: 'organisation-register-permanent', sensitivity: 'normal',
  tests: [
    { name: 'registered and certified', steps: [
      { action: 'check', fields: { orgName: 'A Ltd', orgKind: 'company', representativeName: 'B' }, documents: ['constitution', 'representative-identity'], expect: 'verification' },
      { action: 'verify', expect: 'pending-approval' }, { action: 'register', expect: 'registered' }, { action: 'issue', expect: 'certificate-issued' },
    ] },
    { name: 'incomplete, returned, rejected', steps: [
      { action: 'check', expect: 'refused' },
      { action: 'check', fields: { orgName: 'A Ltd', orgKind: 'company', representativeName: 'B' }, documents: ['constitution', 'representative-identity'], expect: 'verification' },
      { action: 'return', expect: 'returned' }, { action: 'resubmit', expect: 'verification' }, { action: 'verify', expect: 'pending-approval' }, { action: 'reject', expect: 'rejected' },
    ] },
  ],
};

/** A licence (any licence register the authority keeps), with an optional inspection. */
export const REFERENCE_LICENCE: Ref = {
  key: 'org.licence', version: 1, owner: 'businessRegister', title: 'Licence application', refPrefix: 'LIC', reference: true, citations: [],
  fields: [ORG_FIELD, registerField('business-licences'), conditionsField],
  documents: [
    { class: 'premises-evidence', label: 'Evidence of the premises', required: true },
    { class: 'fee-receipt', label: 'Receipt for the licence fee', required: true },
    { class: 'inspection-report', label: 'Inspection report', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'completeness', label: 'Completeness check' }, { key: 'returned', label: 'Returned for correction' },
    { key: 'inspection', label: 'Inspection' }, { key: 'pending-approval', label: 'Pending approval' }, { key: 'granted', label: 'Granted' },
    { key: 'certificate-issued', label: 'Licence issued', terminal: true }, { key: 'declined', label: 'Refused', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Check the application', from: ['submitted'], to: 'completeness', needs: { role: 'officer' }, requires: { fields: ['organisation'] }, effects: ['org.apply'] },
    { key: 'return', label: 'Return for correction', from: ['completeness'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'resubmit', label: 'Corrected: check again', from: ['returned'], to: 'completeness', needs: { role: 'officer' } },
    { key: 'inspect', label: 'Send for inspection', from: ['completeness'], to: 'inspection', needs: { role: 'officer' }, requires: { documents: ['premises-evidence', 'fee-receipt'] } },
    { key: 'inspected', label: 'Inspection reported: propose', from: ['inspection'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['inspection-report'] } },
    { key: 'propose', label: 'Complete without inspection: propose', from: ['completeness'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['premises-evidence', 'fee-receipt'], reasons: true } },
    ...decisionSteps('granted', 'grant', 'org.grant'),
    { key: 'refuse', label: 'Refuse', from: ['pending-approval'], to: 'declined', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['org.refuse'] },
    { key: 'issue', label: 'Issue the licence', from: ['granted'], to: 'certificate-issued', needs: { role: 'officer' }, effects: ['org.issueCertificate'] },
  ],
  deadlines: [{ key: 'decide', label: 'Decide within 30 working days', from: 'opened', days: 30, calendar: 'working', onLapse: 'escalate' }],
  notifications: [], appeal: { days: 30, body: 'the licensing appeals authority', suspensive: false },
  retention: 'organisation-register-permanent', sensitivity: 'normal',
  tests: [
    { name: 'inspected and granted', steps: [
      { action: 'check', fields: { organisation: 'ORG-1' }, expect: 'completeness' },
      { action: 'inspect', documents: ['premises-evidence', 'fee-receipt'], expect: 'inspection' },
      { action: 'inspected', expect: 'refused' },
      { action: 'inspected', documents: ['inspection-report'], expect: 'pending-approval' },
      { action: 'grant', expect: 'granted' }, { action: 'issue', expect: 'certificate-issued' },
    ] },
    { name: 'refused without inspection', steps: [
      { action: 'check', fields: { organisation: 'ORG-1' }, expect: 'completeness' },
      { action: 'propose', documents: ['premises-evidence', 'fee-receipt'], expect: 'pending-approval' },
      { action: 'refuse', expect: 'declined' },
    ] },
  ],
};

/** Accreditation: self-assessment, inspection of the campuses, expert review, committee, decision. */
export const REFERENCE_ACCREDITATION: Ref = {
  key: 'org.accreditation', version: 1, owner: 'higherEducationAccreditation', title: 'Accreditation', refPrefix: 'ACC', reference: true, citations: [],
  fields: [ORG_FIELD, registerField('higher-education'), { key: 'campuses', label: 'Campuses (registered site ids)', type: 'text' }, conditionsField],
  documents: [
    { class: 'self-assessment', label: 'Self-assessment report', required: true },
    { class: 'fee-receipt', label: 'Receipt for the accreditation fee', required: false },
    { class: 'inspection-report', label: 'Inspection report (campuses; health and fire where referred)', required: true },
    { class: 'expert-review', label: 'Expert review', required: true },
    { class: 'committee-minutes', label: 'Accreditation committee minutes', required: true },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'completeness', label: 'Completeness check' }, { key: 'returned', label: 'Returned for correction' },
    { key: 'inspection', label: 'Inspection' }, { key: 'expert-review', label: 'Expert review' }, { key: 'committee', label: 'Committee' },
    { key: 'pending-approval', label: 'Pending approval' }, { key: 'accredited', label: 'Accredited' },
    { key: 'certificate-issued', label: 'Certificate issued', terminal: true }, { key: 'declined', label: 'Refused', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Check the application', from: ['submitted'], to: 'completeness', needs: { role: 'officer' }, requires: { fields: ['organisation'] }, effects: ['org.apply'] },
    { key: 'return', label: 'Return for correction', from: ['completeness'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'resubmit', label: 'Corrected: check again', from: ['returned'], to: 'completeness', needs: { role: 'officer' } },
    { key: 'inspect', label: 'Send for inspection', from: ['completeness'], to: 'inspection', needs: { role: 'officer' }, requires: { documents: ['self-assessment'] }, effects: ['org.linkCampuses'] },
    { key: 'inspected', label: 'Inspection reported: send for expert review', from: ['inspection'], to: 'expert-review', needs: { role: 'officer' }, requires: { documents: ['inspection-report'] } },
    { key: 'reviewed', label: 'Expert review received: to the committee', from: ['expert-review'], to: 'committee', needs: { role: 'officer' }, requires: { documents: ['expert-review'] } },
    { key: 'recommend', label: 'Committee recommendation recorded: propose', from: ['committee'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['committee-minutes'], reasons: true } },
    ...decisionSteps('accredited', 'accredit', 'org.grant'),
    { key: 'refuse', label: 'Refuse', from: ['pending-approval', 'committee'], to: 'declined', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['org.refuse'] },
    { key: 'issue', label: 'Issue the certificate', from: ['accredited'], to: 'certificate-issued', needs: { role: 'officer' }, effects: ['org.issueCertificate'] },
  ],
  deadlines: [{ key: 'decide', label: 'Decide within 180 days', from: 'opened', days: 180, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: { days: 60, body: 'the accreditation appeals board', suspensive: false },
  retention: 'organisation-register-permanent', sensitivity: 'normal',
  tests: [
    { name: 'accredited', steps: [
      { action: 'check', fields: { organisation: 'ORG-1' }, expect: 'completeness' },
      { action: 'inspect', documents: ['self-assessment'], expect: 'inspection' },
      { action: 'inspected', documents: ['inspection-report'], expect: 'expert-review' },
      { action: 'reviewed', documents: ['expert-review'], expect: 'committee' },
      { action: 'recommend', documents: ['committee-minutes'], expect: 'pending-approval' },
      { action: 'accredit', expect: 'accredited' }, { action: 'issue', expect: 'certificate-issued' },
    ] },
    { name: 'refused by the committee', steps: [
      { action: 'check', fields: { organisation: 'ORG-1' }, expect: 'completeness' },
      { action: 'inspect', expect: 'refused' },
      { action: 'inspect', documents: ['self-assessment'], expect: 'inspection' },
      { action: 'inspected', documents: ['inspection-report'], expect: 'expert-review' },
      { action: 'reviewed', documents: ['expert-review'], expect: 'committee' },
      { action: 'refuse', expect: 'declined' },
    ] },
  ],
};

/** Renewal, suspension (with reinstatement) and revocation for one family of registers. */
function standingProcedures(family: 'licence' | 'accreditation', owner: string, fallback: string, prefix: string): Ref[] {
  const fields = [ORG_FIELD, registerField(fallback)];
  const base = { owner, reference: true as const, citations: [], notifications: [], retention: 'organisation-register-permanent', sensitivity: 'normal' as const };
  const word = family === 'licence' ? 'licence' : 'accreditation';
  return [
    {
      ...base, key: `org.${family}-renewal`, version: 1, title: `Renewal of a ${word}`, refPrefix: `${prefix}R`,
      fields: [...fields, conditionsField], documents: [{ class: 'renewal-evidence', label: 'Evidence the conditions are still met', required: true }, { class: 'fee-receipt', label: 'Receipt for the renewal fee', required: false }],
      stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verification' }, { key: 'pending-approval', label: 'Pending approval' }, { key: 'renewed', label: 'Renewed' }, { key: 'certificate-issued', label: 'Certificate issued', terminal: true }, { key: 'declined', label: 'Refused', terminal: true }],
      actions: [
        { key: 'check', label: 'Check the evidence', from: ['submitted'], to: 'verification', needs: { role: 'officer' }, requires: { fields: ['organisation'], documents: ['renewal-evidence'] } },
        { key: 'verify', label: 'Verified: propose', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' } },
        ...decisionSteps('renewed', 'renew', 'org.renew'),
        { key: 'refuse', label: 'Refuse', from: ['pending-approval'], to: 'declined', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
        { key: 'issue', label: 'Issue the renewed certificate', from: ['renewed'], to: 'certificate-issued', needs: { role: 'officer' }, effects: ['org.issueCertificate'] },
      ],
      deadlines: [{ key: 'decide', label: 'Decide within 30 working days', from: 'opened', days: 30, calendar: 'working', onLapse: 'escalate' }],
      appeal: { days: 30, body: `the ${word} appeals authority`, suspensive: false },
      tests: [{ name: 'renewed', steps: [{ action: 'check', fields: { organisation: 'ORG-1' }, documents: ['renewal-evidence'], expect: 'verification' }, { action: 'verify', expect: 'pending-approval' }, { action: 'renew', expect: 'renewed' }, { action: 'issue', expect: 'certificate-issued' }] }],
    },
    {
      ...base, key: `org.${family}-suspension`, version: 1, title: `Suspension of a ${word}`, refPrefix: `${prefix}S`,
      fields, documents: [{ class: 'grounds', label: 'Grounds (inspection, complaint, report)', required: true }, { class: 'representations', label: 'The organisation\'s representations', required: false }],
      stages: [{ key: 'opened', label: 'Opened' }, { key: 'hearing', label: 'Notice given: representations' }, { key: 'pending-approval', label: 'Pending approval' }, { key: 'suspended', label: 'Suspended' }, { key: 'reinstated', label: 'Reinstated', terminal: true }, { key: 'closed', label: 'Closed without suspension', terminal: true }],
      actions: [
        { key: 'notify', label: 'Give notice and invite representations', from: ['opened'], to: 'hearing', needs: { role: 'officer' }, requires: { fields: ['organisation'], documents: ['grounds'], reasons: true } },
        { key: 'propose', label: 'Representations considered: propose suspension', from: ['hearing'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
        ...decisionSteps('suspended', 'suspend', 'org.suspend'),
        { key: 'close', label: 'Close without suspension', from: ['hearing', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
        { key: 'reinstate', label: 'Reinstate', from: ['suspended'], to: 'reinstated', decision: 'reinstate', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['org.reinstate'] },
      ],
      deadlines: [{ key: 'representations', label: 'Representations within 14 days of notice', from: 'hearing', days: 14, calendar: 'calendar', onLapse: 'notify' }],
      appeal: { days: 30, body: `the ${word} appeals authority`, suspensive: false },
      tests: [
        { name: 'suspended and reinstated', steps: [{ action: 'notify', fields: { organisation: 'ORG-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'propose', expect: 'pending-approval' }, { action: 'suspend', expect: 'suspended' }, { action: 'reinstate', expect: 'reinstated' }] },
        { name: 'closed after representations', steps: [{ action: 'notify', fields: { organisation: 'ORG-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'close', expect: 'closed' }] },
      ],
    },
    {
      ...base, key: `org.${family}-revocation`, version: 1, title: `Revocation of a ${word}`, refPrefix: `${prefix}V`,
      fields, documents: [{ class: 'grounds', label: 'Grounds', required: true }, { class: 'representations', label: 'The organisation\'s representations', required: false }],
      stages: [{ key: 'opened', label: 'Opened' }, { key: 'hearing', label: 'Notice given: representations' }, { key: 'pending-approval', label: 'Pending approval' }, { key: 'revoked', label: 'Revoked', terminal: true }, { key: 'closed', label: 'Closed without revocation', terminal: true }],
      actions: [
        { key: 'notify', label: 'Give notice and invite representations', from: ['opened'], to: 'hearing', needs: { role: 'officer' }, requires: { fields: ['organisation'], documents: ['grounds'], reasons: true } },
        { key: 'propose', label: 'Representations considered: propose revocation', from: ['hearing'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
        ...decisionSteps('revoked', 'revoke', 'org.revoke'),
        { key: 'close', label: 'Close without revocation', from: ['hearing', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
      ],
      deadlines: [{ key: 'representations', label: 'Representations within 21 days of notice', from: 'hearing', days: 21, calendar: 'calendar', onLapse: 'notify' }],
      appeal: { days: 30, body: `the ${word} appeals authority`, suspensive: true },
      tests: [{ name: 'revoked', steps: [{ action: 'notify', fields: { organisation: 'ORG-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'propose', expect: 'pending-approval' }, { action: 'revoke', expect: 'revoked' }] }],
    },
  ];
}

export const ORGANISATION_PROCEDURES: Ref[] = [
  REFERENCE_ORG_REGISTRATION, REFERENCE_LICENCE, REFERENCE_ACCREDITATION,
  ...standingProcedures('licence', 'businessRegister', 'business-licences', 'LI'),
  ...standingProcedures('accreditation', 'higherEducationAccreditation', 'higher-education', 'AC'),
];

/** Draft the organisation procedures this installation does not have yet. */
export function installOrganisationProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of ORGANISATION_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}

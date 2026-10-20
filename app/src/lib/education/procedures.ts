// Education on the workflow foundation (owner's Cycle 3 directive,
// workstream 2). Reference procedures, drafts for the education authority to
// adapt to its law and approve:
//
// - school registration, renewal, suspension and revocation: the shared
//   organisation procedures under the education authority's keys, acting on
//   the `schools` register (the institution is one organisation record; its
//   registration is a standing there, never a second identity);
// - an inspection of a school or other institution, recorded with its
//   outcome (a referral for suspension is a separate decided case);
// - recording a qualification an accredited institution awarded, correcting
//   it and revoking it (four-eyes), with a certificate checkable at /verify
//   that carries no name.
//
// University accreditation stays with the accreditation authority's own
// procedures (lib/organisations/procedures.ts).

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { issueCertificate } from '@/lib/records/certificates';
import { getOrganisation, current } from '@/lib/organisations/register';
import { sectorProcedures } from '@/lib/organisations/procedures';
import { recordInspection, recordAward, correctAward, revokeAward, attachAwardCertificate, awardOfCase, getAward } from './register';
import type { CasePackage } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

registerEffect('edu.recordInspection', ({ case: c, actor, now }: EffectContext) => {
  const i = recordInspection({ organisation: str(c.fields.organisation), register: str(c.fields.register) || 'schools', date: str(c.fields.inspectionDate), outcome: str(c.fields.outcome), summary: str(c.fields.summary) }, c.id, actor.name, now);
  if ('error' in i) return i;
  return { facts: { inspection: i.id, outcome: i.outcome } };
});

const awardInput = (c: { fields: Record<string, unknown> }) => ({ holderRef: str(c.fields.holderRef), holderName: str(c.fields.holderName), title: str(c.fields.title), level: str(c.fields.level), field: str(c.fields.fieldOfStudy), awardingBody: str(c.fields.awardingBody), awardedOn: str(c.fields.awardedOn) });

/** Before proposing: the awarding body must be accredited or registered today. */
registerEffect('edu.checkAward', ({ case: c }: EffectContext) => {
  const o = getOrganisation(str(c.fields.awardingBody));
  if (!o) return { error: `No awarding body ${str(c.fields.awardingBody) || '(none given)'} in the organisations register` };
  if (!o.standings.some(s => s.state === 'granted')) return { error: `${current(o).name} holds no granted standing` };
});

registerEffect('edu.award', ({ case: c, actor, now }: EffectContext) => {
  const a = recordAward(awardInput(c), c.id, actor.name, now);
  if ('error' in a) return a;
  return { facts: { qualification: a.number, awardingBody: a.awardingBody, accreditedUnder: a.accreditation.register } };
});

registerEffect('edu.issueAwardCertificate', ({ case: c, actor }: EffectContext) => {
  const a = awardOfCase(c.id) ?? getAward(str(c.fields.qualification));
  const decision = c.decisions[c.decisions.length - 1];
  if (!a || !decision) return { error: 'The qualification must be recorded before its certificate is issued' };
  if (a.state !== 'valid') return { error: 'A revoked qualification has no certificate' };
  const v = a.versions.at(-1)!;
  const body = getOrganisation(a.awardingBody);
  // No name: the certificate proves the award; the holder shows who they are.
  const cert = issueCertificate({ kind: 'qualification', title: 'Record of a qualification', decision, publicFacts: { 'Qualification number': a.number, 'Qualification': v.title, ...(v.level ? { 'Level': v.level } : {}), 'Awarding body': body ? current(body).name : a.awardingBody, 'Awarded on': v.awardedOn } }, actor.name);
  if ('error' in cert) return cert;
  attachAwardCertificate(a.number, cert.code);
  return { facts: { certificate: cert.code } };
});

registerEffect('edu.correctAward', ({ case: c, actor, now }: EffectContext) => {
  const a = correctAward(str(c.fields.qualification), { title: str(c.fields.title), level: str(c.fields.level), field: str(c.fields.fieldOfStudy), awardedOn: str(c.fields.awardedOn), holderName: str(c.fields.holderName) }, c.pending?.reason ?? str(c.fields.grounds), c.id, actor.name, now);
  if ('error' in a) return a;
  return { facts: { qualification: a.number, version: a.versions.length } };
});

registerEffect('edu.revokeAward', ({ case: c, actor, now }: EffectContext) => {
  const a = revokeAward(str(c.fields.qualification), c.pending?.reason ?? str(c.fields.grounds), c.id, actor.name, now);
  if ('error' in a) return a;
  return { facts: { qualification: a.number, state: a.state } };
});

const base = { owner: 'education', reference: true as const, citations: [], notifications: [] };

export const REFERENCE_INSPECTION: Ref = {
  ...base, key: 'edu.inspection', version: 1, title: 'Inspection of an education institution', refPrefix: 'EIN',
  fields: [
    { key: 'organisation', label: 'Institution (register number)', type: 'organisation', required: true },
    { key: 'register', label: 'Register (default schools)', type: 'text' },
    { key: 'inspectionDate', label: 'Date of the visit', type: 'date' },
    { key: 'outcome', label: 'Outcome', type: 'choice', options: ['no-action', 'improvement-required', 'referred-for-suspension'] },
    { key: 'summary', label: 'Summary of findings', type: 'longtext' },
  ],
  documents: [{ class: 'inspection-report', label: 'Inspection report', required: true }],
  stages: [{ key: 'opened', label: 'Planned' }, { key: 'visit', label: 'Visit' }, { key: 'recorded', label: 'Recorded', terminal: true }, { key: 'cancelled', label: 'Cancelled', terminal: true }],
  actions: [
    { key: 'schedule', label: 'Schedule the visit', from: ['opened'], to: 'visit', needs: { role: 'officer' }, requires: { fields: ['organisation'] } },
    { key: 'report', label: 'Record the findings', from: ['visit'], to: 'recorded', needs: { role: 'officer' }, requires: { documents: ['inspection-report'], fields: ['inspectionDate', 'outcome', 'summary'] }, effects: ['edu.recordInspection'] },
    { key: 'cancel', label: 'Cancel', from: ['opened', 'visit'], to: 'cancelled', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  // No appeal: an inspection decides nothing; a suspension it leads to is its own case with its own appeal.
  deadlines: [],
  retention: 'organisation-register-permanent', sensitivity: 'normal',
  tests: [
    { name: 'recorded', steps: [{ action: 'schedule', fields: { organisation: 'ORG-1' }, expect: 'visit' }, { action: 'report', fields: { inspectionDate: '2026-01-02', outcome: 'no-action', summary: 'x' }, expect: 'refused' }, { action: 'report', documents: ['inspection-report'], expect: 'recorded' }] },
    { name: 'cancelled', steps: [{ action: 'cancel', expect: 'cancelled' }] },
  ],
};

const AWARD_FIELDS: CasePackage['fields'] = [
  { key: 'holderRef', label: 'Holder\'s person reference', type: 'person', required: true, personal: true },
  { key: 'holderName', label: 'Holder\'s name as on the award', type: 'text', required: true, personal: true },
  { key: 'title', label: 'Qualification', type: 'text', required: true },
  { key: 'level', label: 'Level (as the national framework names it)', type: 'text' },
  { key: 'fieldOfStudy', label: 'Field of study', type: 'text' },
  { key: 'awardingBody', label: 'Awarding body (register number)', type: 'organisation', required: true },
  { key: 'awardedOn', label: 'Awarded on', type: 'date', required: true },
];

export const REFERENCE_QUALIFICATION: Ref = {
  ...base, key: 'edu.qualification', version: 1, title: 'Recording a qualification', refPrefix: 'QUA',
  fields: AWARD_FIELDS,
  documents: [{ class: 'award-evidence', label: 'The awarding body\'s confirmation (results list or award record)', required: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verification' }, { key: 'pending-approval', label: 'Decision' }, { key: 'recorded', label: 'Recorded' }, { key: 'certificate-issued', label: 'Certificate issued', terminal: true }, { key: 'not-recorded', label: 'Not recorded', terminal: true }],
  actions: [
    { key: 'check', label: 'Check the evidence', from: ['submitted'], to: 'verification', needs: { role: 'officer' }, requires: { documents: ['award-evidence'], fields: ['holderRef', 'holderName', 'title', 'awardingBody', 'awardedOn'] } },
    { key: 'verify', label: 'Awarding body accredited: propose', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' }, effects: ['edu.checkAward'] },
    { key: 'record', label: 'Record the qualification', from: ['pending-approval'], to: 'recorded', decision: 'record', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['edu.award'] },
    { key: 'decline', label: 'Do not record, with reasons', from: ['verification', 'pending-approval'], to: 'not-recorded', decision: 'decline', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'issue', label: 'Issue the certificate', from: ['recorded'], to: 'certificate-issued', needs: { role: 'officer' }, effects: ['edu.issueAwardCertificate'] },
  ],
  deadlines: [{ key: 'decide', label: 'Decide within 20 working days', from: 'opened', days: 20, calendar: 'working', onLapse: 'escalate' }],
  appeal: { days: 30, body: 'the education authority\'s review', suspensive: false },
  retention: 'qualification-record', sensitivity: 'normal',
  tests: [
    { name: 'recorded', steps: [{ action: 'check', fields: { holderRef: 'P-1', holderName: 'A', title: 'Diploma', awardingBody: 'ORG-1', awardedOn: '2026-01-01' }, documents: ['award-evidence'], expect: 'verification' }, { action: 'verify', expect: 'pending-approval' }, { action: 'record', expect: 'recorded' }, { action: 'issue', expect: 'certificate-issued' }] },
    { name: 'declined', steps: [{ action: 'check', fields: { holderRef: 'P-1', holderName: 'A', title: 'Diploma', awardingBody: 'ORG-1', awardedOn: '2026-01-01' }, documents: ['award-evidence'], expect: 'verification' }, { action: 'decline', expect: 'not-recorded' }] },
  ],
};

const QUAL_FIELD = { key: 'qualification', label: 'Qualification number', type: 'text' as const, required: true };

export const REFERENCE_QUALIFICATION_CORRECTION: Ref = {
  ...base, key: 'edu.qualification-correction', version: 1, title: 'Correcting a qualification record', refPrefix: 'QUC',
  fields: [QUAL_FIELD, ...AWARD_FIELDS.filter(f => !['holderRef', 'awardingBody'].includes(f.key)).map(f => ({ ...f, required: false, label: `Corrected: ${f.label.toLowerCase()}` })), { key: 'grounds', label: 'Grounds for the correction', type: 'longtext' }],
  documents: [{ class: 'correction-evidence', label: 'Evidence of the correct entry', required: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'pending-approval', label: 'Decision' }, { key: 'corrected', label: 'Corrected', terminal: true }, { key: 'not-corrected', label: 'Not corrected', terminal: true }],
  actions: [
    { key: 'propose', label: 'Evidence checked: propose', from: ['submitted'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['correction-evidence'], fields: ['qualification'], reasons: true } },
    { key: 'correct', label: 'Correct the record', from: ['pending-approval'], to: 'corrected', decision: 'correct', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['edu.correctAward'] },
    { key: 'decline', label: 'Do not correct, with reasons', from: ['pending-approval'], to: 'not-corrected', decision: 'decline', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [], appeal: { days: 30, body: 'the education authority\'s review', suspensive: false },
  retention: 'qualification-record', sensitivity: 'normal',
  tests: [{ name: 'corrected', steps: [{ action: 'propose', fields: { qualification: 'QUA-1' }, documents: ['correction-evidence'], expect: 'pending-approval' }, { action: 'correct', expect: 'corrected' }] }],
};

export const REFERENCE_QUALIFICATION_REVOCATION: Ref = {
  ...base, key: 'edu.qualification-revocation', version: 1, title: 'Revoking a qualification', refPrefix: 'QUV',
  fields: [QUAL_FIELD, { key: 'grounds', label: 'Grounds', type: 'longtext' }],
  documents: [{ class: 'grounds', label: 'Grounds (e.g. the awarding body\'s finding)', required: true }, { class: 'representations', label: 'The holder\'s representations', required: false }],
  stages: [{ key: 'opened', label: 'Opened' }, { key: 'hearing', label: 'Notice given: representations' }, { key: 'pending-approval', label: 'Decision' }, { key: 'revoked', label: 'Revoked', terminal: true }, { key: 'closed', label: 'Closed without revocation', terminal: true }],
  actions: [
    { key: 'notify', label: 'Give notice and invite representations', from: ['opened'], to: 'hearing', needs: { role: 'officer' }, requires: { fields: ['qualification'], documents: ['grounds'], reasons: true } },
    { key: 'propose', label: 'Representations considered: propose revocation', from: ['hearing'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'revoke', label: 'Revoke', from: ['pending-approval'], to: 'revoked', decision: 'revoke', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['edu.revokeAward'] },
    { key: 'close', label: 'Close without revocation', from: ['hearing', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'representations', label: 'Representations within 21 days of notice', from: 'hearing', days: 21, calendar: 'calendar', onLapse: 'notify' }],
  appeal: { days: 30, body: 'the education appeals body', suspensive: true },
  retention: 'qualification-record', sensitivity: 'normal',
  tests: [{ name: 'revoked', steps: [{ action: 'notify', fields: { qualification: 'QUA-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'propose', expect: 'pending-approval' }, { action: 'revoke', expect: 'revoked' }] }],
};

export const EDUCATION_PROCEDURES: Ref[] = [
  ...sectorProcedures({ prefix: 'edu.school', owner: 'education', register: 'schools', word: 'school registration', refPrefix: 'SCH' }),
  REFERENCE_INSPECTION, REFERENCE_QUALIFICATION, REFERENCE_QUALIFICATION_CORRECTION, REFERENCE_QUALIFICATION_REVOCATION,
];

/** Draft the education procedures this installation does not have yet. */
export function installEducationProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of EDUCATION_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}

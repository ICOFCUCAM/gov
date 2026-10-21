// Visas and residence permits on the workflow foundation (directions 16.3,
// Gate 5). Reference procedures arrive as drafts for the immigration
// authority to adapt to its law and approve: a visa (Submitted →
// Completeness check → Verification → Assessment → Decision → Issued or
// Refused), a residence permit (Submitted → Verified → Assessed → Decision →
// Granted or Refused), an extension and a revocation after notice and
// representations. Every decision is four-eyes, gives reasons and cites the
// law; a refusal and a revocation state the appeal. All restricted: the case
// rules give them to their assignee and supervisors, each read logged.
// Asylum and enforcement are not here (directions 17, Gate 5): they need
// their own safeguards (15.6) and an independent legal review.

import { libraryForm } from '@/lib/forms/library/definitions';
import { attachForm } from '@/lib/forms/library/build';
import { partyName } from '@/lib/forms/contract';
import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { issueCertificate } from '@/lib/records/certificates';
import { recordGrant, changeGrant, getGrant, grantOfCase, attachGrantDecision, attachGrantCertificate, checkGrant, VISA_CATEGORIES, PERMIT_CATEGORIES, type GrantInput, type GrantKind } from './register';
import type { Case, CasePackage } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const kindOf = (c: Case): GrantKind => (c.package.key.includes('permit') ? 'residence-permit' : 'visa');
const input = (c: Case): GrantInput => {
  const f = c.fields;
  return {
    kind: kindOf(c), category: str(f.category),
    holder: { name: partyName(f.holderName), nationality: str(f.nationality), documentNumber: str(f.documentNumber), ...(str(f.birthDate) ? { birthDate: str(f.birthDate) } : {}) },
    validFrom: str(f.validFrom), validUntil: str(f.validUntil), ...(str(f.entries) ? { entries: str(f.entries) } : {}),
    conditions: str(f.conditions).split(/[;\n]/).map(x => x.trim()).filter(Boolean),
  };
};

registerEffect('immigration.check', ({ case: c }: EffectContext) => {
  const why = checkGrant(input(c));
  if (why) return { error: why };
});

registerEffect('immigration.grant', ({ case: c, actor, now }: EffectContext) => {
  const gr = recordGrant(input(c), 'issued', c.id, c.pending?.reason ?? `Granted (${c.ref})`, actor.name, now);
  if ('error' in gr) return gr;
  return { facts: { number: gr.number, validUntil: gr.validUntil ?? '' }, after: (d?: { id: string }) => { if (d) attachGrantDecision(gr.id, d.id); } };
});

registerEffect('immigration.refuse', ({ case: c, actor, now }: EffectContext) => {
  const gr = recordGrant(input(c), 'refused', c.id, c.pending?.reason ?? `Refused (${c.ref})`, actor.name, now);
  if ('error' in gr) return gr;
  return { facts: { refused: true }, after: (d?: { id: string }) => { if (d) attachGrantDecision(gr.id, d.id); } };
});

registerEffect('immigration.extend', ({ case: c, actor, now }: EffectContext) => {
  const gr = getGrant(str(c.fields.grant));
  if (!gr) return { error: `No visa or permit ${str(c.fields.grant) || '(none given)'}` };
  const r = changeGrant(gr.id, { state: gr.state, reason: c.pending?.reason ?? `Extended (${c.ref})`, case: c.id, validUntil: str(c.fields.newValidUntil) }, actor.name, now);
  if ('error' in r) return r;
  return { facts: { number: r.number, validUntil: r.validUntil ?? '' } };
});

registerEffect('immigration.revoke', ({ case: c, actor, now }: EffectContext) => {
  const gr = getGrant(str(c.fields.grant));
  if (!gr) return { error: `No visa or permit ${str(c.fields.grant) || '(none given)'}` };
  const r = changeGrant(gr.id, { state: 'revoked', reason: c.pending?.reason ?? `Revoked (${c.ref})`, case: c.id }, actor.name, now);
  if ('error' in r) return r;
  return { facts: { number: r.number, revoked: true } };
});

registerEffect('immigration.issueDocument', ({ case: c, actor }: EffectContext) => {
  const gr = grantOfCase(c.id);
  const decision = c.decisions[c.decisions.length - 1];
  if (!gr || gr.state === 'refused' || !decision) return { error: 'Only a granted visa or permit has a document' };
  // Anyone holding the code can check validity; the holder's name is not on the public check.
  const cert = issueCertificate({ kind: gr.kind, title: gr.kind === 'visa' ? 'Visa' : 'Residence permit', decision, publicFacts: { 'Number': gr.number, 'Category': gr.category, 'Valid from': gr.validFrom ?? '', 'Valid until': gr.validUntil ?? '', ...(gr.entries ? { 'Entries': gr.entries } : {}) } }, actor.name);
  if ('error' in cert) return { error: cert.error };
  attachGrantCertificate(gr.id, cert.code);
  return { facts: { certificate: cert.code } };
});

const HOLDER: CasePackage['fields'] = [
  { key: 'holderName', label: 'Name as in the travel document', type: 'text', required: true, personal: true },
  { key: 'nationality', label: 'Nationality (ISO 3166-1 alpha-3)', type: 'text', required: true, personal: true },
  { key: 'documentNumber', label: 'Travel document number', type: 'text', required: true, personal: true },
  { key: 'birthDate', label: 'Date of birth', type: 'date', personal: true },
];
const VALIDITY: CasePackage['fields'] = [
  { key: 'validFrom', label: 'Valid from', type: 'date', required: true },
  { key: 'validUntil', label: 'Valid until', type: 'date', required: true },
  { key: 'conditions', label: 'Conditions (one per line)', type: 'longtext' },
];
const REFUSED_STAGE = { key: 'not-granted', label: 'Refused', terminal: true };
const APPEAL = { days: 30, body: 'the immigration appeals tribunal', suspensive: false };

export const REFERENCE_VISA: Ref = {
  key: 'immigration.visa', version: 1, owner: 'immigration', title: 'Visa application', refPrefix: 'VIA', reference: true, citations: [],
  fields: [...HOLDER, { key: 'category', label: 'Category', type: 'choice', options: [...VISA_CATEGORIES], required: true }, { key: 'purpose', label: 'Purpose of the visit', type: 'longtext', personal: true }, { key: 'entries', label: 'Entries', type: 'choice', options: ['single', 'multiple'] }, { key: 'sponsor', label: 'Host or sponsor', type: 'text', personal: true }, ...VALIDITY],
  documents: [
    { class: 'travel-document', label: 'Copy of the travel document', required: true },
    { class: 'photograph', label: 'Photograph', required: true },
    { class: 'invitation', label: 'Invitation or sponsor letter', required: false },
    { class: 'financial-evidence', label: 'Evidence of means', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'completeness', label: 'Completeness check' }, { key: 'returned', label: 'Returned for correction' },
    { key: 'verification', label: 'Verification' }, { key: 'assessment', label: 'Assessment' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'issued', label: 'Issued' }, { key: 'document-issued', label: 'Visa document issued', terminal: true }, REFUSED_STAGE,
  ],
  actions: [
    { key: 'check', label: 'Check completeness', from: ['submitted'], to: 'completeness', needs: { role: 'officer', assigned: true } },
    { key: 'return', label: 'Return for correction', from: ['completeness', 'verification'], to: 'returned', needs: { role: 'officer', assigned: true }, requires: { reasons: true } },
    { key: 'resubmit', label: 'Corrected: check again', from: ['returned'], to: 'completeness', needs: { role: 'officer', assigned: true } },
    { key: 'complete', label: 'Complete: verify the documents', from: ['completeness'], to: 'verification', needs: { role: 'officer', assigned: true }, requires: { documents: ['travel-document', 'photograph'], fields: ['holderName', 'nationality', 'documentNumber', 'category'] } },
    { key: 'verify', label: 'Documents verified: assess', from: ['verification'], to: 'assessment', needs: { role: 'officer', assigned: true } },
    { key: 'assess', label: 'Assessed: propose the decision', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer', assigned: true }, requires: { reasons: true, fields: ['validFrom', 'validUntil'] }, effects: ['immigration.check'] },
    { key: 'grant', label: 'Grant the visa', from: ['pending-approval'], to: 'issued', decision: 'grant', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['immigration.grant'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-granted', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['immigration.refuse'] },
    { key: 'issue', label: 'Issue the visa document', from: ['issued'], to: 'document-issued', needs: { role: 'officer' }, effects: ['immigration.issueDocument'] },
  ],
  deadlines: [{ key: 'decide', label: 'Decide within 15 working days', from: 'opened', days: 15, calendar: 'working', onLapse: 'escalate' }],
  notifications: [], appeal: APPEAL, retention: 'immigration-application', sensitivity: 'restricted',
  tests: [
    { name: 'granted', steps: [
      { action: 'check', expect: 'completeness' },
      { action: 'complete', fields: { holderName: 'A', nationality: 'GHA', documentNumber: 'G1', category: 'business' }, documents: ['travel-document', 'photograph'], expect: 'verification' },
      { action: 'verify', expect: 'assessment' },
      { action: 'assess', expect: 'refused' },
      { action: 'assess', fields: { validFrom: '2026-11-01', validUntil: '2027-01-31' }, expect: 'pending-approval' },
      { action: 'grant', expect: 'issued' }, { action: 'issue', expect: 'document-issued' },
    ] },
    { name: 'refused', steps: [
      { action: 'check', expect: 'completeness' },
      { action: 'complete', fields: { holderName: 'A', nationality: 'GHA', documentNumber: 'G1', category: 'business' }, documents: ['travel-document', 'photograph'], expect: 'verification' },
      { action: 'verify', expect: 'assessment' },
      { action: 'assess', fields: { validFrom: '2026-11-01', validUntil: '2027-01-31' }, expect: 'pending-approval' },
      { action: 'refuse', expect: 'not-granted' },
    ] },
  ],
};

export const REFERENCE_RESIDENCE_PERMIT: Ref = {
  ...REFERENCE_VISA, key: 'immigration.residence-permit', title: 'Residence permit application', refPrefix: 'RPA',
  fields: [...HOLDER, { key: 'category', label: 'Category', type: 'choice', options: [...PERMIT_CATEGORIES], required: true }, { key: 'legalBasis', label: 'Ground of the application (as the law names it)', type: 'text', required: true }, { key: 'sponsor', label: 'Employer, school or family sponsor', type: 'text', personal: true }, ...VALIDITY],
  documents: [
    { class: 'travel-document', label: 'Copy of the travel document', required: true },
    { class: 'photograph', label: 'Photograph', required: true },
    { class: 'eligibility-evidence', label: 'Evidence of eligibility (contract, enrolment, family relationship, means)', required: true },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verified' }, { key: 'returned', label: 'Returned for correction' },
    { key: 'assessment', label: 'Assessed' }, { key: 'pending-approval', label: 'Decision' }, { key: 'issued', label: 'Granted' },
    { key: 'document-issued', label: 'Permit issued', terminal: true }, REFUSED_STAGE,
  ],
  actions: [
    { key: 'verify', label: 'Verify the documents', from: ['submitted'], to: 'verification', needs: { role: 'officer', assigned: true }, requires: { documents: ['travel-document', 'photograph', 'eligibility-evidence'], fields: ['holderName', 'nationality', 'documentNumber', 'category', 'legalBasis'] } },
    { key: 'return', label: 'Return for correction', from: ['submitted', 'verification'], to: 'returned', needs: { role: 'officer', assigned: true }, requires: { reasons: true } },
    { key: 'resubmit', label: 'Corrected: verify again', from: ['returned'], to: 'submitted', needs: { role: 'officer', assigned: true } },
    { key: 'assess', label: 'Eligibility assessed', from: ['verification'], to: 'assessment', needs: { role: 'officer', assigned: true }, requires: { reasons: true } },
    { key: 'propose', label: 'Propose the decision', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer', assigned: true }, requires: { fields: ['validFrom', 'validUntil'] }, effects: ['immigration.check'] },
    { key: 'grant', label: 'Grant the permit', from: ['pending-approval'], to: 'issued', decision: 'grant', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['immigration.grant'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-granted', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['immigration.refuse'] },
    { key: 'issue', label: 'Issue the permit document', from: ['issued'], to: 'document-issued', needs: { role: 'officer' }, effects: ['immigration.issueDocument'] },
  ],
  deadlines: [{ key: 'decide', label: 'Decide within 60 days', from: 'opened', days: 60, calendar: 'calendar', onLapse: 'escalate' }],
  retention: 'immigration-residence',
  tests: [
    { name: 'granted', steps: [
      { action: 'verify', fields: { holderName: 'A', nationality: 'GHA', documentNumber: 'G1', category: 'work', legalBasis: 'Employment' }, documents: ['travel-document', 'photograph', 'eligibility-evidence'], expect: 'verification' },
      { action: 'assess', expect: 'assessment' },
      { action: 'propose', fields: { validFrom: '2026-11-01', validUntil: '2028-10-31' }, expect: 'pending-approval' },
      { action: 'grant', expect: 'issued' }, { action: 'issue', expect: 'document-issued' },
    ] },
    { name: 'returned and refused', steps: [
      { action: 'verify', expect: 'refused' }, { action: 'return', expect: 'returned' }, { action: 'resubmit', expect: 'submitted' },
      { action: 'verify', fields: { holderName: 'A', nationality: 'GHA', documentNumber: 'G1', category: 'work', legalBasis: 'Employment' }, documents: ['travel-document', 'photograph', 'eligibility-evidence'], expect: 'verification' },
      { action: 'assess', expect: 'assessment' },
      { action: 'propose', fields: { validFrom: '2026-11-01', validUntil: '2028-10-31' }, expect: 'pending-approval' },
      { action: 'refuse', expect: 'not-granted' },
    ] },
  ],
};

const GRANT_FIELD = { key: 'grant', label: 'Visa or permit number', type: 'text' as const, required: true };

export const REFERENCE_EXTENSION: Ref = {
  key: 'immigration.extension', version: 1, owner: 'immigration', title: 'Extension of a visa or permit', refPrefix: 'EXT', reference: true, citations: [],
  fields: [GRANT_FIELD, { key: 'newValidUntil', label: 'Extended until', type: 'date', required: true }, { key: 'grounds', label: 'Grounds', type: 'longtext', personal: true }],
  documents: [{ class: 'extension-evidence', label: 'Evidence for the extension', required: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'assessment', label: 'Assessment' }, { key: 'pending-approval', label: 'Decision' }, { key: 'extended', label: 'Extended', terminal: true }, REFUSED_STAGE],
  actions: [
    { key: 'assess', label: 'Assess', from: ['submitted'], to: 'assessment', needs: { role: 'officer', assigned: true }, requires: { fields: ['grant', 'newValidUntil'], documents: ['extension-evidence'] } },
    { key: 'propose', label: 'Propose the decision', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer', assigned: true }, requires: { reasons: true } },
    { key: 'extend', label: 'Extend', from: ['pending-approval'], to: 'extended', decision: 'extend', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['immigration.extend'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-granted', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'decide', label: 'Decide within 30 days', from: 'opened', days: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: APPEAL, retention: 'immigration-application', sensitivity: 'restricted',
  tests: [{ name: 'extended', steps: [{ action: 'assess', fields: { grant: 'VIS-1', newValidUntil: '2027-06-30' }, documents: ['extension-evidence'], expect: 'assessment' }, { action: 'propose', expect: 'pending-approval' }, { action: 'extend', expect: 'extended' }] }],
};

export const REFERENCE_REVOCATION: Ref = {
  key: 'immigration.revocation', version: 1, owner: 'immigration', title: 'Revocation of a visa or permit', refPrefix: 'IRV', reference: true, citations: [],
  fields: [GRANT_FIELD, { key: 'grounds', label: 'Grounds', type: 'longtext', required: true, personal: true }],
  documents: [{ class: 'grounds-evidence', label: 'Evidence of the grounds', required: true }, { class: 'representations', label: 'The holder\'s representations', required: false }],
  stages: [{ key: 'opened', label: 'Opened' }, { key: 'notice', label: 'Notice given: representations' }, { key: 'pending-approval', label: 'Decision' }, { key: 'revoked', label: 'Revoked', terminal: true }, { key: 'closed', label: 'Closed without revocation', terminal: true }],
  actions: [
    { key: 'notify', label: 'Give notice and invite representations', from: ['opened'], to: 'notice', needs: { role: 'officer', assigned: true }, requires: { fields: ['grant', 'grounds'], documents: ['grounds-evidence'], reasons: true } },
    { key: 'propose', label: 'Representations considered: propose', from: ['notice'], to: 'pending-approval', needs: { role: 'officer', assigned: true }, requires: { reasons: true } },
    { key: 'revoke', label: 'Revoke', from: ['pending-approval'], to: 'revoked', decision: 'revoke', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['immigration.revoke'] },
    { key: 'close', label: 'Close without revocation', from: ['notice', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'representations', label: 'Representations within 14 days of notice', from: 'notice', days: 14, calendar: 'calendar', onLapse: 'notify' }],
  notifications: [], appeal: { ...APPEAL, suspensive: true }, retention: 'immigration-application', sensitivity: 'restricted',
  tests: [
    { name: 'revoked after representations', steps: [{ action: 'notify', fields: { grant: 'VIS-1', grounds: 'x' }, documents: ['grounds-evidence'], expect: 'notice' }, { action: 'propose', expect: 'pending-approval' }, { action: 'revoke', expect: 'revoked' }] },
    { name: 'closed', steps: [{ action: 'notify', fields: { grant: 'VIS-1', grounds: 'x' }, documents: ['grounds-evidence'], expect: 'notice' }, { action: 'close', expect: 'closed' }] },
  ],
};

// The specification's form (immigration.residence-permit), attached to the procedure's own fields and documents (lib/forms/library); still a draft the nation approves.
Object.assign(REFERENCE_RESIDENCE_PERMIT, attachForm(REFERENCE_RESIDENCE_PERMIT.fields, REFERENCE_RESIDENCE_PERMIT.documents, libraryForm('immigration.residence-permit')));

export const IMMIGRATION_PROCEDURES: Ref[] = [REFERENCE_VISA, REFERENCE_RESIDENCE_PERMIT, REFERENCE_EXTENSION, REFERENCE_REVOCATION];

export function installImmigrationProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of IMMIGRATION_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}

// Regulated professionals on the workflow foundation (owner's Cycle 3
// directive, workstream 3). Reference procedures, drafts for the regulator to
// adapt to its law and approve: registration (qualifications from the
// education register checked against the name), renewal, suspension with
// reinstatement, and revocation after notice and representations. Four-eyes
// on every decision. The regulator that keeps a profession's register acts
// on it; when an approved permit authority mapping governs the profession's
// permit type, that mapping decides, and a production installation needs it.

import { libraryForm } from '@/lib/forms/library/definitions';
import { attachForm } from '@/lib/forms/library/build';
import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';
import { issueCertificate } from '@/lib/records/certificates';
import { powerRefusal, mappingInForce } from '@/lib/permits/authority';
import { samplesAllowed } from '@/lib/ops/mode';
import { profession, registerProfessional, setProfessionalState, getProfessional, professionalOfCase, attachProfessionalDecision, attachProfessionalCertificate, checkQualifications, type ProfessionalState } from './register';
import type { Case, CasePackage } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown) => str(v).split(/[;\n,]/).map(x => x.trim()).filter(Boolean).slice(0, 20);

/** May this case's institution use this power over this profession's register? */
function mayAct(c: Case, key: string, power: 'issue' | 'renew' | 'suspend' | 'revoke'): string | null {
  const p = profession(key);
  if (!p) return `No profession ${key || '(none given)'}`;
  const resolve = (a: string) => ownerInstitution(a, authorityFor);
  const why = powerRefusal(p.permitType, power, c.owner, resolve, { required: !samplesAllowed() });
  if (why) return why;
  if (mappingInForce(p.permitType)) return null;
  return resolve(p.authority) === c.owner ? null : `The register of ${p.title.toLowerCase()} is kept by another authority`;
}

const professionOf = (c: Case) => str(c.fields.profession) || getProfessional(str(c.fields.professional))?.profession || '';

registerEffect('prof.check', ({ case: c }: EffectContext) => {
  const why = mayAct(c, str(c.fields.profession), 'issue');
  if (why) return { error: why };
  const bad = checkQualifications(str(c.fields.name), list(c.fields.qualifications));
  if (bad) return { error: bad };
});

registerEffect('prof.register', ({ case: c, actor, now }: EffectContext) => {
  const why = mayAct(c, str(c.fields.profession), 'issue');
  if (why) return { error: why };
  const e = registerProfessional({ profession: str(c.fields.profession), personRef: str(c.fields.personRef), name: str(c.fields.name), qualifications: list(c.fields.qualifications), ...(str(c.fields.validUntil) ? { validUntil: str(c.fields.validUntil) } : {}), conditions: list(c.fields.conditions) }, c.id, actor.name, now);
  if ('error' in e) return e;
  return { facts: { professional: e.number, profession: e.profession }, after: (d?: { id: string }) => { if (d) attachProfessionalDecision(e.number, d.id); } };
});

/** A decided change of standing, checked against the power it uses. */
function change(power: 'renew' | 'suspend' | 'revoke', state: ProfessionalState) {
  return ({ case: c, actor, now }: EffectContext) => {
    const why = mayAct(c, professionOf(c), power);
    if (why) return { error: why };
    const number = str(c.fields.professional);
    const e = setProfessionalState(number, { state, reason: c.pending?.reason || str(c.fields.grounds) || state, ...(str(c.fields.validUntil) ? { validUntil: str(c.fields.validUntil) } : {}), ...(str(c.fields.conditions) ? { conditions: list(c.fields.conditions) } : {}) }, c.id, actor.name, now);
    if ('error' in e) return e;
    return { facts: { professional: e.number, standing: e.state }, after: (d?: { id: string }) => { if (d) attachProfessionalDecision(e.number, d.id); } };
  };
}
registerEffect('prof.renew', change('renew', 'registered'));
registerEffect('prof.suspend', change('suspend', 'suspended'));
// Reinstatement after a suspension uses the suspending power.
registerEffect('prof.reinstate', change('suspend', 'registered'));
registerEffect('prof.revoke', change('revoke', 'revoked'));

registerEffect('prof.issueCertificate', ({ case: c, actor }: EffectContext) => {
  const e = professionalOfCase(c.id);
  const decision = c.decisions[c.decisions.length - 1];
  if (!e || !decision) return { error: 'The registration must be decided before its certificate is issued' };
  if (e.state !== 'registered') return { error: 'Only a current registration has a certificate' };
  const cert = issueCertificate({ kind: 'professional-registration', title: `Registration: ${profession(e.profession)?.title ?? e.profession}`, decision, publicFacts: { 'Registration number': e.number, 'Name': e.name, 'Profession': profession(e.profession)?.title ?? e.profession, 'Standing': 'registered', ...(e.validUntil ? { 'Valid until': e.validUntil } : {}), ...(e.conditions.length ? { 'Conditions': e.conditions.join('; ') } : {}) } }, actor.name);
  if ('error' in cert) return cert;
  attachProfessionalCertificate(e.number, cert.code);
  return { facts: { certificate: cert.code } };
});

const base = { owner: 'professionalRegulation', reference: true as const, citations: [], notifications: [], retention: 'professional-register-permanent', sensitivity: 'normal' as const };
const PRO_FIELD = { key: 'professional', label: 'Registration number', type: 'text' as const, required: true };
const decide = (key: string, label: string, to: string, effect: string): CasePackage['actions'][number] => ({ key, label, from: ['pending-approval'], to, decision: key, needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: [effect] });

export const REFERENCE_PROFESSIONAL_REGISTRATION: Ref = {
  ...base, key: 'prof.registration', version: 1, title: 'Registration of a health professional', refPrefix: 'PRR',
  fields: [
    { key: 'profession', label: 'Profession (as configured, e.g. nurse)', type: 'text', required: true },
    { key: 'personRef', label: 'Person reference', type: 'person', required: true, personal: true },
    { key: 'name', label: 'Name as on the register', type: 'text', required: true },
    { key: 'qualifications', label: 'Qualifications (QUA- numbers from the education register, or as stated)', type: 'longtext' },
    { key: 'validUntil', label: 'Valid until (as the law sets it; none: until revoked)', type: 'date' },
    { key: 'conditions', label: 'Conditions (one per line)', type: 'longtext' },
  ],
  documents: [{ class: 'qualification-evidence', label: 'Qualification evidence', required: true }, { class: 'identity-evidence', label: 'Identity evidence', required: true }, { class: 'good-standing', label: 'Certificate of good standing (registered elsewhere)', required: false }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verification' }, { key: 'pending-approval', label: 'Decision' }, { key: 'registered', label: 'Registered' }, { key: 'certificate-issued', label: 'Certificate issued', terminal: true }, { key: 'not-registered', label: 'Refused', terminal: true }],
  actions: [
    { key: 'check', label: 'Check the documents', from: ['submitted'], to: 'verification', needs: { role: 'officer' }, requires: { documents: ['qualification-evidence', 'identity-evidence'], fields: ['profession', 'personRef', 'name'] } },
    { key: 'verify', label: 'Qualifications verified: propose', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' }, effects: ['prof.check'] },
    decide('register', 'Register', 'registered', 'prof.register'),
    { key: 'refuse', label: 'Refuse, with reasons', from: ['verification', 'pending-approval'], to: 'not-registered', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'issue', label: 'Issue the certificate', from: ['registered'], to: 'certificate-issued', needs: { role: 'officer' }, effects: ['prof.issueCertificate'] },
  ],
  deadlines: [{ key: 'decide', label: 'Decide within the time the law sets', from: 'opened', sampleDays: 30, calendar: 'working', onLapse: 'escalate' }],
  appeal: { sampleDays: 30, body: 'the professional regulator\'s appeals body', suspensive: false },
  tests: [
    { name: 'registered', steps: [{ action: 'check', fields: { profession: 'nurse', personRef: 'P-1', name: 'A' }, documents: ['qualification-evidence', 'identity-evidence'], expect: 'verification' }, { action: 'verify', expect: 'pending-approval' }, { action: 'register', expect: 'registered' }, { action: 'issue', expect: 'certificate-issued' }] },
    { name: 'refused', steps: [{ action: 'check', fields: { profession: 'nurse', personRef: 'P-1', name: 'A' }, documents: ['qualification-evidence', 'identity-evidence'], expect: 'verification' }, { action: 'refuse', expect: 'not-registered' }] },
  ],
};

export const REFERENCE_PROFESSIONAL_RENEWAL: Ref = {
  ...base, key: 'prof.renewal', version: 1, title: 'Renewal of a professional registration', refPrefix: 'PRW',
  fields: [PRO_FIELD, { key: 'validUntil', label: 'Renewed until (as the law sets it)', type: 'date' }, { key: 'conditions', label: 'Conditions (one per line; empty keeps them)', type: 'longtext' }],
  documents: [{ class: 'renewal-evidence', label: 'Evidence for renewal (e.g. continuing professional development)', required: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'pending-approval', label: 'Decision' }, { key: 'renewed', label: 'Renewed', terminal: true }, { key: 'not-renewed', label: 'Refused', terminal: true }],
  actions: [
    { key: 'propose', label: 'Evidence checked: propose', from: ['submitted'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['renewal-evidence'], fields: ['professional'] } },
    decide('renew', 'Renew', 'renewed', 'prof.renew'),
    { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-renewed', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [], appeal: { sampleDays: 30, body: 'the professional regulator\'s appeals body', suspensive: false },
  tests: [{ name: 'renewed', steps: [{ action: 'propose', fields: { professional: 'PRN-1' }, documents: ['renewal-evidence'], expect: 'pending-approval' }, { action: 'renew', expect: 'renewed' }] }],
};

export const REFERENCE_PROFESSIONAL_FITNESS: Ref = {
  ...base, key: 'prof.fitness', version: 1, title: 'Fitness to practise: suspension, reinstatement or revocation', refPrefix: 'PRF',
  fields: [PRO_FIELD, { key: 'grounds', label: 'Grounds', type: 'longtext' }, { key: 'conditions', label: 'Conditions on reinstatement (one per line)', type: 'longtext' }],
  documents: [{ class: 'grounds', label: 'Grounds (complaint, finding, report)', required: true }, { class: 'representations', label: 'The professional\'s representations', required: false }],
  stages: [{ key: 'opened', label: 'Opened' }, { key: 'hearing', label: 'Notice given: representations' }, { key: 'pending-approval', label: 'Decision' }, { key: 'suspended', label: 'Suspended' }, { key: 'reinstated', label: 'Reinstated', terminal: true }, { key: 'revoked', label: 'Revoked', terminal: true }, { key: 'closed', label: 'Closed without action', terminal: true }],
  actions: [
    { key: 'notify', label: 'Give notice and invite representations', from: ['opened'], to: 'hearing', needs: { role: 'officer' }, requires: { fields: ['professional'], documents: ['grounds'], reasons: true } },
    { key: 'propose', label: 'Representations considered: propose', from: ['hearing'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    decide('suspend', 'Suspend', 'suspended', 'prof.suspend'),
    { key: 'revoke', label: 'Revoke', from: ['pending-approval', 'suspended'], to: 'revoked', decision: 'revoke', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['prof.revoke'] },
    { key: 'reinstate', label: 'Reinstate', from: ['suspended'], to: 'reinstated', decision: 'reinstate', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['prof.reinstate'] },
    { key: 'close', label: 'Close without action', from: ['hearing', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'representations', label: 'Representations within the time the law sets, from notice', from: 'hearing', sampleDays: 21, calendar: 'calendar', onLapse: 'notify' }],
  appeal: { sampleDays: 30, body: 'the professional regulator\'s appeals body', suspensive: true },
  tests: [
    { name: 'suspended then reinstated', steps: [{ action: 'notify', fields: { professional: 'PRN-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'propose', expect: 'pending-approval' }, { action: 'suspend', expect: 'suspended' }, { action: 'reinstate', expect: 'reinstated' }] },
    { name: 'revoked', steps: [{ action: 'notify', fields: { professional: 'PRN-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'propose', expect: 'pending-approval' }, { action: 'revoke', expect: 'revoked' }] },
  ],
};

// The specification's form (professional-licensing.initial-application), attached to the procedure's own fields and documents (lib/forms/library); still a draft the nation approves.
Object.assign(REFERENCE_PROFESSIONAL_REGISTRATION, attachForm(REFERENCE_PROFESSIONAL_REGISTRATION.fields, REFERENCE_PROFESSIONAL_REGISTRATION.documents, libraryForm('professional-licensing.initial-application')));

export const PROFESSION_PROCEDURES: Ref[] = [REFERENCE_PROFESSIONAL_REGISTRATION, REFERENCE_PROFESSIONAL_RENEWAL, REFERENCE_PROFESSIONAL_FITNESS];

export function installProfessionProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of PROFESSION_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}

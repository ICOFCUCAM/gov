// Citizenship and nationality on the workflow foundation (field series Part 4
// §6 NAT-APP-001 … 012; CFG-NAT-001; plan step I6). One reference procedure,
// a draft the nation adapts and a second official approves, kept by the
// competent authority the nation names for the `citizenship` slot. The field
// series calls these optional "until the country confirms which citizenship
// procedures exist and which institution has jurisdiction": the slot ships
// empty, so no case opens until the nation names that authority, and the
// procedure applies only once approved under its own law.
//
// Critical boundary (Part 4 §6): a national identity number, birthplace,
// passport, a parent's record or an immigration status is never treated as
// conclusive proof of citizenship unless the nation's law expressly gives it
// that effect. The procedure therefore records the grounds claimed, the
// evidence, and the competent official's assessment of each criterion the law
// names; the determination is the authority's, by two officials, with
// reasons and the review route. Nothing here reads another register to infer
// citizenship, and nothing is decided automatically or by AI.
//
// The determination is the sealed decision itself; a certificate follows a
// favourable determination (lib/records/certificates.ts, checked at /verify,
// carrying no name). There is no separate citizenship register on the platform
// yet: verification (NAT-APP-011) and record correction (NAT-APP-008) are not
// built (integration register 22.x).

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { issueCertificate } from '@/lib/records/certificates';
import type { CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** The permit type whose approved mapping governs the determination (lib/permits/decisions.ts reads it). */
export const CITIZENSHIP_PERMITS: Record<string, string> = { 'citizenship.application': 'citizenship-determination' };
export const CITIZENSHIP_KINDS = ['descent', 'birth-determination', 'naturalisation', 'registration', 'status-determination', 'certificate', 'certificate-replacement', 'renunciation'] as const;
export const OUTCOMES = ['citizen', 'not-citizen', 'renunciation-registered', 'undetermined'] as const;

registerEffect('citizenship.checkDetermination', ({ case: c }: EffectContext) => {
  if (!OUTCOMES.includes(str(c.fields.outcome) as never)) return { error: `The determination is one of ${OUTCOMES.join(', ')}` };
  if (!str(c.fields.criteriaAssessment)) return { error: 'Record the assessment of each criterion the nation\'s law names (an identity number, birthplace, passport or a parent\'s record is not conclusive proof unless the law says so)' };
  return { facts: { outcome: str(c.fields.outcome) } };
});

registerEffect('citizenship.issueCertificate', ({ case: c, actor }: EffectContext) => {
  const decision = c.decisions.at(-1);
  if (!decision || c.history.findLast(h => h.decision)?.action !== 'determine') return { error: 'The certificate follows the determination' };
  if (!['citizen', 'renunciation-registered'].includes(str(c.fields.outcome))) return { error: 'A certificate follows a determination of citizenship or a registered renunciation only' };
  // What anyone with its code may check: the kind, the date, the deciding authority; never the person's name.
  const cert = issueCertificate({ kind: 'citizenship', title: str(c.fields.outcome) === 'citizen' ? 'Certificate of citizenship' : 'Certificate of renunciation', decision, publicFacts: { 'Case reference': c.ref, 'Determined on': (c.history.findLast(h => h.decision)?.at ?? '').slice(0, 10) } }, actor.name);
  if ('error' in cert) return { error: cert.error };
  return { facts: { certificate: cert.code } };
});

const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });

export const REFERENCE_CITIZENSHIP: Ref = {
  reference: true, citations: [], notifications: [], deadlines: [], retention: 'citizenship-record', sensitivity: 'restricted', owner: 'citizenship',
  key: 'citizenship.application', version: 1, title: 'Citizenship or nationality application and determination', refPrefix: 'NAT',
  fields: [
    adm('applicationKind', 'What is applied for', 'choice', { options: [...CITIZENSHIP_KINDS], required: true }),
    r('applicantName', 'Applicant\'s full name', 'text', { required: true }),
    r('identityNumber', 'Identity record number, if the applicant has one (not proof of citizenship)'),
    r('civilRegistration', 'Civil register entry, if any (not proof of citizenship)'),
    r('groundsClaimed', 'The grounds claimed, as the nation\'s law names them', 'longtext', { required: true, hint: 'Name the provision relied on. Possession of an identity document, a passport or a birthplace is not conclusive unless the law gives it that effect.' }),
    r('criteriaAssessment', 'Assessment of each criterion the law names, with the evidence relied on and what remains unresolved', 'longtext'),
    adm('outcome', 'Determination', 'choice', { options: [...OUTCOMES] }),
    adm('reviewRoute', 'Review or appeal route open to the applicant (as the nation\'s law gives it)'),
  ],
  documents: [
    { class: 'application', label: 'The application as received', required: true },
    { class: 'evidence', label: 'Evidence of the grounds claimed (issuer, reference, verification)', required: true, multiple: true },
    { class: 'assessment-record', label: 'The assessment record', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Application registered' }, { key: 'evidence', label: 'Evidence and eligibility review' }, { key: 'evidence-requested', label: 'Further evidence requested' },
    { key: 'pending-approval', label: 'Determination by the competent authority' }, { key: 'determined', label: 'Determined' },
    { key: 'certified', label: 'Determined; certificate issued', terminal: true }, { key: 'closed', label: 'Determined; closed', terminal: true }, { key: 'withdrawn', label: 'Withdrawn by the applicant', terminal: true },
  ],
  actions: [
    { key: 'review-evidence', label: 'Register and review the evidence', from: ['submitted'], to: 'evidence', needs: { role: 'officer' }, requires: { fields: ['applicationKind', 'applicantName', 'groundsClaimed'], documents: ['application', 'evidence'] } },
    { key: 'request-evidence', label: 'Request further evidence', from: ['evidence'], to: 'evidence-requested', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'evidence-received', label: 'Further evidence received', from: ['evidence-requested'], to: 'evidence', needs: { role: 'officer' } },
    { key: 'propose', label: 'Assessment recorded: propose the determination', from: ['evidence'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['criteriaAssessment', 'outcome'], reasons: true }, effects: ['citizenship.checkDetermination'] },
    { key: 'determine', label: 'Determine, with reasons and the review route (two officials)', from: ['pending-approval'], to: 'determined', decision: 'determine', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], reasons: true }, effects: ['citizenship.checkDetermination'] },
    { key: 'certify', label: 'Issue the certificate', from: ['determined'], to: 'certified', needs: { role: 'officer' }, effects: ['citizenship.issueCertificate'] },
    { key: 'close', label: 'Close (no certificate follows)', from: ['determined'], to: 'closed', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'withdraw', label: 'Withdrawn at the applicant\'s request', from: ['submitted', 'evidence', 'evidence-requested'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'determined and certified', steps: [
      { action: 'review-evidence', fields: { applicationKind: 'descent', applicantName: 'A', groundsClaimed: 'x' }, documents: ['application', 'evidence'], expect: 'evidence' },
      { action: 'propose', expect: 'refused' },
      { action: 'propose', fields: { criteriaAssessment: 'x', outcome: 'citizen' }, expect: 'pending-approval' },
      { action: 'determine', fields: { reviewRoute: 'x' }, expect: 'determined' }, { action: 'certify', expect: 'certified' },
    ] },
  ],
};

export const CITIZENSHIP_PROCEDURES: Ref[] = [REFERENCE_CITIZENSHIP];

export function installCitizenshipProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const x of CITIZENSHIP_PROCEDURES) {
    if (listPackages({ key: x.key }).length) { present.push(x.key); continue; }
    const d = draftPackage(x, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(x.key);
  }
  return { drafted, present };
}

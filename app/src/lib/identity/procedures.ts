// The identity authority's procedures (Institutional specification Part 2
// §A.2 and §C.1; field series Part 4 §3 IDN-REG, IDN-CARD, IDN-VER, IDN-SEC;
// plan step I6). Reference procedures, drafts the nation adapts and a second
// official approves; the identity authority is the institution the nation
// names for the `identity` slot (never assumed).
//
//   identity.enrolment          an identity application: eligibility, evidence and verification, a duplicate review where
//                               a candidate exists, then the enrolment decision (IDN-REG-001 … 005)
//   identity.credential         a credential: first, renewal or replacement; decided, produced, delivered (IDN-CARD-001, 002, 004, 005)
//   identity.credential-status  a lost, stolen or damaged credential report; suspension, revocation after notice,
//                               reinstatement, cancellation and status correction (IDN-CARD-003, 006, 007)
//   identity.resolution         a suspected duplicate, misuse or compromise, a recovery request or a verification dispute:
//                               containment, comparison and an official's determination (IDN-SEC-001 … 003, IDN-VER-003)
//
// What they share:
//   - A candidate duplicate is a flag: the enrolment cannot be proposed until an
//     official who can sign records a determination with reasons; a
//     determination about two records is a four-eyes decision. Nothing is merged.
//   - A lost or stolen report is recorded as a report, not proof of fraud; what
//     happens to the credential is decided with reasons.
//   - No biometric field, template, match score or risk score (field series
//     Part 4 §3.4; CFG-IDN-004 needs a legal review first, plan I11). AI decides nothing.
//   - Every decision is classified under a proposed, unapproved mapping
//     (IDENTITY_PERMITS, lib/permits/decisions.ts): refused in production until
//     the nation approves its own. No day count ships.

import { registerEffect, registeredEffects, sampleMark, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { getDocument } from '@/lib/records/documents';
import {
  enrolIdentity, attachIdentityDecision, findCandidates, checkEnrolment, requestCredential, recordProduction, recordDelivery, changeCredential,
  markReview, recordDetermination, attachDeterminationDecision, getIdentity, getCredential, credentialHolder, credentialMoveRefusal, DETERMINATIONS,
  type CredentialState, type Determination, type EnrolInput,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const lines = (v: unknown): string[] => str(v).split(/[\n;,]/).map(x => x.trim()).filter(Boolean);
const who = (ctx: EffectContext) => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name });
/** The reasons of the step just taken (the case as it stands after it). */
const reasonOf = (done: Case, fallback: string) => done.history.at(-1)?.reason ?? fallback;

/** The permit type whose approved mapping governs each family's decisions (lib/permits/decisions.ts reads it). */
export const IDENTITY_PERMITS: Record<string, string> = {
  'identity.enrolment': 'identity-enrolment',
  'identity.credential': 'identity-credential',
  'identity.resolution': 'identity-resolution',
};

const enrolInput = (c: Case): EnrolInput => {
  const f = c.fields;
  return {
    givenNames: str(f.givenNames), familyName: str(f.familyName), birthDate: str(f.birthDate),
    ...(str(f.sex) ? { sex: str(f.sex) } : {}), ...(str(f.birthPlace) ? { birthPlace: str(f.birthPlace) } : {}), ...(str(f.nationality) ? { nationality: str(f.nationality) } : {}),
    ...(str(f.civilRegistration) ? { civilRegistration: str(f.civilRegistration), linkBasis: str(f.linkBasis) } : {}),
    verifiedFrom: str(f.civilRegistration) ? 'civil-register' : 'evidence',
    eligibility: { rule: str(f.eligibilityRule), outcome: str(f.eligibilityOutcome) },
  };
};
const candidatesOf = (c: Case) => findCandidates({ civilRegistration: str(c.fields.civilRegistration) || undefined, givenNames: str(c.fields.givenNames), familyName: str(c.fields.familyName), birthDate: str(c.fields.birthDate) });

// ── Enrolment ────────────────────────────────────────────────────────────────

registerEffect('identity.noteCandidates', ({ case: c }: EffectContext) => {
  const m = candidatesOf(c);
  if (!m.length) return { error: 'No record of the register may be the same person: there is nothing to determine' };
  const outcome = str(c.fields.duplicateOutcome);
  if (!DETERMINATIONS.includes(outcome as Determination)) return { error: `The determination is one of ${DETERMINATIONS.join(', ')}` };
  return { facts: { candidates: m.map(x => x.number).join(', '), determination: outcome } };
});

registerEffect('identity.checkEnrolment', ({ case: c }: EffectContext) => {
  const why = checkEnrolment(enrolInput(c));
  if (why) return { error: why };
  if (str(c.fields.verificationResult) !== 'verified') return { error: 'The identity evidence is not verified: record what is missing and request it (an unverified fact is never turned into a refusal or an identity)' };
  if (str(c.fields.eligibilityOutcome) !== 'eligible') return { error: 'The eligibility review did not find the applicant eligible: refuse or refer with reasons' };
  const m = candidatesOf(c);
  const determined = c.history.some(h => h.action === 'determine-duplicate') && str(c.fields.duplicateOutcome) === 'different-persons';
  if (m.length && !determined) return { error: `Possible duplicate of ${m.map(x => `${x.number} (${x.why})`).join(', ')}: an official who can sign determines it with reasons first (never a merge)` };
});

registerEffect('identity.enrol', (ctx: EffectContext) => {
  const r = enrolIdentity(enrolInput(ctx.case), ctx.case.id, who(ctx), ctx.now, sampleMark(ctx.case).sample);
  if ('error' in r) return r;
  return { facts: { identity: r.number }, after: d => { if (d) attachIdentityDecision(r.number, d.id); } };
});

// ── Credentials ──────────────────────────────────────────────────────────────

const REPLACING = ['renewal', 'replacement-lost', 'replacement-stolen', 'replacement-damaged', 'replacement-particulars'];
registerEffect('identity.checkCredential', ({ case: c }: EffectContext) => {
  const r = getIdentity(str(c.fields.identity));
  if (!r) return { error: `No identity record ${str(c.fields.identity) || '(none named)'}` };
  if (r.state !== 'active') return { error: `Identity ${r.number} is ${r.state}` };
  if (r.underReview) return { error: `Identity ${r.number} is under review (case ${r.underReview.case}): decide that first` };
  const kind = str(c.fields.credentialKind);
  if (REPLACING.includes(kind)) {
    const old = getCredential(str(c.fields.replaces));
    if (!old || credentialHolder(old.number)?.number !== r.number) return { error: 'A renewal or replacement names the credential it replaces, held on this identity' };
    // A replacement for a lost or stolen credential follows the recorded report (identity.credential-status), never the request itself.
    if (kind === 'replacement-lost' && !['reported-lost', 'cancelled'].includes(old.state)) return { error: `Credential ${old.number} has no lost report recorded: record the report first` };
    if (kind === 'replacement-stolen' && !['reported-stolen', 'cancelled'].includes(old.state)) return { error: `Credential ${old.number} has no stolen report recorded: record the report first` };
  }
  return { facts: { identity: r.number } };
});

registerEffect('identity.requestCredential', (ctx: EffectContext) => {
  const f = ctx.case.fields;
  const kind = str(f.credentialKind);
  const c = requestCredential({ identity: str(f.identity), type: str(f.credentialType), validFrom: str(f.validFrom), validUntil: str(f.validUntil), ...(REPLACING.includes(kind) ? { replaces: str(f.replaces) } : {}) }, ctx.case.id, who(ctx), ctx.now);
  if ('error' in c) return c;
  return { facts: { credential: c.number, validUntil: c.validUntil ?? '' }, after: d => { if (d) attachIdentityDecision(str(f.identity), d.id, c.number); } };
});

const credentialOfCase = (c: Case) => getIdentity(str(c.fields.identity))?.credentials.find(x => x.case === c.id);
registerEffect('identity.recordProduction', (ctx: EffectContext) => {
  const cr = credentialOfCase(ctx.case);
  if (!cr) return { error: 'This case has requested no credential yet' };
  const r = recordProduction(cr.number, { serial: str(ctx.case.fields.serial), qualityChecked: ctx.case.fields.qualityChecked === true }, ctx.case.id, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { produced: r.number } };
});

registerEffect('identity.recordDelivery', (ctx: EffectContext) => {
  const cr = credentialOfCase(ctx.case);
  if (!cr) return { error: 'This case has requested no credential yet' };
  const evidence = ctx.case.documents.find(id => getDocument(id)?.class === 'delivery-evidence');
  const r = recordDelivery(cr.number, { method: str(ctx.case.fields.deliveryMethod) as 'collected', recipient: str(ctx.case.fields.recipient) as 'holder', ...(evidence ? { evidence } : {}), ...(str(ctx.case.fields.deliveryPlace) ? { place: str(ctx.case.fields.deliveryPlace) } : {}) }, ctx.case.id, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { active: r.number } };
});

// ── Credential status ────────────────────────────────────────────────────────

const REPORTS: Record<string, string> = { lost: 'report-lost', stolen: 'report-stolen', damaged: 'report-damaged' };
registerEffect('identity.recordReport', (ctx: EffectContext) => {
  const c = ctx.case;
  const cr = getCredential(str(c.fields.credential));
  if (!cr) return { error: `No credential ${str(c.fields.credential) || '(none named)'}` };
  const move = REPORTS[str(c.fields.statusKind)];
  // A suspension, revocation or correction is reviewed and decided; only a loss, theft or damage is recorded as reported now.
  if (!move) return { facts: { credential: cr.number, reported: 'none' } };
  const r = changeCredential(cr.number, move, 'Reported by the holder or on their behalf (a report, not proof of fraud)', c.id, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { credential: r.number, reported: str(c.fields.statusKind) } };
});

for (const move of ['suspend', 'reinstate', 'revoke', 'cancel', 'correct-status'] as const) {
  registerEffect(`identity.${move}`, (ctx: EffectContext) => {
    const c = ctx.case;
    const number = str(c.fields.credential);
    const to = move === 'correct-status' ? str(c.fields.correctTo) as CredentialState : undefined;
    // Checked before the decision is sealed; made with the decision's own reasons once it is.
    const why = credentialMoveRefusal(number, move, to);
    if (why) return { error: why };
    return {
      facts: { credential: number, move },
      after: (d, done) => {
        changeCredential(number, move, reasonOf(done, move), c.id, who(ctx), ctx.now, to);
        const h = credentialHolder(number);
        if (d && h) attachIdentityDecision(h.number, d.id, number);
      },
    };
  });
}

// ── Resolution ───────────────────────────────────────────────────────────────

registerEffect('identity.openReview', (ctx: EffectContext) => {
  const c = ctx.case;
  const records = lines(c.fields.records);
  if (str(c.fields.resolutionKind) === 'duplicate' && records.length < 2) return { error: 'A suspected duplicate names at least two identity records' };
  const r = markReview(records, { case: c.id, kind: str(c.fields.resolutionKind) || 'review' }, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { underReview: records.length } };
});

registerEffect('identity.contain', (ctx: EffectContext) => {
  const c = ctx.case;
  const named = lines(c.fields.credentialsToSuspend);
  if (!named.length) return { error: 'Name the credentials to suspend' };
  const records = lines(c.fields.records);
  for (const n of named) if (!records.includes(credentialHolder(n)?.number ?? '')) return { error: `Credential ${n} is not on a record this case reviews` };
  for (const n of named) { const why = credentialMoveRefusal(n, 'suspend'); if (why) return { error: why }; }
  return {
    facts: { suspended: named.join(', ') },
    after: (_d, done) => { for (const n of named) changeCredential(n, 'suspend', reasonOf(done, 'Contained during the review'), c.id, who(ctx), ctx.now); },
  };
});

registerEffect('identity.determine', (ctx: EffectContext) => {
  const c = ctx.case;
  const records = lines(c.fields.records);
  const kind = str(c.fields.resolutionKind), outcome = str(c.fields.outcome);
  if (kind === 'duplicate' && !DETERMINATIONS.includes(outcome as Determination)) return { error: `A duplicate review ends in one of ${DETERMINATIONS.join(', ')}` };
  if (kind !== 'duplicate' && !['misuse-confirmed', 'misuse-not-confirmed', 'recovered', 'not-recovered', 'record-correct', 'record-corrected-elsewhere'].includes(outcome)) return { error: 'Record the outcome of the review' };
  const suspendedHere = (n: string) => getCredential(n)?.history.some(h => h.case === c.id && h.what.endsWith('→ suspended'));
  return {
    facts: { outcome },
    after: (d, done) => {
      const reasons = reasonOf(done, 'Determined');
      if (kind === 'duplicate' && records.length >= 2) recordDetermination(records[0]!, records[1]!, outcome as Determination, reasons, c.id, who(ctx), ctx.now);
      // Credentials this case suspended: reinstated when misuse is not confirmed or the identity is recovered; otherwise they stay suspended for the credential procedures.
      if (['misuse-not-confirmed', 'recovered'].includes(outcome) || (kind === 'duplicate' && outcome === 'different-persons')) {
        for (const n of lines(c.fields.credentialsToSuspend)) if (suspendedHere(n) && getCredential(n)?.state === 'suspended') changeCredential(n, 'reinstate', reasons, c.id, who(ctx), ctx.now);
      }
      markReview(records, null, who(ctx), ctx.now);
      if (d) attachDeterminationDecision(c.id, d.id);
    },
  };
});

registerEffect('identity.closeReview', (ctx: EffectContext) => {
  const r = markReview(lines(ctx.case.fields.records), null, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { closed: true } };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const p = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'personal', ...extra });
const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'identity-record', sensitivity: 'restricted' as const, owner: 'identity' };
const REVIEW_ROUTE = adm('reviewRoute', 'Review or appeal route open to the person (as the nation\'s law gives it)');

export const REFERENCE_ENROLMENT: Ref = {
  ...base, key: 'identity.enrolment', version: 1, title: 'Identity enrolment', refPrefix: 'IDE',
  fields: [
    p('givenNames', 'Given names (as the evidence shows them)', 'text', { required: true }),
    p('familyName', 'Family name (as the evidence shows it)', 'text', { required: true }),
    p('birthDate', 'Date of birth', 'date', { required: true }),
    p('sex', 'Sex (as the nation\'s law records it, where it does)'),
    p('birthPlace', 'Place of birth'),
    p('nationality', 'Nationality (ISO 3166-1 alpha-3), where the law records it'),
    r('civilRegistration', 'Civil register entry relied on (birth registration number), if any', 'text', { hint: 'A link to the civil register is made only with its basis; nothing in the civil register changes.' }),
    adm('linkBasis', 'Basis for the link (the provision or record that allows it)'),
    adm('eligibilityRule', 'Eligibility rule applied (the provision of the nation\'s law and its version)'),
    adm('eligibilityOutcome', 'Eligibility outcome', 'choice', { options: ['eligible', 'not-eligible', 'refer'] }),
    adm('verificationMethod', 'How the evidence was verified (document examination, a register check, an interview)'),
    adm('verificationResult', 'Verification result', 'choice', { options: ['verified', 'not-verified', 'unresolved'] }),
    r('verificationLimitations', 'What could not be verified, and why', 'longtext'),
    adm('duplicateOutcome', 'Determination about a possible duplicate (an official\'s, with reasons)', 'choice', { options: [...DETERMINATIONS] }),
    REVIEW_ROUTE,
  ],
  documents: [
    { class: 'application', label: 'The identity application as received', required: true },
    { class: 'identity-evidence', label: 'Identity evidence (issuer, reference, integrity, verification)', required: true, multiple: true },
    { class: 'civil-record-extract', label: 'Civil register extract relied on', required: false },
    { class: 'photograph', label: 'Photograph for the credential (an image; no biometric template is made)', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Application registered' }, { key: 'eligibility', label: 'Eligibility determined' }, { key: 'evidence-requested', label: 'Further evidence requested' },
    { key: 'verified', label: 'Evidence verified' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'enrolled', label: 'Enrolled', terminal: true }, { key: 'not-enrolled', label: 'Refused, with reasons and the review route', terminal: true }, { key: 'referred', label: 'Referred (reference only)', terminal: true },
  ],
  actions: [
    { key: 'assess-eligibility', label: 'Record the eligibility review', from: ['submitted'], to: 'eligibility', needs: { role: 'officer' }, requires: { fields: ['givenNames', 'familyName', 'birthDate', 'eligibilityRule', 'eligibilityOutcome'], documents: ['application'], reasons: true } },
    { key: 'request-evidence', label: 'Request further evidence', from: ['eligibility', 'verified'], to: 'evidence-requested', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'evidence-received', label: 'Further evidence received', from: ['evidence-requested'], to: 'eligibility', needs: { role: 'officer' } },
    { key: 'verify', label: 'Record the verification of the evidence', from: ['eligibility'], to: 'verified', needs: { role: 'officer' }, requires: { fields: ['verificationMethod', 'verificationResult'], documents: ['identity-evidence'], reasons: true } },
    { key: 'determine-duplicate', label: 'Determine a possible duplicate, with reasons (never a merge)', from: ['verified'], to: 'verified', decision: 'determine-duplicate', needs: { role: 'signatory' }, requires: { fields: ['duplicateOutcome'], reasons: true }, effects: ['identity.noteCandidates'] },
    { key: 'propose', label: 'Propose the enrolment', from: ['verified'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['identity.checkEnrolment'] },
    { key: 'enrol', label: 'Enrol the identity', from: ['pending-approval'], to: 'enrolled', decision: 'enrol', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['identity.enrol'] },
    { key: 'refuse', label: 'Refuse, with reasons and the review route', from: ['eligibility', 'verified', 'pending-approval'], to: 'not-enrolled', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], reasons: true } },
    { key: 'refer', label: 'Refer to the competent authority (a late civil registration, a court)', from: ['eligibility', 'verified'], to: 'referred', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'enrolled', steps: [
      { action: 'assess-eligibility', expect: 'refused' },
      { action: 'assess-eligibility', fields: { givenNames: 'A', familyName: 'B', birthDate: '2000-01-01', eligibilityRule: 'x', eligibilityOutcome: 'eligible' }, documents: ['application'], expect: 'eligibility' },
      { action: 'verify', fields: { verificationMethod: 'x', verificationResult: 'verified' }, documents: ['identity-evidence'], expect: 'verified' },
      { action: 'propose', expect: 'pending-approval' }, { action: 'enrol', expect: 'enrolled' },
    ] },
    { name: 'possible duplicate determined, then refused', steps: [
      { action: 'assess-eligibility', fields: { givenNames: 'A', familyName: 'B', birthDate: '2000-01-01', eligibilityRule: 'x', eligibilityOutcome: 'eligible' }, documents: ['application'], expect: 'eligibility' },
      { action: 'verify', fields: { verificationMethod: 'x', verificationResult: 'verified' }, documents: ['identity-evidence'], expect: 'verified' },
      { action: 'determine-duplicate', fields: { duplicateOutcome: 'same-person' }, expect: 'verified' },
      { action: 'refuse', fields: { reviewRoute: 'x' }, expect: 'not-enrolled' },
    ] },
  ],
};

export const REFERENCE_CREDENTIAL: Ref = {
  ...base, key: 'identity.credential', version: 1, title: 'Identity credential: issue, renewal or replacement', refPrefix: 'IDC',
  fields: [
    r('identity', 'Identity record (its register number)', 'text', { required: true }),
    adm('credentialKind', 'What is asked', 'choice', { options: ['first', ...REPLACING], required: true }),
    r('replaces', 'Credential renewed or replaced (its number)'),
    adm('credentialType', 'Credential type (the nation\'s list)'),
    adm('validFrom', 'Valid from (as the decision sets it)', 'date'),
    adm('validUntil', 'Valid until (as the decision sets it, under the nation\'s law)', 'date'),
    r('serial', 'Serial given by production'),
    adm('qualityChecked', 'Quality check passed', 'boolean'),
    adm('deliveryMethod', 'Collected or delivered', 'choice', { options: ['collected', 'delivered'] }),
    adm('recipient', 'Received by', 'choice', { options: ['holder', 'representative'] }),
    r('deliveryPlace', 'Where it was collected or delivered'),
    REVIEW_ROUTE,
  ],
  documents: [
    { class: 'application', label: 'The request as received', required: true },
    { class: 'photograph', label: 'Photograph for the credential (an image; no biometric template is made)', required: false },
    { class: 'returned-credential', label: 'The damaged or previous credential returned', required: false },
    { class: 'delivery-evidence', label: 'Evidence of collection or delivery (a signed receipt, the courier\'s record)', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Requested' }, { key: 'assessment', label: 'Assessed' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'production', label: 'Production requested' }, { key: 'produced', label: 'Produced, quality checked' },
    { key: 'delivered', label: 'Collected or delivered; active', terminal: true }, { key: 'not-issued', label: 'Refused, with reasons', terminal: true },
  ],
  actions: [
    { key: 'assess', label: 'Assess the request', from: ['submitted'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['identity', 'credentialKind'], documents: ['application'] }, effects: ['identity.checkCredential'] },
    { key: 'propose', label: 'Propose the credential and its validity', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['credentialType', 'validFrom', 'validUntil'], reasons: true }, effects: ['identity.checkCredential'] },
    { key: 'issue', label: 'Decide to issue: production requested', from: ['pending-approval'], to: 'production', decision: 'issue', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['identity.requestCredential'] },
    { key: 'refuse', label: 'Refuse, with reasons and the review route', from: ['assessment', 'pending-approval'], to: 'not-issued', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], reasons: true } },
    { key: 'record-production', label: 'Record production and its quality check', from: ['production'], to: 'produced', needs: { role: 'officer' }, requires: { fields: ['serial', 'qualityChecked'] }, effects: ['identity.recordProduction'] },
    { key: 'record-delivery', label: 'Record collection or delivery, with its evidence', from: ['produced'], to: 'delivered', needs: { role: 'officer' }, requires: { fields: ['deliveryMethod', 'recipient'], documents: ['delivery-evidence'] }, effects: ['identity.recordDelivery'] },
  ],
  tests: [
    { name: 'issued, produced and collected', steps: [
      { action: 'assess', fields: { identity: 'ID-1', credentialKind: 'first' }, documents: ['application'], expect: 'assessment' },
      { action: 'propose', fields: { credentialType: 'x', validFrom: '2026-01-01', validUntil: '2036-01-01' }, expect: 'pending-approval' },
      { action: 'issue', expect: 'production' },
      { action: 'record-production', fields: { serial: 'S1', qualityChecked: true }, expect: 'produced' },
      { action: 'record-delivery', expect: 'refused' },
      { action: 'record-delivery', fields: { deliveryMethod: 'collected', recipient: 'holder' }, documents: ['delivery-evidence'], expect: 'delivered' },
    ] },
    { name: 'refused', steps: [{ action: 'assess', fields: { identity: 'ID-1', credentialKind: 'first' }, documents: ['application'], expect: 'assessment' }, { action: 'refuse', fields: { reviewRoute: 'x' }, expect: 'not-issued' }] },
  ],
};

export const REFERENCE_CREDENTIAL_STATUS: Ref = {
  ...base, key: 'identity.credential-status', version: 1, title: 'Identity credential: lost, stolen or damaged report; suspension, revocation or status correction', refPrefix: 'IDS',
  fields: [
    r('credential', 'Credential (its number)', 'text', { required: true }),
    adm('statusKind', 'What is reported or reviewed', 'choice', { options: ['lost', 'stolen', 'damaged', 'suspension', 'revocation', 'status-correction'], required: true }),
    r('circumstances', 'What happened (a report, never a finding)', 'longtext', { hint: 'When and where it was lost or stolen, or what the discrepancy is. A report of loss or theft is not proof of fraud.' }),
    adm('correctTo', 'Status the record should show (a correction)', 'choice', { options: ['active', 'suspended', 'revoked', 'reported-lost', 'reported-stolen', 'damaged', 'cancelled', 'replaced', 'expired'] }),
    REVIEW_ROUTE,
  ],
  documents: [
    { class: 'report', label: 'The report or request as received', required: true },
    { class: 'police-report-reference', label: 'A police report reference, where the holder has one (never required by the platform)', required: false },
    { class: 'notice', label: 'Notice to the holder, with the grounds and the time for representations', required: false },
    { class: 'representations', label: 'The holder\'s representations', required: false },
  ],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'review', label: 'Under review' }, { key: 'suspended', label: 'Suspended pending the review' },
    { key: 'notice', label: 'Notice given: representations' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'decided', label: 'Decided', terminal: true }, { key: 'closed', label: 'Closed without change, with reasons', terminal: true },
  ],
  actions: [
    { key: 'record-report', label: 'Record the report and open the review', from: ['received'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['credential', 'statusKind'], documents: ['report'] }, effects: ['identity.recordReport'] },
    { key: 'reinstate', label: 'Reinstate (found, or the grounds fall away), with reasons', from: ['review', 'suspended', 'notice'], to: 'decided', decision: 'reinstate', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['identity.reinstate'] },
    { key: 'cancel', label: 'Cancel the credential (a replacement is a separate request), with reasons', from: ['review'], to: 'decided', decision: 'cancel', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['identity.cancel'] },
    { key: 'suspend', label: 'Suspend pending the review, with reasons', from: ['review'], to: 'suspended', decision: 'suspend', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['identity.suspend'] },
    { key: 'notify', label: 'Give the holder notice of a proposed revocation', from: ['review', 'suspended'], to: 'notice', needs: { role: 'officer' }, requires: { documents: ['notice'], reasons: true } },
    { key: 'propose', label: 'Representations considered: propose', from: ['notice'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'revoke', label: 'Revoke, with reasons and the review route', from: ['pending-approval'], to: 'decided', decision: 'revoke', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], reasons: true }, effects: ['identity.revoke'] },
    { key: 'correct-status', label: 'Correct the recorded status after a discrepancy review', from: ['review'], to: 'decided', decision: 'correct-status', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['correctTo'], reasons: true }, effects: ['identity.correct-status'] },
    { key: 'close', label: 'Close without a change, with reasons', from: ['review', 'notice', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'lost, then cancelled', steps: [{ action: 'record-report', fields: { credential: 'IDC-1', statusKind: 'lost' }, documents: ['report'], expect: 'review' }, { action: 'cancel', expect: 'decided' }] },
    { name: 'revoked after notice', steps: [
      { action: 'record-report', fields: { credential: 'IDC-1', statusKind: 'revocation' }, documents: ['report'], expect: 'review' },
      { action: 'suspend', expect: 'suspended' }, { action: 'notify', documents: ['notice'], expect: 'notice' }, { action: 'propose', expect: 'pending-approval' },
      { action: 'revoke', fields: { reviewRoute: 'x' }, expect: 'decided' },
    ] },
  ],
};

export const REFERENCE_RESOLUTION: Ref = {
  ...base, key: 'identity.resolution', version: 1, title: 'Identity resolution: suspected duplicate, misuse or compromise, recovery, verification dispute', refPrefix: 'IDR',
  fields: [
    adm('resolutionKind', 'Kind of review', 'choice', { options: ['duplicate', 'misuse', 'compromise', 'recovery', 'verification-dispute'], required: true }),
    r('records', 'Identity records concerned (register numbers, one per line)', 'longtext', { required: true }),
    r('allegation', 'What was reported or noticed (kept apart from the findings)', 'longtext'),
    r('comparison', 'Evidence compared, source by source, and what it shows', 'longtext'),
    r('credentialsToSuspend', 'Credentials to suspend while the review runs (numbers, one per line)', 'longtext'),
    adm('outcome', 'Outcome', 'choice', { options: [...DETERMINATIONS, 'misuse-confirmed', 'misuse-not-confirmed', 'recovered', 'not-recovered', 'record-correct', 'record-corrected-elsewhere'] }),
    REVIEW_ROUTE,
  ],
  documents: [
    { class: 'report', label: 'The report, request or dispute as received', required: true },
    { class: 'comparison-evidence', label: 'The comparison of the records and evidence (a human determination, never a match score)', required: false },
  ],
  stages: [
    { key: 'opened', label: 'Opened' }, { key: 'investigation', label: 'Under review' }, { key: 'contained', label: 'Credentials suspended during the review' },
    { key: 'pending-approval', label: 'Determination' }, { key: 'determined', label: 'Determined', terminal: true }, { key: 'closed', label: 'Closed without a determination, with reasons', terminal: true },
  ],
  actions: [
    { key: 'open-review', label: 'Open the review of the records named', from: ['opened'], to: 'investigation', needs: { role: 'officer' }, requires: { fields: ['resolutionKind', 'records'], documents: ['report'] }, effects: ['identity.openReview'] },
    { key: 'contain', label: 'Suspend named credentials while the review runs, with reasons', from: ['investigation'], to: 'contained', decision: 'suspend', needs: { role: 'signatory' }, requires: { fields: ['credentialsToSuspend'], reasons: true }, effects: ['identity.contain'] },
    { key: 'propose', label: 'Propose the determination', from: ['investigation', 'contained'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['comparison', 'outcome'], documents: ['comparison-evidence'], reasons: true } },
    { key: 'determine', label: 'Determine, with reasons (two officials)', from: ['pending-approval'], to: 'determined', decision: 'determine', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['identity.determine'] },
    { key: 'close', label: 'Close without a determination, with reasons', from: ['investigation'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['identity.closeReview'] },
  ],
  tests: [
    { name: 'duplicate determined', steps: [
      { action: 'open-review', fields: { resolutionKind: 'duplicate', records: 'ID-1\nID-2' }, documents: ['report'], expect: 'investigation' },
      { action: 'propose', expect: 'refused' },
      { action: 'propose', fields: { comparison: 'x', outcome: 'same-person' }, documents: ['comparison-evidence'], expect: 'pending-approval' },
      { action: 'determine', expect: 'determined' },
    ] },
    { name: 'misuse contained and not confirmed', steps: [
      { action: 'open-review', fields: { resolutionKind: 'misuse', records: 'ID-1' }, documents: ['report'], expect: 'investigation' },
      { action: 'contain', fields: { credentialsToSuspend: 'IDC-1' }, expect: 'contained' },
      { action: 'propose', fields: { comparison: 'x', outcome: 'misuse-not-confirmed' }, documents: ['comparison-evidence'], expect: 'pending-approval' },
      { action: 'determine', expect: 'determined' },
    ] },
  ],
};

export const IDENTITY_PROCEDURES: Ref[] = [REFERENCE_ENROLMENT, REFERENCE_CREDENTIAL, REFERENCE_CREDENTIAL_STATUS, REFERENCE_RESOLUTION];

export function installIdentityProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const x of IDENTITY_PROCEDURES) {
    if (listPackages({ key: x.key }).length) { present.push(x.key); continue; }
    const d = draftPackage(x, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(x.key);
  }
  return { drafted, present };
}

// Passports and travel documents on the workflow foundation (Institutional
// specification Part 2 §C.4; field series Part 4 §5 PAS-APP-001 … 018; plan
// step I6). Reference procedures, drafts the nation adapts and a second
// official approves, kept by the institution the nation names for the
// `travelDocuments` slot (never assumed):
//
//   passport.application  first, renewal, child, replacement, emergency, limited-validity or amendment: the fee from the
//                         approved schedule, the identity checked through the identity.verify exchange, the issuance
//                         decision (two officials), production, quality check, custody and collection or delivery
//                         (PAS-APP-001 … 005, 008 … 013)
//   passport.status       a lost, stolen or damaged report; cancellation; revocation after notice; reinstatement;
//                         return or surrender into custody (PAS-APP-006, 007, 014, 017)
//   passport.review       review of a refused application by officials who took no part in it (PAS-APP-016)
//
// What they share:
//   - The fee comes only from the approved schedule (lib/law/rules.ts,
//     `passports.fees`, shipped unset) and its version is sealed with the
//     decision; an exemption names the ground the nation's law gives. With no
//     approved schedule and no exemption the step is refused: nobody types a fee.
//   - Identity is the identity authority's: the case asks identity.verify for a
//     result (never the record). When the service cannot answer the case is held,
//     never refused for that reason (acceptance P2-08); an official who can sign
//     may instead record the other evidence relied on, with reasons.
//   - A child's application needs the consent the nation's law requires, recorded
//     as a document; a replacement for a lost or stolen document follows the
//     recorded report. A report is not proof of fraud.
//   - No biometric template is made or kept (the photograph is a document of the
//     case). AI decides nothing. Every decision is classified under a proposed,
//     unapproved mapping (PASSPORT_PERMITS). No day count ships.

import { registerEffect, registeredEffects, sampleMark, getCase, type EffectContext, type EffectResult } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { getDocument } from '@/lib/records/documents';
import { calculate } from '@/lib/law/rules';
import { callService } from '@/lib/exchange/services';
import { issueBill } from '@/lib/data/store/payments';
import { getSovereign } from '@/lib/data/store';
import { nationCurrency } from '@/lib/nation/registry';
import {
  approveDocument, attachDocumentDecision, checkApproval, recordProduction, recordQuality, recordCollection, changeDocument, documentMoveRefusal,
  recordReview, attachReviewDecision, getTravelDocument, documentOfCase, feeCodes, FEE_RULE, APPLICATION_KINDS, type ApplicationKind, type Fee, type ApproveInput,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const who = (ctx: EffectContext) => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name });
const reasonOf = (done: Case, fallback: string) => done.history.at(-1)?.reason ?? fallback;

/** The permit type whose approved mapping governs each family's decisions (lib/permits/decisions.ts reads it). */
export const PASSPORT_PERMITS: Record<string, string> = {
  'passport.application': 'travel-document',
  'passport.status': 'travel-document',
  'passport.review': 'travel-document-review',
};

const kindOf = (c: Case): ApplicationKind => (APPLICATION_KINDS.includes(str(c.fields.applicationKind) as ApplicationKind) ? str(c.fields.applicationKind) as ApplicationKind : 'first');
const REPLACING: ApplicationKind[] = ['renewal', 'replacement-lost', 'replacement-stolen', 'replacement-damaged', 'amendment'];

/** The fee the approved schedule sets for this application, or the recorded exemption; an error when neither applies. */
function feeOf(c: Case, on: string): { fee: Fee; rules?: { key: string; version: number; digest: string }[] } | { error: string } {
  const ground = str(c.fields.feeExemption);
  if (ground) {
    if (!str(c.fields.feeExemptionReasons)) return { error: 'An exemption states its reasons as well as the ground the law gives' };
    return { fee: { exempt: true, ground, reasons: str(c.fields.feeExemptionReasons) } };
  }
  let last = '';
  for (const code of feeCodes(str(c.fields.documentType), kindOf(c))) {
    const calc = calculate(FEE_RULE, { amountMinor: 0, code }, on);
    if (!('error' in calc)) return { fee: { amountMinor: calc.amountMinor, currency: nationCurrency(), rule: { key: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest }, code }, rules: [{ key: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest }] };
    last = calc.error;
  }
  return { error: `${last}. The fee is never typed: have the nation's schedule of passport fees (${FEE_RULE}) approved, or record an exemption the law gives with its reasons` };
}

registerEffect('passport.assessFee', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  if (!str(c.fields.documentType)) return { error: 'Name the document type (the nation\'s list) first' };
  const f = feeOf(c, ctx.now.toISOString().slice(0, 10));
  if ('error' in f) return f;
  const fee = f.fee;
  if ('exempt' in fee) return { facts: { fee: `exempt: ${fee.ground}` } };
  return {
    facts: { feeMinor: fee.amountMinor, feeRule: `${fee.rule.key} v${fee.rule.version}` }, rules: f.rules,
    after: () => {
      if (fee.amountMinor > 0) issueBill({ kind: 'licence-fee', description: `Travel document fee (${fee.code})`, amountMinor: fee.amountMinor, currency: fee.currency, dueDate: ctx.now.toISOString().slice(0, 10), reference: `passport:${c.ref}`, issuer: c.owner }, ctx.actor.name);
    },
  };
});

/** Identity is checked with the identity authority through the exchange; the case keeps the receipt. */
registerEffect('passport.verifyIdentity', async (ctx: EffectContext) => {
  const c = ctx.case;
  const r = await callService({ kind: 'module', id: 'travelDocuments', name: 'Passport issuance' }, 'identity.verify',
    { number: str(c.fields.identityNumber), familyName: str(c.fields.surname), givenNames: str(c.fields.givenNames), birthDate: str(c.fields.birthDate) }, 'travel document issuance');
  const result = str(r.data?.result);
  if (r.status !== 200 || result !== 'verified') {
    const meaning = str(r.data?.meaning) || r.error || 'the identity service did not answer';
    return { error: `Identity not verified (${result || 'no answer'}: ${meaning}). This is not a ground for refusal: hold the case until it can be verified, or have an official who can sign record the other evidence relied on` };
  }
  return { facts: { identityCheck: result, receipt: r.receipt.id } };
});

registerEffect('passport.checkApplication', ({ case: c }: EffectContext) => {
  const kind = kindOf(c);
  if (kind === 'child' && c.fields.consentGiven !== true) return { error: 'A child\'s application needs the consent the nation\'s law requires, recorded with its document' };
  if (REPLACING.includes(kind)) {
    const old = getTravelDocument(str(c.fields.previousDocument));
    if (!old) return { error: 'A renewal, replacement or amendment names the previous travel document' };
    if (kind === 'replacement-lost' && !['reported-lost', 'cancelled'].includes(old.state)) return { error: `Travel document ${old.number} has no lost report recorded: record the report first (passport.status)` };
    if (kind === 'replacement-stolen' && !['reported-stolen', 'cancelled'].includes(old.state)) return { error: `Travel document ${old.number} has no stolen report recorded: record the report first (passport.status)` };
  }
  const why = checkApproval(approveInput(c, { exempt: true, ground: 'check', reasons: 'check' }, { kind: 'other-evidence', reasons: 'check' }));
  return why ? { error: why } : { facts: { checked: true } };
});

const approveInput = (c: Case, fee: Fee, basis: ApproveInput['identityBasis']): ApproveInput => ({
  documentType: str(c.fields.documentType), kind: kindOf(c),
  holder: { identity: str(c.fields.identityNumber), surname: str(c.fields.surname), givenNames: str(c.fields.givenNames), nationality: str(c.fields.nationality).toUpperCase(), birthDate: str(c.fields.birthDate), ...(str(c.fields.sex) ? { sex: str(c.fields.sex) } : {}) },
  validFrom: str(c.fields.validFrom), validUntil: str(c.fields.validUntil), fee, identityBasis: basis,
  ...(REPLACING.includes(kindOf(c)) && str(c.fields.previousDocument) ? { replaces: str(c.fields.previousDocument) } : {}),
});

registerEffect('passport.approve', (ctx: EffectContext) => {
  const c = ctx.case;
  const f = feeOf(c, ctx.now.toISOString().slice(0, 10));
  if ('error' in f) return f;
  const checked = c.history.find(h => h.action === 'verify-identity');
  const other = c.history.find(h => h.action === 'verify-other-evidence');
  const receipt = (c.verifications ?? []).at(-1)?.receipt;
  const basis: ApproveInput['identityBasis'] = other ? { kind: 'other-evidence', reasons: other.reason ?? '' } : { kind: 'exchange', receipt: receipt ?? `step ${checked?.seq ?? '?'} of ${c.ref}`, result: 'verified' };
  const d = approveDocument(approveInput(c, f.fee, basis), c.id, who(ctx), ctx.now, sampleMark(c).sample);
  if ('error' in d) return d;
  return { facts: { document: d.number, validUntil: d.validUntil }, ...(f.rules ? { rules: f.rules } : {}), after: dec => { if (dec) attachDocumentDecision(d.number, dec.id); } };
});

registerEffect('passport.recordProduction', (ctx: EffectContext) => {
  const d = documentOfCase(ctx.case.id);
  if (!d) return { error: 'This case has approved no document yet' };
  const r = recordProduction(d.number, { documentNumber: str(ctx.case.fields.documentNumber), batch: str(ctx.case.fields.batch) }, ctx.case.id, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { produced: r.number } };
});

registerEffect('passport.recordQuality', (ctx: EffectContext) => {
  const d = documentOfCase(ctx.case.id);
  if (!d) return { error: 'This case has approved no document yet' };
  const passed = ctx.action.key === 'quality-pass';
  const r = recordQuality(d.number, { passed, note: str(ctx.case.fields.qualityNote), place: str(ctx.case.fields.custodyPlace) }, { state: (getSovereign().iso3 ?? '').toUpperCase(), documentCode: str(ctx.case.fields.documentCode) }, ctx.case.id, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { state: r.state } };
});

registerEffect('passport.recordCollection', (ctx: EffectContext) => {
  const d = documentOfCase(ctx.case.id);
  if (!d) return { error: 'This case has approved no document yet' };
  const evidence = ctx.case.documents.find(id => getDocument(id)?.class === 'delivery-evidence');
  const r = recordCollection(d.number, { method: str(ctx.case.fields.deliveryMethod) as 'collected', recipient: str(ctx.case.fields.recipient) as 'holder', ...(evidence ? { evidence } : {}) }, ctx.case.id, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { issued: r.number } };
});

// ── Status ───────────────────────────────────────────────────────────────────

const REPORTS: Record<string, string> = { lost: 'report-lost', stolen: 'report-stolen', damaged: 'report-damaged' };
registerEffect('passport.recordReport', (ctx: EffectContext) => {
  const c = ctx.case;
  const d = getTravelDocument(str(c.fields.document));
  if (!d) return { error: `No travel document ${str(c.fields.document) || '(none named)'}` };
  const move = REPORTS[str(c.fields.statusKind)];
  if (!move) return { facts: { document: d.number, reported: 'none' } };
  const r = changeDocument(d.number, move, 'Reported by the holder or on their behalf (a report, not proof of fraud)', c.id, who(ctx), ctx.now);
  return 'error' in r ? r : { facts: { document: r.number, reported: str(c.fields.statusKind) } };
});

for (const move of ['reinstate', 'cancel', 'revoke', 'surrender'] as const) {
  registerEffect(`passport.${move}`, (ctx: EffectContext) => {
    const c = ctx.case;
    const n = str(c.fields.document);
    const why = documentMoveRefusal(n, move);
    if (why) return { error: why };
    return {
      facts: { document: n, move },
      after: (d, done) => { changeDocument(n, move, reasonOf(done, move), c.id, who(ctx), ctx.now, str(c.fields.custodyPlace)); if (d) attachDocumentDecision(n, d.id); },
    };
  });
}

// ── Review ───────────────────────────────────────────────────────────────────

/** The original refused application, and the officials who decided it (who may not review it). */
function original(c: Case): { case: Case; deciders: { id?: string; name: string }[] } | { error: string } {
  const o = getCase(str(c.fields.originalCase));
  if (!o || o.package.key !== 'passport.application') return { error: 'Name the refused passport application under review (its case reference)' };
  if (o.owner !== c.owner) return { error: 'The review is made by the authority that refused the application' };
  if (o.stage !== 'not-issued') return { error: `${o.ref} was not refused` };
  const deciders = o.history.filter(h => h.decision).flatMap(h => [h.by, ...(h.confirmedBy ? [h.confirmedBy] : [])]);
  return { case: o, deciders };
}
const same = (a: { id?: string; name: string }, b: { id?: string; name: string }) => (a.id && b.id ? a.id === b.id : a.name === b.name);

registerEffect('passport.checkReview', ({ case: c }: EffectContext) => {
  const o = original(c);
  return 'error' in o ? o : { facts: { original: o.case.ref } };
});

registerEffect('passport.review', (ctx: EffectContext) => {
  const c = ctx.case;
  const o = original(c);
  if ('error' in o) return o;
  const reviewers = [...(c.pending ? [c.pending.by] : []), { ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name }];
  const conflict = reviewers.find(r => o.deciders.some(d => same(d, r)));
  if (conflict) return { error: `${conflict.name} took part in the decision under review: a review is made by officials who did not` };
  const outcome = str(c.fields.reviewOutcome);
  if (!['upheld', 'overturned'].includes(outcome)) return { error: 'The review upholds or overturns the refusal' };
  return {
    facts: { original: o.case.ref, outcome },
    after: d => { recordReview({ originalCase: o.case.id, reviewCase: c.id, outcome: outcome as 'upheld', ...sampleMark(c) }, who(ctx), ctx.now); if (d) attachReviewDecision(c.id, d.id); },
  };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const p = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'personal', ...extra });
const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'travel-document', sensitivity: 'restricted' as const, owner: 'travelDocuments' };
const REVIEW_ROUTE = adm('reviewRoute', 'Review or appeal route open to the applicant (as the nation\'s law gives it)');
const APPLICANT = { applicationKind: 'first', documentType: 'ordinary', identityNumber: 'ID-1', surname: 'A', givenNames: 'B', birthDate: '2000-01-01', nationality: 'KEN' };

export const REFERENCE_PASSPORT_APPLICATION: Ref = {
  ...base, key: 'passport.application', version: 1, title: 'Passport or travel document application', refPrefix: 'PPA',
  fields: [
    adm('applicationKind', 'What is applied for', 'choice', { options: [...APPLICATION_KINDS], required: true }),
    adm('documentType', 'Document type (the nation\'s list)', 'text', { required: true }),
    r('identityNumber', 'Identity record or credential number (checked with the identity authority)', 'text', { required: true }),
    p('surname', 'Surname (primary identifier, ICAO Doc 9303)', 'text', { required: true }),
    p('givenNames', 'Given names (secondary identifier, ICAO Doc 9303)', 'text', { required: true }),
    p('birthDate', 'Date of birth', 'date', { required: true }),
    p('sex', 'Sex as the document shows it (ICAO Doc 9303: F, M or X), where the law records it'),
    p('nationality', 'Nationality (ISO 3166-1 alpha-3)', 'text', { required: true }),
    r('previousDocument', 'Previous travel document (its register or document number), for a renewal, replacement or amendment'),
    adm('consentGiven', 'Consent recorded as the nation\'s law requires for a child', 'boolean'),
    adm('feeExemption', 'Fee exemption: the ground the nation\'s law gives (leave empty when the fee applies)'),
    r('feeExemptionReasons', 'Why the exemption applies', 'longtext'),
    adm('validFrom', 'Valid from (as the decision sets it)', 'date'),
    adm('validUntil', 'Valid until (as the decision sets it, under the nation\'s law)', 'date'),
    adm('documentCode', 'Document code as personalised (ICAO Doc 9303, e.g. P for a passport)'),
    r('documentNumber', 'Document number production gave it'),
    adm('batch', 'Production batch'),
    adm('qualityNote', 'Quality check note (what failed, if it failed)', 'longtext'),
    adm('custodyPlace', 'Where it is held in custody'),
    adm('deliveryMethod', 'Collected or delivered', 'choice', { options: ['collected', 'delivered'] }),
    adm('recipient', 'Received by', 'choice', { options: ['holder', 'representative'] }),
    REVIEW_ROUTE,
  ],
  documents: [
    { class: 'application', label: 'The application as received', required: true },
    { class: 'photograph', label: 'Photograph (an image for printing; no biometric template is made)', required: true },
    { class: 'identity-evidence', label: 'Other identity evidence relied on, where the exchange could not answer', required: false },
    { class: 'previous-document', label: 'Previous travel document, returned or its details', required: false },
    { class: 'consent', label: 'Consent of those with parental responsibility, as the law requires', required: false },
    { class: 'emergency-evidence', label: 'Evidence of the emergency (emergency travel document)', required: false },
    { class: 'delivery-evidence', label: 'Evidence of collection or delivery', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Application registered' }, { key: 'fee-assessed', label: 'Fee assessed' }, { key: 'held', label: 'Held: identity not yet verified' },
    { key: 'verified', label: 'Identity verified' }, { key: 'pending-approval', label: 'Issuance decision' }, { key: 'approved', label: 'Approved: production' },
    { key: 'produced', label: 'Produced: quality check' }, { key: 'in-custody', label: 'In custody: collection or delivery' },
    { key: 'issued', label: 'Issued', terminal: true }, { key: 'not-issued', label: 'Refused, with reasons and the review route', terminal: true }, { key: 'withdrawn', label: 'Withdrawn by the applicant', terminal: true },
  ],
  actions: [
    { key: 'assess-fee', label: 'Assess the fee from the approved schedule (or record an exemption)', from: ['submitted'], to: 'fee-assessed', needs: { role: 'officer' }, requires: { fields: ['applicationKind', 'documentType'], documents: ['application', 'photograph'] }, effects: ['passport.assessFee'] },
    { key: 'verify-identity', label: 'Verify identity with the identity authority (identity.verify)', from: ['fee-assessed', 'held'], to: 'verified', needs: { role: 'officer' }, requires: { fields: ['identityNumber', 'surname', 'givenNames', 'birthDate'] }, effects: ['passport.verifyIdentity'] },
    { key: 'hold', label: 'Hold until identity can be verified (never a refusal)', from: ['fee-assessed'], to: 'held', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'verify-other-evidence', label: 'Record the other identity evidence relied on, with reasons', from: ['held'], to: 'verified', needs: { role: 'signatory' }, requires: { documents: ['identity-evidence'], reasons: true } },
    { key: 'propose', label: 'Assessed: propose the decision and validity', from: ['verified'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['validFrom', 'validUntil'], reasons: true }, effects: ['passport.checkApplication'] },
    { key: 'issue', label: 'Decide to issue', from: ['pending-approval'], to: 'approved', decision: 'issue', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['passport.approve'] },
    { key: 'refuse', label: 'Refuse, with reasons and the review route', from: ['verified', 'pending-approval'], to: 'not-issued', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], reasons: true } },
    { key: 'record-production', label: 'Record production (document number and batch)', from: ['approved'], to: 'produced', needs: { role: 'officer' }, requires: { fields: ['documentNumber', 'batch'] }, effects: ['passport.recordProduction'] },
    { key: 'quality-pass', label: 'Quality check passed: into custody', from: ['produced'], to: 'in-custody', needs: { role: 'officer' }, requires: { fields: ['documentCode'] }, effects: ['passport.recordQuality'] },
    { key: 'quality-fail', label: 'Quality check failed: spoiled, produce again', from: ['produced'], to: 'approved', needs: { role: 'officer' }, requires: { fields: ['qualityNote'] }, effects: ['passport.recordQuality'] },
    { key: 'record-collection', label: 'Record collection or delivery, with its evidence', from: ['in-custody'], to: 'issued', needs: { role: 'officer' }, requires: { fields: ['deliveryMethod', 'recipient'], documents: ['delivery-evidence'] }, effects: ['passport.recordCollection'] },
    { key: 'withdraw', label: 'Withdrawn at the applicant\'s request', from: ['submitted', 'fee-assessed', 'held', 'verified'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'issued', steps: [
      { action: 'assess-fee', fields: APPLICANT, documents: ['application', 'photograph'], expect: 'fee-assessed' },
      { action: 'verify-identity', expect: 'verified' },
      { action: 'propose', fields: { validFrom: '2026-11-01', validUntil: '2036-10-31' }, expect: 'pending-approval' },
      { action: 'issue', expect: 'approved' },
      { action: 'record-production', fields: { documentNumber: 'X1', batch: 'B1' }, expect: 'produced' },
      { action: 'quality-fail', fields: { qualityNote: 'misprint' }, expect: 'approved' },
      { action: 'record-production', expect: 'produced' },
      { action: 'quality-pass', fields: { documentCode: 'P' }, expect: 'in-custody' },
      { action: 'record-collection', fields: { deliveryMethod: 'collected', recipient: 'holder' }, documents: ['delivery-evidence'], expect: 'issued' },
    ] },
    { name: 'held, never refused while held', steps: [
      { action: 'assess-fee', fields: APPLICANT, documents: ['application', 'photograph'], expect: 'fee-assessed' },
      { action: 'hold', expect: 'held' }, { action: 'refuse', expect: 'refused' },
      { action: 'verify-other-evidence', documents: ['identity-evidence'], expect: 'verified' },
      { action: 'refuse', fields: { reviewRoute: 'x' }, expect: 'not-issued' },
    ] },
  ],
};

export const REFERENCE_PASSPORT_STATUS: Ref = {
  ...base, key: 'passport.status', version: 1, title: 'Travel document: lost, stolen or damaged report, cancellation, revocation, surrender', refPrefix: 'PPS',
  fields: [
    r('document', 'Travel document (its register or document number)', 'text', { required: true }),
    adm('statusKind', 'What is reported or reviewed', 'choice', { options: ['lost', 'stolen', 'damaged', 'cancellation', 'revocation', 'surrender'], required: true }),
    r('circumstances', 'What happened (a report, never a finding)', 'longtext', { hint: 'When and where it was lost or stolen. A report of loss or theft is not proof of fraud: the authority decides what follows.' }),
    adm('custodyPlace', 'Where a returned document is held'),
    REVIEW_ROUTE,
  ],
  documents: [
    { class: 'report', label: 'The report or request as received', required: true },
    { class: 'police-report-reference', label: 'A police report reference, where the holder has one', required: false },
    { class: 'notice', label: 'Notice to the holder of a proposed revocation, with the grounds', required: false },
    { class: 'representations', label: 'The holder\'s representations', required: false },
    { class: 'receipt', label: 'Receipt for a document returned or surrendered', required: false },
  ],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'review', label: 'Status under review' }, { key: 'notice', label: 'Notice given: representations' },
    { key: 'pending-approval', label: 'Decision' }, { key: 'decided', label: 'Decided', terminal: true }, { key: 'surrendered', label: 'Returned or surrendered into custody', terminal: true },
    { key: 'closed', label: 'Closed without change, with reasons', terminal: true },
  ],
  actions: [
    { key: 'record-report', label: 'Record the report and open the review', from: ['received'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['document', 'statusKind'], documents: ['report'] }, effects: ['passport.recordReport'] },
    { key: 'record-surrender', label: 'Record the return or surrender: receipt and custody', from: ['received'], to: 'surrendered', needs: { role: 'officer' }, requires: { fields: ['document', 'custodyPlace'], documents: ['receipt'], reasons: true }, effects: ['passport.surrender'] },
    { key: 'reinstate', label: 'Reinstate (found), with reasons', from: ['review'], to: 'decided', decision: 'reinstate', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['passport.reinstate'] },
    { key: 'cancel', label: 'Cancel the document, with reasons', from: ['review'], to: 'decided', decision: 'cancel', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['passport.cancel'] },
    { key: 'notify', label: 'Give the holder notice of a proposed revocation', from: ['review'], to: 'notice', needs: { role: 'officer' }, requires: { documents: ['notice'], reasons: true } },
    { key: 'propose', label: 'Representations considered: propose', from: ['notice'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'revoke', label: 'Revoke, with reasons and the review route', from: ['pending-approval'], to: 'decided', decision: 'revoke', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], reasons: true }, effects: ['passport.revoke'] },
    { key: 'close', label: 'Close without change, with reasons', from: ['review', 'notice', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'lost, then cancelled', steps: [{ action: 'record-report', fields: { document: 'TD-1', statusKind: 'lost' }, documents: ['report'], expect: 'review' }, { action: 'cancel', expect: 'decided' }] },
    { name: 'revoked after notice', steps: [{ action: 'record-report', fields: { document: 'TD-1', statusKind: 'revocation' }, documents: ['report'], expect: 'review' }, { action: 'notify', documents: ['notice'], expect: 'notice' }, { action: 'propose', expect: 'pending-approval' }, { action: 'revoke', fields: { reviewRoute: 'x' }, expect: 'decided' }] },
    { name: 'surrendered', steps: [{ action: 'record-surrender', fields: { document: 'TD-1', custodyPlace: 'Office' }, documents: ['receipt'], expect: 'surrendered' }] },
  ],
};

export const REFERENCE_PASSPORT_REVIEW: Ref = {
  ...base, key: 'passport.review', version: 1, title: 'Review of a refused passport application', refPrefix: 'PPR',
  fields: [
    adm('originalCase', 'The refused application (its case reference)', 'text', { required: true }),
    r('grounds', 'Grounds of the review request', 'longtext', { required: true }),
    adm('reviewOutcome', 'Outcome', 'choice', { options: ['upheld', 'overturned'] }),
    REVIEW_ROUTE,
  ],
  documents: [{ class: 'request', label: 'The review request as received', required: true }, { class: 'new-evidence', label: 'New evidence', required: false, multiple: true }],
  stages: [{ key: 'received', label: 'Received' }, { key: 'review', label: 'Under review (officials who took no part in the decision)' }, { key: 'pending-approval', label: 'Decision' }, { key: 'decided', label: 'Decided', terminal: true }],
  actions: [
    { key: 'accept', label: 'Accept for review', from: ['received'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['originalCase', 'grounds'], documents: ['request'] }, effects: ['passport.checkReview'] },
    { key: 'propose', label: 'Propose the outcome', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['reviewOutcome'], reasons: true } },
    { key: 'decide', label: 'Decide the review (two officials who took no part in the refusal)', from: ['pending-approval'], to: 'decided', decision: 'review', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], reasons: true }, effects: ['passport.review'] },
  ],
  tests: [{ name: 'reviewed', steps: [{ action: 'accept', fields: { originalCase: 'PPA-1', grounds: 'x' }, documents: ['request'], expect: 'review' }, { action: 'propose', fields: { reviewOutcome: 'upheld' }, expect: 'pending-approval' }, { action: 'decide', fields: { reviewRoute: 'x' }, expect: 'decided' }] }],
};

export const PASSPORT_PROCEDURES: Ref[] = [REFERENCE_PASSPORT_APPLICATION, REFERENCE_PASSPORT_STATUS, REFERENCE_PASSPORT_REVIEW];

export function installPassportProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const x of PASSPORT_PROCEDURES) {
    if (listPackages({ key: x.key }).length) { present.push(x.key); continue; }
    const d = draftPackage(x, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(x.key);
  }
  return { drafted, present };
}

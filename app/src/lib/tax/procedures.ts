// Tax on the workflow foundation (owner's Cycle 3 directive, workstream 1).
// Reference procedures (drafts for the tax authority to adapt to its law and
// approve): taxpayer registration; a return from filing to an assessment
// notice; an objection to an assessment. The assessment step calculates with
// the approved rule in force for the tax type (lib/law/rules.ts, key
// `tax.<type>`); without one the assessor enters the amount with reasons.
// Decisions are four-eyes and state the appeal. Restricted (tax secrecy).

import { registerEffect, registeredEffects, listCases, type EffectContext } from '@/lib/casework/engine';
import { samplesAllowed } from '@/lib/ops/mode';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { calculate } from '@/lib/law/rules';
import { issueBill } from '@/lib/data/store/payments';
import { nationCurrency } from '@/lib/nation/registry';
import {
  registerTaxpayer, fileReturn, recordAssessment, attachAssessmentDecision, varyAssessment, getTaxpayer, returnFor, assessmentOfCase, getAssessment,
  amendRegistration, decideRefund, instructRefund, reconcileRefundPayout, refundOfCase, recordPaymentPlan, attachInstalmentBill, changePlan, getPaymentPlan, planOfCase,
  recordDisclosure, recordRuling, attachServiceDecision, type LawAmount, type RegistrationChange,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';
import { libraryForm } from '@/lib/forms/library/definitions';
import { attachForm } from '@/lib/forms/library/build';
import { listOf, textOf } from '@/lib/forms/contract';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number.NaN);
const currencyOf = (c: { fields: Record<string, unknown> }) => str(c.fields.currency).toUpperCase() || nationCurrency();

registerEffect('tax.register', ({ case: c, actor, now }: EffectContext) => {
  const kind = str(c.fields.partyKind) === 'organisation' ? 'organisation' : 'person';
  const t = registerTaxpayer({ party: { kind, id: str(c.fields.partyRef), name: textOf(c.fields.partyName).trim() }, taxTypes: listOf(c.fields.taxTypes).flatMap(x => x.split(/\s+/)).filter(Boolean) }, c.id, actor.name, now);
  if ('error' in t) return t;
  return { facts: { tin: t.tin } };
});

registerEffect('tax.fileReturn', ({ case: c, actor, now }: EffectContext) => {
  const kind = (['nil', 'late'] as const).find(k => k === str(c.fields.returnKind));
  if (kind === 'late' && !str(c.fields.lateReason)) return { error: 'Say why the return is late: what follows from a late return is the approved rule\'s, decided at assessment' };
  const r = fileReturn({ tin: str(c.fields.tin), taxType: str(c.fields.taxType), period: str(c.fields.period), baseMinor: num(c.fields.baseMinor), currency: currencyOf(c), reason: str(c.fields.amendmentReason) || undefined, ...(kind ? { kind } : {}) }, c.id, actor.name, now);
  if ('error' in r) return r;
  return { facts: { return: r.id, version: r.versions.length } };
});

/** Check the assessment can be made before it is proposed: an approved rule, or an amount with reasons. */
registerEffect('tax.checkAssessment', ({ case: c, now }: EffectContext) => {
  const calc = calculate(`tax.${str(c.fields.taxType)}`, { amountMinor: num(c.fields.baseMinor) }, now.toISOString().slice(0, 10));
  if (!('error' in calc)) return { facts: { proposedMinor: calc.amountMinor, rule: `${calc.rule.key} v${calc.rule.version}` } };
  if (!Number.isInteger(num(c.fields.assessedMinor)) || !str(c.fields.assessmentReasons)) return { error: `${calc.error}. Enter the assessed amount and its reasons.` };
});

registerEffect('tax.assess', ({ case: c, actor, now }: EffectContext) => {
  const t = getTaxpayer(str(c.fields.tin));
  if (!t) return { error: `No taxpayer ${str(c.fields.tin)}` };
  const calc = calculate(`tax.${str(c.fields.taxType)}`, { amountMinor: num(c.fields.baseMinor) }, now.toISOString().slice(0, 10));
  const method = 'error' in calc
    ? { kind: 'entered' as const, reasons: str(c.fields.assessmentReasons) }
    : { kind: 'rule' as const, rule: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest, citations: calc.rule.citations, steps: calc.steps };
  const amountMinor = 'error' in calc ? num(c.fields.assessedMinor) : calc.amountMinor;
  const ret = returnFor(t.id, str(c.fields.taxType), str(c.fields.period));
  const a = recordAssessment({ taxpayer: t.id, taxType: str(c.fields.taxType), period: str(c.fields.period), ...(ret ? { returnId: ret.id } : {}), baseMinor: num(c.fields.baseMinor), amountMinor, currency: currencyOf(c), method, case: c.id, by: actor.name }, now);
  if ('error' in a) return a;
  return {
    facts: { assessment: a.reference, amountMinor: a.amountMinor, method: a.method.kind },
    ...(a.method.kind === 'rule' ? { rules: [{ key: a.method.rule, version: a.method.version, digest: a.method.digest }] } : {}),
    after: (d?: { id: string }) => { if (d) attachAssessmentDecision(a.id, d.id); },
  };
});

registerEffect('tax.issueNotice', ({ case: c, actor }: EffectContext) => {
  const t = getTaxpayer(str(c.fields.tin));
  const a = assessmentOfCase(c.id);
  if (!t || !a) return { error: 'The assessment must be made before its notice is issued' };
  if (a.amountMinor === 0) return { facts: { bill: 'none (nothing owed)' } };
  const due = str(c.fields.dueDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: 'Give the date payment is due (the law sets it; no default is assumed)' };
  const b = issueBill({ kind: 'tax', description: `${a.taxType} ${a.period}`, amountMinor: a.amountMinor, currency: a.currency, dueDate: due, reference: a.reference, payer: t.party, issuer: c.owner }, actor.name);
  if ('error' in b) return b;
  return { facts: { bill: b.id } };
});

registerEffect('tax.vary', ({ case: c, actor, now }: EffectContext) => {
  const r = varyAssessment(str(c.fields.assessment), num(c.fields.variedMinor), c.pending?.reason ?? str(c.fields.grounds), c.id, actor.name, now);
  if ('error' in r) return r;
  return { facts: { assessment: r.reference, amountMinor: r.amountMinor } };
});

const TAXPAYER_FIELDS: CasePackage['fields'] = [
  { key: 'tin', label: 'Taxpayer identification number', type: 'text', required: true },
  { key: 'taxType', label: 'Tax type (as the authority names it, e.g. income)', type: 'text', required: true },
  { key: 'period', label: 'Period (2026, 2026-03 or 2026-Q1)', type: 'text', required: true },
];

export const REFERENCE_TAX_REGISTRATION: Ref = {
  key: 'tax.registration', version: 1, owner: 'tax', title: 'Taxpayer registration', refPrefix: 'TXR', reference: true, citations: [],
  // The specification's taxpayer registration form (taxpayer-registration-v1), attached to the procedure's own fields (lib/forms/library).
  ...attachForm([
    { key: 'partyKind', label: 'Person or organisation', type: 'choice', options: ['person', 'organisation'], required: true },
    { key: 'partyRef', label: 'Register reference (birth registration or organisation number)', type: 'text', required: true, personal: true },
    { key: 'partyName', label: 'Name', type: 'text', required: true, personal: true },
    { key: 'taxTypes', label: 'Tax types (comma separated)', type: 'text', required: true },
  ], [{ class: 'identity-evidence', label: 'Identity or registration evidence', required: true }], libraryForm('taxpayer-registration-v1')),
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verification' }, { key: 'pending-approval', label: 'Decision' }, { key: 'registered', label: 'Registered', terminal: true }, { key: 'not-registered', label: 'Refused', terminal: true }],
  actions: [
    { key: 'verify', label: 'Verify identity and registration', from: ['submitted'], to: 'verification', needs: { role: 'officer' }, requires: { documents: ['identity-evidence'], fields: ['partyKind', 'partyRef', 'partyName', 'taxTypes'] } },
    { key: 'propose', label: 'Verified: propose', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' } },
    { key: 'register', label: 'Register the taxpayer', from: ['pending-approval'], to: 'registered', decision: 'register', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['tax.register'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-registered', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [], notifications: [], appeal: { sampleDays: 30, body: 'the tax appeals tribunal', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [{ name: 'registered', steps: [{ action: 'verify', fields: { partyKind: 'person', partyRef: 'BR-1', partyName: 'A', taxTypes: 'income' }, documents: ['identity-evidence'], expect: 'verification' }, { action: 'propose', expect: 'pending-approval' }, { action: 'register', expect: 'registered' }] }],
};

export const REFERENCE_TAX_RETURN: Ref = {
  key: 'tax.return', version: 1, owner: 'tax', title: 'Tax return and assessment', refPrefix: 'TXA', reference: true, citations: [],
  fields: [
    ...TAXPAYER_FIELDS,
    { key: 'baseMinor', label: 'Declared base (minor units)', type: 'number', required: true, personal: true },
    { key: 'currency', label: 'Currency (three letters; the nation\'s by default)', type: 'text' },
    // Forms batch 6: a nil return (nothing to declare where the law requires a return) and a late return (what follows is the approved rule's).
    { key: 'returnKind', label: 'Kind of return', type: 'choice', options: ['periodic', 'nil', 'late'], hint: 'A nil return declares a base of zero. A late return is received and routed under the approved rules; nothing is charged here.' },
    { key: 'lateReason', label: 'Why the return is late (a late return)', type: 'longtext', personalDataClass: 'restricted', confidentiality: 'tax' },
    { key: 'amendmentReason', label: 'Why this replaces an earlier return (amendments)', type: 'longtext' },
    { key: 'assessedMinor', label: 'Assessed amount (minor units), when no approved rule applies', type: 'number', personal: true },
    { key: 'assessmentReasons', label: 'How the amount was assessed, when no approved rule applies', type: 'longtext' },
    { key: 'dueDate', label: 'Payment due on (as the law sets it)', type: 'date' },
  ],
  documents: [{ class: 'return-form', label: 'The return as filed', required: true }, { class: 'supporting-evidence', label: 'Supporting evidence', required: false }],
  stages: [
    { key: 'filed', label: 'Filed' }, { key: 'checking', label: 'Checking' }, { key: 'returned', label: 'Returned for correction' },
    { key: 'pending-approval', label: 'Assessment' }, { key: 'assessed', label: 'Assessed' }, { key: 'notice-issued', label: 'Notice issued', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Record the return and check it', from: ['filed'], to: 'checking', needs: { role: 'officer' }, requires: { documents: ['return-form'], fields: ['tin', 'taxType', 'period', 'baseMinor'] }, effects: ['tax.fileReturn'] },
    { key: 'return', label: 'Return for correction', from: ['checking'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'resubmit', label: 'Corrected return received', from: ['returned'], to: 'filed', needs: { role: 'officer' } },
    { key: 'propose', label: 'Propose the assessment', from: ['checking'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['tax.checkAssessment'] },
    { key: 'assess', label: 'Make the assessment', from: ['pending-approval'], to: 'assessed', decision: 'assess', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.assess'] },
    { key: 'issue', label: 'Issue the notice and the bill', from: ['assessed'], to: 'notice-issued', needs: { role: 'officer' }, requires: { fields: ['dueDate'] }, effects: ['tax.issueNotice'] },
  ],
  deadlines: [], notifications: [], appeal: { sampleDays: 30, body: 'an objection to the tax authority, then the tax appeals tribunal', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'assessed and notified', steps: [
      { action: 'check', fields: { tin: 'TIN-1', taxType: 'income', period: '2025', baseMinor: 1 }, documents: ['return-form'], expect: 'checking' },
      { action: 'propose', expect: 'pending-approval' }, { action: 'assess', expect: 'assessed' },
      { action: 'issue', expect: 'refused' }, { action: 'issue', fields: { dueDate: '2026-12-31' }, expect: 'notice-issued' },
    ] },
    { name: 'returned', steps: [{ action: 'check', fields: { tin: 'TIN-1', taxType: 'income', period: '2025', baseMinor: 1 }, documents: ['return-form'], expect: 'checking' }, { action: 'return', expect: 'returned' }, { action: 'resubmit', expect: 'filed' }] },
    { name: 'nil return', steps: [{ action: 'check', fields: { tin: 'TIN-1', taxType: 'income', period: '2025', baseMinor: 0, returnKind: 'nil' }, documents: ['return-form'], expect: 'checking' }, { action: 'propose', expect: 'pending-approval' }, { action: 'assess', expect: 'assessed' }] },
  ],
};

export const REFERENCE_TAX_OBJECTION: Ref = {
  key: 'tax.objection', version: 1, owner: 'tax', title: 'Objection to a tax assessment', refPrefix: 'TXO', reference: true, citations: [],
  fields: [
    { key: 'assessment', label: 'Assessment reference (tax:ASM-…)', type: 'text', required: true },
    { key: 'grounds', label: 'Grounds of the objection', type: 'longtext', required: true, personal: true },
    { key: 'variedMinor', label: 'Amount after the decision (minor units), if varied', type: 'number', personal: true },
    // Forms batch 6 (Part 2 §2.6 Department E): what an objection to an assessment covers, beside its grounds.
    { key: 'remedy', label: 'What the objector asks for', type: 'text', personalDataClass: 'restricted', confidentiality: 'tax', hint: 'As the nation\'s dispute rules list the remedies (none ship).' },
    { key: 'timelinessRule', label: 'Deadline rule applied (the approved rule and the event date it counts from)', type: 'text', personalDataClass: 'restricted', confidentiality: 'tax', audience: 'officer', hint: 'Never a number of days typed here: if the rule or the event date is disputed, the case goes to review.' },
    { key: 'admissibility', label: 'Completeness and admissibility: what was checked and found, with reasons', type: 'longtext', personalDataClass: 'restricted', confidentiality: 'tax', audience: 'officer' },
  ],
  documents: [{ class: 'objection', label: 'The objection as lodged', required: true }, { class: 'objection-evidence', label: 'Evidence added to the objection', required: false }, { class: 'extension-request', label: 'A request for more time, where the law permits one', required: false }],
  stages: [
    { key: 'lodged', label: 'Lodged' }, { key: 'review', label: 'Under review' }, { key: 'awaiting-information', label: 'Waiting for the objector' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'varied', label: 'Assessment varied', terminal: true }, { key: 'dismissed', label: 'Objection dismissed', terminal: true },
    { key: 'inadmissible', label: 'Not admitted', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'review', label: 'Start the review', from: ['lodged'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['objection'], fields: ['assessment', 'grounds'] } },
    { key: 'request-information', label: 'Ask the objector for evidence or information', from: ['review'], to: 'awaiting-information', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'information-received', label: 'Evidence or information received', from: ['awaiting-information'], to: 'review', needs: { role: 'officer' } },
    { key: 'propose', label: 'Propose the decision', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['admissibility'] } },
    { key: 'vary', label: 'Vary the assessment', from: ['pending-approval'], to: 'varied', decision: 'vary', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['variedMinor'] }, effects: ['tax.vary'] },
    { key: 'dismiss', label: 'Dismiss the objection', from: ['pending-approval'], to: 'dismissed', decision: 'dismiss', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'reject', label: 'Not admitted (out of time, incomplete or not open to objection), with reasons', from: ['pending-approval'], to: 'inadmissible', decision: 'reject', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['admissibility'] } },
    { key: 'withdraw', label: 'Record the objector\'s withdrawal', from: ['lodged', 'review', 'awaiting-information'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'information', label: 'Time the objector has to give the evidence or information asked for (the nation\'s rule)', from: 'awaiting-information', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: { sampleDays: 30, body: 'the tax appeals tribunal', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'varied', steps: [{ action: 'review', fields: { assessment: 'tax:ASM-1', grounds: 'x' }, documents: ['objection'], expect: 'review' }, { action: 'propose', fields: { admissibility: 'In time and complete' }, expect: 'pending-approval' }, { action: 'vary', fields: { variedMinor: 1 }, expect: 'varied' }] },
    { name: 'dismissed', steps: [{ action: 'review', fields: { assessment: 'tax:ASM-1', grounds: 'x' }, documents: ['objection'], expect: 'review' }, { action: 'propose', fields: { admissibility: 'In time and complete' }, expect: 'pending-approval' }, { action: 'dismiss', expect: 'dismissed' }] },
    { name: 'not admitted', steps: [{ action: 'review', fields: { assessment: 'tax:ASM-1', grounds: 'x' }, documents: ['objection'], expect: 'review' }, { action: 'propose', fields: { admissibility: 'Lodged after the period the rule allows' }, expect: 'pending-approval' }, { action: 'reject', expect: 'inadmissible' }] },
    { name: 'withdrawn', steps: [{ action: 'review', fields: { assessment: 'tax:ASM-1', grounds: 'x' }, documents: ['objection'], expect: 'review' }, { action: 'request-information', expect: 'awaiting-information' }, { action: 'withdraw', expect: 'withdrawn' }] },
  ],
};

// ── Tax services (plan step I5, forms batch 6) ───────────────────────────────
// Reference procedures for the tax authority to adapt to its law and approve:
// registration amendment; return or assessment amendment; refund; payment
// arrangement and its review; voluntary disclosure; formal ruling; compliance
// review. Each decision is made by two officials and classified
// (lib/permits/decisions.ts, TAX_PERMITS, under proposed mappings nobody has
// approved). Every period is the nation's (deadlines ship without days);
// interest and penalties come only from an approved rule (lib/law/rules.ts),
// and a production installation refuses one without it. Inspection, review
// and assessment steps record an officer's findings with reasons, never a
// score. Liabilities are bills carrying the assessment's reference; refunds
// are reconciled once against the payout's own reference. Restricted (tax
// secrecy): read under canReadTax(), every read in the access log.

/** The permit type (lib/permits/authority.ts) each tax service's decisions rest on; a compliance review's assessment is a tax assessment. */
export const TAX_PERMITS: Record<string, string> = {
  'tax.amendment': 'tax-assessment', 'tax.disclosure': 'tax-assessment', 'tax.compliance': 'tax-compliance-review',
  'tax.refund': 'tax-refund', 'tax.payment-plan': 'tax-payment-arrangement', 'tax.ruling': 'tax-ruling',
};

/** A field under tax secrecy (restricted, confidentiality tax). */
const R = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', confidentiality: 'tax', ...extra });
const TIN = R('tin', 'Taxpayer identification number', 'text', { required: true });
const TAX_TYPE_FIELD = R('taxType', 'Tax type (as the authority names it, e.g. income)', 'text', { required: true });
const reasonOf = (c: Case) => c.pending?.reason ?? '';
const fail = <T extends object>(x: T | { error: string }): x is { error: string } => 'error' in x;

/**
 * An amount the law decides (interest, a penalty): the approved rule in force
 * for `key`, cited; without one, a production installation refuses and a
 * demonstration or training installation takes the amount entered with
 * reasons. When the deciding officials find the law gives none, they say so
 * with reasons.
 */
function lawAmount(c: Case, key: string, baseMinor: number, applies: boolean, entered: { amount: unknown; reasons: unknown }, now: Date): LawAmount | { error: string } {
  if (!applies) {
    const why = str(entered.reasons) || reasonOf(c);
    return why ? { kind: 'none', reasons: why } : { error: 'Say why the law gives none' };
  }
  const calc = calculate(key, { amountMinor: baseMinor }, now.toISOString().slice(0, 10));
  if (!('error' in calc)) return { kind: 'rule', rule: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest, amountMinor: calc.amountMinor };
  if (!samplesAllowed()) return { error: `${calc.error}: a production installation refuses an amount the law decides without an approved rule (${key})` };
  const amount = num(entered.amount);
  if (!Number.isInteger(amount) || amount < 0 || !str(entered.reasons)) return { error: `${calc.error}. Enter the amount and its reasons (demonstration and training installations only)` };
  return { kind: 'entered', amountMinor: amount, reasons: str(entered.reasons) };
}
const ruleRefs = (...xs: (LawAmount | undefined)[]) => xs.flatMap(x => (x?.kind === 'rule' ? [{ key: x.rule, version: x.version, digest: x.digest }] : []));
const isYes = (v: unknown) => v === true || v === 'true' || v === 'yes';

// Registration amendment (batch 3's change forms): details, an obligation added or cancelled, a transfer, a suspension, a reactivation.

const CHANGE_KINDS = ['details', 'obligation-add', 'obligation-cancel', 'transfer', 'suspend', 'reactivate'];
function changeOf(c: Case): RegistrationChange | { error: string } {
  const k = str(c.fields.change);
  const types = listOf(c.fields.taxTypes).flatMap(x => x.split(/\s+/)).filter(Boolean);
  switch (k) {
    case 'details': {
      const details = { ...(str(c.fields.newAddress) ? { address: str(c.fields.newAddress) } : {}), ...(str(c.fields.newContact) ? { contact: str(c.fields.newContact) } : {}) };
      return Object.keys(details).length ? { kind: 'details', details } : { error: 'Give the new address or contact details' };
    }
    case 'obligation-add': case 'obligation-cancel': return types.length ? { kind: k, taxTypes: types } : { error: 'Name the tax types' };
    case 'transfer': return str(c.fields.office) ? { kind: 'transfer', office: str(c.fields.office) } : { error: 'Name the tax office' };
    case 'suspend': case 'reactivate': return { kind: k };
    default: return { error: `Say what changes (${CHANGE_KINDS.join(', ')})` };
  }
}
/** The step that decides each kind of change: a suspension and a reactivation exercise the suspend power; the rest amend. */
const STEP_FOR: Record<string, string> = { suspend: 'suspend', reactivate: 'reinstate' };

registerEffect('tax.checkRegistrationChange', ({ case: c }: EffectContext) => {
  const t = getTaxpayer(str(c.fields.tin));
  if (!t) return { error: `No taxpayer ${str(c.fields.tin)}` };
  const ch = changeOf(c);
  if (fail(ch)) return ch;
  return { facts: { change: ch.kind, decidedBy: STEP_FOR[ch.kind] ?? 'amend' } };
});
registerEffect('tax.amendRegistration', ({ case: c, action, actor, now }: EffectContext) => {
  const ch = changeOf(c);
  if (fail(ch)) return ch;
  const want = STEP_FOR[ch.kind] ?? 'amend';
  if (action.decision !== want) return { error: `A change of kind ${ch.kind} is decided by the step "${want}"` };
  const t = amendRegistration(str(c.fields.tin), ch, reasonOf(c), c.id, actor.name, now);
  if (fail(t)) return t;
  return { facts: { tin: t.tin, change: ch.kind, version: t.version ?? 1 } };
});

export const REFERENCE_TAX_REGISTRATION_AMENDMENT: Ref = {
  key: 'tax.registration-amendment', version: 1, owner: 'tax', title: 'Amendment of a taxpayer registration', refPrefix: 'TRA', reference: true, citations: [],
  fields: [
    TIN,
    R('change', 'What changes', 'choice', { required: true, options: CHANGE_KINDS, hint: 'Details (address or contact), an obligation added or cancelled, a transfer to another tax office, a suspension or a reactivation where the law permits it.' }),
    R('taxTypes', 'Tax types added or cancelled (comma separated)'),
    R('office', 'The tax office the taxpayer moves to (a transfer)'),
    R('newAddress', 'New address (a change of details)', 'longtext'),
    R('newContact', 'New contact details (a change of details)'),
    R('changeReason', 'Why the change is asked for', 'longtext', { required: true }),
    R('effectiveDate', 'From when (as the nation\'s rule allows)', 'date'),
    R('verification', 'What was verified, and what was found, with reasons', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'change-request', label: 'The request as received', required: true }, { class: 'change-evidence', label: 'Evidence of the change', required: false }],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verification' }, { key: 'awaiting-information', label: 'Waiting for the taxpayer' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'amended', label: 'Registration amended', terminal: true }, { key: 'not-amended', label: 'Refused', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'verify', label: 'Verify the request and its evidence', from: ['submitted'], to: 'verification', needs: { role: 'officer' }, requires: { documents: ['change-request'], fields: ['tin', 'change', 'changeReason'] } },
    { key: 'request-information', label: 'Ask the taxpayer for further information', from: ['verification'], to: 'awaiting-information', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'information-received', label: 'Information received', from: ['awaiting-information'], to: 'verification', needs: { role: 'officer' } },
    { key: 'propose', label: 'Verified: propose the decision', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['verification'] }, effects: ['tax.checkRegistrationChange'] },
    { key: 'amend', label: 'Amend the registration (details, obligations, transfer)', from: ['pending-approval'], to: 'amended', decision: 'amend', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.amendRegistration'] },
    { key: 'suspend', label: 'Suspend the registration, where the law permits it', from: ['pending-approval'], to: 'amended', decision: 'suspend', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.amendRegistration'] },
    { key: 'reinstate', label: 'Reactivate the suspended registration', from: ['pending-approval'], to: 'amended', decision: 'reinstate', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.amendRegistration'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-amended', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'withdraw', label: 'Record the taxpayer\'s withdrawal', from: ['submitted', 'verification', 'awaiting-information'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'information', label: 'Time the taxpayer has to answer a request for information (the nation\'s rule)', from: 'awaiting-information', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: { sampleDays: 30, body: 'an objection to the tax authority, then the body the law names', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'details amended', steps: [{ action: 'verify', fields: { tin: 'TIN-1', change: 'details', changeReason: 'Moved', newAddress: 'x' }, documents: ['change-request'], expect: 'verification' }, { action: 'propose', fields: { verification: 'Checked' }, expect: 'pending-approval' }, { action: 'amend', expect: 'amended' }] },
    { name: 'withdrawn', steps: [{ action: 'verify', fields: { tin: 'TIN-1', change: 'transfer', changeReason: 'x', office: 'North' }, documents: ['change-request'], expect: 'verification' }, { action: 'withdraw', expect: 'withdrawn' }] },
  ],
};

// Amendment of a return or an assessment: the original is never overwritten; a new return version and a varied assessment.

registerEffect('tax.checkAmendment', ({ case: c, now }: EffectContext) => {
  const a = getAssessment(str(c.fields.assessment));
  if (!a) return { error: `No assessment ${str(c.fields.assessment)}` };
  const base = c.fields.amendedBaseMinor === undefined || c.fields.amendedBaseMinor === '' ? a.baseMinor : num(c.fields.amendedBaseMinor);
  const calc = calculate(`tax.${a.taxType}`, { amountMinor: base }, now.toISOString().slice(0, 10));
  if (!('error' in calc)) return { facts: { proposedMinor: calc.amountMinor, rule: `${calc.rule.key} v${calc.rule.version}` } };
  if (!Number.isInteger(num(c.fields.variedMinor)) || !str(c.fields.assessmentReasons)) return { error: `${calc.error}. Enter the amended amount and how it was assessed.` };
});
registerEffect('tax.amend', ({ case: c, actor, now }: EffectContext) => {
  const a = getAssessment(str(c.fields.assessment));
  if (!a) return { error: `No assessment ${str(c.fields.assessment)}` };
  const t = getTaxpayer(a.taxpayer);
  if (!t) return { error: 'The assessment\'s taxpayer is not in the register' };
  const newBase = c.fields.amendedBaseMinor === undefined || c.fields.amendedBaseMinor === '' ? undefined : num(c.fields.amendedBaseMinor);
  // The amended return is a new version beside the original, never in its place.
  if (newBase !== undefined) {
    const r = fileReturn({ tin: t.tin, taxType: a.taxType, period: a.period, baseMinor: newBase, currency: a.currency, reason: str(c.fields.grounds) || reasonOf(c), kind: 'amended' }, c.id, actor.name, now);
    if (fail(r)) return r;
  }
  const calc = calculate(`tax.${a.taxType}`, { amountMinor: newBase ?? a.baseMinor }, now.toISOString().slice(0, 10));
  const amount = 'error' in calc ? num(c.fields.variedMinor) : calc.amountMinor;
  const v = varyAssessment(a.id, amount, 'error' in calc ? `${reasonOf(c)} · ${str(c.fields.assessmentReasons)}` : `${reasonOf(c)} · rule ${calc.rule.key} v${calc.rule.version}`, c.id, actor.name, now);
  if (fail(v)) return v;
  return { facts: { assessment: v.reference, amountMinor: v.amountMinor, ...(newBase !== undefined ? { returnVersion: 'new' } : {}) }, ...('error' in calc ? {} : { rules: [{ key: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest }] }) };
});

export const REFERENCE_TAX_AMENDMENT: Ref = {
  key: 'tax.amendment', version: 1, owner: 'tax', title: 'Amendment of a tax return or assessment', refPrefix: 'TAM', reference: true, citations: [],
  fields: [
    R('assessment', 'Assessment reference (tax:ASM-…)', 'text', { required: true }),
    R('origin', 'Who asks', 'choice', { required: true, options: ['taxpayer', 'review-request', 'officer-correction'], hint: 'The taxpayer\'s amendment or request for review, or an official correcting a clerical error (recorded as such, with the same decision by two officials).' }),
    R('grounds', 'What is amended and why', 'longtext', { required: true }),
    R('amendedBaseMinor', 'Amended declared base (minor units), if the return changes', 'number'),
    R('variedMinor', 'Amended amount (minor units), when no approved rule applies', 'number', { audience: 'officer' }),
    R('assessmentReasons', 'How the amended amount was assessed, when no approved rule applies', 'longtext', { audience: 'officer' }),
    R('review', 'What was reviewed and found, with reasons', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'amendment-request', label: 'The amendment or review request as received', required: true }, { class: 'amendment-evidence', label: 'Evidence', required: false }],
  stages: [
    { key: 'lodged', label: 'Lodged' }, { key: 'review', label: 'Under review' }, { key: 'awaiting-information', label: 'Waiting for the taxpayer' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'amended', label: 'Amended', terminal: true }, { key: 'not-amended', label: 'Refused', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'review', label: 'Start the review', from: ['lodged'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['amendment-request'], fields: ['assessment', 'origin', 'grounds'] } },
    { key: 'request-information', label: 'Ask the taxpayer for further information', from: ['review'], to: 'awaiting-information', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'information-received', label: 'Information received', from: ['awaiting-information'], to: 'review', needs: { role: 'officer' } },
    { key: 'propose', label: 'Propose the amended assessment', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['review'] }, effects: ['tax.checkAmendment'] },
    { key: 'vary', label: 'Amend: a new return version and the assessment varied', from: ['pending-approval'], to: 'amended', decision: 'vary', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.amend'] },
    { key: 'refuse', label: 'Refuse the amendment, with reasons', from: ['pending-approval'], to: 'not-amended', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'withdraw', label: 'Record the withdrawal', from: ['lodged', 'review', 'awaiting-information'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'information', label: 'Time the taxpayer has to answer a request for information (the nation\'s rule)', from: 'awaiting-information', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: { sampleDays: 30, body: 'an objection to the tax authority, then the body the law names', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'amended', steps: [{ action: 'review', fields: { assessment: 'tax:ASM-1', origin: 'taxpayer', grounds: 'Costs omitted' }, documents: ['amendment-request'], expect: 'review' }, { action: 'propose', fields: { review: 'Costs evidenced' }, expect: 'pending-approval' }, { action: 'vary', expect: 'amended' }] },
    { name: 'refused', steps: [{ action: 'review', fields: { assessment: 'tax:ASM-1', origin: 'taxpayer', grounds: 'x' }, documents: ['amendment-request'], expect: 'review' }, { action: 'propose', fields: { review: 'No evidence' }, expect: 'pending-approval' }, { action: 'refuse', expect: 'not-amended' }] },
  ],
};

// Refunds: claim → assessment (an officer's findings) → decision by two officials → payment instruction → reconciliation with the payout, once.

const refundInput = (c: Case) => ({ tin: str(c.fields.tin), taxType: str(c.fields.taxType), period: str(c.fields.period) || undefined, claimedMinor: num(c.fields.claimedMinor), basis: str(c.fields.basis), currency: currencyOf(c) });
const refundInterest = (c: Case, now: Date) => lawAmount(c, `tax.refund-interest.${str(c.fields.taxType)}`, num(c.fields.approvedMinor), isYes(c.fields.interestApplies), { amount: c.fields.interestMinor, reasons: c.fields.interestReasons }, now);

registerEffect('tax.checkRefund', ({ case: c, now }: EffectContext) => {
  const t = getTaxpayer(str(c.fields.tin));
  if (!t) return { error: `No taxpayer ${str(c.fields.tin)}` };
  if (!Number.isInteger(num(c.fields.approvedMinor)) || num(c.fields.approvedMinor) < 0) return { error: 'Propose the amount to refund (zero to refuse)' };
  const interest = refundInterest(c, now);
  if (fail(interest)) return interest;
  return { facts: { proposedMinor: num(c.fields.approvedMinor), interest: interest.kind } };
});
registerEffect('tax.decideRefund', ({ case: c, action, actor, now }: EffectContext) => {
  const refused = action.decision === 'refuse';
  const interest = refused ? undefined : refundInterest(c, now);
  if (interest && fail(interest)) return interest;
  const credit = str(c.fields.credit) === 'new-entitlement' ? 'new-entitlement' : 'existing-credit';
  const r = decideRefund({ ...refundInput(c), approvedMinor: refused ? 0 : num(c.fields.approvedMinor), credit, ...(interest ? { interest } : {}), reasons: reasonOf(c) }, c.id, actor.name, now);
  if (fail(r)) return r;
  if (!refused && r.state !== 'approved') return { error: 'An approval refunds a positive amount; a refund of nothing is a refusal' };
  return { facts: { refund: r.reference, approvedMinor: r.approvedMinor, credit: r.credit, interest: r.interest?.kind ?? 'none' }, rules: ruleRefs(r.interest), after: (d?: { id: string }) => { if (d) attachServiceDecision('refund', r.id, d.id); } };
});
registerEffect('tax.instructRefund', ({ case: c, actor, now }: EffectContext) => {
  const r = refundOfCase(c.id);
  if (!r) return { error: 'The refund must be decided before it is instructed' };
  const i = instructRefund(r.id, c.id, actor.name, now);
  return fail(i) ? i : { facts: { refund: i.reference, instructed: true } };
});
registerEffect('tax.reconcileRefund', ({ case: c, actor, now }: EffectContext) => {
  const r = refundOfCase(c.id);
  if (!r) return { error: 'No refund to reconcile' };
  const p = reconcileRefundPayout(r.id, { railReference: str(c.fields.payoutReference), amountMinor: num(c.fields.payoutMinor), paidAt: str(c.fields.payoutDate), ...(isYes(c.fields.payoutSimulated) ? { simulated: true } : {}) }, actor.name, now);
  return fail(p) ? p : { facts: { refund: p.reference, paid: p.payout!.railReference } };
});

export const REFERENCE_TAX_REFUND: Ref = {
  key: 'tax.refund', version: 1, owner: 'tax', title: 'Tax refund claim', refPrefix: 'TRF', reference: true, citations: [],
  fields: [
    TIN, TAX_TYPE_FIELD,
    R('period', 'Period (2026, 2026-03 or 2026-Q1), where the claim arises from a return'),
    R('claimedMinor', 'Amount claimed (minor units)', 'number', { required: true }),
    R('basis', 'Claim basis (as the nation\'s rules list them)', 'text', { required: true }),
    R('currency', 'Currency (three letters; the nation\'s by default)'),
    R('findings', 'Assessment of the claim: what was checked and found, with reasons', 'longtext', { audience: 'officer' }),
    R('approvedMinor', 'Amount to refund (minor units); zero to refuse', 'number', { audience: 'officer' }),
    R('credit', 'Paid from', 'choice', { audience: 'officer', options: ['existing-credit', 'new-entitlement'], hint: 'A credit the account already shows, or an entitlement the decision credits to the account (with reasons).' }),
    R('interestApplies', 'Does the law give interest on this refund?', 'boolean', { audience: 'officer', hint: 'Calculated only by the approved rule; a production installation refuses without one.' }),
    R('interestMinor', 'Interest (minor units), when no approved rule applies (demonstration and training only)', 'number', { audience: 'officer' }),
    R('interestReasons', 'How the interest was set, or why the law gives none', 'longtext', { audience: 'officer' }),
    R('payoutReference', 'The payout\'s own reference (treasury or bank)', 'text', { audience: 'officer' }),
    R('payoutMinor', 'Amount paid out (minor units)', 'number', { audience: 'officer' }),
    R('payoutDate', 'Date paid out', 'date', { audience: 'officer' }),
  ],
  documents: [{ class: 'refund-claim', label: 'The refund claim as received', required: true }, { class: 'refund-evidence', label: 'Evidence for the claim', required: false }, { class: 'payout-confirmation', label: 'The payout confirmation', required: false }],
  stages: [
    { key: 'claimed', label: 'Claimed' }, { key: 'assessment', label: 'Assessment' }, { key: 'awaiting-evidence', label: 'Waiting for evidence' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'approved', label: 'Approved' }, { key: 'instructed', label: 'Payment instructed' }, { key: 'paid', label: 'Paid and reconciled', terminal: true },
    { key: 'refund-refused', label: 'Refused', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'assess', label: 'Start the assessment of the claim', from: ['claimed'], to: 'assessment', needs: { role: 'officer' }, requires: { documents: ['refund-claim'], fields: ['tin', 'taxType', 'claimedMinor', 'basis'] } },
    { key: 'request-evidence', label: 'Ask the taxpayer for evidence', from: ['assessment'], to: 'awaiting-evidence', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'evidence-received', label: 'Evidence received', from: ['awaiting-evidence'], to: 'assessment', needs: { role: 'officer' } },
    { key: 'propose', label: 'Record the findings and propose the decision', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['findings', 'approvedMinor', 'credit'] }, effects: ['tax.checkRefund'] },
    { key: 'approve', label: 'Approve the refund (in full or adjusted)', from: ['pending-approval'], to: 'approved', decision: 'approve', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.decideRefund'] },
    { key: 'refuse', label: 'Refuse the refund, with reasons', from: ['pending-approval'], to: 'refund-refused', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.decideRefund'] },
    { key: 'instruct', label: 'Authorise the payment instruction', from: ['approved'], to: 'instructed', needs: { role: 'signatory' }, effects: ['tax.instructRefund'] },
    { key: 'reconcile', label: 'Reconcile the payout (once)', from: ['instructed'], to: 'paid', needs: { role: 'officer' }, requires: { documents: ['payout-confirmation'], fields: ['payoutReference', 'payoutMinor', 'payoutDate'] }, effects: ['tax.reconcileRefund'] },
    { key: 'withdraw', label: 'Record the taxpayer\'s withdrawal', from: ['claimed', 'assessment', 'awaiting-evidence'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [
    { key: 'evidence', label: 'Time the taxpayer has to give the evidence asked for (the nation\'s rule)', from: 'awaiting-evidence', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' },
    { key: 'decide', label: 'Time the authority has to decide a refund claim, where the law sets one', from: 'claimed', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' },
  ],
  notifications: [], appeal: { sampleDays: 30, body: 'an objection to the tax authority, then the body the law names', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'approved and paid', steps: [
      { action: 'assess', fields: { tin: 'TIN-1', taxType: 'income', claimedMinor: 100, basis: 'overpayment' }, documents: ['refund-claim'], expect: 'assessment' },
      { action: 'propose', fields: { findings: 'Overpaid', approvedMinor: 100, credit: 'existing-credit' }, expect: 'pending-approval' },
      { action: 'approve', expect: 'approved' }, { action: 'instruct', expect: 'instructed' },
      { action: 'reconcile', expect: 'refused' }, { action: 'reconcile', fields: { payoutReference: 'TRS-1', payoutMinor: 100, payoutDate: '2026-11-01' }, documents: ['payout-confirmation'], expect: 'paid' },
    ] },
    { name: 'refused', steps: [{ action: 'assess', fields: { tin: 'TIN-1', taxType: 'income', claimedMinor: 100, basis: 'overpayment' }, documents: ['refund-claim'], expect: 'assessment' }, { action: 'propose', fields: { findings: 'No overpayment', approvedMinor: 0, credit: 'existing-credit' }, expect: 'pending-approval' }, { action: 'refuse', expect: 'refund-refused' }] },
  ],
};

// Payment arrangements: request → statutory eligibility and affordability (an officer's findings) → decision by two officials → instalments billed.

/** The schedule as lines "YYYY-MM-DD amount" (minor units), one instalment a line. */
function scheduleOf(v: unknown): { due: string; amountMinor: number }[] | { error: string } {
  const lines = textOf(v).split(/\n+/).map(l => l.trim()).filter(Boolean);
  const out: { due: string; amountMinor: number }[] = [];
  for (const l of lines) {
    const m = /^(\d{4}-\d{2}-\d{2})\s*[,;| ]\s*(\d+)$/.exec(l);
    if (!m) return { error: `Each instalment is a line "YYYY-MM-DD amount" in minor units: ${l.slice(0, 60)}` };
    out.push({ due: m[1]!, amountMinor: Number(m[2]) });
  }
  return out.length ? out : { error: 'Give the schedule of instalments' };
}
const planInterest = (c: Case, now: Date) => {
  const owed = listOf(c.fields.liabilities).map(r => getAssessment(r)).reduce((s, a) => s + (a ? a.amountMinor : 0), 0);
  const first = getAssessment(listOf(c.fields.liabilities)[0] ?? '');
  return lawAmount(c, `tax.interest.${first?.taxType ?? 'unknown'}`, owed, isYes(c.fields.interestApplies), { amount: c.fields.interestMinor, reasons: c.fields.interestReasons }, now);
};

registerEffect('tax.checkPlan', ({ case: c, now }: EffectContext) => {
  const t = getTaxpayer(str(c.fields.tin));
  if (!t) return { error: `No taxpayer ${str(c.fields.tin)}` };
  const liabilities = listOf(c.fields.liabilities);
  if (!liabilities.length || liabilities.some(r => getAssessment(r)?.taxpayer !== t.id)) return { error: 'Every liability is an assessment of this taxpayer (tax:ASM-…): a balance never stands alone' };
  const s = scheduleOf(c.fields.schedule);
  if (fail(s)) return s;
  const interest = planInterest(c, now);
  if (fail(interest)) return interest;
  return { facts: { instalments: s.length, interest: interest.kind } };
});
registerEffect('tax.approvePlan', ({ case: c, actor, now }: EffectContext) => {
  const s = scheduleOf(c.fields.schedule);
  if (fail(s)) return s;
  const interest = planInterest(c, now);
  if (fail(interest)) return interest;
  const p = recordPaymentPlan({ tin: str(c.fields.tin), liabilities: listOf(c.fields.liabilities), instalments: s, interest }, c.id, actor.name, now);
  if (fail(p)) return p;
  return { facts: { plan: p.id, instalments: p.instalments.length, interest: interest.kind }, rules: ruleRefs(interest), after: (d?: { id: string }) => { if (d) attachServiceDecision('plan', p.id, d.id); } };
});
/** Each instalment not yet billed becomes a bill carrying the assessment's reference and its number; receipts reconcile once each (reconcileTaxPayments). */
registerEffect('tax.issueInstalments', ({ case: c, actor }: EffectContext) => {
  const p = planOfCase(c.id);
  const t = p ? getTaxpayer(p.taxpayer) : undefined;
  if (!p || !t) return { error: 'The arrangement must be decided before its instalments are billed' };
  let n = 0;
  for (const i of p.instalments.filter(x => !x.bill)) {
    const b = issueBill({ kind: 'tax', description: `${p.taxType}: instalment ${i.n} of ${p.instalments.length} (${p.id})`, amountMinor: i.amountMinor, currency: p.currency, dueDate: i.due, reference: i.reference, payer: t.party, issuer: c.owner }, actor.name);
    if (fail(b)) return b;
    attachInstalmentBill(p.id, i.n, b.id);
    n++;
  }
  return { facts: { plan: p.id, billed: n } };
});

export const REFERENCE_TAX_PAYMENT_PLAN: Ref = {
  key: 'tax.payment-plan', version: 1, owner: 'tax', title: 'Payment arrangement for tax debt', refPrefix: 'TPP', reference: true, citations: [],
  fields: [
    TIN,
    R('liabilities', 'The assessed liabilities it covers (tax:ASM-…, comma separated)', 'text', { required: true }),
    R('schedule', 'Proposed schedule: one instalment a line, "YYYY-MM-DD amount" in minor units', 'longtext', { required: true }),
    R('reason', 'Why an arrangement is asked for', 'longtext', { required: true }),
    R('findings', 'Statutory eligibility and affordability: what was assessed and found, with reasons', 'longtext', { audience: 'officer' }),
    R('interestApplies', 'Does the law charge interest during the arrangement?', 'boolean', { audience: 'officer', hint: 'Calculated only by the approved rule; a production installation refuses without one.' }),
    R('interestMinor', 'Interest (minor units), when no approved rule applies (demonstration and training only)', 'number', { audience: 'officer' }),
    R('interestReasons', 'How the interest was set, or why the law gives none', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'arrangement-request', label: 'The request as received', required: true }, { class: 'arrangement-evidence', label: 'Evidence of the taxpayer\'s circumstances, as the rules ask', required: false }],
  stages: [
    { key: 'requested', label: 'Requested' }, { key: 'assessment', label: 'Eligibility and affordability' }, { key: 'awaiting-evidence', label: 'Waiting for evidence' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'approved', label: 'Approved' }, { key: 'billed', label: 'Instalments billed', terminal: true }, { key: 'not-approved', label: 'Refused', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'assess', label: 'Start the assessment', from: ['requested'], to: 'assessment', needs: { role: 'officer' }, requires: { documents: ['arrangement-request'], fields: ['tin', 'liabilities', 'schedule', 'reason'] } },
    { key: 'request-evidence', label: 'Ask the taxpayer for evidence', from: ['assessment'], to: 'awaiting-evidence', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'evidence-received', label: 'Evidence received', from: ['awaiting-evidence'], to: 'assessment', needs: { role: 'officer' } },
    { key: 'propose', label: 'Record the findings and propose the decision', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['findings'] }, effects: ['tax.checkPlan'] },
    { key: 'approve', label: 'Approve the arrangement', from: ['pending-approval'], to: 'approved', decision: 'approve', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.approvePlan'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-approved', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'bill', label: 'Issue the instalments as bills', from: ['approved'], to: 'billed', needs: { role: 'officer' }, effects: ['tax.issueInstalments'] },
    { key: 'withdraw', label: 'Record the taxpayer\'s withdrawal', from: ['requested', 'assessment', 'awaiting-evidence'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'evidence', label: 'Time the taxpayer has to give the evidence asked for (the nation\'s rule)', from: 'awaiting-evidence', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: { sampleDays: 30, body: 'the review the law provides for arrangement decisions', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'approved and billed', steps: [{ action: 'assess', fields: { tin: 'TIN-1', liabilities: 'tax:ASM-1', schedule: '2026-12-01 100', reason: 'Cash flow' }, documents: ['arrangement-request'], expect: 'assessment' }, { action: 'propose', fields: { findings: 'Eligible' }, expect: 'pending-approval' }, { action: 'approve', expect: 'approved' }, { action: 'bill', expect: 'billed' }] },
    { name: 'refused', steps: [{ action: 'assess', fields: { tin: 'TIN-1', liabilities: 'tax:ASM-1', schedule: '2026-12-01 100', reason: 'x' }, documents: ['arrangement-request'], expect: 'assessment' }, { action: 'propose', fields: { findings: 'Not eligible under the rules' }, expect: 'pending-approval' }, { action: 'refuse', expect: 'not-approved' }] },
  ],
};

// A change to an arrangement in force: the taxpayer's change or cancellation request, or an official's review of an alleged default.

registerEffect('tax.changePlan', ({ case: c, action, actor, now }: EffectContext) => {
  const id = str(c.fields.plan);
  if (!getPaymentPlan(id)) return { error: `No arrangement ${id}` };
  const d = action.decision;
  const change = d === 'vary' ? (() => { const s = scheduleOf(c.fields.schedule); return fail(s) ? s : { state: 'varied' as const, instalments: s }; })()
    : d === 'cancel' ? { state: 'cancelled' as const } : d === 'find-default' ? { state: 'defaulted' as const } : d === 'complete' ? { state: 'completed' as const } : { error: 'Unknown change' };
  if (fail(change)) return change;
  const p = changePlan(id, change, reasonOf(c), c.id, actor.name, now);
  return fail(p) ? p : { facts: { plan: p.id, state: p.state } };
});

export const REFERENCE_TAX_PAYMENT_PLAN_REVIEW: Ref = {
  key: 'tax.payment-plan-review', version: 1, owner: 'tax', title: 'Change, cancellation or default of a payment arrangement', refPrefix: 'TPR', reference: true, citations: [],
  fields: [
    TIN,
    R('plan', 'The arrangement (PPA-…)', 'text', { required: true }),
    R('request', 'What is asked or alleged', 'choice', { required: true, options: ['change', 'cancellation', 'default-review'] }),
    R('schedule', 'New schedule for what is left (a change): one instalment a line, "YYYY-MM-DD amount"', 'longtext'),
    R('reason', 'Why', 'longtext', { required: true }),
    R('findings', 'What was reviewed and found (payments, the taxpayer\'s response), with reasons', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'review-request', label: 'The request or the review record', required: true }, { class: 'taxpayer-response', label: 'The taxpayer\'s response to an alleged default', required: false }],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'review', label: 'Under review' }, { key: 'awaiting-response', label: 'Waiting for the taxpayer\'s response' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'decided', label: 'Decided', terminal: true }, { key: 'dismissed', label: 'No change', terminal: true },
  ],
  actions: [
    { key: 'review', label: 'Start the review', from: ['received'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['review-request'], fields: ['tin', 'plan', 'request', 'reason'] } },
    { key: 'ask-response', label: 'Give the taxpayer the chance to respond', from: ['review'], to: 'awaiting-response', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'response-received', label: 'Response received, or the time to respond passed', from: ['awaiting-response'], to: 'review', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'propose', label: 'Record the findings and propose the decision', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['findings'] } },
    { key: 'vary', label: 'Change the schedule of what is left', from: ['pending-approval'], to: 'decided', decision: 'vary', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['schedule'] }, effects: ['tax.changePlan'] },
    { key: 'cancel', label: 'Cancel the arrangement', from: ['pending-approval'], to: 'decided', decision: 'cancel', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.changePlan'] },
    { key: 'find-default', label: 'Find the arrangement in default', from: ['pending-approval'], to: 'decided', decision: 'find-default', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.changePlan'] },
    { key: 'dismiss', label: 'No change, with reasons', from: ['pending-approval'], to: 'dismissed', decision: 'dismiss', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'response', label: 'Time the taxpayer has to respond to an alleged default (the nation\'s rule)', from: 'awaiting-response', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: { sampleDays: 30, body: 'the review the law provides for arrangement decisions', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'default found after a response', steps: [{ action: 'review', fields: { tin: 'TIN-1', plan: 'PPA-1', request: 'default-review', reason: 'Instalment 2 unpaid' }, documents: ['review-request'], expect: 'review' }, { action: 'ask-response', expect: 'awaiting-response' }, { action: 'response-received', expect: 'review' }, { action: 'propose', fields: { findings: 'Unpaid; no response' }, expect: 'pending-approval' }, { action: 'find-default', expect: 'decided' }] },
    { name: 'no change', steps: [{ action: 'review', fields: { tin: 'TIN-1', plan: 'PPA-1', request: 'change', reason: 'x' }, documents: ['review-request'], expect: 'review' }, { action: 'propose', fields: { findings: 'x' }, expect: 'pending-approval' }, { action: 'dismiss', expect: 'dismissed' }] },
  ],
};

// Voluntary disclosure: disclosure → assessment (an officer's findings) → decision by two officials (an assessment, and a penalty only by the approved rule) → notice and bill.

const disclosurePenalty = (c: Case, baseMinor: number, now: Date) => lawAmount(c, `tax.disclosure-penalty.${str(c.fields.taxType)}`, baseMinor, isYes(c.fields.penaltyApplies), { amount: c.fields.penaltyMinor, reasons: c.fields.penaltyReasons }, now);
const disclosedTax = (c: Case, now: Date) => {
  const calc = calculate(`tax.${str(c.fields.taxType)}`, { amountMinor: num(c.fields.baseMinor) }, now.toISOString().slice(0, 10));
  return calc;
};

registerEffect('tax.checkDisclosure', ({ case: c, now }: EffectContext) => {
  const t = getTaxpayer(str(c.fields.tin));
  if (!t) return { error: `No taxpayer ${str(c.fields.tin)}` };
  const calc = disclosedTax(c, now);
  if ('error' in calc && (!Number.isInteger(num(c.fields.assessedMinor)) || !str(c.fields.assessmentReasons))) return { error: `${calc.error}. Enter the assessed amount and how it was assessed.` };
  const tax = 'error' in calc ? num(c.fields.assessedMinor) : calc.amountMinor;
  const pen = disclosurePenalty(c, tax, now);
  if (fail(pen)) return pen;
  return { facts: { proposedMinor: tax, penalty: pen.kind } };
});
registerEffect('tax.acceptDisclosure', ({ case: c, actor, now }: EffectContext) => {
  const t = getTaxpayer(str(c.fields.tin));
  if (!t) return { error: `No taxpayer ${str(c.fields.tin)}` };
  const periods = listOf(c.fields.periods);
  const calc = disclosedTax(c, now);
  const method = 'error' in calc ? { kind: 'entered' as const, reasons: str(c.fields.assessmentReasons) } : { kind: 'rule' as const, rule: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest, citations: calc.rule.citations, steps: calc.steps };
  const tax = 'error' in calc ? num(c.fields.assessedMinor) : calc.amountMinor;
  const pen = disclosurePenalty(c, tax, now);
  if (fail(pen)) return pen;
  // The penalty, if the law imposes one, is part of the assessed liability only as the approved rule calculates it.
  const amount = tax + (pen.kind === 'none' ? 0 : pen.amountMinor);
  const a = recordAssessment({ taxpayer: t.id, taxType: str(c.fields.taxType), period: periods[0] ?? '', baseMinor: num(c.fields.baseMinor), amountMinor: amount, currency: currencyOf(c), method, origin: 'disclosure', case: c.id, by: actor.name }, now);
  if (fail(a)) return a;
  const x = recordDisclosure({ tin: t.tin, taxType: str(c.fields.taxType), periods, assessment: a.reference, penalty: pen, accepted: true, reasons: reasonOf(c) }, c.id, actor.name, now);
  if (fail(x)) return x;
  return {
    facts: { assessment: a.reference, amountMinor: a.amountMinor, penalty: pen.kind, disclosure: x.id },
    rules: [...(method.kind === 'rule' ? [{ key: method.rule, version: method.version, digest: method.digest }] : []), ...ruleRefs(pen)],
    after: (d?: { id: string }) => { if (d) { attachAssessmentDecision(a.id, d.id); attachServiceDecision('disclosure', x.id, d.id); } },
  };
});
registerEffect('tax.refuseDisclosure', ({ case: c, actor, now }: EffectContext) => {
  const x = recordDisclosure({ tin: str(c.fields.tin), taxType: str(c.fields.taxType), periods: listOf(c.fields.periods), accepted: false, reasons: reasonOf(c) }, c.id, actor.name, now);
  return fail(x) ? x : { facts: { disclosure: x.id, accepted: false }, after: (d?: { id: string }) => { if (d) attachServiceDecision('disclosure', x.id, d.id); } };
});

export const REFERENCE_TAX_DISCLOSURE: Ref = {
  key: 'tax.disclosure', version: 1, owner: 'tax', title: 'Voluntary disclosure', refPrefix: 'TVD', reference: true, citations: [],
  fields: [
    TIN, TAX_TYPE_FIELD,
    R('periods', 'Periods disclosed (2025, 2025-03 or 2025-Q1; comma separated)', 'text', { required: true }),
    R('description', 'What was omitted or is corrected', 'longtext', { required: true }),
    R('baseMinor', 'Disclosed base (minor units)', 'number', { required: true }),
    R('currency', 'Currency (three letters; the nation\'s by default)'),
    R('findings', 'Assessment of the disclosure: what was checked and found, with reasons', 'longtext', { audience: 'officer' }),
    R('assessedMinor', 'Assessed tax (minor units), when no approved rule applies', 'number', { audience: 'officer' }),
    R('assessmentReasons', 'How the tax was assessed, when no approved rule applies', 'longtext', { audience: 'officer' }),
    R('penaltyApplies', 'Does the law impose a penalty on this disclosure?', 'boolean', { audience: 'officer', hint: 'Calculated only by the approved rule for disclosures; a production installation refuses without one.' }),
    R('penaltyMinor', 'Penalty (minor units), when no approved rule applies (demonstration and training only)', 'number', { audience: 'officer' }),
    R('penaltyReasons', 'How the penalty was set, or why the law gives none', 'longtext', { audience: 'officer' }),
    R('dueDate', 'Payment due on (as the law sets it)', 'date', { audience: 'officer' }),
  ],
  documents: [{ class: 'disclosure', label: 'The disclosure as made', required: true }, { class: 'disclosure-evidence', label: 'Records supporting the disclosure', required: false }],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'assessment', label: 'Assessment' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'accepted', label: 'Accepted and assessed' }, { key: 'notice-issued', label: 'Notice issued', terminal: true }, { key: 'not-accepted', label: 'Not accepted', terminal: true },
  ],
  actions: [
    { key: 'assess', label: 'Start the assessment', from: ['received'], to: 'assessment', needs: { role: 'officer' }, requires: { documents: ['disclosure'], fields: ['tin', 'taxType', 'periods', 'description', 'baseMinor'] } },
    { key: 'propose', label: 'Record the findings and propose the assessment', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['findings'] }, effects: ['tax.checkDisclosure'] },
    { key: 'accept', label: 'Accept the disclosure and make the assessment', from: ['pending-approval'], to: 'accepted', decision: 'assess', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.acceptDisclosure'] },
    { key: 'refuse', label: 'Do not accept it as a voluntary disclosure, with reasons', from: ['pending-approval'], to: 'not-accepted', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.refuseDisclosure'] },
    { key: 'issue', label: 'Issue the notice and the bill', from: ['accepted'], to: 'notice-issued', needs: { role: 'officer' }, requires: { fields: ['dueDate'] }, effects: ['tax.issueNotice'] },
  ],
  deadlines: [], notifications: [], appeal: { sampleDays: 30, body: 'an objection to the tax authority, then the body the law names', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'accepted and notified', steps: [{ action: 'assess', fields: { tin: 'TIN-1', taxType: 'income', periods: '2024', description: 'Rent omitted', baseMinor: 100 }, documents: ['disclosure'], expect: 'assessment' }, { action: 'propose', fields: { findings: 'Complete' }, expect: 'pending-approval' }, { action: 'accept', expect: 'accepted' }, { action: 'issue', fields: { dueDate: '2026-12-31' }, expect: 'notice-issued' }] },
    { name: 'refused', steps: [{ action: 'assess', fields: { tin: 'TIN-1', taxType: 'income', periods: '2024', description: 'x', baseMinor: 1 }, documents: ['disclosure'], expect: 'assessment' }, { action: 'propose', fields: { findings: 'Made after a compliance review began' }, expect: 'pending-approval' }, { action: 'refuse', expect: 'not-accepted' }] },
  ],
};

// Formal rulings, where the law provides them: request → review → decision by two officials citing the law.

registerEffect('tax.decideRuling', ({ case: c, action, actor, now }: EffectContext) => {
  const issued = action.decision === 'issue';
  const earlier = str(c.fields.earlierRuling);
  // A reconsideration is decided by officials who did not decide the ruling reconsidered.
  if (earlier) {
    const prior = listCases({ procedure: 'tax.ruling' }).find(x => x.ref === earlier || x.id === earlier);
    const deciders = new Set((prior?.history ?? []).filter(h => h.decision).flatMap(h => [h.by.name, h.confirmedBy?.name]).filter(Boolean));
    if (deciders.has(actor.name) || (c.pending && deciders.has(c.pending.by.name))) return { error: 'A reconsideration is decided by officials who did not decide the ruling reconsidered' };
  }
  const r = recordRuling({ tin: str(c.fields.tin), taxType: str(c.fields.taxType), question: str(c.fields.question), facts: str(c.fields.facts), conclusion: issued ? str(c.fields.conclusion) : reasonOf(c), citations: c.pending?.citations ?? [], issued }, c.id, actor.name, now);
  return fail(r) ? r : { facts: { ruling: r.id, issued }, after: (d?: { id: string }) => { if (d) attachServiceDecision('ruling', r.id, d.id); } };
});

export const REFERENCE_TAX_RULING: Ref = {
  key: 'tax.ruling', version: 1, owner: 'tax', title: 'Formal tax ruling', refPrefix: 'TRL', reference: true, citations: [],
  fields: [
    TIN, TAX_TYPE_FIELD,
    R('question', 'The question presented', 'longtext', { required: true }),
    R('facts', 'The facts, as the applicant states them', 'longtext', { required: true }),
    R('earlierRuling', 'For a reconsideration: the case reference of the ruling reconsidered'),
    R('review', 'Review: what was considered, kept apart from the applicant\'s facts', 'longtext', { audience: 'officer' }),
    R('conclusion', 'The ruling', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'ruling-request', label: 'The request as received', required: true }, { class: 'ruling-documents', label: 'Supporting documents', required: false }],
  stages: [
    { key: 'requested', label: 'Requested' }, { key: 'review', label: 'Under review' }, { key: 'awaiting-information', label: 'Waiting for the applicant' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'issued', label: 'Ruling issued', terminal: true }, { key: 'not-issued', label: 'Refused', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'review', label: 'Start the review', from: ['requested'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['ruling-request'], fields: ['tin', 'taxType', 'question', 'facts'] } },
    { key: 'request-information', label: 'Ask the applicant for information', from: ['review'], to: 'awaiting-information', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'information-received', label: 'Information received', from: ['awaiting-information'], to: 'review', needs: { role: 'officer' } },
    { key: 'propose', label: 'Propose the ruling', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['review'] } },
    { key: 'issue', label: 'Issue the ruling, citing the law', from: ['pending-approval'], to: 'issued', decision: 'issue', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, citations: true, fields: ['conclusion'] }, effects: ['tax.decideRuling'] },
    { key: 'refuse', label: 'Refuse to rule, with reasons', from: ['pending-approval'], to: 'not-issued', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.decideRuling'] },
    { key: 'withdraw', label: 'Record the applicant\'s withdrawal', from: ['requested', 'review', 'awaiting-information'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'information', label: 'Time the applicant has to answer a request for information (the nation\'s rule)', from: 'awaiting-information', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: { sampleDays: 30, body: 'the reconsideration or review the law provides, if any', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'issued', steps: [{ action: 'review', fields: { tin: 'TIN-1', taxType: 'income', question: 'Is the grant taxable?', facts: 'A grant was received.' }, documents: ['ruling-request'], expect: 'review' }, { action: 'propose', fields: { review: 'Considered' }, expect: 'pending-approval' }, { action: 'issue', fields: { conclusion: 'Taxable under the Act' }, expect: 'issued' }] },
    { name: 'withdrawn', steps: [{ action: 'review', fields: { tin: 'TIN-1', taxType: 'income', question: 'q', facts: 'f' }, documents: ['ruling-request'], expect: 'review' }, { action: 'withdraw', expect: 'withdrawn' }] },
  ],
};

// Compliance review (audit): legal basis and scope authorised → information and inspection (observations) → findings → the taxpayer's response → review → assessment by two officials → notice; or closed with reasons.

registerEffect('tax.complianceAssess', ({ case: c, actor, now }: EffectContext) => {
  const t = getTaxpayer(str(c.fields.tin));
  if (!t) return { error: `No taxpayer ${str(c.fields.tin)}` };
  const calc = calculate(`tax.${str(c.fields.taxType)}`, { amountMinor: num(c.fields.baseMinor) }, now.toISOString().slice(0, 10));
  const method = 'error' in calc ? { kind: 'entered' as const, reasons: str(c.fields.assessmentReasons) } : { kind: 'rule' as const, rule: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest, citations: calc.rule.citations, steps: calc.steps };
  const a = recordAssessment({ taxpayer: t.id, taxType: str(c.fields.taxType), period: str(c.fields.period), baseMinor: num(c.fields.baseMinor), amountMinor: 'error' in calc ? num(c.fields.assessedMinor) : calc.amountMinor, currency: currencyOf(c), method, origin: 'compliance', case: c.id, by: actor.name }, now);
  if (fail(a)) return a;
  return { facts: { assessment: a.reference, amountMinor: a.amountMinor, method: a.method.kind }, ...(method.kind === 'rule' ? { rules: [{ key: method.rule, version: method.version, digest: method.digest }] } : {}), after: (d?: { id: string }) => { if (d) attachAssessmentDecision(a.id, d.id); } };
});

export const REFERENCE_TAX_COMPLIANCE: Ref = {
  key: 'tax.compliance', version: 1, owner: 'tax', title: 'Tax compliance review', refPrefix: 'TCR', reference: true, citations: [],
  fields: [
    TIN, TAX_TYPE_FIELD,
    R('period', 'Period reviewed (2026, 2026-03 or 2026-Q1)', 'text', { required: true }),
    R('power', 'The legal power relied on (provision of the law)', 'text', { required: true }),
    R('scope', 'Scope: the taxes, periods, records and places covered', 'longtext', { required: true }),
    R('selection', 'Why the case was opened (the officer\'s stated grounds; a risk indicator only as the lawful policy allows, never a score that decides)', 'longtext', { required: true }),
    R('observations', 'Observed facts (inspection or records examined), kept apart from conclusions', 'longtext', { audience: 'officer' }),
    R('findings', 'Proposed findings, each with its evidence and reasons', 'longtext', { audience: 'officer' }),
    R('taxpayerResponse', 'The taxpayer\'s response to the proposed findings', 'longtext'),
    R('reviewNote', 'Review of the findings and the response, with reasons', 'longtext', { audience: 'officer' }),
    R('baseMinor', 'Base as found (minor units)', 'number', { audience: 'officer' }),
    R('assessedMinor', 'Assessed amount (minor units), when no approved rule applies', 'number', { audience: 'officer' }),
    R('assessmentReasons', 'How the amount was assessed, when no approved rule applies', 'longtext', { audience: 'officer' }),
    R('dueDate', 'Payment due on (as the law sets it)', 'date', { audience: 'officer' }),
  ],
  documents: [
    { class: 'case-opening', label: 'The case opening record', required: true }, { class: 'information-request', label: 'An information request issued', required: false },
    { class: 'information-response', label: 'The taxpayer\'s information response', required: false }, { class: 'inspection-record', label: 'The inspection record', required: false },
    { class: 'evidence', label: 'Evidence collected under the authorised scope', required: false }, { class: 'findings', label: 'The proposed findings as sent', required: false }, { class: 'taxpayer-response', label: 'The taxpayer\'s response to the findings', required: false },
  ],
  stages: [
    { key: 'opened', label: 'Opened' }, { key: 'scope-review', label: 'Scope for authorisation' }, { key: 'authorised', label: 'Authorised: information and inspection' },
    { key: 'awaiting-information', label: 'Waiting for information' }, { key: 'findings-draft', label: 'Findings drafted' }, { key: 'awaiting-response', label: 'Waiting for the taxpayer\'s response' },
    { key: 'findings-review', label: 'Findings and response under review' }, { key: 'pending-approval', label: 'Assessment decision' }, { key: 'assessed', label: 'Assessed' },
    { key: 'notice-issued', label: 'Notice issued', terminal: true }, { key: 'not-authorised', label: 'Scope not authorised', terminal: true }, { key: 'closed', label: 'Closed without change', terminal: true },
  ],
  actions: [
    { key: 'propose-scope', label: 'Propose the legal basis and scope', from: ['opened'], to: 'scope-review', needs: { role: 'officer' }, requires: { documents: ['case-opening'], fields: ['tin', 'taxType', 'period', 'power', 'scope', 'selection'], reasons: true } },
    { key: 'authorise', label: 'Authorise the scope', from: ['scope-review'], to: 'authorised', decision: 'authorise', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'refuse-scope', label: 'Do not authorise, with reasons', from: ['scope-review'], to: 'not-authorised', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'request-information', label: 'Issue an information request under the authorised power', from: ['authorised'], to: 'awaiting-information', needs: { role: 'officer' }, requires: { documents: ['information-request'], reasons: true } },
    { key: 'information-received', label: 'Information received, or an extension decided', from: ['awaiting-information'], to: 'authorised', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'draft-findings', label: 'Record the observations and draft the findings', from: ['authorised'], to: 'findings-draft', needs: { role: 'officer' }, requires: { fields: ['observations', 'findings'], reasons: true } },
    { key: 'send-findings', label: 'Send the proposed findings to the taxpayer', from: ['findings-draft'], to: 'awaiting-response', needs: { role: 'officer' }, requires: { documents: ['findings'] } },
    { key: 'response-received', label: 'Response received, or the time to respond passed', from: ['awaiting-response'], to: 'findings-review', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'propose-assessment', label: 'Review the findings and propose the assessment', from: ['findings-review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true, fields: ['reviewNote', 'baseMinor'] }, effects: ['tax.checkAssessment'] },
    { key: 'assess', label: 'Make the assessment', from: ['pending-approval'], to: 'assessed', decision: 'assess', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['tax.complianceAssess'] },
    { key: 'issue', label: 'Issue the notice and the bill', from: ['assessed'], to: 'notice-issued', needs: { role: 'officer' }, requires: { fields: ['dueDate'] }, effects: ['tax.issueNotice'] },
    { key: 'close', label: 'Close without change, with reasons', from: ['findings-review'], to: 'closed', decision: 'close', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['reviewNote'] } },
  ],
  deadlines: [
    { key: 'information', label: 'Time the taxpayer has to answer the information request (the nation\'s rule; an extension is recorded with reasons)', from: 'awaiting-information', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' },
    { key: 'response', label: 'Time the taxpayer has to respond to the proposed findings (the nation\'s rule)', from: 'awaiting-response', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' },
  ],
  notifications: [], appeal: { sampleDays: 30, body: 'an objection to the tax authority, then the body the law names', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'assessed and notified', steps: [
      { action: 'propose-scope', fields: { tin: 'TIN-1', taxType: 'income', period: '2024', power: 'Act s.50', scope: 'Income 2024', selection: 'Return inconsistent with third-party statements' }, documents: ['case-opening'], expect: 'scope-review' },
      { action: 'authorise', expect: 'authorised' }, { action: 'draft-findings', fields: { observations: 'Ledger seen', findings: 'Income understated' }, expect: 'findings-draft' },
      { action: 'send-findings', documents: ['findings'], expect: 'awaiting-response' }, { action: 'response-received', expect: 'findings-review' },
      { action: 'propose-assessment', fields: { reviewNote: 'Response considered', baseMinor: 100 }, expect: 'pending-approval' }, { action: 'assess', expect: 'assessed' },
      { action: 'issue', fields: { dueDate: '2026-12-31' }, expect: 'notice-issued' },
    ] },
    { name: 'closed without change', steps: [
      { action: 'propose-scope', fields: { tin: 'TIN-1', taxType: 'income', period: '2024', power: 'Act s.50', scope: 's', selection: 's' }, documents: ['case-opening'], expect: 'scope-review' },
      { action: 'authorise', expect: 'authorised' }, { action: 'draft-findings', fields: { observations: 'o', findings: 'No difference' }, expect: 'findings-draft' },
      { action: 'send-findings', documents: ['findings'], expect: 'awaiting-response' }, { action: 'response-received', expect: 'findings-review' }, { action: 'close', fields: { reviewNote: 'Nothing to assess' }, expect: 'closed' },
    ] },
  ],
};

/** The tax services' procedures (plan step I5, forms batch 6). */
export const TAX_SERVICE_PROCEDURES: Ref[] = [REFERENCE_TAX_REGISTRATION_AMENDMENT, REFERENCE_TAX_AMENDMENT, REFERENCE_TAX_REFUND, REFERENCE_TAX_PAYMENT_PLAN, REFERENCE_TAX_PAYMENT_PLAN_REVIEW, REFERENCE_TAX_DISCLOSURE, REFERENCE_TAX_RULING, REFERENCE_TAX_COMPLIANCE];

export const TAX_PROCEDURES: Ref[] = [REFERENCE_TAX_REGISTRATION, REFERENCE_TAX_RETURN, REFERENCE_TAX_OBJECTION, ...TAX_SERVICE_PROCEDURES];

export function installTaxProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of TAX_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}

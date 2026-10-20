// Tax on the workflow foundation (owner's Cycle 3 directive, workstream 1).
// Reference procedures (drafts for the tax authority to adapt to its law and
// approve): taxpayer registration; a return from filing to an assessment
// notice; an objection to an assessment. The assessment step calculates with
// the approved rule in force for the tax type (lib/law/rules.ts, key
// `tax.<type>`); without one the assessor enters the amount with reasons.
// Decisions are four-eyes and state the appeal. Restricted (tax secrecy).

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { calculate } from '@/lib/law/rules';
import { issueBill } from '@/lib/data/store/payments';
import { nationCurrency } from '@/lib/nation/registry';
import { registerTaxpayer, fileReturn, recordAssessment, attachAssessmentDecision, varyAssessment, getTaxpayer, returnFor, assessmentOfCase } from './register';
import type { CasePackage } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number.NaN);
const currencyOf = (c: { fields: Record<string, unknown> }) => str(c.fields.currency).toUpperCase() || nationCurrency();

registerEffect('tax.register', ({ case: c, actor, now }: EffectContext) => {
  const kind = str(c.fields.partyKind) === 'organisation' ? 'organisation' : 'person';
  const t = registerTaxpayer({ party: { kind, id: str(c.fields.partyRef), name: str(c.fields.partyName) }, taxTypes: str(c.fields.taxTypes).split(/[,\s]+/).filter(Boolean) }, c.id, actor.name, now);
  if ('error' in t) return t;
  return { facts: { tin: t.tin } };
});

registerEffect('tax.fileReturn', ({ case: c, actor, now }: EffectContext) => {
  const r = fileReturn({ tin: str(c.fields.tin), taxType: str(c.fields.taxType), period: str(c.fields.period), baseMinor: num(c.fields.baseMinor), currency: currencyOf(c), reason: str(c.fields.amendmentReason) || undefined }, c.id, actor.name, now);
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
  fields: [
    { key: 'partyKind', label: 'Person or organisation', type: 'choice', options: ['person', 'organisation'], required: true },
    { key: 'partyRef', label: 'Register reference (birth registration or organisation number)', type: 'text', required: true, personal: true },
    { key: 'partyName', label: 'Name', type: 'text', required: true, personal: true },
    { key: 'taxTypes', label: 'Tax types (comma separated)', type: 'text', required: true },
  ],
  documents: [{ class: 'identity-evidence', label: 'Identity or registration evidence', required: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verification' }, { key: 'pending-approval', label: 'Decision' }, { key: 'registered', label: 'Registered', terminal: true }, { key: 'not-registered', label: 'Refused', terminal: true }],
  actions: [
    { key: 'verify', label: 'Verify identity and registration', from: ['submitted'], to: 'verification', needs: { role: 'officer' }, requires: { documents: ['identity-evidence'], fields: ['partyKind', 'partyRef', 'partyName', 'taxTypes'] } },
    { key: 'propose', label: 'Verified: propose', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' } },
    { key: 'register', label: 'Register the taxpayer', from: ['pending-approval'], to: 'registered', decision: 'register', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['tax.register'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-registered', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [], notifications: [], appeal: { days: 30, body: 'the tax appeals tribunal', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [{ name: 'registered', steps: [{ action: 'verify', fields: { partyKind: 'person', partyRef: 'BR-1', partyName: 'A', taxTypes: 'income' }, documents: ['identity-evidence'], expect: 'verification' }, { action: 'propose', expect: 'pending-approval' }, { action: 'register', expect: 'registered' }] }],
};

export const REFERENCE_TAX_RETURN: Ref = {
  key: 'tax.return', version: 1, owner: 'tax', title: 'Tax return and assessment', refPrefix: 'TXA', reference: true, citations: [],
  fields: [
    ...TAXPAYER_FIELDS,
    { key: 'baseMinor', label: 'Declared base (minor units)', type: 'number', required: true, personal: true },
    { key: 'currency', label: 'Currency (three letters; the nation\'s by default)', type: 'text' },
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
  deadlines: [], notifications: [], appeal: { days: 30, body: 'an objection to the tax authority, then the tax appeals tribunal', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'assessed and notified', steps: [
      { action: 'check', fields: { tin: 'TIN-1', taxType: 'income', period: '2025', baseMinor: 1 }, documents: ['return-form'], expect: 'checking' },
      { action: 'propose', expect: 'pending-approval' }, { action: 'assess', expect: 'assessed' },
      { action: 'issue', expect: 'refused' }, { action: 'issue', fields: { dueDate: '2026-12-31' }, expect: 'notice-issued' },
    ] },
    { name: 'returned', steps: [{ action: 'check', fields: { tin: 'TIN-1', taxType: 'income', period: '2025', baseMinor: 1 }, documents: ['return-form'], expect: 'checking' }, { action: 'return', expect: 'returned' }, { action: 'resubmit', expect: 'filed' }] },
  ],
};

export const REFERENCE_TAX_OBJECTION: Ref = {
  key: 'tax.objection', version: 1, owner: 'tax', title: 'Objection to a tax assessment', refPrefix: 'TXO', reference: true, citations: [],
  fields: [
    { key: 'assessment', label: 'Assessment reference (tax:ASM-…)', type: 'text', required: true },
    { key: 'grounds', label: 'Grounds of the objection', type: 'longtext', required: true, personal: true },
    { key: 'variedMinor', label: 'Amount after the decision (minor units), if varied', type: 'number', personal: true },
  ],
  documents: [{ class: 'objection', label: 'The objection as lodged', required: true }],
  stages: [{ key: 'lodged', label: 'Lodged' }, { key: 'review', label: 'Under review' }, { key: 'pending-approval', label: 'Decision' }, { key: 'varied', label: 'Assessment varied', terminal: true }, { key: 'dismissed', label: 'Objection dismissed', terminal: true }],
  actions: [
    { key: 'review', label: 'Start the review', from: ['lodged'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['objection'], fields: ['assessment', 'grounds'] } },
    { key: 'propose', label: 'Propose the decision', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'vary', label: 'Vary the assessment', from: ['pending-approval'], to: 'varied', decision: 'vary', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['variedMinor'] }, effects: ['tax.vary'] },
    { key: 'dismiss', label: 'Dismiss the objection', from: ['pending-approval'], to: 'dismissed', decision: 'dismiss', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
  ],
  deadlines: [], notifications: [], appeal: { days: 30, body: 'the tax appeals tribunal', suspensive: false },
  retention: 'tax-record', sensitivity: 'restricted',
  tests: [
    { name: 'varied', steps: [{ action: 'review', fields: { assessment: 'tax:ASM-1', grounds: 'x' }, documents: ['objection'], expect: 'review' }, { action: 'propose', expect: 'pending-approval' }, { action: 'vary', fields: { variedMinor: 1 }, expect: 'varied' }] },
    { name: 'dismissed', steps: [{ action: 'review', fields: { assessment: 'tax:ASM-1', grounds: 'x' }, documents: ['objection'], expect: 'review' }, { action: 'propose', expect: 'pending-approval' }, { action: 'dismiss', expect: 'dismissed' }] },
  ],
};

export const TAX_PROCEDURES: Ref[] = [REFERENCE_TAX_REGISTRATION, REFERENCE_TAX_RETURN, REFERENCE_TAX_OBJECTION];

export function installTaxProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of TAX_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}

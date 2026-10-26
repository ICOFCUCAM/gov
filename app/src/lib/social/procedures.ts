// Social protection on the workflow foundation (Institutional specification
// Part 2 §C.6; catalogue supplement Part 15 SOC-BEN-001 … 024; plan step I6).
// Reference procedures, drafts the nation adapts and a second official
// approves, kept by the institution the nation names for the
// `socialProtection` slot (never assumed):
//
//   social.registration   a person registers with the authority; identity checked through identity.verify (SOC-BEN-001, 003)
//   social.household      a household declaration or change: a new version, the earlier kept (SOC-BEN-003, 006)
//   social.benefit        a benefit claim: identity verified, means assessed from recorded inputs, the amount calculated
//                         by the approved rule (its version sealed), decided by two officials with an explanation
//                         (SOC-BEN-002, 004, 009 … 014)
//   social.reassessment   a change of circumstances or a review: a new assessment, then vary, continue or end (SOC-BEN-005, 006, 017)
//   social.suspension     suspension or termination after notice and representations, on stated facts (SOC-BEN-007)
//   social.payment        a payment instruction from the current assessment, prepared by one official and approved by a
//                         different one, with the payment service's result (SOC-BEN-018)
//   social.overpayment    an overpayment: what was paid against what the period's rule gives on corrected inputs; recover or
//                         waive by two officials after the recipient's response and a hardship review (SOC-BEN-019)
//   social.appeal         an appeal or reconsideration decided by two officials who took no part in the decision (SOC-BEN-020)
//
// The supplement's safeguard (Part 15): "Benefit eligibility and payment
// decisions must be explainable, linked to the applicable rule version,
// reviewable by an authorized human, and appealable where the law provides. A
// risk score alone cannot determine loss of essential support." So:
//   - eligibility and amounts only from an approved rule (`social.<programme>`); with none, nothing is calculated;
//   - an identity check that cannot be performed holds the claim and is never itself a ground for refusal (acceptance
//     P2-08): refusal is not open from the held stage;
//   - no field is a score; a suspension states the facts and evidence and is refused when its grounds rest on a score;
//   - every decision is an official's, with reasons and an explanation to the person; AI decides nothing.
// Decisions are classified under proposed, unapproved mappings (SOCIAL_PERMITS). No day count ships.

import { registerEffect, registeredEffects, sampleMark, getCase, type EffectContext, type EffectResult } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { calculate } from '@/lib/law/rules';
import { callService } from '@/lib/exchange/services';
import { nationCurrency } from '@/lib/nation/registry';
import {
  registerClaimant, declareHousehold, getClaimant, getHousehold, recordAssessment, claimOfCase, getClaim, latestAssessment, claimMoveRefusal, decideClaim, attachClaimDecision,
  recordClaimReview, preparePayment, settlePayment, attachPaymentDecision, paidFor, recordOverpayment, decideOverpayment, attachOverpaymentDecision, overpaymentOfCase,
  meansOf, ruleInputOf, checkInputs, type Assessment, type InputLine,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number(str(v)));
const lines = (v: unknown): string[] => str(v).split(/\n/).map(x => x.trim()).filter(Boolean);
const reasonOf = (done: Case, fallback: string) => done.history.at(-1)?.reason ?? fallback;
const who = (ctx: EffectContext) => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name });

/** The permit type whose approved mapping governs each family's decisions (lib/permits/decisions.ts reads it). */
export const SOCIAL_PERMITS: Record<string, string> = {
  'social.benefit': 'social-benefit',
  'social.reassessment': 'social-benefit',
  'social.suspension': 'social-benefit',
  'social.payment': 'social-payment',
  'social.overpayment': 'social-overpayment',
  'social.appeal': 'social-appeal',
};
/** The rule a programme's eligibility and amount come from (lib/law/rules.ts; a means-tested rule the nation approves). */
export const programmeRule = (programme: string) => `social.${programme}`;
/** Words that mark a ground resting on a score: a score alone never cuts support (supplement Part 15). */
const SCORE = /\b(risk|fraud|propensity|credit)[ -]?(score|rating|level|band)\b|\bscor(e|ed|ing)\b/i;

// ── Identity, registration and household ─────────────────────────────────────

/** Identity is the identity authority's: the case asks identity.verify (never the record); a check that cannot be made holds the case. */
async function verify(identity: string, facts: { familyName?: string; givenNames?: string; birthDate?: string }, purpose: string): Promise<EffectResult> {
  const r = await callService({ kind: 'module', id: 'socialProtection', name: 'Social protection' }, 'identity.verify', { number: identity, ...facts }, purpose);
  const result = str(r.data?.result);
  if (r.status !== 200 || result !== 'verified') {
    return { error: `Identity not verified (${result || 'no answer'}: ${str(r.data?.meaning) || r.error || 'the identity service did not answer'}). This is never a ground for refusal: hold the case until it can be verified, or have an official who can sign record the other evidence relied on` };
  }
  return { facts: { identityCheck: result, receipt: r.receipt.id } };
}
registerEffect('social.verifyApplicant', ({ case: c }: EffectContext) => verify(str(c.fields.identityNumber), { familyName: str(c.fields.familyName), givenNames: str(c.fields.givenNames), birthDate: str(c.fields.birthDate) }, 'social protection registration'));
registerEffect('social.verifyClaimant', ({ case: c }: EffectContext) => {
  const p = getClaimant(str(c.fields.claimant));
  if (!p) return { error: `No claimant ${str(c.fields.claimant) || '(none named)'}: register the person first` };
  // The facts compared: those the case gives, else the family name the registration recorded.
  return verify(p.identity, { familyName: str(c.fields.familyName) || (p.name.split(/\s+/).at(-1) ?? ''), ...(str(c.fields.birthDate) ? { birthDate: str(c.fields.birthDate) } : {}) }, 'benefit claim');
});

const members = (v: unknown) => lines(v).map(l => { const [reference, relationship] = l.split('|').map(x => x.trim()); return { reference: reference ?? '', relationship: relationship ?? '' }; });
registerEffect('social.registerClaimant', (ctx: EffectContext) => {
  const c = ctx.case;
  const other = c.history.find(h => h.action === 'verify-other-evidence');
  const receipt = (c.verifications ?? []).at(-1)?.receipt;
  const r = registerClaimant({
    identity: str(c.fields.identityNumber), name: `${str(c.fields.givenNames)} ${str(c.fields.familyName)}`.trim(), ...(str(c.fields.contact) ? { contact: str(c.fields.contact) } : {}),
    ...(str(c.fields.preferredChannel) ? { preferredChannel: str(c.fields.preferredChannel) } : {}), ...(str(c.fields.representative) ? { representative: str(c.fields.representative) } : {}),
    identityBasis: other ? { kind: 'other-evidence', reasons: other.reason ?? '' } : { kind: 'exchange', receipt: receipt ?? `verified at a step of ${c.ref}` },
    ...(members(c.fields.householdMembers).length ? { members: members(c.fields.householdMembers), ...(str(c.fields.effectiveFrom) ? { effectiveFrom: str(c.fields.effectiveFrom) } : {}) } : {}),
    ...sampleMark(c),
  }, c.id, ctx.actor.name, ctx.now);
  return 'error' in r ? r : { facts: { claimant: r.number } };
});
registerEffect('social.declareHousehold', (ctx: EffectContext) => {
  const c = ctx.case;
  const m = members(c.fields.householdMembers);
  if (!getClaimant(str(c.fields.claimant))) return { error: `No claimant ${str(c.fields.claimant) || '(none named)'}` };
  if (!m.length || m.some(x => !x.reference || !x.relationship)) return { error: 'Each member on its own line: reference | relationship' };
  return { facts: { members: m.length }, after: (_d, done) => { declareHousehold(str(c.fields.claimant), { members: m, effectiveFrom: str(c.fields.effectiveFrom), reason: reasonOf(done, 'Household declared') }, c.id, ctx.actor.name, ctx.now); } };
});

// ── Assessment ───────────────────────────────────────────────────────────────

/** Input lines given as "source | amount (minor units) | verified yes or no | counted yes or no (assets)". */
const inputLines = (v: unknown, counted = false): InputLine[] => lines(v).map(l => {
  const [source, amount, verified, count] = l.split('|').map(x => x.trim());
  return { source: source ?? '', amountMinor: Number(amount), verified: /^(yes|y|true|verified)$/i.test(verified ?? ''), ...(counted ? { counted: /^(yes|y|true|counted)$/i.test(count ?? '') } : {}) };
});
const householdSize = (c: Case): number => {
  if (num(c.fields.householdSize) >= 1) return num(c.fields.householdSize);
  const p = getClaimant(str(c.fields.claimant)) ?? (str(c.fields.claim) ? getClaimant(getClaim(str(c.fields.claim))?.claimant ?? '') : undefined);
  const h = p?.household ? getHousehold(p.household) : undefined;
  return 1 + (h?.versions.at(-1)?.members.length ?? 0);
};
/** The assessment this case's inputs give under the rule in force on `on` (an error when no approved rule applies). */
function assessmentOf(c: Case, programme: string, on: string): Omit<Assessment, 'n' | 'at' | 'by'> | { error: string } {
  const inputs = { income: inputLines(c.fields.incomeItems), assets: inputLines(c.fields.assetItems, true), deductions: inputLines(c.fields.deductionItems), members: householdSize(c) };
  const why = checkInputs(inputs);
  if (why) return { error: `${why} (one line each: source | amount in minor units | verified yes or no${c.fields.assetItems ? ' | counted yes or no for assets' : ''})` };
  const meansMinor = meansOf(inputs);
  const calc = calculate(programmeRule(programme), { amountMinor: meansMinor, members: inputs.members }, on);
  if ('error' in calc) return { error: `${calc.error}. Eligibility and amounts come only from the approved rule for the programme: nothing is calculated or typed without it` };
  return { period: { from: str(c.fields.periodFrom), to: str(c.fields.periodTo) }, inputs, meansMinor, rule: { key: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest }, amountMinor: calc.amountMinor, steps: calc.steps, case: c.id, reason: '' };
}
registerEffect('social.assess', (ctx: EffectContext) => {
  const c = ctx.case;
  const claim = str(c.fields.claim) ? getClaim(str(c.fields.claim)) : undefined;
  const programme = claim?.programme ?? str(c.fields.programme);
  const claimant = claim?.claimant ?? str(c.fields.claimant);
  if (!getClaimant(claimant)) return { error: `No claimant ${claimant || '(none named)'}` };
  if (claim && claim.case !== c.id && !['awarded', 'suspended'].includes(claim.state)) return { error: `Claim ${claim.number} is ${claim.state}: a reassessment is of an award in force` };
  const a = assessmentOf(c, programme, str(c.fields.periodFrom) || ctx.now.toISOString().slice(0, 10));
  if ('error' in a) return a;
  return {
    facts: { amountMinor: a.amountMinor, rule: `${a.rule.key} v${a.rule.version}` }, rules: [a.rule],
    after: (_d, done) => { recordAssessment({ claimant, programme, ...(claim ? { claim: claim.number } : {}), ...a, reason: reasonOf(done, 'Assessed'), ...sampleMark(c) }, ctx.actor.name, ctx.now); },
  };
});

/** A decision on the claim this case makes or names, standing on the assessment this case recorded (its rule version sealed with it). */
function decideEffect(kind: string) {
  return (ctx: EffectContext): EffectResult => {
    const c = ctx.case;
    const claim = str(c.fields.claim) ? getClaim(str(c.fields.claim)) : claimOfCase(c.id);
    // A refusal before any assessment (not eligible on another ground) records no claim; it rests on its reasons and explanation.
    if (!claim && kind === 'refuse') return str(c.fields.explanation) ? { facts: { decision: 'refuse' } } : { error: 'Give the person an understandable explanation of the decision' };
    if (!claim) return { error: 'Assess the claim first: there is nothing to decide' };
    const why = claimMoveRefusal(claim.number, kind);
    if (why) return { error: why };
    const a = ['award', 'vary', 'refuse'].includes(kind) ? latestAssessment(claim, c.id) : undefined;
    if (['award', 'vary'].includes(kind) && !a) return { error: 'This case recorded no assessment' };
    if (kind === 'award' && a!.amountMinor <= 0) return { error: `The approved rule gives nothing on these inputs (${a!.steps.at(-1)}): the claim is not eligible, so it is refused with that explanation` };
    if (['award', 'vary', 'refuse'].includes(kind) && !str(c.fields.explanation)) return { error: 'Give the person an understandable explanation of the decision' };
    if (['suspend', 'terminate'].includes(kind)) {
      const grounds = str(c.fields.groundsFacts);
      if (!grounds) return { error: 'State the facts the decision rests on, with their evidence' };
      if (SCORE.test(grounds)) return { error: 'A score cannot cut support: state the facts and evidence the officials rely on' };
    }
    return {
      facts: { claim: claim.number, decision: kind, ...(a ? { amountMinor: a.amountMinor, rule: `${a.rule.key} v${a.rule.version}` } : {}) },
      ...(a ? { rules: [a.rule] } : {}),
      after: (d, done) => {
        decideClaim(claim.number, kind, { case: c.id, reason: reasonOf(done, kind), ...(a ? { assessment: a.n } : {}), ...(kind === 'award' && str(c.fields.startOn) ? { startOn: str(c.fields.startOn) } : {}) }, ctx.actor.name, ctx.now);
        if (d) attachClaimDecision(claim.number, c.id, d.id);
      },
    };
  };
}
for (const k of ['award', 'refuse', 'vary', 'continue', 'end', 'suspend', 'terminate']) registerEffect(`social.${k}`, decideEffect(k));

// ── Payments and overpayments ────────────────────────────────────────────────

registerEffect('social.preparePayment', (ctx: EffectContext) => {
  const c = ctx.case;
  const p = preparePayment({ claim: str(c.fields.claim), period: { from: str(c.fields.periodFrom), to: str(c.fields.periodTo) }, currency: nationCurrency(), maker: who(ctx), ...sampleMark(c) }, c.id, ctx.now);
  return 'error' in p ? p : { facts: { instruction: p.number, amountMinor: p.amountMinor }, rules: [p.rule] };
});
registerEffect('social.approvePayment', (ctx: EffectContext) => {
  const c = ctx.case;
  return { facts: { approved: true }, after: d => { settlePayment(c.id, 'approve', who(ctx), {}, ctx.now); if (d) attachPaymentDecision(c.id, d.id); } };
});
registerEffect('social.paymentResult', ({ case: c, actor, now, action }: EffectContext) => {
  const r = settlePayment(c.id, action.key === 'record-paid' ? 'paid' : action.key === 'record-failed' ? 'failed' : 'cancel', { ...(actor.id ? { id: actor.id } : {}), name: actor.name }, { externalReference: str(c.fields.externalReference) }, now);
  return 'error' in r ? r : { facts: { state: r.state } };
});

registerEffect('social.calculateOverpayment', (ctx: EffectContext) => {
  const c = ctx.case;
  const claim = getClaim(str(c.fields.claim));
  if (!claim) return { error: `No claim ${str(c.fields.claim) || '(none named)'}` };
  const period = { from: str(c.fields.periodFrom), to: str(c.fields.periodTo) };
  const paid = paidFor(claim.number, period);
  if (!paid.payments.length) return { error: 'No payment reported paid falls in this period' };
  // What was due on the corrected inputs, by the rule version in force for the period.
  const a = assessmentOf(c, claim.programme, period.from);
  if ('error' in a) return a;
  const periods = paid.payments.length;
  const due = a.amountMinor * periods;
  if (paid.amountMinor <= due) return { error: `Nothing was paid above what the rule gives on the corrected inputs (${paid.amountMinor} paid, ${due} due): there is no overpayment` };
  return { facts: { paidMinor: paid.amountMinor, dueMinor: due, overMinor: paid.amountMinor - due, rule: `${a.rule.key} v${a.rule.version}` }, rules: [a.rule],
    after: () => { recordOverpayment({ claim: claim.number, period, paidMinor: paid.amountMinor, dueMinor: due, rule: a.rule, payments: paid.payments, case: c.id, ...sampleMark(c) }, ctx.actor.name, ctx.now); } };
});
for (const outcome of ['recover', 'waive'] as const) {
  registerEffect(`social.${outcome}`, (ctx: EffectContext) => {
    const c = ctx.case;
    if (!overpaymentOfCase(c.id)) return { error: 'Calculate the overpayment first' };
    if (!str(c.fields.hardshipReview)) return { error: 'Record the hardship and recovery review first' };
    return { facts: { outcome }, after: d => { decideOverpayment(c.id, outcome, ctx.actor.name); if (d) attachOverpaymentDecision(c.id, d.id); } };
  });
}

// ── Appeal ───────────────────────────────────────────────────────────────────

const same = (a: { id?: string; name: string }, b: { id?: string; name: string }) => (a.id && b.id ? a.id === b.id : a.name === b.name);
function original(c: Case): { case: Case; claim: string; deciders: { id?: string; name: string }[] } | { error: string } {
  const o = getCase(str(c.fields.originalCase));
  if (!o || !o.package.key.startsWith('social.') || !o.decisions.length) return { error: 'Name the decided social protection case under appeal (its reference)' };
  if (o.owner !== c.owner) return { error: 'The appeal is made to the authority that decided' };
  const claim = str(o.fields.claim) || claimOfCase(o.id)?.number;
  if (!claim) return { error: `${o.ref} decided no claim` };
  return { case: o, claim, deciders: o.history.filter(h => h.decision).flatMap(h => [h.by, ...(h.confirmedBy ? [h.confirmedBy] : [])]) };
}
registerEffect('social.checkAppeal', ({ case: c }: EffectContext) => { const o = original(c); return 'error' in o ? o : { facts: { original: o.case.ref } }; });
registerEffect('social.decideAppeal', (ctx: EffectContext) => {
  const c = ctx.case;
  const o = original(c);
  if ('error' in o) return o;
  // Appeals go to officials independent of the decision (specification Part 2 §C.6 controls).
  const reviewers = [...(c.pending ? [c.pending.by] : []), who(ctx)];
  const conflict = reviewers.find(r => o.deciders.some(d => same(d, r)));
  if (conflict) return { error: `${conflict.name} took part in the decision under appeal: an appeal is decided by officials who did not` };
  const outcome = str(c.fields.appealOutcome);
  if (!['upheld', 'varied', 'overturned'].includes(outcome)) return { error: 'The appeal upholds, varies or overturns the decision' };
  return { facts: { original: o.case.ref, outcome }, after: d => { recordClaimReview(o.claim, { case: c.id, outcome }, ctx.actor.name, ctx.now); if (d) attachClaimDecision(o.claim, c.id, d.id); } };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const p = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'personal', ...extra });
const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const fin = (key: string, label: string, type: FieldSpec['type'] = 'longtext', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'financial', ...extra });
const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], owner: 'socialProtection', retention: 'social-protection-claim', sensitivity: 'restricted' as const };
const REVIEW_ROUTE = adm('reviewRoute', 'Review or appeal route open to the person (as the nation\'s law gives it)');
const EXPLANATION = r('explanation', 'Explanation to the person: what was decided, on which facts and rule version, in plain words', 'longtext');
const INPUTS: FieldSpec[] = [
  fin('incomeItems', 'Income (one per line: source | amount in minor units | verified yes or no)', 'longtext', { hint: 'Each line names where it comes from and whether it was verified. A mismatch is a discrepancy to resolve, not proof of fraud.' }),
  fin('assetItems', 'Assets (one per line: kind | amount in minor units | verified yes or no | counted yes or no under the programme\'s rule)'),
  fin('deductionItems', 'Deductions (one per line: kind | amount in minor units | verified yes or no)'),
  adm('householdSize', 'Household members counted (the household record\'s when left empty)', 'number'),
  adm('periodFrom', 'Assessment period from', 'date'),
  adm('periodTo', 'Assessment period to', 'date'),
];
const install = (list: Ref[], by: string) => {
  const drafted: string[] = [], present: string[] = [];
  for (const x of list) {
    if (listPackages({ key: x.key }).length) { present.push(x.key); continue; }
    const d = draftPackage(x, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(x.key);
  }
  return { drafted, present };
};

export const REFERENCE_SOCIAL_REGISTRATION: Ref = {
  ...base, key: 'social.registration', version: 1, title: 'Social protection registration', refPrefix: 'SPR',
  fields: [
    r('identityNumber', 'Identity record or credential number (checked with the identity authority)', 'text', { required: true }),
    p('givenNames', 'Given names', 'text', { required: true }),
    p('familyName', 'Family name', 'text', { required: true }),
    p('birthDate', 'Date of birth', 'date', { required: true }),
    r('contact', 'How to reach the person', 'text', { required: true }),
    adm('preferredChannel', 'Preferred way of being served', 'choice', { options: ['office', 'phone', 'post', 'online', 'home-visit'] }),
    r('representative', 'Representative, if any (their reference)'),
    r('householdMembers', 'Household members (one per line: reference | relationship)', 'longtext'),
    adm('effectiveFrom', 'Household composition applies from', 'date'),
  ],
  documents: [{ class: 'application', label: 'The registration as received', required: true }, { class: 'representative-authority', label: 'The representative\'s authority to act', required: false }, { class: 'identity-evidence', label: 'Other identity evidence relied on, where the exchange could not answer', required: false }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'held', label: 'Held: identity not yet verified' }, { key: 'verified', label: 'Identity verified' }, { key: 'registered', label: 'Registered', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true }],
  actions: [
    { key: 'verify-identity', label: 'Verify identity with the identity authority (identity.verify)', from: ['submitted', 'held'], to: 'verified', needs: { role: 'officer' }, requires: { fields: ['identityNumber', 'givenNames', 'familyName', 'birthDate'], documents: ['application'] }, effects: ['social.verifyApplicant'] },
    { key: 'hold', label: 'Hold until identity can be verified (never a refusal)', from: ['submitted'], to: 'held', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'verify-other-evidence', label: 'Record the other identity evidence relied on, with reasons', from: ['held'], to: 'verified', needs: { role: 'signatory' }, requires: { documents: ['identity-evidence'], reasons: true } },
    { key: 'register', label: 'Register the person', from: ['verified'], to: 'registered', needs: { role: 'officer' }, requires: { fields: ['contact'] }, effects: ['social.registerClaimant'] },
    { key: 'withdraw', label: 'Withdrawn at the person\'s request', from: ['submitted', 'held', 'verified'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [{ name: 'registered', steps: [{ action: 'verify-identity', fields: { identityNumber: 'ID-1', givenNames: 'A', familyName: 'B', birthDate: '2000-01-01' }, documents: ['application'], expect: 'verified' }, { action: 'register', fields: { contact: 'x' }, expect: 'registered' }] }],
};

export const REFERENCE_HOUSEHOLD: Ref = {
  ...base, key: 'social.household', version: 1, title: 'Household composition declaration or change', refPrefix: 'SPH',
  fields: [
    adm('claimant', 'Claimant (their register number)', 'text', { required: true }),
    r('householdMembers', 'Household members (one per line: reference | relationship)', 'longtext', { required: true }),
    adm('effectiveFrom', 'Applies from', 'date', { required: true }),
    adm('livingArrangement', 'Living arrangement (the nation\'s list)'),
  ],
  documents: [{ class: 'declaration', label: 'The declaration as received', required: true }, { class: 'evidence', label: 'Supporting evidence', required: false, multiple: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'recorded', label: 'Recorded (a new version; the earlier kept)', terminal: true }],
  actions: [{ key: 'record', label: 'Record the composition', from: ['submitted'], to: 'recorded', needs: { role: 'officer' }, requires: { fields: ['claimant', 'householdMembers', 'effectiveFrom'], documents: ['declaration'], reasons: true }, effects: ['social.declareHousehold'] }],
  tests: [{ name: 'recorded', steps: [{ action: 'record', fields: { claimant: 'SPC-1', householdMembers: 'x | child', effectiveFrom: '2026-01-01' }, documents: ['declaration'], expect: 'recorded' }] }],
};

export const REFERENCE_BENEFIT: Ref = {
  ...base, key: 'social.benefit', version: 1, title: 'Benefit claim', refPrefix: 'SPB',
  fields: [
    adm('claimant', 'Claimant (their register number)', 'text', { required: true }),
    adm('programme', 'Programme (one with an approved rule in force)', 'enum', { required: true, valuesSource: { kind: 'rules', prefix: 'social.' } }),
    r('applicationReason', 'Why the person applies', 'longtext', { required: true }),
    adm('requestedStart', 'Requested start', 'date'),
    p('familyName', 'Family name (for the identity check)'),
    p('birthDate', 'Date of birth (for the identity check)', 'date'),
    ...INPUTS,
    adm('startOn', 'Award starts on (as the decision sets it)', 'date'),
    r('paymentPreference', 'Payment method (a protected reference; never shown in lists)'),
    EXPLANATION, REVIEW_ROUTE,
  ],
  documents: [
    { class: 'application', label: 'The claim as received', required: true },
    { class: 'income-evidence', label: 'Income and resource evidence (only what the programme\'s rules require)', required: false, multiple: true },
    { class: 'other-evidence', label: 'Other eligibility evidence', required: false, multiple: true },
    { class: 'identity-evidence', label: 'Other identity evidence relied on, where the exchange could not answer', required: false },
    { class: 'decision-notice', label: 'Decision notice with the explanation', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'held', label: 'Held: identity not yet verified' }, { key: 'verified', label: 'Identity verified' },
    { key: 'assessed', label: 'Means assessed; amount calculated by the approved rule' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'awarded', label: 'Awarded', terminal: true }, { key: 'not-awarded', label: 'Refused, with an explanation and the review route', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'verify-identity', label: 'Verify identity with the identity authority (identity.verify)', from: ['submitted', 'held'], to: 'verified', needs: { role: 'officer' }, requires: { fields: ['claimant', 'programme'], documents: ['application'] }, effects: ['social.verifyClaimant'] },
    { key: 'hold', label: 'Hold until identity can be verified (never a refusal)', from: ['submitted'], to: 'held', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'verify-other-evidence', label: 'Record the other identity evidence relied on, with reasons', from: ['held'], to: 'verified', needs: { role: 'signatory' }, requires: { documents: ['identity-evidence'], reasons: true } },
    { key: 'assess', label: 'Assess the means: the approved rule calculates the amount', from: ['verified', 'assessed'], to: 'assessed', needs: { role: 'officer' }, requires: { fields: ['periodFrom', 'periodTo'], reasons: true }, effects: ['social.assess'] },
    { key: 'propose', label: 'Propose the decision with its explanation', from: ['assessed'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['explanation'], reasons: true } },
    { key: 'award', label: 'Award, on the assessment and rule version recorded (two officials)', from: ['pending-approval'], to: 'awarded', decision: 'award', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['startOn'], documents: ['decision-notice'], reasons: true }, effects: ['social.award'] },
    { key: 'refuse', label: 'Refuse, with an explanation and the review route (two officials)', from: ['assessed', 'pending-approval'], to: 'not-awarded', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute', 'explanation'], documents: ['decision-notice'], reasons: true }, effects: ['social.refuse'] },
    { key: 'withdraw', label: 'Withdrawn at the person\'s request', from: ['submitted', 'held', 'verified', 'assessed'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'awarded', steps: [
      { action: 'verify-identity', fields: { claimant: 'SPC-1', programme: 'x' }, documents: ['application'], expect: 'verified' },
      { action: 'assess', fields: { periodFrom: '2026-01-01', periodTo: '2026-01-31' }, expect: 'assessed' },
      { action: 'propose', fields: { explanation: 'x' }, expect: 'pending-approval' },
      { action: 'award', fields: { startOn: '2026-02-01' }, documents: ['decision-notice'], expect: 'awarded' },
    ] },
    { name: 'held, never refused while held', steps: [{ action: 'hold', expect: 'held' }, { action: 'refuse', expect: 'refused' }, { action: 'verify-other-evidence', documents: ['identity-evidence'], expect: 'verified' }] },
  ],
};

export const REFERENCE_REASSESSMENT: Ref = {
  ...base, key: 'social.reassessment', version: 1, title: 'Benefit reassessment or change of circumstances', refPrefix: 'SPA',
  fields: [
    adm('claim', 'Claim (its number)', 'text', { required: true }),
    adm('changeKind', 'Why it is reassessed', 'choice', { options: ['change-of-circumstances', 'scheduled-review', 'correction'], required: true }),
    r('changeDetails', 'What changed, and when', 'longtext', { required: true }),
    ...INPUTS, EXPLANATION, REVIEW_ROUTE,
  ],
  documents: [{ class: 'notification', label: 'The notification or review record', required: true }, { class: 'evidence', label: 'Evidence of the change', required: false, multiple: true }, { class: 'decision-notice', label: 'Decision notice with the explanation', required: false }],
  stages: [{ key: 'received', label: 'Received' }, { key: 'assessed', label: 'Reassessed (a new version; the earlier kept)' }, { key: 'pending-approval', label: 'Decision' }, { key: 'decided', label: 'Decided', terminal: true }],
  actions: [
    { key: 'assess', label: 'Reassess with the rule in force', from: ['received', 'assessed'], to: 'assessed', needs: { role: 'officer' }, requires: { fields: ['claim', 'changeKind', 'changeDetails', 'periodFrom', 'periodTo'], documents: ['notification'], reasons: true }, effects: ['social.assess'] },
    { key: 'propose', label: 'Propose the decision with its explanation', from: ['assessed'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['explanation'], reasons: true } },
    { key: 'vary', label: 'Vary the award to the new assessment (two officials)', from: ['pending-approval'], to: 'decided', decision: 'vary', needs: { role: 'signatory', fourEyes: true }, requires: { documents: ['decision-notice'], reasons: true }, effects: ['social.vary'] },
    { key: 'continue', label: 'Continue unchanged, with reasons', from: ['pending-approval'], to: 'decided', decision: 'continue', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['social.continue'] },
    { key: 'end', label: 'End the award, with an explanation and the review route (two officials)', from: ['pending-approval'], to: 'decided', decision: 'end', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], documents: ['decision-notice'], reasons: true }, effects: ['social.end'] },
  ],
  tests: [{ name: 'varied', steps: [{ action: 'assess', fields: { claim: 'BEN-1', changeKind: 'change-of-circumstances', changeDetails: 'x', periodFrom: '2026-03-01', periodTo: '2026-03-31' }, documents: ['notification'], expect: 'assessed' }, { action: 'propose', fields: { explanation: 'x' }, expect: 'pending-approval' }, { action: 'vary', documents: ['decision-notice'], expect: 'decided' }] }],
};

export const REFERENCE_SUSPENSION: Ref = {
  ...base, key: 'social.suspension', version: 1, title: 'Benefit suspension or termination review', refPrefix: 'SPS',
  fields: [
    adm('claim', 'Claim (its number)', 'text', { required: true }),
    r('groundsFacts', 'The facts the review rests on, with their evidence', 'longtext', { required: true, hint: 'A mismatch is a discrepancy to resolve, not proof of fraud. A risk score alone can never cut support.' }),
    r('representationsSummary', 'The person\'s representations (or that none were received by the date the notice gave)', 'longtext'),
    EXPLANATION, REVIEW_ROUTE,
  ],
  documents: [{ class: 'grounds-evidence', label: 'Evidence of the facts relied on', required: true, multiple: true }, { class: 'notice', label: 'Notice to the person, with the grounds and how to respond', required: false }, { class: 'representations', label: 'The person\'s representations', required: false }],
  stages: [{ key: 'opened', label: 'Opened' }, { key: 'representations', label: 'Notice given: representations' }, { key: 'pending-approval', label: 'Decision' }, { key: 'decided', label: 'Decided', terminal: true }],
  actions: [
    { key: 'notify', label: 'Give notice of the facts and invite representations', from: ['opened'], to: 'representations', needs: { role: 'officer' }, requires: { fields: ['claim', 'groundsFacts'], documents: ['grounds-evidence', 'notice'], reasons: true } },
    { key: 'propose', label: 'Representations considered: propose', from: ['representations'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['representationsSummary'], reasons: true } },
    { key: 'suspend', label: 'Suspend, with an explanation and the review route (two officials)', from: ['pending-approval'], to: 'decided', decision: 'suspend', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute', 'explanation'], reasons: true }, effects: ['social.suspend'] },
    { key: 'terminate', label: 'Terminate, with an explanation and the review route (two officials)', from: ['pending-approval'], to: 'decided', decision: 'terminate', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute', 'explanation'], reasons: true }, effects: ['social.terminate'] },
    { key: 'continue', label: 'Continue the award, with reasons', from: ['pending-approval'], to: 'decided', decision: 'continue', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['social.continue'] },
  ],
  tests: [{ name: 'suspended after representations', steps: [{ action: 'notify', fields: { claim: 'BEN-1', groundsFacts: 'x' }, documents: ['grounds-evidence', 'notice'], expect: 'representations' }, { action: 'propose', fields: { representationsSummary: 'x' }, expect: 'pending-approval' }, { action: 'suspend', fields: { reviewRoute: 'x', explanation: 'x' }, expect: 'decided' }] }],
};

export const REFERENCE_PAYMENT: Ref = {
  ...base, key: 'social.payment', version: 1, title: 'Benefit payment instruction', refPrefix: 'SPP',
  fields: [
    adm('claim', 'Claim (its number)', 'text', { required: true }),
    adm('periodFrom', 'Payment period from', 'date', { required: true }),
    adm('periodTo', 'Payment period to', 'date', { required: true }),
    r('paymentMethodReference', 'Payment method (a protected reference held by the payment service)'),
    adm('externalReference', 'The payment service\'s reference for the result'),
  ],
  documents: [{ class: 'instruction', label: 'The instruction as sent to the payment service', required: false }],
  stages: [{ key: 'opened', label: 'Opened' }, { key: 'prepared', label: 'Prepared (maker)' }, { key: 'approved', label: 'Approved (a different official): with the payment service' }, { key: 'paid', label: 'Paid', terminal: true }, { key: 'failed', label: 'Failed: reconcile', terminal: true }, { key: 'cancelled', label: 'Cancelled', terminal: true }],
  actions: [
    { key: 'prepare', label: 'Prepare the instruction from the current assessment (the amount is never typed)', from: ['opened'], to: 'prepared', needs: { role: 'officer' }, requires: { fields: ['claim', 'periodFrom', 'periodTo'] }, effects: ['social.preparePayment'] },
    { key: 'approve', label: 'Approve the instruction (a different official from the maker)', from: ['prepared'], to: 'approved', decision: 'instruct', needs: { role: 'signatory', distinctFrom: ['prepare'] }, requires: { reasons: true }, effects: ['social.approvePayment'] },
    { key: 'cancel', label: 'Cancel before approval, with reasons', from: ['prepared'], to: 'cancelled', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['social.paymentResult'] },
    { key: 'record-paid', label: 'Record the payment service\'s confirmation', from: ['approved'], to: 'paid', needs: { role: 'officer' }, requires: { fields: ['externalReference'] }, effects: ['social.paymentResult'] },
    { key: 'record-failed', label: 'Record a failed payment for reconciliation', from: ['approved'], to: 'failed', needs: { role: 'officer' }, requires: { fields: ['externalReference'], reasons: true }, effects: ['social.paymentResult'] },
  ],
  tests: [{ name: 'prepared, approved, paid', steps: [{ action: 'prepare', fields: { claim: 'BEN-1', periodFrom: '2026-02-01', periodTo: '2026-02-28' }, expect: 'prepared' }, { action: 'approve', expect: 'approved' }, { action: 'record-paid', fields: { externalReference: 'x' }, expect: 'paid' }] }],
};

export const REFERENCE_OVERPAYMENT: Ref = {
  ...base, key: 'social.overpayment', version: 1, title: 'Benefit overpayment review', refPrefix: 'SPO',
  fields: [
    adm('claim', 'Claim (its number)', 'text', { required: true }),
    r('correctionBasis', 'What the corrected inputs rest on', 'longtext', { required: true }),
    ...INPUTS,
    r('recipientResponse', 'The recipient\'s response', 'longtext'),
    r('hardshipReview', 'Hardship and recovery review', 'longtext'),
    REVIEW_ROUTE,
  ],
  documents: [{ class: 'evidence', label: 'Evidence of the corrected facts', required: true, multiple: true }, { class: 'notice', label: 'Notice of the overpayment and how to respond', required: false }, { class: 'response', label: 'The recipient\'s response', required: false }],
  stages: [{ key: 'opened', label: 'Opened' }, { key: 'calculated', label: 'Calculated by the period\'s rule' }, { key: 'response', label: 'Notice given: response' }, { key: 'pending-approval', label: 'Decision' }, { key: 'decided', label: 'Decided', terminal: true }],
  actions: [
    { key: 'calculate', label: 'Calculate: paid against what the period\'s rule gives on corrected inputs', from: ['opened'], to: 'calculated', needs: { role: 'officer' }, requires: { fields: ['claim', 'correctionBasis', 'periodFrom', 'periodTo'], documents: ['evidence'], reasons: true }, effects: ['social.calculateOverpayment'] },
    { key: 'notify', label: 'Give notice and invite a response', from: ['calculated'], to: 'response', needs: { role: 'officer' }, requires: { documents: ['notice'] } },
    { key: 'review', label: 'Response and hardship reviewed: propose', from: ['response'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['hardshipReview'], reasons: true } },
    { key: 'recover', label: 'Recover, with reasons and the review route (two officials)', from: ['pending-approval'], to: 'decided', decision: 'recover', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], reasons: true }, effects: ['social.recover'] },
    { key: 'waive', label: 'Waive, with reasons (two officials)', from: ['pending-approval'], to: 'decided', decision: 'waive', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['social.waive'] },
  ],
  tests: [{ name: 'waived', steps: [{ action: 'calculate', fields: { claim: 'BEN-1', correctionBasis: 'x', periodFrom: '2026-02-01', periodTo: '2026-02-28' }, documents: ['evidence'], expect: 'calculated' }, { action: 'notify', documents: ['notice'], expect: 'response' }, { action: 'review', fields: { hardshipReview: 'x' }, expect: 'pending-approval' }, { action: 'waive', expect: 'decided' }] }],
};

export const REFERENCE_APPEAL: Ref = {
  ...base, key: 'social.appeal', version: 1, title: 'Benefit appeal or reconsideration', refPrefix: 'SPX',
  fields: [
    adm('originalCase', 'The decision appealed (its case reference)', 'text', { required: true }),
    r('appealGrounds', 'Grounds (one per line, as the nation\'s law names them)', 'longtext', { required: true }),
    r('statementOfGrounds', 'Statement of the grounds', 'longtext', { required: true }),
    r('representative', 'Representative, if any (their reference)'),
    adm('appealOutcome', 'Outcome', 'choice', { options: ['upheld', 'varied', 'overturned'] }),
    EXPLANATION, REVIEW_ROUTE,
  ],
  documents: [{ class: 'appeal', label: 'The appeal as received', required: true }, { class: 'new-evidence', label: 'New evidence', required: false, multiple: true }, { class: 'decision-notice', label: 'Decision notice with the explanation', required: false }],
  stages: [{ key: 'received', label: 'Received' }, { key: 'review', label: 'Under review (officials independent of the decision)' }, { key: 'pending-approval', label: 'Decision' }, { key: 'decided', label: 'Decided', terminal: true }],
  actions: [
    { key: 'accept', label: 'Accept for review', from: ['received'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['originalCase', 'appealGrounds', 'statementOfGrounds'], documents: ['appeal'] }, effects: ['social.checkAppeal'] },
    { key: 'propose', label: 'Propose the outcome', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['appealOutcome', 'explanation'], reasons: true } },
    { key: 'decide', label: 'Decide the appeal (two officials who took no part in the decision)', from: ['pending-approval'], to: 'decided', decision: 'review', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['reviewRoute'], documents: ['decision-notice'], reasons: true }, effects: ['social.decideAppeal'] },
  ],
  tests: [{ name: 'decided', steps: [{ action: 'accept', fields: { originalCase: 'SPB-1', appealGrounds: 'x', statementOfGrounds: 'x' }, documents: ['appeal'], expect: 'review' }, { action: 'propose', fields: { appealOutcome: 'upheld', explanation: 'x' }, expect: 'pending-approval' }, { action: 'decide', fields: { reviewRoute: 'x' }, documents: ['decision-notice'], expect: 'decided' }] }],
};

export const SOCIAL_PROCEDURES: Ref[] = [REFERENCE_SOCIAL_REGISTRATION, REFERENCE_HOUSEHOLD, REFERENCE_BENEFIT, REFERENCE_REASSESSMENT, REFERENCE_SUSPENSION, REFERENCE_PAYMENT, REFERENCE_OVERPAYMENT, REFERENCE_APPEAL];

export function installSocialProcedures(by: string): { drafted: string[]; present: string[] } { return install(SOCIAL_PROCEDURES, by); }

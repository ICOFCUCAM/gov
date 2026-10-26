// Budget and treasury on the workflow foundation (plan step I5; institutional
// specification Part 1 §4.3; field series Part 2 §2.4 and §2.5). Reference
// procedures, drafts for the finance authority (deployment-profile slot
// `finance`, shipped empty) to adapt to its law and approve:
//
//   budget.circular        budget call circular: drafted, issued by two officials (budget.circular.issue)
//   budget.ceiling         institutional ceiling: proposed, approved by two officials (budget.ceiling.*)
//   budget.bid             institutional bid: submission → validation → review (justification, revision,
//                          costing) → negotiation → allocation by two officials, or not allocated;
//                          withdrawal (budget.bid.*, budget.programme.costing, budget.negotiation.record,
//                          budget.allocation.*)
//   budget.appropriation   enacted appropriation → allocation → authority validation → release by two
//                          officials, citing the appropriation law (specification §4.3)
//   budget.revision        request → source and destination checks → legal authority → approval → revised
//                          allocation: virement, supplementary, further release, reduction
//                          (budget.execution.reallocation.*, supplementary.request, virement)
//   finance.commitment     a commitment against a released appropriation, never above what is available;
//                          approved by two officials; cancelled or closed with the remainder returned
//                          (budget.execution.commitment, commitment.approve)
//   treasury.payee-account a payee's bank account: requested, verified by another person, approved by two
//                          officials, then in force (field series Part 3 §3.5 Department B, bank-detail change)
//   treasury.payment       obligation → invoice validation → commitment check → payment instruction →
//                          verification → approval by two officials → execution (the bank's reference) →
//                          reconciliation (the statement line), each by a different person
//                          (specification §4.3, §4.5; treasury.payment.*)
//   treasury.cash-forecast an institution's cash forecast: recorded, reviewed with its assumptions and
//                          variance, returned or closed (treasury.cash_forecast.*)
//
// Each decision is classified (lib/permits/decisions.ts, FINANCE_PERMITS)
// under mappings CivicOS proposes and nobody has approved (lead: the finance
// slot); a production installation refuses a decision until the nation
// approves its mapping. No ceiling, threshold, tier or period ships: an
// approval tier comes only from the approved `treasury.payment.approval-tiers`
// rule (lib/law/rules.ts, tiers), refused in production without one; every
// deadline is the nation's (shipped without days). The spending institution
// is the case's applicant; its signed request is the case's evidence.

import { registerEffect, registeredEffects, sampleMark, type EffectContext, type EffectResult } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { samplesAllowed } from '@/lib/ops/mode';
import { tierFor } from '@/lib/law/rules';
import { citeBasis } from '@/lib/law/policy-change';
import { judicialRefusal } from '@/lib/transitions/restrictions';
import { getOrganisation, current as orgCurrent } from '@/lib/organisations/register';
import { nationCurrency } from '@/lib/nation/registry';
import {
  issueCall, setCeiling, recordBid, reviseBid, negotiateBid, allocateBid, closeBid, enactAppropriation, validateAppropriation, releaseAppropriation, refuseRelease,
  attachAppropriationDecision, checkRevision, reviseAppropriations, recordCommitment, endCommitment, attachCommitmentDecision, getCommitment, commitmentRemaining,
  requestPayeeAccount, verifyPayeeAccount, approvePayeeAccount, refusePayeeAccount, attachPayeeDecision, payeeAccountInForce,
  instructPayment, verifyPayment, approvePayment, attachPaymentDecision, executePayment, reconcilePayment, endPayment, retryPayment, getPayment,
  submitForecast, reviewForecast, getAppropriation, balanceOf, REVISION_KINDS, type RevisionKind, type PaymentOrder,
} from './register';
import { contractForPayment } from '@/lib/procurement/register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);
const fail = <T extends object>(x: T | { error: string }): x is { error: string } => 'error' in x;
const who = (ctx: EffectContext) => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name });
const at = (ctx: EffectContext) => ctx.now.toISOString();
const reasonOf = (ctx: EffectContext) => ctx.case.pending?.reason ?? ctx.case.history[ctx.case.history.length - 1]?.reason ?? `${ctx.action.label} (${ctx.case.ref})`;
const currencyOf = (c: Case) => str(c.fields.currency).toUpperCase() || nationCurrency();
const sample = (c: Case) => sampleMark(c);

/** The permit type (lib/permits/authority.ts) each finance procedure's decisions rest on (lead: the finance slot; proposed, unapproved). */
export const FINANCE_PERMITS: Record<string, string> = {
  'budget.circular': 'budget-circular', 'budget.ceiling': 'budget-ceiling', 'budget.bid': 'budget-allocation', 'budget.appropriation': 'appropriation-release',
  'budget.revision': 'budget-revision', 'finance.commitment': 'expenditure-commitment', 'treasury.payee-account': 'payee-account-change', 'treasury.payment': 'payment-authorisation',
};
/** The approved rule that sets the payment approval tiers (a `tiers` rule, lib/law/rules.ts): shipped unset. */
export const PAYMENT_TIERS_RULE = 'treasury.payment.approval-tiers';

/** Only the finance authority named under Who is responsible keeps these records. */
function keeper(c: Case): string | null {
  const f = authorityFor('finance');
  return f && f === c.owner ? null : 'Budget and treasury records are kept by the finance authority named under Who is responsible';
}
/** The institution a case is for: the applicant institution the request came from (an institution of the registry). */
function institutionOf(c: Case): string | { error: string } {
  const id = str(c.fields.institution) || (c.applicant?.kind === 'institution' ? c.applicant.id ?? '' : '');
  if (!id || !getMinistry(id)) return { error: 'Name the institution (its id in the ministry registry) the record is for' };
  return id;
}
/** The provisions a step relies on, cited from the laws register on the day (fields lawInstrument and lawProvision); refused if a court ruled them invalid. */
function basisOf(c: Case, now: Date, what: string) {
  const instrument = str(c.fields.lawInstrument), eId = str(c.fields.lawProvision);
  const b = citeBasis(instrument || eId ? [{ instrument, eId }] : [], now.toISOString().slice(0, 10), `${what} (${c.ref})`);
  if (fail(b)) return b;
  const ruled = judicialRefusal(b, now);
  return ruled ? { error: ruled } : b;
}
const supplierOf = (number: string): { number: string; name: string } | { error: string } => {
  const o = getOrganisation(number);
  if (!o) return { error: `No organisation ${number || '(none given)'} on the organisations register: a supplier or payee is an organisation there, never a second identity` };
  return { number: o.number, name: orgCurrent(o).name };
};

// ── Effects: budget preparation ──────────────────────────────────────────────

registerEffect('finance.issueCall', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const r = issueCall({ period: str(c.fields.period), currency: currencyOf(c), ...(str(c.fields.closesOn) ? { closesOn: str(c.fields.closesOn) } : {}), instructions: str(c.fields.instructions), case: c.id, by: ctx.actor.name, at: at(ctx), ...sample(c) });
  return fail(r) ? r : { facts: { call: r.ref, period: r.period, currency: r.currency } };
});

registerEffect('finance.setCeiling', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const inst = institutionOf(c);
  if (typeof inst !== 'string') return inst;
  const r = setCeiling({ institution: inst, period: str(c.fields.period), amountMinor: int(c.fields.ceilingMinor), currency: currencyOf(c), case: c.id, by: ctx.actor.name, at: at(ctx), ...sample(c) });
  return fail(r) ? r : { facts: { institution: inst, period: r.period, ceilingMinor: r.amountMinor, version: r.version } };
});

registerEffect('finance.recordBid', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const inst = institutionOf(c);
  if (typeof inst !== 'string') return inst;
  const r = recordBid({ ref: c.ref, institution: inst, period: str(c.fields.period), programme: str(c.fields.programme), requestedMinor: int(c.fields.requestedMinor), currency: currencyOf(c), ...(str(c.fields.lateReason) ? { lateReason: str(c.fields.lateReason) } : {}), case: c.id, by: ctx.actor.name, at: at(ctx), ...sample(c) });
  return fail(r) ? r : { facts: { bid: r.ref, requestedMinor: r.requestedMinor } };
});
registerEffect('finance.reviseBid', (ctx: EffectContext): EffectResult => {
  const r = reviseBid(ctx.case.id, int(ctx.case.fields.requestedMinor), reasonOf(ctx), ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { requestedMinor: r.requestedMinor, version: r.versions.length } };
});
registerEffect('finance.negotiateBid', (ctx: EffectContext): EffectResult => {
  const r = negotiateBid(ctx.case.id, int(ctx.case.fields.agreedMinor), str(ctx.case.fields.negotiationNote), ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { agreedMinor: r.negotiation!.agreedMinor } };
});
registerEffect('finance.allocateBid', (ctx: EffectContext): EffectResult => {
  const r = allocateBid(ctx.case.id, int(ctx.case.fields.allocationMinor), ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { bid: r.ref, allocationMinor: r.allocationMinor! } };
});
registerEffect('finance.refuseBid', (ctx: EffectContext): EffectResult => { const r = closeBid(ctx.case.id, 'not-allocated', reasonOf(ctx), ctx.actor.name); return fail(r) ? r : { facts: { bid: r.ref, state: r.state } }; });
registerEffect('finance.withdrawBid', (ctx: EffectContext): EffectResult => { const r = closeBid(ctx.case.id, 'withdrawn', reasonOf(ctx), ctx.actor.name); return fail(r) ? r : { facts: { bid: r.ref, state: r.state } }; });

// ── Effects: appropriations and revisions ────────────────────────────────────

registerEffect('finance.enact', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const inst = institutionOf(c);
  if (typeof inst !== 'string') return inst;
  const basis = basisOf(c, ctx.now, 'Appropriation');
  if (fail(basis)) return basis;
  const r = enactAppropriation({ period: str(c.fields.period), institution: inst, programme: str(c.fields.programme), ...(str(c.fields.economicCode) ? { economicCode: str(c.fields.economicCode) } : {}), ...(str(c.fields.fund) ? { fund: str(c.fields.fund) } : {}),
    amountMinor: int(c.fields.amountMinor), currency: currencyOf(c), basis, ...(str(c.fields.bid) ? { bid: str(c.fields.bid) } : {}), case: c.id, by: ctx.actor.name, at: at(ctx), ...sample(c) });
  return fail(r) ? r : { facts: { appropriation: r.ref, amountMinor: r.amountMinor } };
});
registerEffect('finance.validateAuthority', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const a = getAppropriation(c.id);
  if (!a) return { error: 'The enacted appropriation is recorded first' };
  // The law it rests on is still in force and no court has ruled it invalid.
  const ruled = judicialRefusal(a.basis, ctx.now);
  if (ruled) return { error: ruled };
  const r = validateAppropriation(c.id, str(c.fields.validationNote) || reasonOf(ctx), ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { appropriation: r.ref, validated: true } };
});
registerEffect('finance.release', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const a = getAppropriation(c.id);
  const r = releaseAppropriation(c.id, Number.isInteger(int(c.fields.releaseMinor)) ? int(c.fields.releaseMinor) : a?.amountMinor ?? NaN, reasonOf(ctx), ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { appropriation: r.ref, releasedMinor: r.releasedMinor }, after: (d?: { id: string }) => { if (d) attachAppropriationDecision(c.id, d.id); } };
});
registerEffect('finance.refuseRelease', (ctx: EffectContext): EffectResult => {
  const r = refuseRelease(ctx.case.id, reasonOf(ctx), ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { appropriation: r.ref, state: r.state }, after: (d?: { id: string }) => { if (d) attachAppropriationDecision(ctx.case.id, d.id); } };
});

const revisionOf = (c: Case) => ({ kind: str(c.fields.revisionKind) as RevisionKind, ...(str(c.fields.source) ? { source: str(c.fields.source) } : {}), destination: str(c.fields.destination), amountMinor: int(c.fields.amountMinor) });
registerEffect('finance.checkRevision', (ctx: EffectContext): EffectResult => {
  const why = keeper(ctx.case);
  if (why) return { error: why };
  const r = checkRevision(revisionOf(ctx.case));
  return fail(r) ? r : { facts: { destination: r.destination.ref, ...(r.source ? { source: r.source.ref } : {}) } };
});
registerEffect('finance.checkRevisionAuthority', (ctx: EffectContext): EffectResult => {
  const basis = basisOf(ctx.case, ctx.now, 'Budget revision');
  return fail(basis) ? basis : { facts: { basis: `${basis[0]!.title ?? basis[0]!.instrument} ${basis[0]!.num ?? basis[0]!.eId}` } };
});
registerEffect('finance.revise', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const basis = basisOf(c, ctx.now, 'Budget revision');
  if (fail(basis)) return basis;
  const r = reviseAppropriations({ ...revisionOf(c), reason: reasonOf(ctx), basis, case: c.id, by: ctx.actor.name, at: at(ctx) });
  return fail(r) ? r : { facts: { destination: r.destination.ref, amountMinor: r.destination.amountMinor, ...(r.source ? { source: r.source.ref } : {}) }, after: (d?: { id: string }) => { if (d) attachAppropriationDecision(c.id, d.id); } };
});

// ── Effects: commitments ─────────────────────────────────────────────────────

/** The commitment a case proposes, checked against the records as they stand (no change). */
function commitmentInput(c: Case) {
  const a = getAppropriation(str(c.fields.appropriation));
  if (!a) return { error: `No appropriation ${str(c.fields.appropriation) || '(none given)'}` };
  const inst = institutionOf(c);
  if (typeof inst !== 'string') return inst;
  if (a.institution !== inst) return { error: `${a.ref} is appropriated to another institution` };
  const s = supplierOf(str(c.fields.supplier));
  if (fail(s)) return s;
  const contract = str(c.fields.contract);
  if (contract) {
    const k = contractForPayment(contract);
    if (!k) return { error: `No signed procurement contract ${contract}` };
    if (k.supplier !== s.number) return { error: `Contract ${contract} is with another supplier` };
  }
  return { a, inst, s, contract };
}
registerEffect('finance.checkCommitment', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const x = commitmentInput(c);
  if (fail(x)) return x;
  const b = balanceOf(x.a.id)!;
  if (x.a.state !== 'released') return { error: `${x.a.ref} is not released` };
  if (int(c.fields.amountMinor) > b.availableMinor) return { error: `${x.a.ref} has ${b.availableMinor / 100} available: less than the commitment` };
  return { facts: { appropriation: x.a.ref, availableMinor: b.availableMinor } };
});
registerEffect('finance.commit', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const x = commitmentInput(c);
  if (fail(x)) return x;
  const r = recordCommitment({ appropriation: x.a.id, supplier: x.s, ...(x.contract ? { contract: x.contract } : {}), description: str(c.fields.description), amountMinor: int(c.fields.amountMinor), currency: currencyOf(c), case: c.id, by: ctx.actor.name, at: at(ctx), ...sample(c) });
  return fail(r) ? r : { facts: { commitment: r.ref, amountMinor: r.amountMinor, appropriation: r.appropriationRef }, after: (d?: { id: string }) => { if (d) attachCommitmentDecision(c.id, d.id); } };
});
registerEffect('finance.endCommitment', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const com = getCommitment(c.id);
  if (!com) return { error: 'No commitment was recorded on this case' };
  const r = endCommitment(com.id, reasonOf(ctx), c.ref, ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { commitment: r.ref, state: r.state, releasedMinor: r.ended!.releasedMinor } };
});

// ── Effects: payee accounts ──────────────────────────────────────────────────

registerEffect('finance.requestPayee', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const s = supplierOf(str(c.fields.payee));
  if (fail(s)) return s;
  const r = requestPayeeAccount({ organisation: s, bank: str(c.fields.bank), accountNumber: str(c.fields.accountNumber), reason: str(c.fields.changeReason), case: c.id, by: who(ctx), at: at(ctx), ...sample(c) });
  return fail(r) ? r : { facts: { account: r.ref, masked: r.masked } };
});
registerEffect('finance.verifyPayee', (ctx: EffectContext): EffectResult => {
  const r = verifyPayeeAccount(ctx.case.id, str(ctx.case.fields.verificationMethod), str(ctx.case.fields.verificationNote), who(ctx), at(ctx));
  return fail(r) ? r : { facts: { account: r.ref, verified: true } };
});
registerEffect('finance.approvePayee', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const proposer = c.pending?.by ?? who(ctx);
  const r = approvePayeeAccount(c.id, { ...(proposer.id ? { id: proposer.id } : {}), name: proposer.name }, who(ctx), at(ctx));
  return fail(r) ? r : { facts: { account: r.ref, masked: r.masked, inForce: true }, after: (d?: { id: string }) => { if (d) attachPayeeDecision(c.id, d.id); } };
});
registerEffect('finance.refusePayee', (ctx: EffectContext): EffectResult => {
  const r = refusePayeeAccount(ctx.case.id, reasonOf(ctx), who(ctx), at(ctx));
  return fail(r) ? r : { facts: { account: r.ref, state: r.state } };
});

// ── Effects: payments ────────────────────────────────────────────────────────

/** The obligation a payment case names, checked against the commitment, the invoice and (for a procurement contract) the certification. */
function obligationOf(c: Case) {
  const com = getCommitment(str(c.fields.commitment));
  if (!com) return { error: `No commitment ${str(c.fields.commitment) || '(none given)'}` };
  if (com.state !== 'committed') return { error: `${com.ref} is ${com.state}` };
  const inst = institutionOf(c);
  if (typeof inst !== 'string') return inst;
  if (com.institution !== inst) return { error: `${com.ref} is another institution's commitment` };
  const invoice = { ref: str(c.fields.invoiceRef), date: str(c.fields.invoiceDate), amountMinor: int(c.fields.invoiceMinor) };
  if (!invoice.ref || !/^\d{4}-\d{2}-\d{2}$/.test(invoice.date) || !Number.isInteger(invoice.amountMinor) || invoice.amountMinor <= 0) return { error: 'Give the invoice\'s reference, date and amount' };
  const amount = int(c.fields.amountMinor);
  if (!Number.isInteger(amount) || amount <= 0 || amount > invoice.amountMinor) return { error: 'The payment is a positive whole number of minor units, at most the invoice' };
  // A procurement officer cannot have a payment approved merely because a contract exists (specification §9.3): the
  // invoice must be certified against an accepted deliverable of that contract.
  let certification: string | undefined;
  if (com.contract) {
    const k = contractForPayment(com.contract, invoice.ref);
    if (!k?.certification) return { error: `${com.ref} rests on contract ${com.contract}: the invoice is certified against an accepted deliverable of the contract first (its payment certification)` };
    if (k.certification.amountMinor < amount) return { error: `The certification covers ${k.certification.amountMinor / 100}: less than the payment` };
    certification = k.certification.ref;
  }
  return { com, invoice: { ...invoice, ...(certification ? { certification } : {}) }, amount };
}
registerEffect('finance.validateInvoice', (ctx: EffectContext): EffectResult => {
  const why = keeper(ctx.case);
  if (why) return { error: why };
  const o = obligationOf(ctx.case);
  if (fail(o)) return o;
  if (!payeeAccountInForce(o.com.supplier.number)) return { error: `${o.com.supplier.name} (${o.com.supplier.number}) has no approved payee account in force: approve it under its own procedure first` };
  return { facts: { commitment: o.com.ref, invoice: o.invoice.ref, ...(o.invoice.certification ? { certification: o.invoice.certification } : {}) } };
});
registerEffect('finance.checkFunds', (ctx: EffectContext): EffectResult => {
  const o = obligationOf(ctx.case);
  if (fail(o)) return o;
  const left = commitmentRemaining(o.com.id)!;
  if (o.amount > left) return { error: `${o.com.ref} has ${left / 100} left to pay: less than the payment` };
  return { facts: { commitment: o.com.ref, remainingMinor: left } };
});
registerEffect('finance.instruct', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const o = obligationOf(c);
  if (fail(o)) return o;
  const r = instructPayment({ commitment: o.com.id, invoice: o.invoice, amountMinor: o.amount, purpose: str(c.fields.purpose), case: c.id, by: who(ctx), at: at(ctx), ...sample(c) });
  return fail(r) ? r : { facts: { payment: r.ref, amountMinor: r.amountMinor, account: r.account.masked } };
});
registerEffect('finance.verifyPayment', (ctx: EffectContext): EffectResult => {
  const r = verifyPayment(ctx.case.id, str(ctx.case.fields.verificationNote) || reasonOf(ctx), who(ctx), at(ctx));
  return fail(r) ? r : { facts: { payment: r.ref, verified: true } };
});
/** The approval tier from the approved rule; a production installation refuses an approval without it (demonstrations record that none applies). */
function tierOf(p: PaymentOrder, now: Date): NonNullable<PaymentOrder['tier']> | { error: string } {
  const t = tierFor(PAYMENT_TIERS_RULE, p.amountMinor, now.toISOString().slice(0, 10));
  if (!('error' in t)) return { tier: t.tier, rule: { key: t.rule.key, version: t.rule.version, digest: t.rule.digest } };
  if (!samplesAllowed()) return { error: `${t.error}: a production installation approves no payment without the nation's approval tiers (${PAYMENT_TIERS_RULE})` };
  return { none: 'No approved approval tiers: a demonstration or training installation only' };
}
const tierLabel = (t: NonNullable<PaymentOrder['tier']>) => ('tier' in t ? t.tier : 'none (demonstration)');
registerEffect('finance.checkTier', (ctx: EffectContext): EffectResult => {
  const p = getPayment(ctx.case.id);
  if (!p) return { error: 'No payment order on this case' };
  const t = tierOf(p, ctx.now);
  if (!t) return { error: 'No approval tier' };
  return 'error' in t ? t : { facts: { tier: tierLabel(t) } };
});
registerEffect('finance.approvePayment', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const p = getPayment(c.id);
  if (!p) return { error: 'No payment order on this case' };
  const t = tierOf(p, ctx.now);
  if (!t) return { error: 'No approval tier' };
  if ('error' in t) return t;
  // The commitment must still cover it as it stands now.
  if (getCommitment(p.commitment)?.state !== 'committed') return { error: `${p.commitmentRef} is no longer open` };
  const proposer = c.pending?.by ?? who(ctx);
  const r = approvePayment(c.id, { ...(proposer.id ? { id: proposer.id } : {}), name: proposer.name }, who(ctx), at(ctx));
  if (fail(r)) return r;
  return { facts: { payment: r.ref, amountMinor: r.amountMinor, tier: tierLabel(t) }, ...('rule' in t ? { rules: [t.rule] } : {}), after: (d?: { id: string }) => { if (d) attachPaymentDecision(c.id, d.id, t); } };
});
registerEffect('finance.execute', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const r = executePayment(c.id, { bankReference: str(c.fields.bankReference), valueDate: str(c.fields.valueDate), amountMinor: int(c.fields.executedMinor) }, who(ctx), at(ctx));
  return fail(r) ? r : { facts: { payment: r.ref, bankReference: r.executed!.bankReference } };
});
registerEffect('finance.reconcile', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const r = reconcilePayment(c.id, { statementReference: str(c.fields.statementReference), amountMinor: int(c.fields.statementMinor) }, who(ctx), at(ctx));
  return fail(r) ? r : { facts: { payment: r.ref, statement: r.reconciled!.statementReference } };
});
registerEffect('finance.rejectPayment', (ctx: EffectContext): EffectResult => { const r = endPayment(ctx.case.id, 'rejected', reasonOf(ctx), who(ctx), at(ctx)); return fail(r) ? r : { facts: { payment: r.ref, state: r.state } }; });
registerEffect('finance.failPayment', (ctx: EffectContext): EffectResult => { const r = endPayment(ctx.case.id, 'failed', reasonOf(ctx), who(ctx), at(ctx)); return fail(r) ? r : { facts: { payment: r.ref, state: r.state } }; });
registerEffect('finance.cancelPayment', (ctx: EffectContext): EffectResult => {
  // A payment order is cancelled only once instructed; before that the case simply ends.
  if (!getPayment(ctx.case.id)) return { facts: { payment: 'none instructed' } };
  const r = endPayment(ctx.case.id, 'cancelled', reasonOf(ctx), who(ctx), at(ctx));
  return fail(r) ? r : { facts: { payment: r.ref, state: r.state } };
});
registerEffect('finance.retryPayment', (ctx: EffectContext): EffectResult => { const r = retryPayment(ctx.case.id, who(ctx)); return fail(r) ? r : { facts: { payment: r.ref, state: r.state } }; });

// ── Effects: cash forecasts ──────────────────────────────────────────────────

const parseLines = (v: unknown): unknown => {
  if (Array.isArray(v)) return v;
  // A typed list, one line per entry: category; amount in minor units; date (optional)
  return str(v).split('\n').map(l => l.split(';').map(x => x.trim())).filter(x => x[0]).map(([category, amount, date]) => ({ category, amountMinor: Number(amount), ...(date ? { date } : {}) }));
};
registerEffect('finance.recordForecast', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = keeper(c);
  if (why) return { error: why };
  const inst = institutionOf(c);
  if (typeof inst !== 'string') return inst;
  const r = submitForecast({ institution: inst, period: str(c.fields.period), currency: currencyOf(c), inflows: parseLines(c.fields.inflows), outflows: parseLines(c.fields.outflows), assumptions: str(c.fields.assumptions), varianceNote: str(c.fields.varianceNote), case: c.id, by: ctx.actor.name, at: at(ctx), ...sample(c) });
  return fail(r) ? r : { facts: { forecast: r.ref, version: r.version, basis: r.basis } };
});
const forecastTo = (state: 'reviewed' | 'returned' | 'closed') => (ctx: EffectContext): EffectResult => {
  const r = reviewForecast(ctx.case.id, state, str(ctx.case.fields.reviewNote) || reasonOf(ctx), who(ctx), at(ctx));
  return fail(r) ? r : { facts: { forecast: r.ref, state: r.state } };
};
registerEffect('finance.reviewForecast', forecastTo('reviewed'));
registerEffect('finance.returnForecast', forecastTo('returned'));
registerEffect('finance.closeForecast', forecastTo('closed'));

// ── Reference procedures ─────────────────────────────────────────────────────

/** A field (administrative unless said otherwise). */
const F = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
/** A field of a payment or payee record: restricted (commercial and financial data). */
const RF = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => F(key, label, type, { personalDataClass: 'restricted', ...extra });
const INSTITUTION = F('institution', 'Institution the record is for (its id in the ministry registry)', 'text', { required: true });
const PERIOD = F('period', 'Budget period (2027, 2027-2028, 2027-Q1)', 'text', { required: true });
const CURRENCY = F('currency', 'Currency (three letters; the nation\'s by default)');
const LAW = [F('lawInstrument', 'The law relied on (its id in the laws register)'), F('lawProvision', 'The provision (its eId, e.g. sec_12)')];
const base = { owner: 'finance', reference: true as const, citations: [], notifications: [], appeal: undefined, retention: 'public-finance-record' };

export const REFERENCE_BUDGET_CIRCULAR: Ref = {
  ...base, key: 'budget.circular', version: 1, title: 'Budget call circular', refPrefix: 'BCC', sensitivity: 'normal',
  fields: [PERIOD, CURRENCY, F('closesOn', 'Submissions close on (the circular\'s own date)', 'date'), F('instructions', 'Instructions to institutions (calendar, classifications, evidence the bids must carry)', 'longtext', { required: true })],
  documents: [{ class: 'circular', label: 'The circular as drafted', required: true }],
  stages: [{ key: 'drafted', label: 'Drafted' }, { key: 'pending-approval', label: 'For issue' }, { key: 'issued', label: 'Issued', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true }],
  actions: [
    { key: 'propose', label: 'Propose the circular for issue', from: ['drafted'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['circular'], fields: ['period', 'instructions'] } },
    { key: 'issue', label: 'Issue the circular', from: ['pending-approval'], to: 'issued', decision: 'issue', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.issueCall'] },
    { key: 'withdraw', label: 'Withdraw the draft, with reasons', from: ['drafted', 'pending-approval'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [],
  tests: [{ name: 'issued', steps: [{ action: 'propose', fields: { period: '2027', instructions: 'Submit bids by programme with costing.' }, documents: ['circular'], expect: 'pending-approval' }, { action: 'issue', expect: 'issued' }] }],
};

export const REFERENCE_BUDGET_CEILING: Ref = {
  ...base, key: 'budget.ceiling', version: 1, title: 'Institutional budget ceiling', refPrefix: 'BCL', sensitivity: 'normal',
  fields: [INSTITUTION, PERIOD, CURRENCY, F('ceilingMinor', 'Proposed ceiling (minor units)', 'number', { required: true }), F('basisNote', 'What the ceiling rests on (the fiscal framework, the institution\'s mandate)', 'longtext', { required: true })],
  documents: [{ class: 'ceiling-analysis', label: 'The analysis behind the ceiling', required: false }],
  stages: [{ key: 'proposed', label: 'Proposed' }, { key: 'pending-approval', label: 'For approval' }, { key: 'approved', label: 'Approved', terminal: true }, { key: 'refused', label: 'Not approved', terminal: true }],
  actions: [
    { key: 'propose', label: 'Propose the ceiling', from: ['proposed'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['institution', 'period', 'ceilingMinor', 'basisNote'] } },
    { key: 'approve', label: 'Approve the ceiling', from: ['pending-approval'], to: 'approved', decision: 'approve', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.setCeiling'] },
    { key: 'refuse', label: 'Do not approve, with reasons', from: ['pending-approval'], to: 'refused', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
  ],
  deadlines: [],
  tests: [{ name: 'approved', steps: [{ action: 'propose', fields: { institution: 'min-health', period: '2027', ceilingMinor: 1, basisNote: 'Fiscal framework' }, expect: 'pending-approval' }, { action: 'approve', expect: 'approved' }] }],
};

export const REFERENCE_BUDGET_BID: Ref = {
  ...base, key: 'budget.bid', version: 1, title: 'Institutional budget bid', refPrefix: 'BBD', sensitivity: 'normal',
  fields: [
    INSTITUTION, PERIOD, CURRENCY,
    F('programme', 'Programme or service the funding is for', 'text', { required: true }),
    F('objective', 'Purpose of the funding request', 'longtext', { required: true }),
    F('requestedMinor', 'Total funding requested (minor units)', 'number', { required: true }),
    F('lateReason', 'Why a bid received after the circular\'s date is accepted (only for a late bid)', 'longtext'),
    F('agreedMinor', 'Outcome of the negotiation (minor units)', 'number', { audience: 'officer' }),
    F('negotiationNote', 'What was agreed and why', 'longtext', { audience: 'officer' }),
    F('allocationMinor', 'Allocation (minor units)', 'number', { audience: 'officer' }),
  ],
  documents: [
    { class: 'bid', label: 'The bid as submitted (signed by the institution)', required: true }, { class: 'costing', label: 'Programme costing', required: false },
    { class: 'justification', label: 'Further justification supplied', required: false }, { class: 'capital-project', label: 'Capital project proposal and appraisal', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'review', label: 'Under review' }, { key: 'awaiting-justification', label: 'Waiting for justification' },
    { key: 'negotiation', label: 'Negotiated' }, { key: 'pending-approval', label: 'Allocation' },
    { key: 'allocated', label: 'Allocated', terminal: true }, { key: 'not-allocated', label: 'Not allocated', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'validate', label: 'Validate against the circular and the ceiling', from: ['submitted'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['bid'], fields: ['institution', 'period', 'programme', 'objective', 'requestedMinor'] }, effects: ['finance.recordBid'] },
    { key: 'request-justification', label: 'Ask the institution for justification', from: ['review'], to: 'awaiting-justification', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'justification-received', label: 'Justification received', from: ['awaiting-justification'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['justification'] } },
    { key: 'revise', label: 'Record the institution\'s revised bid', from: ['review'], to: 'review', needs: { role: 'officer' }, requires: { reasons: true, fields: ['requestedMinor'] }, effects: ['finance.reviseBid'] },
    { key: 'record-negotiation', label: 'Record the negotiation outcome', from: ['review'], to: 'negotiation', needs: { role: 'officer' }, requires: { fields: ['agreedMinor', 'negotiationNote'] }, effects: ['finance.negotiateBid'] },
    { key: 'propose', label: 'Propose the allocation', from: ['negotiation'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['allocationMinor'], reasons: true } },
    { key: 'allocate', label: 'Allocate, within the ceiling', from: ['pending-approval'], to: 'allocated', decision: 'allocate', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.allocateBid'] },
    { key: 'refuse', label: 'Do not allocate, with reasons', from: ['pending-approval'], to: 'not-allocated', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.refuseBid'] },
    { key: 'withdraw', label: 'Record the institution\'s withdrawal', from: ['review', 'awaiting-justification', 'negotiation'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['finance.withdrawBid'] },
  ],
  deadlines: [{ key: 'justification', label: 'Time the institution has to supply justification (the circular\'s calendar)', from: 'awaiting-justification', sampleDays: 10, calendar: 'working', onLapse: 'escalate' }],
  tests: [
    { name: 'allocated', steps: [
      { action: 'validate', fields: { institution: 'min-health', period: '2027', programme: 'Immunisation', objective: 'Fund the national immunisation programme', requestedMinor: 1 }, documents: ['bid'], expect: 'review' },
      { action: 'record-negotiation', fields: { agreedMinor: 1, negotiationNote: 'Agreed' }, expect: 'negotiation' }, { action: 'propose', fields: { allocationMinor: 1 }, expect: 'pending-approval' }, { action: 'allocate', expect: 'allocated' },
    ] },
    { name: 'withdrawn', steps: [{ action: 'validate', fields: { institution: 'min-health', period: '2027', programme: 'P', objective: 'O', requestedMinor: 1 }, documents: ['bid'], expect: 'review' }, { action: 'withdraw', expect: 'withdrawn' }] },
  ],
};

export const REFERENCE_BUDGET_APPROPRIATION: Ref = {
  ...base, key: 'budget.appropriation', version: 1, title: 'Appropriation: allocation, authority validation and release', refPrefix: 'BAP', sensitivity: 'normal',
  fields: [
    INSTITUTION, PERIOD, CURRENCY, ...LAW,
    F('programme', 'Programme the law appropriates for', 'text', { required: true }),
    F('economicCode', 'Economic classification code (the nation\'s chart of accounts)'),
    F('fund', 'Fund (where the nation keeps funds apart)'),
    F('amountMinor', 'Amount appropriated (minor units)', 'number', { required: true }),
    F('bid', 'The allocated bid it comes from (its case reference), where there is one'),
    F('validationNote', 'Authority validation: what was checked (the law in force, the institution\'s authority, the amount)', 'longtext', { audience: 'officer' }),
    F('releaseMinor', 'Amount released for commitment (minor units; the whole appropriation when not given)', 'number', { audience: 'officer' }),
  ],
  documents: [{ class: 'appropriation-act', label: 'The appropriation act or schedule as enacted', required: true }],
  stages: [
    { key: 'enacted', label: 'Enacted appropriation' }, { key: 'allocated', label: 'Allocated' }, { key: 'validated', label: 'Authority validated' }, { key: 'pending-release', label: 'Release' },
    { key: 'released', label: 'Released', terminal: true }, { key: 'not-released', label: 'Not released', terminal: true },
  ],
  actions: [
    { key: 'allocate', label: 'Record the enacted appropriation and its allocation', from: ['enacted'], to: 'allocated', needs: { role: 'officer' }, requires: { documents: ['appropriation-act'], fields: ['institution', 'period', 'programme', 'amountMinor', 'lawInstrument', 'lawProvision'] }, effects: ['finance.enact'] },
    { key: 'validate', label: 'Validate the authority', from: ['allocated'], to: 'validated', needs: { role: 'officer' }, requires: { fields: ['validationNote'] }, effects: ['finance.validateAuthority'] },
    { key: 'propose', label: 'Propose the release', from: ['validated'], to: 'pending-release', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'release', label: 'Release the appropriation, citing the law', from: ['pending-release'], to: 'released', decision: 'release', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, citations: true }, effects: ['finance.release'] },
    { key: 'refuse', label: 'Do not release, with reasons', from: ['pending-release'], to: 'not-released', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.refuseRelease'] },
  ],
  deadlines: [],
  tests: [{ name: 'released', steps: [
    { action: 'allocate', fields: { institution: 'min-health', period: '2027', programme: 'Immunisation', amountMinor: 1, lawInstrument: '/eli/x/act/2027/1', lawProvision: 'sch_1' }, documents: ['appropriation-act'], expect: 'allocated' },
    { action: 'validate', fields: { validationNote: 'Act in force' }, expect: 'validated' }, { action: 'propose', expect: 'pending-release' }, { action: 'release', expect: 'released' },
  ] }],
};

export const REFERENCE_BUDGET_REVISION: Ref = {
  ...base, key: 'budget.revision', version: 1, title: 'Budget revision (reallocation, virement, supplementary, release, reduction)', refPrefix: 'BRV', sensitivity: 'normal',
  fields: [
    F('revisionKind', 'Kind of revision', 'choice', { required: true, options: REVISION_KINDS.map(k => k.key) }),
    F('source', 'Appropriation the money comes from (a transfer only: APP-…)'),
    F('destination', 'Appropriation revised (APP-…)', 'text', { required: true }),
    F('amountMinor', 'Amount (minor units)', 'number', { required: true }),
    F('justification', 'Why the revision is needed and its impact (forecasts, programmes, commitments)', 'longtext', { required: true }),
    ...LAW,
  ],
  documents: [{ class: 'revision-request', label: 'The request as made (signed by the institution)', required: true }, { class: 'supplementary-act', label: 'The supplementary appropriation, where the law requires one', required: false }],
  stages: [
    { key: 'requested', label: 'Requested' }, { key: 'checked', label: 'Source and destination checked' }, { key: 'authority', label: 'Legal authority checked' }, { key: 'pending-approval', label: 'Approval' },
    { key: 'revised', label: 'Allocation revised', terminal: true }, { key: 'refused', label: 'Refused', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Check the source and destination', from: ['requested'], to: 'checked', needs: { role: 'officer' }, requires: { documents: ['revision-request'], fields: ['revisionKind', 'destination', 'amountMinor', 'justification'] }, effects: ['finance.checkRevision'] },
    { key: 'check-authority', label: 'Check the legal authority', from: ['checked'], to: 'authority', needs: { role: 'officer' }, requires: { fields: ['lawInstrument', 'lawProvision'] }, effects: ['finance.checkRevisionAuthority'] },
    { key: 'propose', label: 'Propose the revision', from: ['authority'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'approve', label: 'Approve the revision, citing the law', from: ['pending-approval'], to: 'revised', decision: 'revise', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, citations: true }, effects: ['finance.revise'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['checked', 'authority', 'pending-approval'], to: 'refused', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
  ],
  deadlines: [],
  tests: [{ name: 'revised', steps: [
    { action: 'check', fields: { revisionKind: 'further-release', destination: 'APP-1', amountMinor: 1, justification: 'J' }, documents: ['revision-request'], expect: 'checked' },
    { action: 'check-authority', fields: { lawInstrument: '/eli/x/act/2027/1', lawProvision: 'sec_5' }, expect: 'authority' }, { action: 'propose', expect: 'pending-approval' }, { action: 'approve', expect: 'revised' },
  ] }],
};

export const REFERENCE_COMMITMENT: Ref = {
  ...base, key: 'finance.commitment', version: 1, title: 'Commitment against an appropriation', refPrefix: 'FCM', sensitivity: 'normal',
  fields: [
    INSTITUTION, CURRENCY,
    F('appropriation', 'Appropriation it is committed against (APP-…)', 'text', { required: true }),
    F('supplier', 'Supplier (organisation number on the organisations register)', 'text', { required: true }),
    F('contract', 'Procurement contract it rests on (its number), where there is one'),
    F('description', 'What is committed (goods, works or services)', 'longtext', { required: true }),
    F('amountMinor', 'Amount committed (minor units)', 'number', { required: true }),
  ],
  documents: [{ class: 'commitment-request', label: 'The spending institution\'s signed request', required: true }, { class: 'commitment-evidence', label: 'Order, contract or other evidence of the obligation', required: false }],
  stages: [
    { key: 'proposed', label: 'Proposed' }, { key: 'checked', label: 'Funds checked' }, { key: 'pending-approval', label: 'Approval' }, { key: 'committed', label: 'Committed' },
    { key: 'ended', label: 'Cancelled or closed', terminal: true }, { key: 'refused', label: 'Refused', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Check the appropriation and the supplier', from: ['proposed'], to: 'checked', needs: { role: 'officer' }, requires: { documents: ['commitment-request'], fields: ['institution', 'appropriation', 'supplier', 'description', 'amountMinor'] }, effects: ['finance.checkCommitment'] },
    { key: 'propose', label: 'Propose the commitment', from: ['checked'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'approve', label: 'Approve the commitment', from: ['pending-approval'], to: 'committed', decision: 'commit', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.commit'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['checked', 'pending-approval'], to: 'refused', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'end', label: 'Cancel or close the commitment (the unpaid part returns to the appropriation)', from: ['committed'], to: 'ended', decision: 'withdraw', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.endCommitment'] },
  ],
  deadlines: [],
  tests: [{ name: 'committed', steps: [
    { action: 'check', fields: { institution: 'min-health', appropriation: 'APP-1', supplier: 'ORG-1', description: 'Vaccines', amountMinor: 1 }, documents: ['commitment-request'], expect: 'checked' },
    { action: 'propose', expect: 'pending-approval' }, { action: 'approve', expect: 'committed' }, { action: 'end', expect: 'ended' },
  ] }],
};

export const REFERENCE_PAYEE_ACCOUNT: Ref = {
  ...base, key: 'treasury.payee-account', version: 1, title: 'Payee bank account: request, verification and approval', refPrefix: 'TPA', sensitivity: 'restricted', retention: 'public-finance-record',
  fields: [
    RF('payee', 'Payee (organisation number on the organisations register)', 'text', { required: true }),
    RF('bank', 'Bank (its name or identifier)', 'text', { required: true }),
    RF('accountNumber', 'Account number or IBAN', 'text', { required: true, rules: [{ rule: 'pattern', pattern: 'account-number' }] }),
    RF('changeReason', 'Why the account is given or changed', 'longtext', { required: true }),
    RF('verificationMethod', 'How it was verified (the method the nation approves)', 'text', { audience: 'officer' }),
    RF('verificationNote', 'What the verification found', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'account-request', label: 'The payee\'s signed request', required: true }, { class: 'bank-evidence', label: 'The bank\'s confirmation of the account', required: true }],
  stages: [
    { key: 'requested', label: 'Requested' }, { key: 'recorded', label: 'Recorded (not in force)' }, { key: 'verified', label: 'Verified' }, { key: 'pending-approval', label: 'Approval' },
    { key: 'active', label: 'In force', terminal: true }, { key: 'refused', label: 'Refused', terminal: true },
  ],
  actions: [
    { key: 'record', label: 'Record the request (it does not change where payments go)', from: ['requested'], to: 'recorded', needs: { role: 'officer' }, requires: { documents: ['account-request'], fields: ['payee', 'bank', 'accountNumber', 'changeReason'] }, effects: ['finance.requestPayee'] },
    { key: 'verify', label: 'Verify the account independently', from: ['recorded'], to: 'verified', needs: { role: 'officer', distinctFrom: ['record'] }, requires: { documents: ['bank-evidence'], fields: ['verificationMethod', 'verificationNote'] }, effects: ['finance.verifyPayee'] },
    { key: 'propose', label: 'Propose the account', from: ['verified'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'approve', label: 'Approve: the account is in force from now', from: ['pending-approval'], to: 'active', decision: 'approve-account', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['record', 'verify'] }, requires: { reasons: true }, effects: ['finance.approvePayee'] },
    { key: 'refuse', label: 'Refuse, with reasons', from: ['recorded', 'verified', 'pending-approval'], to: 'refused', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.refusePayee'] },
  ],
  deadlines: [],
  tests: [{ name: 'in force', steps: [
    { action: 'record', fields: { payee: 'ORG-1', bank: 'Bank', accountNumber: 'GB00TEST', changeReason: 'New supplier' }, documents: ['account-request'], expect: 'recorded' },
    { action: 'verify', fields: { verificationMethod: 'call-back', verificationNote: 'Confirmed' }, documents: ['bank-evidence'], expect: 'verified' }, { action: 'propose', expect: 'pending-approval' }, { action: 'approve', expect: 'active' },
  ] }],
};

export const REFERENCE_PAYMENT: Ref = {
  ...base, key: 'treasury.payment', version: 1, title: 'Government payment: verification, approval, execution and reconciliation', refPrefix: 'TPO', sensitivity: 'restricted',
  fields: [
    INSTITUTION,
    RF('commitment', 'Commitment it pays (COM-…)', 'text', { required: true }),
    RF('invoiceRef', 'Invoice reference', 'text', { required: true }),
    RF('invoiceDate', 'Invoice date', 'date', { required: true }),
    RF('invoiceMinor', 'Invoice amount (minor units)', 'number', { required: true }),
    RF('amountMinor', 'Payment amount (minor units; at most the invoice and what is left on the commitment)', 'number', { required: true }),
    RF('purpose', 'Payment purpose', 'text', { required: true }),
    RF('verificationNote', 'Verification: what was checked', 'longtext', { audience: 'officer' }),
    RF('bankReference', 'The bank\'s transaction reference', 'text', { audience: 'officer' }),
    RF('valueDate', 'Value date', 'date', { audience: 'officer' }),
    RF('executedMinor', 'Amount the bank confirms (minor units)', 'number', { audience: 'officer' }),
    RF('statementReference', 'Bank statement line reference', 'text', { audience: 'officer' }),
    RF('statementMinor', 'Amount on the statement (minor units)', 'number', { audience: 'officer' }),
  ],
  documents: [{ class: 'invoice', label: 'The invoice', required: true }, { class: 'payment-evidence', label: 'Supporting payment evidence', required: false }, { class: 'bank-confirmation', label: 'The bank\'s confirmation', required: false }, { class: 'statement', label: 'The bank statement extract', required: false }],
  stages: [
    { key: 'obligation', label: 'Obligation received' }, { key: 'validated', label: 'Invoice validated' }, { key: 'checked', label: 'Commitment checked' }, { key: 'instructed', label: 'Payment instructed' },
    { key: 'verified', label: 'Verified' }, { key: 'pending-approval', label: 'Approval' }, { key: 'approved', label: 'Approved' }, { key: 'failed', label: 'Execution failed' },
    { key: 'executed', label: 'Executed (bank confirmed)' }, { key: 'reconciled', label: 'Reconciled', terminal: true },
    { key: 'returned', label: 'Returned for correction' }, { key: 'rejected', label: 'Rejected', terminal: true }, { key: 'cancelled', label: 'Cancelled', terminal: true },
  ],
  actions: [
    { key: 'validate-invoice', label: 'Validate the invoice against the commitment', from: ['obligation'], to: 'validated', needs: { role: 'officer' }, requires: { documents: ['invoice'], fields: ['institution', 'commitment', 'invoiceRef', 'invoiceDate', 'invoiceMinor', 'amountMinor', 'purpose'] }, effects: ['finance.validateInvoice'] },
    { key: 'return', label: 'Return for correction, with reasons', from: ['validated', 'checked'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'resubmit', label: 'Corrected obligation received', from: ['returned'], to: 'obligation', needs: { role: 'officer' } },
    { key: 'check-commitment', label: 'Check the commitment covers it', from: ['validated'], to: 'checked', needs: { role: 'officer' }, effects: ['finance.checkFunds'] },
    { key: 'instruct', label: 'Instruct the payment', from: ['checked'], to: 'instructed', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['finance.instruct'] },
    { key: 'verify', label: 'Verify the payment', from: ['instructed'], to: 'verified', needs: { role: 'officer', distinctFrom: ['instruct'] }, requires: { fields: ['verificationNote'] }, effects: ['finance.verifyPayment'] },
    { key: 'propose', label: 'Propose for approval (the approval tier read from the approved rule)', from: ['verified'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['finance.checkTier'] },
    { key: 'approve', label: 'Approve the payment', from: ['pending-approval'], to: 'approved', decision: 'approve-payment', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['instruct', 'verify'] }, requires: { reasons: true }, effects: ['finance.approvePayment'] },
    { key: 'reject', label: 'Reject, with reasons', from: ['pending-approval'], to: 'rejected', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['finance.rejectPayment'] },
    { key: 'execute', label: 'Record the bank\'s execution', from: ['approved'], to: 'executed', needs: { role: 'officer', distinctFrom: ['instruct', 'approve'] }, requires: { fields: ['bankReference', 'valueDate', 'executedMinor'], documents: ['bank-confirmation'] }, effects: ['finance.execute'] },
    { key: 'fail', label: 'Record a failed execution, with reasons', from: ['approved'], to: 'failed', needs: { role: 'officer', distinctFrom: ['instruct', 'approve'] }, requires: { reasons: true }, effects: ['finance.failPayment'] },
    { key: 'retry', label: 'Send the approved payment to the bank again', from: ['failed'], to: 'approved', needs: { role: 'officer', distinctFrom: ['instruct', 'approve'] }, requires: { reasons: true }, effects: ['finance.retryPayment'] },
    { key: 'reconcile', label: 'Reconcile against the bank statement', from: ['executed'], to: 'reconciled', needs: { role: 'officer', distinctFrom: ['instruct', 'approve', 'execute'] }, requires: { fields: ['statementReference', 'statementMinor'], documents: ['statement'] }, effects: ['finance.reconcile'] },
    { key: 'cancel', label: 'Cancel the payment order, with reasons', from: ['obligation', 'returned', 'instructed', 'verified'], to: 'cancelled', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['finance.cancelPayment'] },
  ],
  deadlines: [{ key: 'payment', label: 'Time within which an approved obligation is paid (the nation\'s payment rule)', from: 'approved', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
  tests: [{ name: 'paid and reconciled', steps: [
    { action: 'validate-invoice', fields: { institution: 'min-health', commitment: 'COM-1', invoiceRef: 'INV-1', invoiceDate: '2027-02-01', invoiceMinor: 1, amountMinor: 1, purpose: 'Goods' }, documents: ['invoice'], expect: 'validated' },
    { action: 'check-commitment', expect: 'checked' }, { action: 'instruct', expect: 'instructed' }, { action: 'verify', fields: { verificationNote: 'Checked' }, expect: 'verified' },
    { action: 'propose', expect: 'pending-approval' }, { action: 'approve', expect: 'approved' },
    { action: 'execute', fields: { bankReference: 'B1', valueDate: '2027-02-10', executedMinor: 1 }, documents: ['bank-confirmation'], expect: 'executed' },
    { action: 'reconcile', fields: { statementReference: 'S1', statementMinor: 1 }, documents: ['statement'], expect: 'reconciled' },
  ] }],
};

export const REFERENCE_CASH_FORECAST: Ref = {
  ...base, key: 'treasury.cash-forecast', version: 1, title: 'Institutional cash forecast', refPrefix: 'TCF', sensitivity: 'normal',
  fields: [
    INSTITUTION, CURRENCY,
    F('period', 'Forecast period (2027, 2027-03 or 2027-Q1)', 'text', { required: true }),
    F('inflows', 'Expected inflows: one line each, "category; amount in minor units; date (optional)"', 'longtext'),
    F('outflows', 'Expected outflows: one line each, "category; amount in minor units; date (optional)"', 'longtext'),
    F('assumptions', 'Assumptions the forecast rests on', 'longtext', { required: true }),
    F('varianceNote', 'For a revision: the variance from the earlier version, explained', 'longtext'),
    F('reviewNote', 'Review: assumptions and variance considered', 'longtext', { audience: 'officer' }),
  ],
  documents: [{ class: 'forecast', label: 'The forecast as reported', required: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'recorded', label: 'Recorded' }, { key: 'reviewed', label: 'Reviewed' }, { key: 'returned', label: 'Returned', terminal: true }, { key: 'closed', label: 'Period closed', terminal: true }],
  actions: [
    { key: 'record', label: 'Record the forecast', from: ['submitted'], to: 'recorded', needs: { role: 'officer' }, requires: { documents: ['forecast'], fields: ['institution', 'period', 'assumptions'] }, effects: ['finance.recordForecast'] },
    { key: 'review', label: 'Review the assumptions and variance', from: ['recorded'], to: 'reviewed', needs: { role: 'officer', distinctFrom: ['record'] }, requires: { fields: ['reviewNote'] }, effects: ['finance.reviewForecast'] },
    { key: 'return', label: 'Return to the institution, with reasons', from: ['recorded'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['finance.returnForecast'] },
    { key: 'close', label: 'Close the forecasting period', from: ['reviewed'], to: 'closed', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['finance.closeForecast'] },
  ],
  deadlines: [],
  tests: [{ name: 'reviewed and closed', steps: [{ action: 'record', fields: { institution: 'min-health', period: '2027-Q1', assumptions: 'A' }, documents: ['forecast'], expect: 'recorded' }, { action: 'review', fields: { reviewNote: 'R' }, expect: 'reviewed' }, { action: 'close', expect: 'closed' }] }],
};

/** The budget and treasury procedures (plan step I5). */
export const FINANCE_PROCEDURES: Ref[] = [REFERENCE_BUDGET_CIRCULAR, REFERENCE_BUDGET_CEILING, REFERENCE_BUDGET_BID, REFERENCE_BUDGET_APPROPRIATION, REFERENCE_BUDGET_REVISION, REFERENCE_COMMITMENT, REFERENCE_PAYEE_ACCOUNT, REFERENCE_PAYMENT, REFERENCE_CASH_FORECAST];

export function installFinanceProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of FINANCE_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}

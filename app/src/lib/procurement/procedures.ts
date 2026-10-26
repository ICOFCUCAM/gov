// Public procurement on the workflow foundation (plan step I5; institutional
// specification Part 1 §9; field series Part 3 §3.5). Templates each
// procuring institution adopts as its own (`proc.<template>.<institution>`,
// drafted on request like the internal administration procedures, approved
// there by a second official): each institution keeps and decides its own
// procurement (spec Part 4 §D, Procurement). The review of complaints is the
// review body's own procedure, never the procuring institution's.
//
//   proc.plan                 procurement plan item: recorded → budget confirmed against an appropriation of
//                             the institution (lib/finance) → method checked against the approved thresholds
//                             → approved by two officials → published (ADM-PRC-018; procurement.plan.*,
//                             procurement.method.*)
//   proc.tender               tender: prepared → legal review → published by two officials (version and
//                             criteria fixed; addenda only before the deadline) → submissions closed →
//                             committee appointed → bids opened together by two members (sealed until then;
//                             late bids recorded, never opened) → evaluated by two members who declared their
//                             interests (reasons for every result; a recommendation, never a score that
//                             decides) → award by two officials who did not evaluate → standstill (the
//                             nation's period) → contract signed, unless a challenge is open
//                             (ADM-PRC-019, ADM-PRC-020; procurement.tender.*, bid.*, evaluation.*, award.*)
//   proc.contract-variation   variation: requested → assessed → legal review → approved by two officials: a new
//                             version of the contract, the executed one kept (procurement.contract.variation.*)
//   proc.contract-delivery    deliverable → inspection → acceptance by an official who can sign → payment
//                             certification by a different person (never payment execution: the treasury pays
//                             through treasury.payment, which reads the certification)
//   procurement-review.complaint  the review body's complaint: lodged → completeness → response from the procuring
//                             institution → review → interim measure where the law allows → decision by two of
//                             its officials (procurement.complaint.*); its records are the review body's
//
// Every decision is classified (lib/permits/decisions.ts): the procuring
// institution's under proposed mappings whose lead is "the procuring entity"
// (each institution for its own procurement), the review body's under its own
// slot; none approved. No threshold, method list, period or standstill ships.

import { registerEffect, registeredEffects, sampleMark, type EffectContext, type EffectResult } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { accountById } from '@/lib/auth/officials';
import { samplesAllowed } from '@/lib/ops/mode';
import { tierFor } from '@/lib/law/rules';
import { nationCurrency } from '@/lib/nation/registry';
import { getAppropriation, balanceOf } from '@/lib/finance/register';
import {
  recordPlanItem, confirmPlanBudget, setPlanMethodRule, setPlanState, getPlanItem, prepareTender, parseCriteria, publishTender, attachTenderDecision, addAddendum,
  closeSubmissions, appointCommittee, openBids, parseResults, recordEvaluation, awardTender, cancelTender, signContract, getTender, getContract, varyContract,
  attachContractDecision, submitDeliverable, decideDeliverable, certifyPayment, lodgeChallenge, interimMeasure, decideChallenge, mayEvaluate, type Who,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);
const fail = <T extends object>(x: T | { error: string }): x is { error: string } => 'error' in x;
const who = (ctx: EffectContext): Who => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name });
const at = (ctx: EffectContext) => ctx.now.toISOString();
const reasonOf = (ctx: EffectContext) => ctx.case.pending?.reason ?? ctx.case.history[ctx.case.history.length - 1]?.reason ?? `${ctx.action.label} (${ctx.case.ref})`;
/** The officials of a two-official step: the proposer and the official confirming now. */
const pair = (ctx: EffectContext): Who[] => [...(ctx.case.pending ? [{ ...(ctx.case.pending.by.id ? { id: ctx.case.pending.by.id } : {}), name: ctx.case.pending.by.name }] : []), who(ctx)];

/** The mapping lead that stands for "the institution conducting this procurement" (resolved to the case's own institution). */
export const PROCURING_ENTITY = 'procuring-entity';
/** The permit type each procurement procedure's decisions rest on (template prefix → permit type; proposed, unapproved). */
export const PROCUREMENT_PERMITS: Record<string, string> = {
  'proc.plan': 'procurement-plan', 'proc.tender': 'procurement-award', 'proc.contract-variation': 'procurement-contract', 'proc.contract-delivery': 'procurement-contract',
  'procurement-review.complaint': 'procurement-review-decision',
};
/** The approved rule that sets which methods a value allows (a `tiers` rule, lib/law/rules.ts): shipped unset. */
export const METHOD_THRESHOLDS_RULE = 'procurement.method-thresholds';

/** The officials a form names by account id: active accounts of this institution. */
function officialsOf(c: Case, v: unknown, what: string): Who[] | { error: string } {
  const list = (Array.isArray(v) ? v.map(String) : str(v).split(/[,;\s]+/)).map(x => x.trim()).filter(Boolean).slice(0, 20);
  const out: Who[] = [];
  for (const id of list) {
    const a = accountById(id.replace(/^local:/, ''));
    if (!a || a.disabled) return { error: `${what}: no active official account ${id}` };
    if (a.institution !== c.owner) return { error: `${what}: ${a.name} is not an official of this institution` };
    out.push({ id: `local:${a.id}`, name: a.name });
  }
  return out;
}

// ── Effects: plans ───────────────────────────────────────────────────────────

registerEffect('proc.recordPlan', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const r = recordPlanItem({ institution: c.owner, period: str(c.fields.period), description: str(c.fields.description), category: str(c.fields.category), estimatedMinor: int(c.fields.estimatedMinor),
    currency: str(c.fields.currency).toUpperCase() || nationCurrency(), method: str(c.fields.method), methodJustification: str(c.fields.methodJustification), case: c.id, by: ctx.actor.name, at: at(ctx), ...sampleMark(c) });
  return fail(r) ? r : { facts: { planItem: r.ref } };
});
registerEffect('proc.confirmBudget', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const p = getPlanItem(c.id);
  if (!p) return { error: 'The plan item is recorded first' };
  const a = getAppropriation(str(c.fields.appropriation));
  if (!a) return { error: `No appropriation ${str(c.fields.appropriation) || '(none given)'}: a procurement is planned against the institution's budget (lib/finance)` };
  if (a.institution !== c.owner) return { error: `${a.ref} is appropriated to another institution` };
  if (a.currency !== p.currency) return { error: `${a.ref} is in ${a.currency}` };
  const b = balanceOf(a.id)!;
  if (a.state !== 'released' && !samplesAllowed()) return { error: `${a.ref} is not released: funding is confirmed against a released appropriation` };
  const r = confirmPlanBudget(c.id, { appropriation: a.reference, availableMinor: b.availableMinor }, ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { appropriation: a.ref, availableMinor: b.availableMinor, covers: b.availableMinor >= p.estimatedMinor } };
});
registerEffect('proc.checkMethod', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const p = getPlanItem(c.id);
  if (!p) return { error: 'The plan item is recorded first' };
  const t = tierFor(METHOD_THRESHOLDS_RULE, p.estimatedMinor, ctx.now.toISOString().slice(0, 10));
  if ('error' in t) {
    if (!samplesAllowed()) return { error: `${t.error}: a production installation authorises no method without the nation's thresholds (${METHOD_THRESHOLDS_RULE})` };
    const r = setPlanMethodRule(c.id, { none: 'No approved method thresholds: a demonstration or training installation only' }, ctx.actor.name);
    return fail(r) ? r : { facts: { method: p.method, thresholds: 'none (demonstration)' } };
  }
  if (t.allows && !t.allows.includes(p.method)) return { error: `For this value (tier ${t.tier}) the approved thresholds allow ${t.allows.join(', ')}: not ${p.method}` };
  if (p.method !== (t.allows?.[0] ?? p.method) && !p.methodJustification) return { error: 'This method needs the justification the rules ask for' };
  const r = setPlanMethodRule(c.id, { tier: t.tier, ...(t.allows ? { allows: t.allows } : {}), rule: { key: t.rule.key, version: t.rule.version, digest: t.rule.digest } }, ctx.actor.name);
  return fail(r) ? r : { facts: { method: p.method, tier: t.tier } };
});
registerEffect('proc.approvePlan', (ctx: EffectContext): EffectResult => {
  const p = getPlanItem(ctx.case.id);
  if (!p?.budget || !p.methodRule) return { error: 'The budget is confirmed and the method checked before approval' };
  const rule = 'rule' in p.methodRule ? p.methodRule.rule : undefined;
  const r = setPlanState(ctx.case.id, 'approved', ctx.actor.name);
  return fail(r) ? r : { facts: { planItem: r.ref, method: r.method }, ...(rule ? { rules: [rule] } : {}), after: (d?: { id: string }) => { if (d) setPlanState(ctx.case.id, 'approved', ctx.actor.name, d.id); } };
});
registerEffect('proc.publishPlan', (ctx: EffectContext): EffectResult => { const r = setPlanState(ctx.case.id, 'published', ctx.actor.name); return fail(r) ? r : { facts: { planItem: r.ref, published: true } }; });
registerEffect('proc.cancelPlan', (ctx: EffectContext): EffectResult => { const r = setPlanState(ctx.case.id, 'cancelled', ctx.actor.name); return fail(r) ? r : { facts: { planItem: r.ref, state: r.state } }; });

// ── Effects: tenders ─────────────────────────────────────────────────────────

registerEffect('proc.prepareTender', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const criteria = parseCriteria(c.fields.criteria);
  if (fail(criteria)) return criteria;
  const r = prepareTender({ planItem: str(c.fields.planItem), institution: c.owner, title: str(c.fields.title), scope: str(c.fields.scope), criteria, deadline: str(c.fields.deadline), case: c.id, by: ctx.actor.name, at: at(ctx), ...sampleMark(c) });
  return fail(r) ? r : { facts: { tender: r.ref, criteria: r.versions[0]!.criteriaDigest.slice(0, 16) } };
});
const decisionAfter = (c: Case) => (d?: { id: string }) => { if (d) attachTenderDecision(c.id, d.id); };
registerEffect('proc.publishTender', (ctx: EffectContext): EffectResult => {
  const r = publishTender(ctx.case.id, ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { tender: r.ref, deadline: r.versions[r.versions.length - 1]!.deadline }, after: decisionAfter(ctx.case) };
});
registerEffect('proc.addendum', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const criteria = str(c.fields.addendumCriteria) ? parseCriteria(c.fields.addendumCriteria) : undefined;
  if (criteria && fail(criteria)) return criteria;
  const r = addAddendum(c.id, { reason: str(c.fields.addendumReason) || reasonOf(ctx), ...(str(c.fields.addendumScope) ? { scope: str(c.fields.addendumScope) } : {}), ...(criteria ? { criteria } : {}), ...(str(c.fields.addendumDeadline) ? { deadline: str(c.fields.addendumDeadline) } : {}), case: c.id, by: ctx.actor.name, at: at(ctx) });
  return fail(r) ? r : { facts: { tender: r.ref, version: r.versions.length } };
});
registerEffect('proc.closeSubmissions', (ctx: EffectContext): EffectResult => { const r = closeSubmissions(ctx.case.id, ctx.actor.name, at(ctx)); return fail(r) ? r : { facts: { tender: r.ref, closed: true } }; });
registerEffect('proc.appointCommittee', (ctx: EffectContext): EffectResult => {
  const members = officialsOf(ctx.case, ctx.case.fields.committeeMembers, 'Committee');
  if (fail(members)) return members;
  const r = appointCommittee(ctx.case.id, members, who(ctx), at(ctx));
  return fail(r) ? r : { facts: { tender: r.ref, members: r.committee!.members.length } };
});
registerEffect('proc.openBids', (ctx: EffectContext): EffectResult => {
  const r = openBids(ctx.case.id, pair(ctx), str(ctx.case.fields.openingRecord) || reasonOf(ctx), at(ctx));
  return fail(r) ? r : { facts: { tender: r.ref, opened: r.opening!.opened.length, late: r.opening!.late.length } };
});
registerEffect('proc.checkEvaluator', (ctx: EffectContext): EffectResult => {
  const t = getTender(ctx.case.id);
  if (!t) return { error: 'No tender on this case' };
  const why = mayEvaluate(t, who(ctx));
  return why ? { error: why } : {};
});
registerEffect('proc.evaluate', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const results = parseResults(c.fields.results);
  if (fail(results)) return results;
  const r = recordEvaluation(c.id, { results, recommendation: { bid: str(c.fields.recommendedBid), reasons: str(c.fields.recommendationReasons) }, by: pair(ctx), at: at(ctx) });
  return fail(r) ? r : { facts: { tender: r.ref, recommended: r.evaluation!.recommendation.bid } };
});
registerEffect('proc.award', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const [proposer, confirmer] = pair(ctx);
  const r = awardTender(c.id, { bid: str(c.fields.awardBid) || getTender(c.id)?.evaluation?.recommendation.bid || '', reasons: reasonOf(ctx), departure: str(c.fields.departureReasons), by: proposer!, ...(confirmer ? { confirmedBy: confirmer } : {}), at: at(ctx) });
  return fail(r) ? r : { facts: { tender: r.ref, bid: r.award!.bid, supplier: r.award!.supplier.number, valueMinor: r.award!.valueMinor }, after: decisionAfter(c) };
});
registerEffect('proc.signContract', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  // The standstill (the nation's period, a deadline of this procedure) must have run.
  const stand = c.deadlines.find(d => d.key === 'standstill' && !d.met);
  if (stand && Date.parse(stand.due) > ctx.now.getTime()) return { error: `The standstill period runs until ${stand.due.slice(0, 10)}: no contract before then` };
  const r = signContract(c.id, { terms: str(c.fields.contractTerms), by: ctx.actor.name, at: at(ctx), ...sampleMark(c) });
  return fail(r) ? r : { facts: { contract: r.ref, valueMinor: r.versions[0]!.valueMinor } };
});
registerEffect('proc.cancelTender', (ctx: EffectContext): EffectResult => {
  const r = cancelTender(ctx.case.id, reasonOf(ctx), ctx.actor.name, at(ctx));
  return fail(r) ? r : { facts: { tender: r.ref, state: r.state }, after: decisionAfter(ctx.case) };
});

// ── Effects: contracts ───────────────────────────────────────────────────────

const ownContract = (c: Case) => {
  const k = getContract(str(c.fields.contract));
  if (!k) return { error: `No contract ${str(c.fields.contract) || '(none given)'}` };
  if (k.institution !== c.owner) return { error: `${k.ref} is another institution's contract` };
  return k;
};
registerEffect('proc.checkVariation', (ctx: EffectContext): EffectResult => {
  const k = ownContract(ctx.case);
  if (fail(k)) return k;
  if (!Number.isInteger(int(ctx.case.fields.newValueMinor)) || int(ctx.case.fields.newValueMinor) <= 0) return { error: 'Give the contract value after the variation (minor units)' };
  return { facts: { contract: k.ref, from: k.versions[k.versions.length - 1]!.valueMinor, to: int(ctx.case.fields.newValueMinor) } };
});
registerEffect('proc.vary', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const k = ownContract(c);
  if (fail(k)) return k;
  const r = varyContract(k.ref, { valueMinor: int(c.fields.newValueMinor), terms: str(c.fields.proposedTerms), reasons: reasonOf(ctx), case: c.id, by: ctx.actor.name, at: at(ctx) });
  return fail(r) ? r : { facts: { contract: r.ref, version: r.versions.length, valueMinor: int(c.fields.newValueMinor) }, after: (d?: { id: string }) => { if (d) attachContractDecision(r.ref, c.id, d.id); } };
});
registerEffect('proc.receiveDeliverable', (ctx: EffectContext): EffectResult => {
  const k = ownContract(ctx.case);
  if (fail(k)) return k;
  if (getContract(k.ref)!.deliverables.some(d => d.description === str(ctx.case.fields.deliverable) && !d.rejected)) return { error: 'That deliverable is already recorded' };
  const r = submitDeliverable(k.ref, str(ctx.case.fields.deliverable), at(ctx), ctx.actor.name);
  return fail(r) ? r : { facts: { contract: k.ref, deliverable: r.id } };
});
const deliverableOf = (c: Case) => { const k = getContract(str(c.fields.contract)); return k?.deliverables.filter(d => d.description === str(c.fields.deliverable)).pop(); };
registerEffect('proc.acceptDeliverable', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const d = deliverableOf(c);
  if (!d) return { error: 'The deliverable is recorded first' };
  const r = decideDeliverable(str(c.fields.contract), d.id, true, str(c.fields.inspectionFindings) || reasonOf(ctx), who(ctx), c.id, at(ctx));
  return fail(r) ? r : { facts: { deliverable: r.id, accepted: true }, after: (x?: { id: string }) => { if (x) attachContractDecision(str(c.fields.contract), c.id, x.id); } };
});
registerEffect('proc.rejectDeliverable', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const d = deliverableOf(c);
  if (!d) return { error: 'The deliverable is recorded first' };
  const r = decideDeliverable(str(c.fields.contract), d.id, false, reasonOf(ctx), who(ctx), c.id, at(ctx));
  return fail(r) ? r : { facts: { deliverable: r.id, accepted: false } };
});
registerEffect('proc.certify', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const d = deliverableOf(c);
  if (!d) return { error: 'The deliverable is recorded first' };
  const r = certifyPayment(str(c.fields.contract), { deliverable: d.id, invoiceRef: str(c.fields.invoiceRef), amountMinor: int(c.fields.certifiedMinor), by: who(ctx), case: c.id, at: at(ctx) });
  return fail(r) ? r : { facts: { certification: r.ref, invoice: r.invoiceRef, amountMinor: r.amountMinor } };
});

// ── Effects: the review body's complaint ─────────────────────────────────────

const reviewBody = (c: Case): string | null => (authorityFor('procurementReview') === c.owner ? null : 'Procurement complaints are decided by the review body named under Who is responsible, never by the procuring institution');
registerEffect('review.lodge', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = reviewBody(c);
  if (why) return { error: why };
  const t = getTender(str(c.fields.tender));
  if (!t) return { error: `No tender ${str(c.fields.tender) || '(none given)'}` };
  if (t.institution === c.owner) return { error: 'The review body does not review its own procurement' };
  const r = lodgeChallenge(t.ref, { case: c.id, ref: c.ref, body: c.owner, at: at(ctx) });
  return fail(r) ? r : { facts: { tender: t.ref, procuringInstitution: getMinistry(t.institution)?.name ?? t.institution } };
});
registerEffect('review.interim', (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = reviewBody(c);
  if (why) return { error: why };
  const r = interimMeasure(str(c.fields.tender), c.id, str(c.fields.interimMeasure) || reasonOf(ctx), at(ctx), ctx.actor.name);
  return fail(r) ? r : { facts: { tender: r.ref, interim: str(c.fields.interimMeasure) } };
});
const decide = (result: 'upheld' | 'dismissed' | 'not-admitted') => (ctx: EffectContext): EffectResult => {
  const c = ctx.case;
  const why = reviewBody(c);
  if (why) return { error: why };
  const r = decideChallenge(str(c.fields.tender), c.id, result, str(c.fields.remedy), at(ctx), ctx.actor.name);
  return fail(r) ? r : { facts: { tender: r.ref, result } };
};
registerEffect('review.uphold', decide('upheld'));
registerEffect('review.dismiss', decide('dismissed'));
registerEffect('review.notAdmitted', decide('not-admitted'));

// ── Templates and the review procedure ───────────────────────────────────────

const F = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const RF = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => F(key, label, type, { personalDataClass: 'restricted', ...extra });
const base = { owner: 'institution', reference: true as const, citations: [], notifications: [], retention: 'procurement-record' };

/** The procurement templates each procuring institution adopts as its own, with the catalogue forms each carries. */
export const PROCUREMENT_PROCEDURES: (Ref & { forms: string[] })[] = [
  {
    ...base, key: 'proc.plan', version: 1, title: 'Procurement plan item', refPrefix: 'PPL', sensitivity: 'normal', forms: ['ADM-PRC-018'],
    fields: [
      F('period', 'Planning period (2027, 2027-2028, 2027-Q1)', 'text', { required: true }),
      F('description', 'What is to be bought (goods, services or works), without naming a preferred supplier', 'longtext', { required: true }),
      F('category', 'Procurement category (as the nation\'s list names it)', 'text', { required: true }),
      F('estimatedMinor', 'Estimated value (minor units): an estimate, not an award or a payment', 'number', { required: true }),
      F('currency', 'Currency (three letters; the nation\'s by default)'),
      F('method', 'Proposed procurement method (as the nation\'s list names it)', 'text', { required: true }),
      F('methodJustification', 'Why this method, where the rules require a justification', 'longtext'),
      F('appropriation', 'Appropriation that funds it (APP-…)', 'text'),
    ],
    documents: [{ class: 'requisition', label: 'The requisition or need statement', required: true }, { class: 'market-analysis', label: 'Market analysis', required: false }],
    stages: [
      { key: 'drafted', label: 'Drafted' }, { key: 'recorded', label: 'Recorded' }, { key: 'budget-confirmed', label: 'Budget confirmed' }, { key: 'method-checked', label: 'Method checked' },
      { key: 'pending-approval', label: 'Approval' }, { key: 'approved', label: 'Approved' }, { key: 'published', label: 'Published', terminal: true }, { key: 'cancelled', label: 'Cancelled', terminal: true },
    ],
    actions: [
      { key: 'record', label: 'Record the plan item', from: ['drafted'], to: 'recorded', needs: { role: 'officer' }, requires: { documents: ['requisition'], fields: ['period', 'description', 'category', 'estimatedMinor', 'method'] }, effects: ['proc.recordPlan'] },
      { key: 'confirm-budget', label: 'Confirm the funding against an appropriation', from: ['recorded'], to: 'budget-confirmed', needs: { role: 'officer' }, requires: { fields: ['appropriation'] }, effects: ['proc.confirmBudget'] },
      { key: 'check-method', label: 'Check the method against the approved thresholds', from: ['budget-confirmed'], to: 'method-checked', needs: { role: 'officer' }, effects: ['proc.checkMethod'] },
      { key: 'propose', label: 'Propose for approval', from: ['method-checked'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
      { key: 'approve', label: 'Approve the plan item and its method', from: ['pending-approval'], to: 'approved', decision: 'approve-plan', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['proc.approvePlan'] },
      { key: 'publish', label: 'Publish the approved plan item', from: ['approved'], to: 'published', needs: { role: 'officer' }, effects: ['proc.publishPlan'] },
      { key: 'cancel', label: 'Cancel the planned procurement, with reasons', from: ['recorded', 'budget-confirmed', 'method-checked', 'pending-approval', 'approved'], to: 'cancelled', decision: 'withdraw', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['proc.cancelPlan'] },
    ],
    deadlines: [],
    tests: [{ name: 'approved and published', steps: [
      { action: 'record', fields: { period: '2027', description: 'Cold-chain refrigerators', category: 'goods', estimatedMinor: 1, method: 'open' }, documents: ['requisition'], expect: 'recorded' },
      { action: 'confirm-budget', fields: { appropriation: 'APP-1' }, expect: 'budget-confirmed' }, { action: 'check-method', expect: 'method-checked' },
      { action: 'propose', expect: 'pending-approval' }, { action: 'approve', expect: 'approved' }, { action: 'publish', expect: 'published' },
    ] }],
  },
  {
    ...base, key: 'proc.tender', version: 1, title: 'Tender: publication, sealed bids, opening, evaluation, award and contract', refPrefix: 'PTN', sensitivity: 'restricted', forms: ['ADM-PRC-019', 'ADM-PRC-020'],
    fields: [
      F('planItem', 'Approved plan item (PPL-…)', 'text', { required: true }),
      F('title', 'Tender title', 'text', { required: true }),
      F('scope', 'Scope: what is required, technical specification and contract terms in summary', 'longtext', { required: true }),
      F('criteria', 'Evaluation criteria, one per line: "id; description; pass-fail or scored; weight (scored only)"', 'longtext', { required: true }),
      F('deadline', 'Submission deadline (date and time, as published)', 'text', { required: true }),
      F('legalReview', 'Legal review of the solicitation: what was checked, with reasons', 'longtext', { audience: 'officer' }),
      F('addendumReason', 'Why the tender is corrected (an addendum)', 'longtext', { audience: 'officer' }),
      F('addendumScope', 'Corrected scope (an addendum)', 'longtext', { audience: 'officer' }),
      F('addendumCriteria', 'Corrected criteria (an addendum, before the deadline only)', 'longtext', { audience: 'officer' }),
      F('addendumDeadline', 'Extended deadline (an addendum; never earlier)', 'text', { audience: 'officer' }),
      F('committeeMembers', 'Evaluation committee: official account ids, separated by commas', 'text', { audience: 'officer' }),
      F('openingRecord', 'Opening record: who was present, what was read out', 'longtext', { audience: 'officer' }),
      RF('results', 'Evaluation results, one per line: "bid; criterion; meets, does-not-meet or a score; evidence; reasons"', 'longtext', { audience: 'officer' }),
      RF('recommendedBid', 'Recommended bid (BID-…)', 'text', { audience: 'officer' }),
      RF('recommendationReasons', 'Reasons for the recommendation', 'longtext', { audience: 'officer' }),
      RF('awardBid', 'Bid awarded (the recommended one unless stated)', 'text', { audience: 'officer' }),
      RF('departureReasons', 'Why the recommendation is not followed (only when it is not)', 'longtext', { audience: 'officer' }),
      RF('contractTerms', 'Contract terms as executed', 'longtext', { audience: 'officer' }),
    ],
    documents: [
      { class: 'tender-documents', label: 'The solicitation documents', required: true }, { class: 'legal-review', label: 'Legal review', required: false },
      { class: 'addendum', label: 'An addendum as published', required: false }, { class: 'opening-record', label: 'The signed opening record', required: false },
      { class: 'evaluation-report', label: 'The evaluation report', required: false }, { class: 'award-notice', label: 'The award notice', required: false }, { class: 'contract', label: 'The executed contract', required: false },
    ],
    stages: [
      { key: 'prepared', label: 'Prepared' }, { key: 'legal-review', label: 'Legal review' }, { key: 'pending-publication', label: 'For publication' }, { key: 'published', label: 'Open for bids' },
      { key: 'closed', label: 'Submissions closed' }, { key: 'committee', label: 'Committee appointed' }, { key: 'opened', label: 'Bids opened' }, { key: 'evaluated', label: 'Evaluated' },
      { key: 'pending-award', label: 'Award decision' }, { key: 'standstill', label: 'Standstill' }, { key: 'contracted', label: 'Contract signed', terminal: true }, { key: 'cancelled', label: 'Cancelled', terminal: true },
    ],
    actions: [
      { key: 'prepare', label: 'Record the tender and its criteria', from: ['prepared'], to: 'legal-review', needs: { role: 'officer' }, requires: { documents: ['tender-documents'], fields: ['planItem', 'title', 'scope', 'criteria', 'deadline'] }, effects: ['proc.prepareTender'] },
      { key: 'review', label: 'Record the legal review', from: ['legal-review'], to: 'pending-publication', needs: { role: 'officer', distinctFrom: ['prepare'] }, requires: { fields: ['legalReview'] } },
      { key: 'publish', label: 'Approve and publish the tender', from: ['pending-publication'], to: 'published', decision: 'publish', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['proc.publishTender'] },
      { key: 'addendum', label: 'Publish a correction or addendum (before the deadline)', from: ['published'], to: 'published', decision: 'amend-tender', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['addendumReason'], documents: ['addendum'] }, effects: ['proc.addendum'] },
      { key: 'close', label: 'Close submissions at the deadline', from: ['published'], to: 'closed', needs: { role: 'officer' }, effects: ['proc.closeSubmissions'] },
      { key: 'appoint-committee', label: 'Appoint the evaluation committee', from: ['closed'], to: 'committee', needs: { role: 'signatory' }, requires: { fields: ['committeeMembers'] }, effects: ['proc.appointCommittee'] },
      { key: 'open-bids', label: 'Open the bids, together (two committee members)', from: ['committee'], to: 'opened', needs: { role: 'officer', fourEyes: true }, requires: { fields: ['openingRecord'] }, effects: ['proc.openBids'] },
      { key: 'evaluate', label: 'Record the evaluation and the recommendation (two committee members)', from: ['opened'], to: 'evaluated', needs: { role: 'officer', fourEyes: true }, requires: { fields: ['results', 'recommendedBid', 'recommendationReasons'], documents: ['evaluation-report'] }, effects: ['proc.checkEvaluator', 'proc.evaluate'] },
      { key: 'propose-award', label: 'Propose the award', from: ['evaluated'], to: 'pending-award', needs: { role: 'officer' }, requires: { reasons: true } },
      { key: 'award', label: 'Award the tender', from: ['pending-award'], to: 'standstill', decision: 'award', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['evaluate'] }, requires: { reasons: true }, effects: ['proc.award'] },
      { key: 'sign-contract', label: 'Sign the contract (after the standstill, no challenge open)', from: ['standstill'], to: 'contracted', needs: { role: 'signatory' }, requires: { fields: ['contractTerms'], documents: ['contract'] }, effects: ['proc.signContract'] },
      { key: 'cancel', label: 'Cancel the tender, with reasons', from: ['legal-review', 'pending-publication', 'published', 'closed', 'committee', 'opened', 'evaluated', 'pending-award', 'standstill'], to: 'cancelled', decision: 'withdraw', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['proc.cancelTender'] },
    ],
    deadlines: [{ key: 'standstill', label: 'Standstill before the contract is signed (the nation\'s period, where its law has one)', from: 'standstill', sampleDays: 10, calendar: 'calendar', onLapse: 'notify' }],
    tests: [{ name: 'contracted', steps: [
      { action: 'prepare', fields: { planItem: 'PPL-1', title: 'T', scope: 'Scope of the tender', criteria: 'C1; Compliant; pass-fail', deadline: '2027-03-01T12:00:00Z' }, documents: ['tender-documents'], expect: 'legal-review' },
      { action: 'review', fields: { legalReview: 'Lawful' }, expect: 'pending-publication' }, { action: 'publish', expect: 'published' }, { action: 'close', expect: 'closed' },
      { action: 'appoint-committee', fields: { committeeMembers: 'a, b' }, expect: 'committee' }, { action: 'open-bids', fields: { openingRecord: 'Opened' }, expect: 'opened' },
      { action: 'evaluate', fields: { results: 'BID-1; C1; meets; e; r', recommendedBid: 'BID-1', recommendationReasons: 'Meets every criterion' }, documents: ['evaluation-report'], expect: 'evaluated' },
      { action: 'propose-award', expect: 'pending-award' }, { action: 'award', expect: 'standstill' }, { action: 'sign-contract', fields: { contractTerms: 'Terms as executed' }, documents: ['contract'], expect: 'contracted' },
    ] }],
  },
  {
    ...base, key: 'proc.contract-variation', version: 1, title: 'Contract variation', refPrefix: 'PCV', sensitivity: 'restricted', forms: [],
    fields: [
      F('contract', 'Contract (CTR-…)', 'text', { required: true }),
      F('changeType', 'Type of change (as the nation\'s list names it)', 'text', { required: true }),
      F('reason', 'Why the change is needed', 'longtext', { required: true }),
      F('newValueMinor', 'Contract value after the variation (minor units)', 'number', { required: true }),
      RF('proposedTerms', 'The exact proposed changes to the terms', 'longtext'),
      F('assessment', 'Assessment: whether the change needs a new competition, its value and its effect', 'longtext', { audience: 'officer' }),
      F('legalReview', 'Legal review of the authority to vary', 'longtext', { audience: 'officer' }),
    ],
    documents: [{ class: 'variation-request', label: 'The variation request', required: true }, { class: 'variation-evidence', label: 'Supporting evidence', required: false }],
    stages: [{ key: 'requested', label: 'Requested' }, { key: 'assessed', label: 'Assessed' }, { key: 'legal-review', label: 'Legal review' }, { key: 'pending-approval', label: 'Approval' }, { key: 'varied', label: 'Varied', terminal: true }, { key: 'refused', label: 'Refused', terminal: true }],
    actions: [
      { key: 'assess', label: 'Assess the variation', from: ['requested'], to: 'assessed', needs: { role: 'officer' }, requires: { documents: ['variation-request'], fields: ['contract', 'changeType', 'reason', 'newValueMinor', 'assessment'] }, effects: ['proc.checkVariation'] },
      { key: 'review', label: 'Record the legal review', from: ['assessed'], to: 'legal-review', needs: { role: 'officer', distinctFrom: ['assess'] }, requires: { fields: ['legalReview'] } },
      { key: 'propose', label: 'Propose', from: ['legal-review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
      { key: 'approve', label: 'Approve the variation', from: ['pending-approval'], to: 'varied', decision: 'vary', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['proc.vary'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['assessed', 'legal-review', 'pending-approval'], to: 'refused', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    ],
    deadlines: [],
    tests: [{ name: 'varied', steps: [
      { action: 'assess', fields: { contract: 'CTR-1', changeType: 'scope', reason: 'More units needed', newValueMinor: 2, assessment: 'Within scope' }, documents: ['variation-request'], expect: 'assessed' },
      { action: 'review', fields: { legalReview: 'Allowed by clause 9' }, expect: 'legal-review' }, { action: 'propose', expect: 'pending-approval' }, { action: 'approve', expect: 'varied' },
    ] }],
  },
  {
    ...base, key: 'proc.contract-delivery', version: 1, title: 'Deliverable acceptance and payment certification', refPrefix: 'PCD', sensitivity: 'restricted', forms: [],
    fields: [
      F('contract', 'Contract (CTR-…)', 'text', { required: true }),
      F('deliverable', 'Deliverable as submitted', 'longtext', { required: true }),
      F('inspectionFindings', 'Inspection: what was checked and found', 'longtext', { audience: 'officer' }),
      RF('invoiceRef', 'Invoice reference', 'text', { audience: 'officer' }),
      RF('certifiedMinor', 'Amount certified for payment (minor units)', 'number', { audience: 'officer' }),
    ],
    documents: [{ class: 'deliverable', label: 'The deliverable or delivery note', required: true }, { class: 'inspection', label: 'Inspection record', required: false }, { class: 'invoice', label: 'The invoice', required: false }],
    stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'inspected', label: 'Inspected' }, { key: 'accepted', label: 'Accepted' }, { key: 'certified', label: 'Payment certified', terminal: true }, { key: 'rejected', label: 'Rejected', terminal: true }],
    actions: [
      { key: 'receive', label: 'Record the deliverable', from: ['submitted'], to: 'inspected', needs: { role: 'officer' }, requires: { documents: ['deliverable'], fields: ['contract', 'deliverable'] }, effects: ['proc.receiveDeliverable'] },
      { key: 'accept', label: 'Accept the deliverable', from: ['inspected'], to: 'accepted', decision: 'accept', needs: { role: 'signatory' }, requires: { reasons: true, fields: ['inspectionFindings'] }, effects: ['proc.acceptDeliverable'] },
      { key: 'reject', label: 'Reject the deliverable, with reasons', from: ['inspected'], to: 'rejected', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['proc.rejectDeliverable'] },
      { key: 'certify', label: 'Certify the invoice for payment (never payment execution)', from: ['accepted'], to: 'certified', needs: { role: 'officer', distinctFrom: ['accept'] }, requires: { fields: ['invoiceRef', 'certifiedMinor'], documents: ['invoice'] }, effects: ['proc.certify'] },
    ],
    deadlines: [],
    tests: [{ name: 'certified', steps: [
      { action: 'receive', fields: { contract: 'CTR-1', deliverable: 'First batch' }, documents: ['deliverable'], expect: 'inspected' },
      { action: 'accept', fields: { inspectionFindings: 'Complete' }, expect: 'accepted' }, { action: 'certify', fields: { invoiceRef: 'INV-1', certifiedMinor: 1 }, documents: ['invoice'], expect: 'certified' },
    ] }],
  },
];

/** The review body's complaint procedure (its own records; the procuring institution answers, never decides). */
export const REFERENCE_PROCUREMENT_COMPLAINT: Ref = {
  owner: 'procurementReview', reference: true, citations: [], notifications: [], retention: 'procurement-review-record',
  key: 'procurement-review.complaint', version: 1, title: 'Procurement complaint before the review body', refPrefix: 'PRC', sensitivity: 'restricted',
  fields: [
    F('tender', 'Tender complained of (TND-…)', 'text', { required: true }),
    F('decisionChallenged', 'Decision challenged (the award, an exclusion, the specification …)', 'text', { required: true }),
    RF('complainant', 'Complainant (organisation number on the organisations register)', 'text', { required: true }),
    RF('grounds', 'Grounds of the complaint', 'longtext', { required: true }),
    F('requestedRemedy', 'Remedy requested (as the nation\'s list names them)', 'text', { required: true }),
    F('completeness', 'Completeness and standing: what was checked, with reasons', 'longtext', { audience: 'officer' }),
    RF('entityResponse', 'The procuring institution\'s response', 'longtext', { audience: 'officer' }),
    F('interimMeasure', 'Interim measure (where the law allows one)', 'text', { audience: 'officer' }),
    F('reviewNote', 'Review: what was considered', 'longtext', { audience: 'officer' }),
    F('remedy', 'Remedy decided (e.g. annul the award)', 'text', { audience: 'officer' }),
  ],
  documents: [{ class: 'complaint', label: 'The complaint as lodged', required: true }, { class: 'entity-response', label: 'The procuring institution\'s response', required: false }, { class: 'complaint-evidence', label: 'Evidence', required: false }],
  stages: [
    { key: 'lodged', label: 'Lodged' }, { key: 'completeness', label: 'Completeness' }, { key: 'awaiting-response', label: 'Waiting for the procuring institution' }, { key: 'review', label: 'Under review' },
    { key: 'pending-decision', label: 'Decision' }, { key: 'upheld', label: 'Upheld', terminal: true }, { key: 'dismissed', label: 'Dismissed', terminal: true }, { key: 'not-admitted', label: 'Not admitted', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the complaint against the tender', from: ['lodged'], to: 'completeness', needs: { role: 'officer' }, requires: { documents: ['complaint'], fields: ['tender', 'decisionChallenged', 'complainant', 'grounds', 'requestedRemedy'] }, effects: ['review.lodge'] },
    { key: 'request-response', label: 'Ask the procuring institution to respond', from: ['completeness'], to: 'awaiting-response', needs: { role: 'officer' }, requires: { fields: ['completeness'] } },
    { key: 'response-received', label: 'Response received, or the time for it passed', from: ['awaiting-response'], to: 'review', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'interim', label: 'Order an interim measure (suspends the award or the contract)', from: ['completeness', 'awaiting-response', 'review'], to: 'review', decision: 'interim-measure', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['interimMeasure'] }, effects: ['review.interim'] },
    { key: 'propose', label: 'Propose the decision', from: ['review'], to: 'pending-decision', needs: { role: 'officer' }, requires: { reasons: true, fields: ['reviewNote'] } },
    { key: 'uphold', label: 'Uphold the complaint, with the remedy', from: ['pending-decision'], to: 'upheld', decision: 'uphold', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['remedy'] }, effects: ['review.uphold'] },
    { key: 'dismiss', label: 'Dismiss the complaint, with reasons', from: ['pending-decision'], to: 'dismissed', decision: 'dismiss', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['review.dismiss'] },
    { key: 'not-admit', label: 'Not admitted (out of time, no standing), with reasons', from: ['completeness'], to: 'not-admitted', decision: 'reject', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: ['completeness'] }, effects: ['review.notAdmitted'] },
  ],
  deadlines: [{ key: 'response', label: 'Time the procuring institution has to respond (the nation\'s rule)', from: 'awaiting-response', sampleDays: 7, calendar: 'working', onLapse: 'escalate' }],
  appeal: { sampleDays: 30, body: 'the court or tribunal the procurement law names', suspensive: false },
  tests: [{ name: 'dismissed', steps: [
    { action: 'register', fields: { tender: 'TND-1', decisionChallenged: 'award', complainant: 'ORG-1', grounds: 'g', requestedRemedy: 'annul' }, documents: ['complaint'], expect: 'completeness' },
    { action: 'request-response', fields: { completeness: 'In time' }, expect: 'awaiting-response' }, { action: 'response-received', expect: 'review' },
    { action: 'propose', fields: { reviewNote: 'Considered' }, expect: 'pending-decision' }, { action: 'dismiss', expect: 'dismissed' },
  ] }],
};

/** The key an institution's own version of a template takes: proc.<name>.<institution>. */
export const procurementKey = (template: string, institution: string) => `${template}.${institution.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 60);

/** Draft the institution's own procurement procedures from the templates (once each); a second official approves each. */
export function installProcurementProcedures(institution: string, by: string, byId?: string): { drafted: string[]; present: string[] } | { error: string } {
  const m = getMinistry(institution);
  if (!m) return { error: 'No such institution' };
  const drafted: string[] = [], present: string[] = [];
  for (const t of PROCUREMENT_PROCEDURES) {
    const key = procurementKey(t.key, institution);
    if (listPackages({ key }).length) { present.push(key); continue; }
    const { forms: _forms, ...pkg } = t;
    const d = draftPackage({ ...pkg, key, owner: institution, title: `${t.title} (${m.name})` }, by, byId, registeredEffects());
    if ('error' in d) return { error: `${key}: ${d.error}` };
    drafted.push(key);
  }
  return { drafted, present };
}

/** Draft the review body's complaint procedure (a reference, once). */
export function installProcurementReviewProcedures(by: string): { drafted: string[]; present: string[] } {
  if (listPackages({ key: REFERENCE_PROCUREMENT_COMPLAINT.key }).length) return { drafted: [], present: [REFERENCE_PROCUREMENT_COMPLAINT.key] };
  const r = draftPackage(REFERENCE_PROCUREMENT_COMPLAINT, by, undefined, registeredEffects());
  return 'error' in r ? { drafted: [], present: [] } : { drafted: [REFERENCE_PROCUREMENT_COMPLAINT.key], present: [] };
}

// The public procurement register (plan step I5; institutional
// specification Part 1 §9; field series Part 3 §3.5): each procuring
// institution's procurement plans, tenders with their published versions,
// the bids received sealed, the opening record, conflict declarations, the
// evaluation, the award and its standstill, challenges before the review
// body, and the contracts with their variations, accepted deliverables and
// payment certifications. Each institution keeps and decides its own
// procurement (spec Part 4 §D: "shared tooling is permitted; each institution
// retains its authorised procurement decisions and audit trail"); complaints
// are decided by the review body the nation names (slot `procurementReview`,
// independent of the procuring institution). Changed only by the effects of
// the procurement procedures (lib/procurement/procedures.ts), and, outside a
// procedure, only by what a procedure cannot carry without breaking a seal:
// the receipt of a sealed bid, its withdrawal before the deadline, and each
// committee member's own declaration of interests with its management
// (register-writes.test.ts lists them with their reasons).
//
// Distinct records, never merged (field series §3.5): a plan item is not a
// tender, a published tender is never changed (an addendum is a new linked
// version, refused once submissions close), a bid is sealed until the opening
// step (content sealed at rest, never returned before the opening; a late
// bid keeps its real receipt time and is not opened), evaluation criteria are
// frozen at publication, an evaluation records reasons for each result and a
// recommendation, never a score that decides on its own (the award is a
// decision of two officials who did not evaluate), an executed contract is
// immutable (a variation is a new version), payment certification is not
// payment execution (the treasury pays: lib/finance). Suppliers are
// organisations of the organisations register, by number. No threshold,
// method list, period or standstill ships: the method allowed for a value
// comes only from the approved rule `procurement.method-thresholds` (a tiers
// rule, lib/law/rules.ts, shipped unset); the standstill is the procedure's
// deadline, its days the nation's.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber } from '@/lib/data/numbering';
import { personOf } from '@/lib/data/dual-control';
import { seal, open } from '@/lib/crypto/envelope';
import { createHash } from 'node:crypto';

export interface Who { id?: string; name: string }
export interface Criterion { id: string; description: string; kind: 'pass-fail' | 'scored'; weight?: number }
export interface TierRef { tier: string; allows?: string[]; rule: { key: string; version: number; digest: string } }

export interface PlanItem {
  id: string; ref: string; institution: string; period: string; description: string; category: string;
  estimatedMinor: number; currency: string;
  /** The appropriation it is funded from (fin:APP-…) and whether finance confirmed it covers the estimate when checked. */
  budget?: { appropriation: string; availableMinor: number; at: string };
  method: string; methodJustification?: string;
  /** The method thresholds rule the method was checked against, or why none applied (a demonstration only). */
  methodRule?: TierRef | { none: string };
  state: 'planned' | 'approved' | 'published' | 'cancelled';
  case: string; decision?: string; at: string; by: string; sample?: true;
}
export interface TenderVersion { n: number; at: string; by: string; reason: string; scope: string; criteria: Criterion[]; criteriaDigest: string; deadline: string; case: string; decision?: string }
export interface Declaration { member: Who; at: string; interest: 'none' | 'declared'; details?: string; managed?: { by: Who; at: string; outcome: 'recused' | 'may-participate'; reasons: string } }
export interface SealedBid {
  id: string; ref: string; tender: string; supplier: { number: string; name: string };
  receivedAt: string; receivedBy: Who;
  /** Content sealed at rest; opened only by the opening step. */
  sealed: string;
  /** SHA-256 of the content and the documents' own hashes: what the receipt proves without revealing it. */
  manifest: { sha256: string; documents: string[] };
  late: boolean;
  state: 'received' | 'withdrawn' | 'opened' | 'not-opened';
  withdrawn?: { at: string; by: Who; reason: string };
  /** Set by the opening step only. */
  opened?: { at: string; priceMinor: number; currency: string; summary: string };
}
export interface Evaluation {
  at: string; by: Who[]; case: string;
  results: { bid: string; criterion: string; result: 'meets' | 'does-not-meet' | 'scored'; score?: number; evidence: string; reasons: string }[];
  recommendation: { bid: string; reasons: string };
}
export interface Award { bid: string; supplier: { number: string; name: string }; valueMinor: number; currency: string; reasons: string; at: string; by: Who; confirmedBy?: Who; decision?: string; annulled?: { at: string; by: string; reason: string; case: string } }
export interface Challenge { case: string; ref: string; body: string; at: string; state: 'open' | 'decided'; interim?: { at: string; measure: string }; outcome?: { at: string; result: 'upheld' | 'dismissed' | 'not-admitted'; remedy?: string } }
export interface Tender {
  id: string; ref: string; institution: string; planItem: string; title: string; method: string; currency: string;
  versions: TenderVersion[];
  /** Submissions close at (the published deadline, an ISO time). */
  publishedAt?: string;
  committee?: { members: Who[]; appointedBy: Who; at: string; case: string };
  declarations: Declaration[];
  opening?: { at: string; officials: Who[]; opened: string[]; late: string[]; withdrawn: string[]; record: string; case: string };
  evaluation?: Evaluation;
  award?: Award;
  challenges: Challenge[];
  contract?: string;
  state: 'prepared' | 'published' | 'closed' | 'opened' | 'evaluated' | 'awarded' | 'contracted' | 'cancelled';
  case: string; at: string; sample?: true;
}
export interface Deliverable { id: string; description: string; at: string; accepted?: { by: Who; at: string; reasons: string; case: string; decision?: string }; rejected?: { by: Who; at: string; reasons: string; case: string } }
export interface Certification { ref: string; deliverable: string; invoiceRef: string; amountMinor: number; by: Who; at: string; case: string }
export interface ContractVersion { n: number; at: string; valueMinor: number; terms: string; termsDigest: string; change: 'signed' | 'varied'; reasons: string; case: string; by: string; decision?: string }
export interface Contract {
  id: string; ref: string; tender: string; institution: string; supplier: { number: string; name: string }; currency: string;
  versions: ContractVersion[];
  deliverables: Deliverable[]; certifications: Certification[];
  state: 'active' | 'completed' | 'terminated';
  case: string; at: string; sample?: true;
}

interface ProcurementDb { plans: PlanItem[]; tenders: Tender[]; bids: SealedBid[]; contracts: Contract[]; planSeq: number; tenderSeq: number; bidSeq: number; contractSeq: number; certSeq: number }
const g = globalThis as unknown as { __civicosProcurement?: ProcurementDb };
const db = (): ProcurementDb => {
  const d = touch('__civicosProcurement', g.__civicosProcurement ??= { plans: [], tenders: [], bids: [], contracts: [], planSeq: 0, tenderSeq: 0, bidSeq: 0, contractSeq: 0, certSeq: 0 });
  d.plans ??= []; d.tenders ??= []; d.bids ??= []; d.contracts ??= [];
  return d;
};
export function resetProcurement(): void { g.__civicosProcurement = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const ok = (s: unknown, max = 200): string => (typeof s === 'string' ? s.trim().slice(0, max) : '');
const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const counters = () => db() as unknown as Record<string, unknown>;
/** Whether two officials are the same person (accounts, and the person behind them at the identity provider; names only without sign-in). */
export function samePerson(a: Who | undefined, b: Who | undefined): boolean {
  if (!a || !b) return false;
  if (a.id && b.id) {
    if (a.id === b.id) return true;
    const x = personOf(a.id), y = personOf(b.id);
    return x.bound && y.bound && x.key === y.key;
  }
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}
const digestOf = (criteria: Criterion[]) => sha(JSON.stringify(criteria.map(c => [c.id, c.description, c.kind, c.weight ?? null])));

/** Criteria from typed lines "id; description; pass-fail|scored; weight" (or a list). */
export function parseCriteria(v: unknown): Criterion[] | { error: string } {
  const raw: unknown[] = Array.isArray(v) ? v : ok(v, 20000).split('\n').filter(l => l.trim()).map(l => { const [id, description, kind, weight] = l.split(';').map(x => x.trim()); return { id, description, kind, ...(weight ? { weight: Number(weight) } : {}) }; });
  const out: Criterion[] = [];
  for (const x of raw.slice(0, 60)) {
    const c = (x ?? {}) as Record<string, unknown>;
    const id = ok(c.id, 40), description = ok(c.description, 500), kind = c.kind === 'scored' ? 'scored' : c.kind === 'pass-fail' ? 'pass-fail' : '';
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(id) || !description || !kind) return { error: 'Each criterion is "id; description; pass-fail or scored; weight (scored only)"' };
    if (kind === 'scored' && c.weight !== undefined && (typeof c.weight !== 'number' || !Number.isFinite(c.weight) || c.weight <= 0)) return { error: `Criterion ${id}: a weight is a positive number` };
    if (out.some(y => y.id === id)) return { error: `Criterion ${id} appears twice` };
    out.push({ id, description, kind, ...(kind === 'scored' && typeof c.weight === 'number' ? { weight: c.weight } : {}) });
  }
  if (!out.length) return { error: 'A tender publishes its evaluation criteria' };
  return out;
}

// ── Plans (§3.5 Department A) ────────────────────────────────────────────────

export function recordPlanItem(input: { institution: string; period: string; description: string; category: string; estimatedMinor: number; currency: string; method: string; methodJustification?: string; case: string; by: string; at: string; sample?: true }): PlanItem | { error: string } {
  if (!/^\d{4}(-\d{2}|-Q[1-4]|-\d{4})?$/.test(input.period)) return { error: 'The planning period is a year, a year span or a part of a year' };
  if (ok(input.description, 500).length < 5) return { error: 'Describe what is to be bought (5 to 500 characters), without naming a preferred supplier' };
  if (!ok(input.category)) return { error: 'Choose the procurement category' };
  if (!whole(input.estimatedMinor)) return { error: 'The estimate is a positive whole number of minor units' };
  if (!/^[A-Z]{3}$/.test(input.currency)) return { error: 'The currency is a three-letter code' };
  if (!/^[a-z][a-z0-9-]{1,40}$/.test(input.method)) return { error: 'Choose the proposed method (as the nation\'s list names it)' };
  const d = db();
  if (d.plans.some(p => p.case === input.case)) return { error: 'This case already holds a plan item' };
  const p: PlanItem = {
    id: uuid7(), ref: nextNumber(counters(), 'planSeq', 'PPL', new Date(input.at)), institution: input.institution, period: input.period, description: ok(input.description, 500), category: ok(input.category, 80),
    estimatedMinor: input.estimatedMinor, currency: input.currency, method: input.method, ...(ok(input.methodJustification) ? { methodJustification: ok(input.methodJustification, 4000) } : {}),
    state: 'planned', case: input.case, at: input.at, by: input.by, ...(input.sample ? { sample: true as const } : {}),
  };
  d.plans.push(p);
  recordAudit(input.by, 'procurement.plan.record', `PlanItem:${p.ref}`, 'ok', `${p.institution} · ${p.period} · ${p.category} · ${p.method}`);
  return clone(p);
}
const planOfCase = (caseId: string) => db().plans.find(p => p.case === caseId);
export const getPlanItem = (x: string): PlanItem | undefined => { const p = db().plans.find(y => y.id === x || y.ref === x || y.case === x); return p ? clone(p) : undefined; };
export function confirmPlanBudget(caseId: string, budget: { appropriation: string; availableMinor: number }, by: string, at: string): PlanItem | { error: string } {
  const p = planOfCase(caseId);
  if (!p) return { error: 'No plan item on this case' };
  p.budget = { ...budget, at };
  recordAudit(by, 'procurement.plan.budget', `PlanItem:${p.ref}`, 'ok', `${budget.appropriation} · available ${budget.availableMinor / 100} when checked`);
  return clone(p);
}
export function setPlanMethodRule(caseId: string, rule: TierRef | { none: string }, by: string): PlanItem | { error: string } {
  const p = planOfCase(caseId);
  if (!p) return { error: 'No plan item on this case' };
  p.methodRule = clone(rule);
  recordAudit(by, 'procurement.plan.method', `PlanItem:${p.ref}`, 'ok', 'tier' in rule ? `${p.method} allowed in tier ${rule.tier} (${rule.rule.key} v${rule.rule.version})` : rule.none);
  return clone(p);
}
export function setPlanState(caseId: string, state: PlanItem['state'], by: string, decision?: string): PlanItem | { error: string } {
  const p = planOfCase(caseId);
  if (!p) return { error: 'No plan item on this case' };
  if (state === 'approved' && p.state !== 'planned') return { error: `The plan item is ${p.state}` };
  if (state === 'published' && p.state !== 'approved') return { error: 'Only an approved plan item is published' };
  p.state = state;
  if (decision) p.decision ??= decision;
  recordAudit(by, `procurement.plan.${state}`, `PlanItem:${p.ref}`, 'ok', `${p.description.slice(0, 80)}`);
  return clone(p);
}

// ── Tenders (§3.5 Departments C–E) ───────────────────────────────────────────

export function prepareTender(input: { planItem: string; institution: string; title: string; scope: string; criteria: Criterion[]; deadline: string; case: string; by: string; at: string; sample?: true }): Tender | { error: string } {
  const p = db().plans.find(x => x.ref === input.planItem || x.id === input.planItem);
  if (!p) return { error: `No plan item ${input.planItem}` };
  if (p.institution !== input.institution) return { error: `${p.ref} is another institution's plan item` };
  if (p.state !== 'approved' && p.state !== 'published') return { error: `${p.ref} is not an approved plan item` };
  if (!ok(input.title) || ok(input.scope, 10000).length < 10) return { error: 'Give the tender its title and scope' };
  if (!Number.isFinite(Date.parse(input.deadline))) return { error: 'The submission deadline is a date and time' };
  const d = db();
  if (d.tenders.some(t => t.case === input.case)) return { error: 'This case already holds a tender' };
  if (d.tenders.some(t => t.planItem === p.ref && t.state !== 'cancelled')) return { error: `${p.ref} already has a tender` };
  const t: Tender = {
    id: uuid7(), ref: nextNumber(counters(), 'tenderSeq', 'TND', new Date(input.at)), institution: input.institution, planItem: p.ref, title: ok(input.title, 300), method: p.method, currency: p.currency,
    versions: [{ n: 1, at: input.at, by: input.by, reason: 'Prepared', scope: ok(input.scope, 10000), criteria: clone(input.criteria), criteriaDigest: digestOf(input.criteria), deadline: new Date(input.deadline).toISOString(), case: input.case }],
    declarations: [], challenges: [], state: 'prepared', case: input.case, at: input.at, ...(input.sample ? { sample: true as const } : {}),
  };
  d.tenders.push(t);
  recordAudit(input.by, 'procurement.tender.prepare', `Tender:${t.ref}`, 'ok', `${t.title} · ${t.method} · criteria ${t.versions[0]!.criteriaDigest.slice(0, 12)}`);
  return clone(t);
}
const tenderOf = (x: string) => db().tenders.find(t => t.id === x || t.ref === x || t.case === x);
export const getTender = (x: string): Tender | undefined => { const t = tenderOf(x); return t ? clone(t) : undefined; };
export const latestVersion = (t: Pick<Tender, 'versions'>): TenderVersion => t.versions[t.versions.length - 1]!;

/** Publish the tender (a decision of two officials): its version and criteria are fixed from now. */
export function publishTender(caseId: string, by: string, at: string): Tender | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state !== 'prepared') return { error: `The tender is ${t.state}` };
  if (Date.parse(latestVersion(t).deadline) <= Date.parse(at)) return { error: 'The submission deadline is already past: set a deadline after publication' };
  t.state = 'published';
  t.publishedAt = at;
  const p = db().plans.find(x => x.ref === t.planItem);
  if (p && p.state === 'approved') p.state = 'published';
  recordAudit(by, 'procurement.tender.publish', `Tender:${t.ref}`, 'ok', `version ${latestVersion(t).n} · submissions close ${latestVersion(t).deadline}`);
  return clone(t);
}
export function attachTenderDecision(caseId: string, decision: string): void {
  const t = tenderOf(caseId);
  if (!t) return;
  const v = latestVersion(t);
  if (t.state === 'published' && !v.decision) v.decision = decision;
  if (t.award && !t.award.decision && t.state === 'awarded') t.award.decision = decision;
}
/** A correction or addendum (a decision of two officials): a new linked version; never after submissions close. */
export function addAddendum(caseId: string, input: { reason: string; scope?: string; criteria?: Criterion[]; deadline?: string; case: string; by: string; at: string }): Tender | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state !== 'published') return { error: 'An addendum is published only while the tender is open for submissions' };
  const v = latestVersion(t);
  if (Date.parse(v.deadline) <= Date.parse(input.at)) return { error: 'Submissions are closed: the published criteria and terms can no longer change' };
  if (!ok(input.reason)) return { error: 'Say why the tender is corrected' };
  const criteria = input.criteria ?? v.criteria;
  const deadline = input.deadline ? new Date(input.deadline).toISOString() : v.deadline;
  if (!Number.isFinite(Date.parse(deadline)) || Date.parse(deadline) < Date.parse(v.deadline)) return { error: 'An addendum never brings the deadline forward' };
  t.versions.push({ n: v.n + 1, at: input.at, by: input.by, reason: ok(input.reason, 2000), scope: ok(input.scope, 10000) || v.scope, criteria: clone(criteria), criteriaDigest: digestOf(criteria), deadline, case: input.case });
  recordAudit(input.by, 'procurement.tender.addendum', `Tender:${t.ref}`, 'ok', `version ${v.n + 1} · ${ok(input.reason, 120)}`);
  return clone(t);
}

/** Receive a bid, sealed (outside a procedure: the seal would break if a case carried it). */
export function receiveBid(input: { tender: string; supplier: { number: string; name: string }; priceMinor: number; summary: string; documents?: string[]; by: Who; at: string }): Omit<SealedBid, 'sealed'> | { error: string } {
  const t = tenderOf(input.tender);
  if (!t) return { error: `No tender ${input.tender}` };
  if (t.state !== 'published' && t.state !== 'closed') return { error: `Tender ${t.ref} is ${t.state}: it takes no bids` };
  if (!whole(input.priceMinor)) return { error: 'The bid price is a positive whole number of minor units' };
  if (!ok(input.summary)) return { error: 'Give the bid\'s content (its summary as submitted)' };
  const docs = (input.documents ?? []).map(x => ok(x, 64)).filter(x => /^[0-9a-f]{64}$/.test(x)).slice(0, 50);
  const d = db();
  const late = Date.parse(input.at) > Date.parse(latestVersion(t).deadline);
  const id = uuid7();
  const content = JSON.stringify({ priceMinor: input.priceMinor, currency: t.currency, summary: ok(input.summary, 20000) });
  const b: SealedBid = {
    id, ref: nextNumber(counters(), 'bidSeq', 'BID', new Date(input.at)), tender: t.ref, supplier: clone(input.supplier),
    receivedAt: input.at, receivedBy: clone(input.by), sealed: seal(content, `bid:${t.ref}:${id}`), manifest: { sha256: sha(content), documents: docs }, late, state: 'received',
  };
  d.bids.push(b);
  // The audit names the receipt, the time and the manifest hash, never the content.
  recordAudit(input.by.name, 'procurement.bid.receive', `Bid:${b.ref}`, 'ok', `tender ${t.ref} · supplier ${b.supplier.number} · received ${b.receivedAt}${late ? ' (after the deadline: recorded, not opened)' : ''} · sha256 ${b.manifest.sha256.slice(0, 12)}`);
  const { sealed: _s, ...out } = clone(b);
  return out;
}
export function withdrawBid(ref: string, reason: string, by: Who, at: string): Omit<SealedBid, 'sealed'> | { error: string } {
  const b = db().bids.find(x => x.ref === ref || x.id === ref);
  if (!b) return { error: `No bid ${ref}` };
  const t = tenderOf(b.tender)!;
  if (b.state !== 'received') return { error: `The bid is ${b.state}` };
  if (Date.parse(at) > Date.parse(latestVersion(t).deadline)) return { error: 'After the deadline a bid is not withdrawn: the opening records it' };
  if (!ok(reason)) return { error: 'Record the supplier\'s reason or request' };
  b.state = 'withdrawn';
  b.withdrawn = { at, by: clone(by), reason: ok(reason, 500) };
  recordAudit(by.name, 'procurement.bid.withdraw', `Bid:${b.ref}`, 'ok', `tender ${t.ref}`);
  const { sealed: _s, ...out } = clone(b);
  return out;
}

export function closeSubmissions(caseId: string, by: string, at: string): Tender | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state !== 'published') return { error: `The tender is ${t.state}` };
  if (Date.parse(at) < Date.parse(latestVersion(t).deadline)) return { error: `Submissions close at ${latestVersion(t).deadline}: not before` };
  t.state = 'closed';
  recordAudit(by, 'procurement.tender.close', `Tender:${t.ref}`, 'ok', `${db().bids.filter(b => b.tender === t.ref && b.state === 'received' && !b.late).length} bids in time`);
  return clone(t);
}

export function appointCommittee(caseId: string, members: Who[], by: Who, at: string): Tender | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state !== 'published' && t.state !== 'closed') return { error: 'The committee is appointed before the bids are opened' };
  const list: Who[] = [];
  for (const m of members) if (!list.some(x => samePerson(x, m))) list.push(m);
  if (list.length < 2) return { error: 'An evaluation committee has at least two different people' };
  if (list.some(m => samePerson(m, by))) return { error: 'The appointing official is not a member of the committee' };
  t.committee = { members: clone(list), appointedBy: clone(by), at, case: caseId };
  recordAudit(by.name, 'procurement.committee.appoint', `Tender:${t.ref}`, 'ok', `${list.map(m => m.name).join(', ')}`);
  return clone(t);
}

/** A committee member declares their own interests (outside a procedure: it is the member's own statement about themselves). */
export function declareInterest(tender: string, member: Who, interest: 'none' | 'declared', details: string, at: string): Declaration | { error: string } {
  const t = tenderOf(tender);
  if (!t) return { error: `No tender ${tender}` };
  if (!t.committee?.members.some(m => samePerson(m, member))) return { error: 'Only a member of this tender\'s evaluation committee declares an interest here' };
  if (t.state === 'evaluated' || t.state === 'awarded' || t.state === 'contracted' || t.state === 'cancelled') return { error: 'The evaluation is recorded: a later interest is raised with the procuring institution\'s integrity route' };
  if (interest === 'declared' && !ok(details)) return { error: 'Describe the interest' };
  t.declarations = t.declarations.filter(x => !samePerson(x.member, member));
  const d: Declaration = { member: clone(member), at, interest, ...(interest === 'declared' ? { details: ok(details, 4000) } : {}) };
  t.declarations.push(d);
  // The details stay on the restricted record; the audit says only that a declaration was made.
  recordAudit(member.name, 'procurement.conflict.declare', `Tender:${t.ref}`, 'ok', interest === 'none' ? 'declared no interest' : 'declared an interest (details restricted)');
  return clone(d);
}
/** How a declared interest is managed, decided by an official who can sign and is neither the member nor on the committee. */
export function manageInterest(tender: string, member: Who, outcome: 'recused' | 'may-participate', reasons: string, by: Who, at: string): Declaration | { error: string } {
  const t = tenderOf(tender);
  if (!t) return { error: `No tender ${tender}` };
  const d = t.declarations.find(x => samePerson(x.member, member));
  if (!d || d.interest !== 'declared') return { error: 'No declared interest of that member to manage' };
  if (samePerson(by, member) || t.committee?.members.some(m => samePerson(m, by))) return { error: 'A declared interest is managed by an official independent of the committee' };
  if (!ok(reasons)) return { error: 'Give the reasons' };
  d.managed = { by: clone(by), at, outcome, reasons: ok(reasons, 2000) };
  recordAudit(by.name, 'procurement.conflict.manage', `Tender:${t.ref}`, 'ok', `${member.name}: ${outcome}`);
  return clone(d);
}
/** Whether a member may evaluate: declared, and a declared interest managed so that they may take part. */
export function mayEvaluate(t: Tender, member: Who): string | null {
  if (!t.committee?.members.some(m => samePerson(m, member))) return 'Only a member of the evaluation committee records the evaluation';
  const d = t.declarations.find(x => samePerson(x.member, member));
  if (!d) return `${member.name} has not declared their interests in this tender`;
  if (d.interest === 'declared' && d.managed?.outcome !== 'may-participate') return d.managed ? `${member.name} is recused from this evaluation` : `${member.name}'s declared interest has not been managed yet`;
  return null;
}

/** The opening: at least two committee members, together; sealed bids received in time are opened, late ones recorded and left sealed. */
export function openBids(caseId: string, officials: Who[], record: string, at: string): Tender | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state !== 'closed') return { error: 'Bids are opened once submissions have closed, and once only' };
  if (!t.committee) return { error: 'The evaluation committee is appointed before the opening' };
  const present: Who[] = [];
  for (const o of officials) if (!present.some(x => samePerson(x, o))) present.push(o);
  if (present.length < 2) return { error: 'Bids are opened by at least two different members of the committee, together' };
  for (const o of present) if (!t.committee.members.some(m => samePerson(m, o))) return { error: `${o.name} is not a member of the evaluation committee` };
  const bids = db().bids.filter(b => b.tender === t.ref);
  const opened: string[] = [], late: string[] = [];
  for (const b of bids) {
    if (b.state !== 'received') continue;
    if (b.late) { b.state = 'not-opened'; late.push(b.ref); continue; }
    const o = open(b.sealed, `bid:${t.ref}:${b.id}`);
    if ('error' in o) return { error: `${b.ref}: ${o.error}` };
    const c = JSON.parse(o.plain) as { priceMinor: number; currency: string; summary: string };
    if (sha(o.plain) !== b.manifest.sha256) return { error: `${b.ref} does not match the hash given at receipt: the opening stops for the review the law provides` };
    b.state = 'opened';
    b.opened = { at, priceMinor: c.priceMinor, currency: c.currency, summary: c.summary };
    opened.push(b.ref);
  }
  t.opening = { at, officials: clone(present), opened, late, withdrawn: bids.filter(b => b.state === 'withdrawn').map(b => b.ref), record: ok(record, 4000), case: caseId };
  t.state = 'opened';
  recordAudit(present[0]!.name, 'procurement.bid.open', `Tender:${t.ref}`, 'ok', `opened ${opened.length}, late ${late.length}, withdrawn ${t.opening.withdrawn.length} · by ${present.map(o => o.name).join(', ')}`);
  return clone(t);
}

/** Parse result lines "bid; criterion; meets|does-not-meet|score; evidence; reasons" (or a list). */
export function parseResults(v: unknown): Evaluation['results'] | { error: string } {
  const raw: unknown[] = Array.isArray(v) ? v : ok(v, 40000).split('\n').filter(l => l.trim()).map(l => { const [bid, criterion, result, evidence, ...reasons] = l.split(';').map(x => x.trim()); return { bid, criterion, result, evidence, reasons: reasons.join('; ') }; });
  const out: Evaluation['results'] = [];
  for (const x of raw.slice(0, 500)) {
    const r = (x ?? {}) as Record<string, unknown>;
    const res = String(r.result ?? '');
    const score = /^\d+(\.\d+)?$/.test(res) ? Number(res) : typeof r.score === 'number' ? r.score : undefined;
    const result = res === 'meets' || res === 'does-not-meet' ? res : score !== undefined ? 'scored' : '';
    if (!ok(r.bid) || !ok(r.criterion) || !result || !ok(r.reasons)) return { error: 'Each result is "bid; criterion; meets, does-not-meet or a score; evidence; reasons": every result carries its reasons' };
    out.push({ bid: ok(r.bid, 40), criterion: ok(r.criterion, 40), result: result as 'meets' | 'does-not-meet' | 'scored', ...(score !== undefined ? { score } : {}), evidence: ok(r.evidence, 500), reasons: ok(r.reasons, 2000) });
  }
  if (!out.length) return { error: 'Record the result for each opened bid against each criterion' };
  return out;
}
export function recordEvaluation(caseId: string, input: { results: Evaluation['results']; recommendation: { bid: string; reasons: string }; by: Who[]; at: string }): Tender | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state !== 'opened') return { error: 'The evaluation follows the opening' };
  for (const m of t.committee?.members ?? []) {
    const d = t.declarations.find(x => samePerson(x.member, m));
    if (!d) return { error: `Every committee member declares their interests before the evaluation: ${m.name} has not` };
    if (d.interest === 'declared' && !d.managed) return { error: `${m.name}'s declared interest is managed before the evaluation` };
  }
  for (const w of input.by) { const why = mayEvaluate(t, w); if (why) return { error: why }; }
  const v = latestVersion(t);
  const opened = db().bids.filter(b => b.tender === t.ref && b.state === 'opened').map(b => b.ref);
  for (const r of input.results) {
    if (!opened.includes(r.bid)) return { error: `${r.bid} is not an opened bid of this tender` };
    const c = v.criteria.find(x => x.id === r.criterion);
    if (!c) return { error: `${r.criterion} is not a published criterion (version ${v.n}): criteria never change after the deadline` };
    if (c.kind === 'pass-fail' && r.result === 'scored') return { error: `${c.id} is pass or fail` };
    if (c.kind === 'scored' && r.result !== 'scored') return { error: `${c.id} is scored` };
  }
  for (const b of opened) for (const c of v.criteria) if (!input.results.some(r => r.bid === b && r.criterion === c.id)) return { error: `No result for ${b} against ${c.id}` };
  if (!opened.includes(input.recommendation.bid)) return { error: 'The recommendation names an opened bid' };
  if (!ok(input.recommendation.reasons)) return { error: 'The recommendation carries its reasons: a score never decides on its own' };
  if (input.results.some(r => r.bid === input.recommendation.bid && r.result === 'does-not-meet')) return { error: 'The recommended bid does not meet a criterion' };
  t.evaluation = { at: input.at, by: clone(input.by), case: caseId, results: clone(input.results), recommendation: { bid: input.recommendation.bid, reasons: ok(input.recommendation.reasons, 4000) } };
  t.state = 'evaluated';
  recordAudit(input.by[0]!.name, 'procurement.evaluation.record', `Tender:${t.ref}`, 'ok', `${input.results.length} results · recommends ${input.recommendation.bid} · criteria version ${v.n} (${v.criteriaDigest.slice(0, 12)})`);
  return clone(t);
}

/** The award (a decision of two officials, neither of whom evaluated). */
export function awardTender(caseId: string, input: { bid: string; reasons: string; departure?: string; by: Who; confirmedBy?: Who; at: string }): Tender | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state !== 'evaluated') return { error: 'The award follows the evaluation' };
  for (const o of [input.by, input.confirmedBy]) if (o && t.evaluation?.by.some(e => samePerson(e, o))) return { error: 'The award is decided by officials who did not evaluate the bids' };
  if (t.challenges.some(c => c.state === 'open' && c.interim)) return { error: 'The review body\'s interim measure suspends the award' };
  const b = db().bids.find(x => x.ref === input.bid && x.tender === t.ref && x.state === 'opened');
  if (!b) return { error: `${input.bid} is not an opened bid of this tender` };
  if (b.ref !== t.evaluation!.recommendation.bid && !ok(input.departure)) return { error: 'Awarding a bid other than the one recommended: record why the recommendation is not followed' };
  t.award = { bid: b.ref, supplier: clone(b.supplier), valueMinor: b.opened!.priceMinor, currency: b.opened!.currency, reasons: ok(input.reasons, 4000) + (ok(input.departure) ? ` (departing from the recommendation: ${ok(input.departure, 2000)})` : ''), at: input.at, by: clone(input.by), ...(input.confirmedBy ? { confirmedBy: clone(input.confirmedBy) } : {}) };
  t.state = 'awarded';
  recordAudit((input.confirmedBy ?? input.by).name, 'procurement.award', `Tender:${t.ref}`, 'ok', `${b.ref} · ${b.supplier.number} · ${b.opened!.currency} ${b.opened!.priceMinor / 100}`);
  return clone(t);
}
export function cancelTender(caseId: string, reason: string, by: string, at: string): Tender | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state === 'contracted') return { error: 'A contracted tender is ended under its contract' };
  t.state = 'cancelled';
  recordAudit(by, 'procurement.tender.cancel', `Tender:${t.ref}`, 'ok', `${ok(reason, 160)} · ${at.slice(0, 10)}`);
  return clone(t);
}

// Challenges before the review body (§3.5 Department G): recorded by the review body's procedure on the procuring institution's tender.
export function lodgeChallenge(tender: string, c: { case: string; ref: string; body: string; at: string }): Tender | { error: string } {
  const t = tenderOf(tender);
  if (!t) return { error: `No tender ${tender}` };
  if (t.challenges.some(x => x.case === c.case)) return clone(t);
  t.challenges.push({ ...c, state: 'open' });
  recordAudit(c.body, 'procurement.challenge.lodge', `Tender:${t.ref}`, 'ok', `complaint ${c.ref}`);
  return clone(t);
}
export function interimMeasure(tender: string, caseId: string, measure: string, at: string, by: string): Tender | { error: string } {
  const t = tenderOf(tender);
  const c = t?.challenges.find(x => x.case === caseId);
  if (!t || !c) return { error: 'No such challenge' };
  c.interim = { at, measure: ok(measure, 300) };
  recordAudit(by, 'procurement.challenge.interim', `Tender:${t.ref}`, 'ok', ok(measure, 120));
  return clone(t);
}
export function decideChallenge(tender: string, caseId: string, result: 'upheld' | 'dismissed' | 'not-admitted', remedy: string, at: string, by: string): Tender | { error: string } {
  const t = tenderOf(tender);
  const c = t?.challenges.find(x => x.case === caseId);
  if (!t || !c) return { error: 'No such challenge' };
  c.state = 'decided';
  c.outcome = { at, result, ...(ok(remedy) ? { remedy: ok(remedy, 300) } : {}) };
  // An upheld challenge whose remedy annuls the award returns the tender to its evaluated state: the procuring institution decides again.
  if (result === 'upheld' && /annul/i.test(remedy) && t.award && t.state === 'awarded') {
    t.award.annulled = { at, by, reason: ok(remedy, 300), case: caseId };
    t.state = 'evaluated';
  }
  recordAudit(by, 'procurement.challenge.decide', `Tender:${t.ref}`, 'ok', `${result}${remedy ? ` · ${ok(remedy, 80)}` : ''}`);
  return clone(t);
}

// ── Contracts (§3.5 Department F) ────────────────────────────────────────────

export function signContract(caseId: string, input: { terms: string; by: string; at: string; sample?: true }): Contract | { error: string } {
  const t = tenderOf(caseId);
  if (!t) return { error: 'No tender on this case' };
  if (t.state !== 'awarded' || !t.award) return { error: 'A contract follows an award' };
  if (t.challenges.some(c => c.state === 'open')) return { error: 'A challenge to this tender is open before the review body: no contract is signed until it is decided' };
  if (ok(input.terms, 20000).length < 10) return { error: 'Give the contract terms as executed' };
  const d = db();
  const terms = ok(input.terms, 20000);
  const k: Contract = {
    id: uuid7(), ref: nextNumber(counters(), 'contractSeq', 'CTR', new Date(input.at)), tender: t.ref, institution: t.institution, supplier: clone(t.award.supplier), currency: t.award.currency,
    versions: [{ n: 1, at: input.at, valueMinor: t.award.valueMinor, terms, termsDigest: sha(terms), change: 'signed', reasons: 'Executed on the award', case: caseId, by: input.by }],
    deliverables: [], certifications: [], state: 'active', case: caseId, at: input.at, ...(input.sample ? { sample: true as const } : {}),
  };
  d.contracts.push(k);
  t.contract = k.ref;
  t.state = 'contracted';
  recordAudit(input.by, 'procurement.contract.sign', `Contract:${k.ref}`, 'ok', `tender ${t.ref} · ${k.supplier.number} · ${k.currency} ${t.award.valueMinor / 100} · terms ${k.versions[0]!.termsDigest.slice(0, 12)}`);
  return clone(k);
}
const contractOf = (x: string) => db().contracts.find(k => k.id === x || k.ref === x);
export const getContract = (x: string): Contract | undefined => { const k = contractOf(x); return k ? clone(k) : undefined; };
export const contractValue = (k: Pick<Contract, 'versions'>) => k.versions[k.versions.length - 1]!.valueMinor;

/** A variation (a decision of two officials): a new version of the contract, the executed one kept. */
export function varyContract(ref: string, input: { valueMinor: number; terms?: string; reasons: string; case: string; by: string; at: string }): Contract | { error: string } {
  const k = contractOf(ref);
  if (!k) return { error: `No contract ${ref}` };
  if (k.state !== 'active') return { error: `${k.ref} is ${k.state}` };
  if (!Number.isInteger(input.valueMinor) || input.valueMinor <= 0) return { error: 'The varied value is a positive whole number of minor units' };
  const certified = k.certifications.reduce((s, c) => s + c.amountMinor, 0);
  if (input.valueMinor < certified) return { error: `${k.ref} has ${certified / 100} certified for payment: a variation never goes below that` };
  if (!ok(input.reasons)) return { error: 'Give the reasons' };
  const prev = k.versions[k.versions.length - 1]!;
  const terms = ok(input.terms, 20000) || prev.terms;
  k.versions.push({ n: prev.n + 1, at: input.at, valueMinor: input.valueMinor, terms, termsDigest: sha(terms), change: 'varied', reasons: ok(input.reasons, 2000), case: input.case, by: input.by });
  recordAudit(input.by, 'procurement.contract.vary', `Contract:${k.ref}`, 'ok', `version ${prev.n + 1} · ${k.currency} ${prev.valueMinor / 100} → ${input.valueMinor / 100}`);
  return clone(k);
}
export function attachContractDecision(ref: string, caseId: string, decision: string): void {
  const k = contractOf(ref);
  if (!k) return;
  for (const v of k.versions) if (v.case === caseId) v.decision ??= decision;
  for (const d of k.deliverables) if (d.accepted?.case === caseId) d.accepted.decision ??= decision;
}

export function submitDeliverable(ref: string, description: string, at: string, by: string): Deliverable | { error: string } {
  const k = contractOf(ref);
  if (!k) return { error: `No contract ${ref}` };
  if (k.state !== 'active') return { error: `${k.ref} is ${k.state}` };
  if (!ok(description)) return { error: 'Describe the deliverable' };
  const d: Deliverable = { id: uuid7(), description: ok(description, 1000), at };
  k.deliverables.push(d);
  recordAudit(by, 'procurement.deliverable.submit', `Contract:${k.ref}`, 'ok', ok(description, 120));
  return clone(d);
}
export function decideDeliverable(ref: string, id: string, accepted: boolean, reasons: string, by: Who, caseId: string, at: string): Deliverable | { error: string } {
  const k = contractOf(ref);
  const d = k?.deliverables.find(x => x.id === id);
  if (!k || !d) return { error: 'No such deliverable' };
  if (d.accepted || d.rejected) return { error: 'The deliverable is already decided' };
  if (!ok(reasons)) return { error: 'Give the reasons, with the inspection evidence relied on' };
  if (accepted) d.accepted = { by: clone(by), at, reasons: ok(reasons, 2000), case: caseId };
  else d.rejected = { by: clone(by), at, reasons: ok(reasons, 2000), case: caseId };
  recordAudit(by.name, `procurement.deliverable.${accepted ? 'accept' : 'reject'}`, `Contract:${k.ref}`, 'ok', ok(reasons, 120));
  return clone(d);
}
/** Certify an invoice against an accepted deliverable: never payment execution, never above the contract's value, never by the official who accepted it. */
export function certifyPayment(ref: string, input: { deliverable: string; invoiceRef: string; amountMinor: number; by: Who; case: string; at: string }): Certification | { error: string } {
  const k = contractOf(ref);
  if (!k) return { error: `No contract ${ref}` };
  const d = k.deliverables.find(x => x.id === input.deliverable);
  if (!d?.accepted) return { error: 'A payment is certified only against an accepted deliverable' };
  if (samePerson(d.accepted.by, input.by)) return { error: 'Separation of duties: the payment is certified by a person other than the one who accepted the deliverable' };
  if (!ok(input.invoiceRef) || !whole(input.amountMinor)) return { error: 'Give the invoice reference and the amount certified' };
  if (k.certifications.some(c => c.invoiceRef === ok(input.invoiceRef, 80))) return { error: `Invoice ${input.invoiceRef} is already certified` };
  const certified = k.certifications.reduce((s, c) => s + c.amountMinor, 0);
  if (certified + input.amountMinor > contractValue(k)) return { error: `Above the contract's value (${contractValue(k) / 100}, of which ${certified / 100} is certified)` };
  const c: Certification = { ref: nextNumber(counters(), 'certSeq', 'PCT', new Date(input.at)), deliverable: d.id, invoiceRef: ok(input.invoiceRef, 80), amountMinor: input.amountMinor, by: clone(input.by), at: input.at, case: input.case };
  k.certifications.push(c);
  recordAudit(input.by.name, 'procurement.payment.certify', `Contract:${k.ref}`, 'ok', `${c.ref} · invoice ${c.invoiceRef} · ${k.currency} ${c.amountMinor / 100} (certified, not paid)`);
  return clone(c);
}

/** What the treasury needs to pay against a contract: its supplier and, for an invoice, its certification (lib/finance reads it). */
export function contractForPayment(ref: string, invoiceRef?: string): { ref: string; supplier: string; institution: string; valueMinor: number; certification?: { ref: string; amountMinor: number } } | undefined {
  const k = contractOf(ref);
  if (!k || k.state === 'terminated') return undefined;
  const c = invoiceRef ? k.certifications.find(x => x.invoiceRef === invoiceRef) : undefined;
  return { ref: k.ref, supplier: k.supplier.number, institution: k.institution, valueMinor: contractValue(k), ...(c ? { certification: { ref: c.ref, amountMinor: c.amountMinor } } : {}) };
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** A bid as anyone may see it before the opening: the receipt only (never the content); after the opening, what was opened. */
export function bidView(b: SealedBid): Omit<SealedBid, 'sealed'> {
  const { sealed: _s, ...rest } = clone(b);
  return rest;
}
export const bidsOf = (tender: string): Omit<SealedBid, 'sealed'>[] => db().bids.filter(b => b.tender === tender || b.tender === tenderOf(tender)?.ref).map(bidView);

/** Declarations without their details (the details stay on the restricted record, for the institution's own officials). */
const publicDeclarations = (t: Tender) => t.declarations.map(d => ({ member: d.member.name, at: d.at, interest: d.interest, ...(d.managed ? { managed: { outcome: d.managed.outcome, by: d.managed.by.name, at: d.managed.at } } : {}) }));

/** Everything for these institutions (all when undefined): bids sealed until opened, declarations' details only with `restricted`. */
export function procurementRecords(institutions?: string[], opts: { restricted?: boolean } = {}) {
  const d = db();
  const mine = (i: string) => !institutions || institutions.includes(i);
  return {
    plans: d.plans.filter(p => mine(p.institution)).map(clone),
    tenders: d.tenders.filter(t => mine(t.institution)).map(t => ({ ...clone(t), declarations: opts.restricted ? clone(t.declarations) : publicDeclarations(t), bids: bidsOf(t.ref) })),
    contracts: d.contracts.filter(k => mine(k.institution)).map(k => ({ ...clone(k), valueMinor: contractValue(k) })),
  };
}

/**
 * The tender as an Open Contracting Data Standard release (OCDS 1.1; spec
 * §9.3: publish approved procurement information through OCDS mappings). Only
 * what a public notice carries: no bid content, no declaration, no unsuccessful
 * bidder's price. The ocid needs the publisher prefix the nation registers with
 * the Open Contracting Partnership: until it is set the release says so.
 */
export function ocdsRelease(tender: string, prefix?: string) {
  const t = tenderOf(tender);
  if (!t || t.state === 'prepared') return undefined;
  const v = latestVersion(t);
  const status = t.state === 'cancelled' ? 'cancelled' : t.state === 'published' ? 'active' : 'complete';
  const k = t.contract ? contractOf(t.contract) : undefined;
  return {
    ocid: prefix ? `${prefix}-${t.ref}` : null,
    ...(prefix ? {} : { note: 'No OCDS publisher prefix is registered for this nation: the release is not published until it is' }),
    id: `${t.ref}-${v.n}`, date: t.publishedAt ?? t.at, tag: [t.contract ? 'contract' : t.award && !t.award.annulled ? 'award' : 'tender'], initiationType: 'tender',
    buyer: { id: t.institution },
    tender: { id: t.ref, title: t.title, description: v.scope.slice(0, 2000), status, procurementMethodDetails: t.method, tenderPeriod: { startDate: t.publishedAt, endDate: v.deadline }, awardCriteriaDetails: v.criteria.map(c => `${c.id}: ${c.description}`).join('; '), numberOfTenderers: t.opening?.opened.length },
    ...(t.award && !t.award.annulled ? { awards: [{ id: `${t.ref}-award`, status: 'active', date: t.award.at, suppliers: [{ id: t.award.supplier.number, name: t.award.supplier.name }], value: { amount: t.award.valueMinor / 100, currency: t.award.currency } }] } : {}),
    ...(k ? { contracts: [{ id: k.ref, awardID: `${t.ref}-award`, status: k.state === 'active' ? 'active' : 'terminated', value: { amount: contractValue(k) / 100, currency: k.currency }, dateSigned: k.at, amendments: k.versions.slice(1).map(x => ({ id: `${k.ref}-v${x.n}`, date: x.at, rationale: x.reasons })) }] } : {}),
  };
}

export function procurementCounts() {
  const d = db();
  const by = <T extends { state: string }>(xs: T[]) => xs.reduce<Record<string, number>>((m, x) => ({ ...m, [x.state]: (m[x.state] ?? 0) + 1 }), {});
  return { plans: by(d.plans), tenders: by(d.tenders), bids: by(d.bids), contracts: by(d.contracts), challenges: d.tenders.reduce((s, t) => s + t.challenges.length, 0) };
}

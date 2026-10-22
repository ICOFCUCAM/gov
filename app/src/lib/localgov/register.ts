// Local and regional government records (plan step I7; specification Part 3
// §C.9 "Municipalities, Provinces and Regional Government"; supplement Part 19
// LRG-ORG-004, 005, LRG-FIN-008, LRG-SVC-013, 014: "Local and regional
// authorities must have their own institutional scope, records and delegated
// powers. A central-government administrator must not be able to alter local
// resolutions, budgets or case records without an authorized legal
// relationship and an auditable action.").
//
// Each local government is an institution of standing `subnational`, outside
// whole-government reach (lib/auth/roles.ts Boundaries.subnational): its
// council's standing rules, resolutions, budgets and service requests are its
// own records, written only by the effects of its own procedures
// (lib/localgov/procedures.ts, adopted by it as lg.<template>.<institution>)
// and its rules only by its own officials (two of them, citing the law). The
// centre reads them only under an approved relationship (read, for a listed
// purpose, logged) and never changes them.
//
// The council's rules (seats, quorum, the majority a resolution needs) are
// the council's own law, entered by its officials, never shipped: a vote is
// checked against the version in force, which the certified resolution keeps.

import { createHash } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges, type PolicyVersion } from '@/lib/law/policy-change';

export type Majority = 'simple' | 'absolute' | 'two-thirds';
export const MAJORITIES: { key: Majority; label: string }[] = [
  { key: 'simple', label: 'More votes for than against' }, { key: 'absolute', label: 'More than half of all seats' }, { key: 'two-thirds', label: 'At least two thirds of the members present' },
];
export interface CouncilRuleValues { seats: number; quorum: { kind: 'count' | 'fraction'; value: number }; majority: Majority }
export interface AdoptedCouncilRules extends CouncilRuleValues { version: number; digest: string; at: string; by: string; confirmedBy?: string }

export interface Vote { present: number; for: number; against: number; abstain: number; recused: number }
export interface VoteCheck { seats: number; required: number; quorate: boolean; carried: boolean; majority: Majority; why?: string }

export interface Resolution {
  number: string;
  council: string;
  case: { id: string; ref: string };
  meeting: { id: string; date: string };
  agendaItem: string;
  text: string;
  vote: Vote;
  check: VoteCheck;
  rules: { version: number; digest: string };
  conflicts: string[];
  minutes?: string;
  decision?: string;
  at: string; by: string;
  sample?: true;
}
export interface BudgetLine { line: string; amountMinor: number }
export interface LocalBudget {
  number: string;
  council: string;
  case: { id: string; ref: string };
  fiscalYear: string;
  version: string;
  revenue: BudgetLine[]; expenditure: BudgetLine[]; capital: BudgetLine[];
  totals: { revenue: number; expenditure: number; capital: number; balance: number };
  approvedBy: string;
  submittedTo?: string;
  decision?: string;
  at: string;
  sample?: true;
}
export interface ServiceRequest {
  number: string;
  institution: string;
  case: { id: string; ref: string };
  kind: 'service' | 'complaint';
  service: string;
  place: { regionCode?: string; region?: string; districtCode?: string; district?: string; point?: [number, number] };
  state: 'open' | 'resolved' | 'closed';
  outcome?: { at: string; by: string; reasons: string; decision?: string };
  at: string;
  sample?: true;
}

interface Council { rules?: AdoptedCouncilRules; changes: PolicyChanges<CouncilRuleValues> }
interface Db { councils: Record<string, Council>; resolutions: Resolution[]; budgets: LocalBudget[]; requests: ServiceRequest[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosLocalGov?: Db };
const db = (): Db => {
  const d = touch('__civicosLocalGov', g.__civicosLocalGov ??= { councils: {}, resolutions: [], budgets: [], requests: [], seq: {} });
  d.councils ??= {}; d.resolutions ??= []; d.budgets ??= []; d.requests ??= []; d.seq ??= {};
  return d;
};
export function resetLocalGov(): void { g.__civicosLocalGov = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const next = (prefix: string, now: Date) => { const d = db(); d.seq[prefix] = (d.seq[prefix] ?? 0) + 1; return `${prefix}-${now.getUTCFullYear()}-${String(d.seq[prefix]).padStart(6, '0')}`; };
const council = (id: string): Council => (db().councils[id] ??= { changes: {} });

// ── The council's rules (its own officials, two of them, citing the law) ─────

function checkRules(v: CouncilRuleValues): string | null {
  if (!Number.isInteger(v.seats) || v.seats < 1 || v.seats > 2000) return 'The council has a whole number of seats (from 1)';
  if (v.quorum.kind === 'count' && (!Number.isInteger(v.quorum.value) || v.quorum.value < 1 || v.quorum.value > v.seats)) return 'A quorum in members is a whole number up to the seats';
  if (v.quorum.kind === 'fraction' && !(v.quorum.value > 0 && v.quorum.value <= 1)) return 'A quorum as a share of the seats is above 0 and at most 1';
  if (!MAJORITIES.some(m => m.key === v.majority)) return `The majority is ${MAJORITIES.map(m => m.key).join(', ')}`;
  return null;
}
const describe = (v: CouncilRuleValues) => `${v.seats} seats, quorum ${v.quorum.kind === 'count' ? `${v.quorum.value} members` : `${v.quorum.value} of the seats`}, ${v.majority} majority`;
const digestOf = (v: CouncilRuleValues) => createHash('sha256').update(JSON.stringify([v.seats, v.quorum, v.majority]), 'utf8').digest('hex');

export const councilRules = (institution: string): AdoptedCouncilRules | null => { const r = db().councils[institution]?.rules; return r ? clone(r) : null; };
export const councilRuleChanges = (institution: string): PolicyChanges<CouncilRuleValues> => clone(db().councils[institution]?.changes ?? {});

export function proposeCouncilRules(institution: string, input: { seats?: unknown; quorum?: unknown; majority?: unknown; legalBasis?: unknown }, by: string, byId?: string, now = new Date()): ReturnType<typeof proposePolicy<CouncilRuleValues>> {
  const c = council(institution);
  const q = (input.quorum ?? {}) as { kind?: unknown; value?: unknown };
  const current: CouncilRuleValues = c.rules ? { seats: c.rules.seats, quorum: { ...c.rules.quorum }, majority: c.rules.majority } : { seats: 0, quorum: { kind: 'count', value: 0 }, majority: 'simple' };
  const change: Partial<CouncilRuleValues> = {
    ...(input.seats !== undefined ? { seats: Number(input.seats) } : {}),
    ...(input.quorum !== undefined ? { quorum: { kind: q.kind === 'fraction' ? 'fraction' as const : 'count' as const, value: Number(q.value) } } : {}),
    ...(input.majority !== undefined ? { majority: String(input.majority) as Majority } : {}),
  };
  return proposePolicy(c.changes, current, change, input.legalBasis, { by, ...(byId ? { byId } : {}), now, pendingHours: 72, audit: `localgov.rules.${institution}`, context: 'Council standing rules', check: checkRules, describe });
}
export function confirmCouncilRules(institution: string, by: string, byId?: string, now = new Date()): PolicyVersion<CouncilRuleValues> | { error: string } {
  const c = council(institution);
  return confirmPolicy(c.changes, { by, ...(byId ? { byId } : {}), now, audit: `localgov.rules.${institution}`, describe, adopt: v => {
    c.rules = { ...clone(v.values), version: (c.rules?.version ?? 0) + 1, digest: digestOf(v.values), at: now.toISOString(), by: v.by, ...(v.confirmed ? { confirmedBy: v.confirmed.by } : {}) };
  } });
}
export function withdrawCouncilRules(institution: string, by: string, reason?: string): { ok: true } | { error: string } {
  return withdrawPolicy(council(institution).changes, { by, ...(reason ? { reason } : {}), audit: `localgov.rules.${institution}` });
}

/** Check a vote against the council's rules in force: quorum, then the majority. Never decides anything by itself. */
export function checkVote(rules: CouncilRuleValues, vote: Vote): VoteCheck | { error: string } {
  const n = [vote.present, vote.for, vote.against, vote.abstain, vote.recused];
  if (n.some(x => !Number.isInteger(x) || x < 0)) return { error: 'Members present and votes are whole numbers' };
  if (vote.present > rules.seats) return { error: `More members present (${vote.present}) than the council has seats (${rules.seats})` };
  if (vote.for + vote.against + vote.abstain + vote.recused > vote.present) return { error: 'More votes and recusals than members present' };
  const required = rules.quorum.kind === 'count' ? rules.quorum.value : Math.ceil(rules.seats * rules.quorum.value);
  const quorate = vote.present >= required;
  const carried = quorate && (rules.majority === 'simple' ? vote.for > vote.against : rules.majority === 'absolute' ? vote.for > rules.seats / 2 : vote.for * 3 >= vote.present * 2);
  return { seats: rules.seats, required, quorate, carried, majority: rules.majority, ...(!quorate ? { why: `Not quorate: ${vote.present} present, ${required} required` } : !carried ? { why: `Not carried: ${vote.for} for, ${vote.against} against (${rules.majority} majority)` } : {}) };
}

// ── Changes (only from lib/localgov/procedures.ts) ────────────────────────────

export function recordResolution(input: Omit<Resolution, 'number' | 'at' | 'sample'> & { sample?: boolean }, now = new Date()): Resolution {
  const { sample, ...rest } = input;
  const r: Resolution = { ...clone(rest), number: next('RES', now), at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().resolutions.push(r);
  recordAudit(r.by, 'localgov.resolution', `Resolution:${r.number}`, 'ok', `${r.council} · meeting ${r.meeting.id} item ${r.agendaItem} · ${r.vote.for}-${r.vote.against}-${r.vote.abstain} of ${r.vote.present} present (quorum ${r.check.required}) · rules v${r.rules.version}`);
  return clone(r);
}
export function adoptBudget(input: Omit<LocalBudget, 'number' | 'at' | 'sample'> & { sample?: boolean }, now = new Date()): LocalBudget {
  const { sample, ...rest } = input;
  const b: LocalBudget = { ...clone(rest), number: next('LBG', now), at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().budgets.push(b);
  recordAudit('Local government', 'localgov.budget', `LocalBudget:${b.number}`, 'ok', `${b.council} · ${b.fiscalYear} ${b.version} · resolution ${b.approvedBy}`);
  return clone(b);
}
export function openRequest(input: Omit<ServiceRequest, 'number' | 'at' | 'state' | 'sample'> & { sample?: boolean }, now = new Date()): ServiceRequest {
  const existing = db().requests.find(r => r.case.id === input.case.id);
  if (existing) return clone(existing);
  const { sample, ...rest } = input;
  const r: ServiceRequest = { ...clone(rest), number: next(input.kind === 'complaint' ? 'LCP' : 'LSR', now), state: 'open', at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().requests.push(r);
  return clone(r);
}
export function closeRequest(caseId: string, state: 'resolved' | 'closed', outcome: NonNullable<ServiceRequest['outcome']>): ServiceRequest | { error: string } {
  const r = db().requests.find(x => x.case.id === caseId);
  if (!r) return { error: 'No request is recorded for this case' };
  r.state = state; r.outcome = clone(outcome);
  return clone(r);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export const getResolution = (number: string): Resolution | undefined => { const r = db().resolutions.find(x => x.number === number); return r ? clone(r) : undefined; };
export const resolutionOfCase = (caseId: string): Resolution | undefined => { const r = db().resolutions.find(x => x.case.id === caseId); return r ? clone(r) : undefined; };
export const budgetOfCase = (caseId: string): LocalBudget | undefined => { const b = db().budgets.find(x => x.case.id === caseId); return b ? clone(b) : undefined; };
export const requestOfCase = (caseId: string): ServiceRequest | undefined => { const r = db().requests.find(x => x.case.id === caseId); return r ? clone(r) : undefined; };
/** One local government's own records (the route decides who may read them). */
export function localRecords(institution: string): { rules: AdoptedCouncilRules | null; resolutions: Resolution[]; budgets: LocalBudget[]; requests: ServiceRequest[] } {
  const d = db();
  return { rules: councilRules(institution), resolutions: d.resolutions.filter(r => r.council === institution).map(clone), budgets: d.budgets.filter(b => b.council === institution).map(clone), requests: d.requests.filter(r => r.institution === institution).map(clone) };
}
/** Requests with a recorded place, for a map: region, district and point only (never the description). */
export const requestPlaces = (institution?: string) => db().requests.filter(r => !institution || r.institution === institution).map(r => ({ number: r.number, kind: r.kind, state: r.state, place: clone(r.place), ...(r.sample ? { sample: true as const } : {}) }));
export function localCounts(institution?: string): { resolutions: number; budgets: number; requests: number; open: number; resolved: number; councilsWithRules: number; samples: number } {
  const d = db();
  const mine = <T extends { council?: string; institution?: string }>(xs: T[]) => xs.filter(x => !institution || (x.council ?? x.institution) === institution);
  const req = mine(d.requests);
  return {
    resolutions: mine(d.resolutions).length, budgets: mine(d.budgets).length, requests: req.length, open: req.filter(r => r.state === 'open').length, resolved: req.filter(r => r.state !== 'open').length,
    councilsWithRules: Object.entries(d.councils).filter(([k, c]) => c.rules && (!institution || k === institution)).length,
    samples: [...mine(d.resolutions), ...mine(d.budgets), ...req].filter(x => (x as { sample?: true }).sample).length,
  };
}

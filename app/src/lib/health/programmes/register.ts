// The register of public-health programmes (Institutional specification Part
// 2 §C.2, the Programme record: "Programme identifier, approved eligibility,
// coverage definition, budget reference, reporting period"; Health I4
// dependency `public-health-programmes`, docs/HEALTH_I4_DEPENDENCIES.md).
// Kept for the institution the nation names in the `publicHealth` slot of its
// deployment profile (lib/data/register-owners.ts), never a ministry by name;
// until it is named nobody keeps it (a provisional owner never runs a case).
//
// Administrative records and aggregates only. A programme holds its terms by
// version: title, the approved eligibility (a provision of the nation's law in
// the laws register, cited when the decision is made; none ships), the
// coverage definition with its denominator and the denominator's documented
// source, the budget reference (a reference into the nation's budget, kept by
// finance: plan step I5), the reporting period, the indicators the programme
// reports, the areas it covers and its supply items (a product of the register
// of medicines and medical devices by its number, a unit; no lot, stock or
// location: there is no warehouse here). Its interventions (population or area
// measures under the nation's intervention authority rules, CFG-PH-003) and
// its aggregate returns (HLT-PH-015, HLT-PH-011: counts by area and period,
// each count marked reported, suspected, confirmed or modelled and counted,
// estimated, incomplete or not available) are kept with it.
//
// Never an individual: no case, contact, laboratory or vaccination record is
// held, and none can be: every value has a fixed shape (keys, whole numbers,
// regions, dates), and the scope check (lib/forms/scope.ts) refuses any
// procedure whose fields name a patient, a vaccinee, a contact or a specimen.
//
// It changes only through the effects of the public-health procedures
// (lib/health/programmes/procedures.ts; lib/casework/register-writes.test.ts):
// a programme is established, amended, suspended, reinstated or closed by a
// sealed two-official decision; an intervention likewise; a return is
// recorded when an officer accepts it after validation. Every change is a new
// version or a history step; a correction is a new version of the return, the
// one it corrects kept. Published figures pass through publishedReturn(): the
// nation's small-cell rule (lib/health/small-cells.ts) applied, the four
// classes of count kept apart, a missing count never a zero. Held in platform
// state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber } from '@/lib/data/numbering';
import { withDefaults } from '@/lib/data/defaults';
import { nationRegions } from '@/lib/nation/registry';
import { getOrganisation } from '@/lib/organisations/register';
import { productByReference } from '@/lib/health/products/register';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges } from '@/lib/law/policy-change';
import type { Citation } from '@/lib/law/register';
import { protect, smallCellRule, type Cell } from '@/lib/health/small-cells';

export type ProgrammeState = 'established' | 'suspended' | 'closed';
export const PROGRAMME_STATE_LABEL: Record<ProgrammeState, string> = { established: 'Established', suspended: 'Suspended', closed: 'Closed' };
/** How often a programme reports (a term of the programme's decision, not a deadline). */
export const REPORTING_PERIODS = ['month', 'quarter', 'year'] as const;
export type ReportingPeriod = (typeof REPORTING_PERIODS)[number];
/** The four classes of public-health count kept apart (field series Part 6 §4: an initial report, a suspected case, a confirmed case and a modelled figure; gate FC6-12-06). */
export const COUNT_BASES = ['reported', 'suspected', 'confirmed', 'modelled'] as const;
export type CountBasis = (typeof COUNT_BASES)[number];
export const BASIS_LABEL: Record<CountBasis, string> = { reported: 'Reported', suspected: 'Suspected', confirmed: 'Confirmed', modelled: 'Modelled' };
/** Whether a count was counted, estimated, incomplete or not available (HLT-PH-015's civicos.aggregate.count_status). */
export const COUNT_QUALITY = ['counted', 'estimated', 'incomplete', 'not-available'] as const;
export type CountQuality = (typeof COUNT_QUALITY)[number];

export interface SupplyItem { id: string; product: string; unit: string }
export interface ProgrammeTerms {
  title: string;
  /** The approved eligibility: the provision of the nation's law, cited in the laws register (empty: none cited, a demonstration only). */
  eligibility: { basis: Citation[]; note?: string };
  coverage: { definition: string; denominator?: string; denominatorSource?: string };
  /** A reference into the nation's budget (finance keeps it: plan step I5). */
  budgetReference?: string;
  reportingPeriod: ReportingPeriod;
  /** The indicators the programme reports (keys the nation approves; none ship). */
  indicators: string[];
  /** The regions the programme covers (empty: the whole nation). */
  areas: string[];
  supplyItems: SupplyItem[];
}
export interface ProgrammeVersion { n: number; terms: ProgrammeTerms; at: string; by: string; reason: string; case: string; decision?: string }
export interface ProgrammeStep { state: ProgrammeState; at: string; by: string; reason: string; case: string; decision?: string; version: number; sample?: true }
export interface Programme {
  id: string;
  /** PHP-YYYY-NNNNNN. */
  number: string;
  state: ProgrammeState;
  versions: ProgrammeVersion[];
  history: ProgrammeStep[];
  case: string;
  createdAt: string;
  sample?: true;
}

export interface Intervention {
  id: string;
  /** PHI-YYYY-NNNNNN. */
  number: string;
  programme?: string;
  /** A kind from the nation's intervention authority rules (CFG-PH-003). */
  kind: string;
  /** The regions it applies to: an area or population measure, never a person. */
  areas: string[];
  measure: string;
  from: string; to?: string; reviewBy?: string;
  /** The rule version it was checked against, or that none was adopted (demonstrations only). */
  rule: { version: number; authority: string; reviewRequired: boolean; expiryRequired: boolean } | { none: true };
  state: 'in-force' | 'ended';
  reviews: { at: string; by: string; reason: string; case: string }[];
  case: string; at: string; by: string; decision?: string;
  sample?: true;
}

export interface ReturnEntry { indicator: string; breakdown?: string; supplyItem?: string; basis: CountBasis; quality: CountQuality; value?: number }
export interface ReturnVersion { n: number; entries: ReturnEntry[]; complete: boolean; method?: string; case: string; at: string; by: string; corrects?: string }
export interface ProgrammeReturn {
  id: string;
  /** PHR-YYYY-NNNNNN. */
  number: string;
  programme: string;
  /** The reporting facility or reporter: an organisation of the organisations register, by its number. */
  reporter: string;
  area: string;
  period: { from: string; to: string };
  versions: ReturnVersion[];
  sample?: true;
}

/** One kind of intervention in the nation's rules: who decides it (a slot of the deployment profile) and what each decision must carry. */
export interface InterventionRule { kind: string; authority: string; reviewRequired: boolean; expiryRequired: boolean }
type Rules = { rules: InterventionRule[] };

type Db = {
  programmes: Programme[]; interventions: Intervention[]; returns: ProgrammeReturn[];
  phpSeq: number; phiSeq: number; phrSeq: number;
  ruleChanges: PolicyChanges<Rules>; adopted: Rules & { version: number };
};
const seed = (): Db => ({ programmes: [], interventions: [], returns: [], phpSeq: 0, phiSeq: 0, phrSeq: 0, ruleChanges: {}, adopted: { rules: [], version: 0 } });
const g = globalThis as unknown as { __civicosHealthProgrammes?: Db };
const db = (): Db => touch('__civicosHealthProgrammes', g.__civicosHealthProgrammes = withDefaults(g.__civicosHealthProgrammes ??= seed(), seed()));
export function resetProgrammes(): void { g.__civicosHealthProgrammes = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const keys = (v: unknown, max = 60): string[] => [...new Set((Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[;\n,]/) : []).map(x => str(x, 60).toLowerCase()).filter(Boolean))].slice(0, max);
const find = (ref: string) => db().programmes.find(p => p.number === ref || p.id === ref);
const latest = (p: Programme) => p.versions[p.versions.length - 1]!;
const regionsOk = (areas: string[]): string | null => {
  const known = nationRegions();
  const bad = known.length ? areas.filter(a => !known.includes(a)) : [];
  return bad.length ? `${bad.join(', ')}: not one of the nation's regions` : null;
};

// ── Programme terms ──────────────────────────────────────────────────────────

/** The terms a decision states, checked: every value of a fixed shape, nothing about any person. */
export function checkTerms(input: { title?: unknown; basis?: Citation[]; eligibilityNote?: unknown; coverageDefinition?: unknown; denominator?: unknown; denominatorSource?: unknown; budgetReference?: unknown; reportingPeriod?: unknown; indicators?: unknown; areas?: unknown; supplyItems?: unknown }, prev?: ProgrammeTerms): ProgrammeTerms | { error: string } {
  const title = str(input.title, 200) || prev?.title || '';
  if (title.length < 3) return { error: 'Give the programme its title' };
  const definition = str(input.coverageDefinition, 1000) || prev?.coverage.definition || '';
  if (!definition) return { error: 'Define the programme\'s coverage: who or what it reaches, and how coverage is counted' };
  const denominator = str(input.denominator, 300) || prev?.coverage.denominator;
  const denominatorSource = str(input.denominatorSource, 300) || prev?.coverage.denominatorSource;
  if (denominator && !denominatorSource) return { error: 'Name the documented source of the coverage denominator (a register, a census or survey, with its date)' };
  const reportingPeriod = (str(input.reportingPeriod) || prev?.reportingPeriod) as ReportingPeriod;
  if (!REPORTING_PERIODS.includes(reportingPeriod)) return { error: `The reporting period is ${REPORTING_PERIODS.join(', ')}` };
  const indicators = input.indicators !== undefined && keys(input.indicators).length ? keys(input.indicators) : prev?.indicators ?? [];
  if (!indicators.length) return { error: 'Name the indicators the programme reports (keys from the nation\'s approved indicator definitions)' };
  if (indicators.some(k => !KEY.test(k))) return { error: 'An indicator is a key: lower-case letters, digits, dots and hyphens' };
  const areas = input.areas !== undefined ? [...new Set((Array.isArray(input.areas) ? input.areas : str(input.areas, 4000).split(/[;\n,]/)).map(x => str(x, 120)).filter(Boolean))].slice(0, 200) : prev?.areas ?? [];
  const badArea = regionsOk(areas);
  if (badArea) return { error: badArea };
  let supplyItems = prev?.supplyItems ?? [];
  if (input.supplyItems !== undefined && input.supplyItems !== '') {
    const rows = Array.isArray(input.supplyItems) ? input.supplyItems : str(input.supplyItems, 4000).split('\n').filter(l => l.trim()).map(l => { const [product, unit] = l.split('|').map(x => x.trim()); return { product, unit }; });
    const out: SupplyItem[] = [];
    for (const r of rows.slice(0, 100)) {
      const x = (r ?? {}) as { product?: unknown; unit?: unknown };
      const ref = str(x.product, 80), unit = str(x.unit, 40);
      const p = ref ? productByReference(ref) : undefined;
      if (!p) return { error: `Supply item ${ref || '(none given)'}: not a decided product of the register of medicines and medical devices` };
      if (!unit) return { error: `Supply item ${p.number}: name its unit (doses, packs, vials…)` };
      const id = `${p.number}|${unit}`;
      if (!out.some(s => s.id === id)) out.push({ id, product: p.number, unit });
    }
    supplyItems = out;
  }
  const budgetReference = str(input.budgetReference, 120) || prev?.budgetReference;
  const eligibilityNote = str(input.eligibilityNote, 500) || prev?.eligibility.note;
  return {
    title, eligibility: { basis: input.basis ?? prev?.eligibility.basis ?? [], ...(eligibilityNote ? { note: eligibilityNote } : {}) },
    coverage: { definition, ...(denominator ? { denominator } : {}), ...(denominatorSource ? { denominatorSource } : {}) },
    ...(budgetReference ? { budgetReference } : {}), reportingPeriod, indicators, areas, supplyItems,
  };
}

function step(p: Programme, state: ProgrammeState, reason: string, caseId: string, by: string, now: Date, sample?: true): void {
  p.state = state;
  p.history.push({ state, at: now.toISOString(), by, reason: reason.slice(0, 500), case: caseId, version: latest(p).n, ...(sample ? { sample } : {}) });
}

// ── Changes: only through the public-health procedures' effects ──────────────

/** Establish a programme with the terms the decision states. */
export function establishProgramme(terms: ProgrammeTerms, reason: string, caseId: string, by: string, now = new Date(), sample?: true): Programme | { error: string } {
  if (db().programmes.some(p => p.case === caseId)) return { error: 'This case has already established its programme' };
  if (db().programmes.some(p => p.state !== 'closed' && latest(p).terms.title.toLowerCase() === terms.title.toLowerCase())) return { error: `A programme called ${terms.title} is already on the register` };
  const at = now.toISOString();
  const p: Programme = {
    id: uuid7(), number: nextNumber(db() as unknown as Record<string, unknown>, 'phpSeq', 'PHP', now), state: 'established',
    versions: [{ n: 1, terms: clone(terms), at, by, reason: reason.slice(0, 500), case: caseId }], history: [], case: caseId, createdAt: at, ...(sample ? { sample } : {}),
  };
  step(p, 'established', reason, caseId, by, now, sample);
  db().programmes.push(p);
  recordAudit(by, 'programme.establish', `Programme:${p.number}`, 'ok', `${terms.indicators.length} indicator(s) · ${terms.supplyItems.length} supply item(s) · case ${caseId}${sample ? ' · sample' : ''}`);
  return clone(p);
}

/** Amend an established programme: its new terms as a new version. */
export function amendProgramme(ref: string, terms: ProgrammeTerms, reason: string, caseId: string, by: string, now = new Date(), sample?: true): Programme | { error: string } {
  const p = find(ref);
  if (!p) return { error: `No programme ${ref || '(none given)'} on the register` };
  if (p.state !== 'established') return { error: `${p.number} is ${PROGRAMME_STATE_LABEL[p.state].toLowerCase()}: only an established programme is amended` };
  p.versions.push({ n: latest(p).n + 1, terms: clone(terms), at: now.toISOString(), by, reason: reason.slice(0, 500), case: caseId });
  step(p, 'established', `Amended: ${reason}`, caseId, by, now, sample);
  recordAudit(by, 'programme.amend', `Programme:${p.number}`, 'ok', `version ${latest(p).n} · case ${caseId}`);
  return clone(p);
}

const MOVES: Record<ProgrammeState, ProgrammeState[]> = { established: ['suspended', 'closed'], suspended: ['established', 'closed'], closed: [] };
/** Suspend, reinstate or close a programme. */
export function setProgrammeState(ref: string, state: ProgrammeState, reason: string, caseId: string, by: string, now = new Date(), sample?: true): Programme | { error: string } {
  const p = find(ref);
  if (!p) return { error: `No programme ${ref || '(none given)'} on the register` };
  if (!MOVES[p.state].includes(state)) return { error: `${p.number} is ${PROGRAMME_STATE_LABEL[p.state].toLowerCase()}: it cannot become ${PROGRAMME_STATE_LABEL[state].toLowerCase()}` };
  if (!reason.trim()) return { error: 'State the reasons' };
  step(p, state, reason, caseId, by, now, sample);
  recordAudit(by, `programme.${state === 'established' ? 'reinstate' : state === 'suspended' ? 'suspend' : 'close'}`, `Programme:${p.number}`, 'ok', `case ${caseId}`);
  return clone(p);
}

/** Attach the sealed decision of a case to the step and version it made. */
export function attachProgrammeDecision(caseId: string, decision: string): void {
  for (const p of db().programmes) {
    for (const s of p.history) if (s.case === caseId && !s.decision) s.decision = decision;
    for (const v of p.versions) if (v.case === caseId && !v.decision) v.decision = decision;
  }
  for (const i of db().interventions) if (i.case === caseId && !i.decision) i.decision = decision;
}

// ── Interventions: under the nation's intervention authority rules (CFG-PH-003) ──

/** The adopted rule for a kind of intervention (none until two officials adopt the rules). */
export function interventionRule(kind: string): (InterventionRule & { version: number }) | undefined {
  const r = db().adopted.rules.find(x => x.kind === kind);
  return r ? { ...r, version: db().adopted.version } : undefined;
}

/**
 * Record an intervention a decision authorises: an area or population
 * measure (never a person), checked against the adopted rule for its kind.
 * Without one, `required` (production) refuses; a demonstration records that
 * none was adopted.
 */
export function recordIntervention(input: { programme?: string; kind: string; areas: string[]; measure: string; from: string; to?: string; reviewBy?: string; sample?: true }, caseId: string, by: string, opts: { required: boolean; authority?: string }, now = new Date()): Intervention | { error: string } {
  if (db().interventions.some(i => i.case === caseId)) return { error: 'This case has already recorded its intervention' };
  const kind = str(input.kind, 80);
  if (!kind) return { error: 'Give the kind of intervention, from the nation\'s intervention rules' };
  const rule = interventionRule(kind);
  if (!rule && opts.required) return { error: `No intervention authority rule for ${kind} is adopted: two officials adopt the nation's rules first, citing the law (CFG-PH-003)` };
  if (rule && opts.authority && rule.authority !== opts.authority) return { error: `The nation's rules give ${kind} to ${rule.authority}, not ${opts.authority}` };
  const areas = [...new Set(input.areas.map(a => str(a, 120)).filter(Boolean))];
  if (!areas.length) return { error: 'Name the areas the intervention applies to (an intervention applies to an area or a population, never to a named person)' };
  const badArea = regionsOk(areas);
  if (badArea) return { error: badArea };
  if (!DATE.test(input.from)) return { error: 'Give the date it takes effect' };
  if (input.to && (!DATE.test(input.to) || input.to < input.from)) return { error: 'The end date is on or after the start' };
  if (rule?.expiryRequired && !input.to) return { error: `The nation's rules require an expiry date for ${kind}` };
  if (rule?.reviewRequired && !input.reviewBy) return { error: `The nation's rules require a review date for ${kind}` };
  if (input.reviewBy && (!DATE.test(input.reviewBy) || input.reviewBy < input.from)) return { error: 'The review date is on or after the start' };
  const measure = str(input.measure, 2000);
  if (measure.length < 10) return { error: 'Describe the measure (what applies, where and to whom as a group)' };
  if (input.programme && !find(input.programme)) return { error: `No programme ${input.programme} on the register` };
  const i: Intervention = {
    id: uuid7(), number: nextNumber(db() as unknown as Record<string, unknown>, 'phiSeq', 'PHI', now), ...(input.programme ? { programme: find(input.programme)!.number } : {}),
    kind, areas, measure, from: input.from, ...(input.to ? { to: input.to } : {}), ...(input.reviewBy ? { reviewBy: input.reviewBy } : {}),
    rule: rule ? { version: rule.version, authority: rule.authority, reviewRequired: rule.reviewRequired, expiryRequired: rule.expiryRequired } : { none: true },
    state: 'in-force', reviews: [], case: caseId, at: now.toISOString(), by, ...(input.sample ? { sample: true as const } : {}),
  };
  db().interventions.push(i);
  recordAudit(by, 'programme.intervention', `Intervention:${i.number}`, 'ok', `${kind} · ${areas.length} area(s) · ${rule ? `rule version ${rule.version}` : 'no adopted rule (demonstration)'} · case ${caseId}${i.sample ? ' · sample' : ''}`);
  return clone(i);
}

/** A review of an intervention in force, recorded with reasons (the decision to continue or end it is its own act). */
export function reviewIntervention(caseId: string, reason: string, by: string, now = new Date()): Intervention | { error: string } {
  const i = db().interventions.find(x => x.case === caseId);
  if (!i || !i.decision) return { error: 'This case has no decided intervention to review' };
  if (i.state !== 'in-force') return { error: `${i.number} has ended` };
  if (!reason.trim()) return { error: 'State the review\'s findings and reasons' };
  i.reviews.push({ at: now.toISOString(), by, reason: reason.slice(0, 1000), case: caseId });
  recordAudit(by, 'programme.intervention.review', `Intervention:${i.number}`, 'ok', `review ${i.reviews.length}`);
  return clone(i);
}

/** End an intervention by decision. */
export function endIntervention(caseId: string, reason: string, by: string, now = new Date()): Intervention | { error: string } {
  const i = db().interventions.find(x => x.case === caseId);
  if (!i || !i.decision) return { error: 'This case has no decided intervention to end' };
  if (i.state !== 'in-force') return { error: `${i.number} has already ended` };
  i.state = 'ended';
  i.to = i.to && i.to < now.toISOString().slice(0, 10) ? i.to : now.toISOString().slice(0, 10);
  recordAudit(by, 'programme.intervention.end', `Intervention:${i.number}`, 'ok', reason.slice(0, 200));
  return clone(i);
}

const RULE_AUDIT = 'health.intervention-rules';
const checkRules = (v: Rules): string | null => {
  if (!Array.isArray(v.rules) || v.rules.length > 100) return 'Give the rules as a list (at most 100)';
  const seen = new Set<string>();
  for (const r of v.rules) {
    if (typeof r?.kind !== 'string' || !KEY.test(r.kind)) return 'Each rule names its kind of intervention (a key: lower-case letters, digits, dots and hyphens)';
    if (typeof r.authority !== 'string' || !r.authority.trim()) return `${r.kind}: name the authority the law gives it to (a slot of Who is responsible)`;
    if (typeof r.reviewRequired !== 'boolean' || typeof r.expiryRequired !== 'boolean') return `${r.kind}: say whether a review date and an expiry date are required`;
    if (seen.has(r.kind)) return `${r.kind} is given twice`;
    seen.add(r.kind);
  }
  return null;
};
const describeRules = (v: Rules) => v.rules.length ? v.rules.map(r => `${r.kind} by ${r.authority}${r.reviewRequired ? ', review required' : ''}${r.expiryRequired ? ', expiry required' : ''}`).join('; ') : 'no rule';

/** An administrator proposes the nation's intervention authority, review and expiry rules (CFG-PH-003), citing the law; a different official confirms. */
export function proposeInterventionRules(rules: unknown, legalBasis: unknown, by: string, byId?: string, now = new Date(), pendingHours = 24) {
  const want = (Array.isArray(rules) ? rules : []).map(x => { const r = (x ?? {}) as Partial<InterventionRule>; return { kind: str(r.kind, 80), authority: str(r.authority, 80), reviewRequired: r.reviewRequired === true, expiryRequired: r.expiryRequired === true }; });
  return proposePolicy(db().ruleChanges, { rules: clone(db().adopted.rules) }, { rules: want }, legalBasis, {
    by, ...(byId ? { byId } : {}), now, pendingHours, audit: RULE_AUDIT, context: 'Public-health intervention authority, review and expiry rules (CFG-PH-003)', check: checkRules, describe: describeRules,
  });
}
/** A different official confirms: the rules apply to intervention decisions from now (earlier ones keep the version they were checked against). */
export function confirmInterventionRules(by: string, byId?: string, now = new Date(), requireIdentityBinding = false) {
  const d = db();
  return confirmPolicy(d.ruleChanges, {
    by, ...(byId ? { byId } : {}), now, audit: RULE_AUDIT, requireIdentityBinding, describe: describeRules,
    adopt: v => { d.adopted = { rules: clone(v.values.rules), version: d.adopted.version + 1 }; },
  });
}
export const withdrawInterventionRules = (by: string, reason?: string) => withdrawPolicy(db().ruleChanges, { by, ...(reason ? { reason } : {}), audit: RULE_AUDIT });

// ── Aggregate returns (HLT-PH-015, HLT-PH-011) ───────────────────────────────

/** Check a return's counts against its programme: approved indicators and supply items, the four classes kept apart, whole numbers only. */
export function checkEntries(programmeRef: string, raw: unknown): { programme: Programme; entries: ReturnEntry[] } | { error: string } {
  const p = find(programmeRef);
  if (!p) return { error: `No programme ${programmeRef || '(none given)'} on the register` };
  if (p.state !== 'established') return { error: `${p.number} is ${PROGRAMME_STATE_LABEL[p.state].toLowerCase()}: it takes no return` };
  const terms = latest(p).terms;
  const rows = Array.isArray(raw) ? raw : [];
  if (!rows.length) return { error: 'Give at least one count' };
  const out: ReturnEntry[] = [];
  const ALLOWED = new Set(['indicator', 'breakdown', 'supplyItem', 'basis', 'quality', 'value']);
  for (const [n, r] of rows.slice(0, 500).entries()) {
    const x = (r ?? {}) as Record<string, unknown>;
    const extra = Object.keys(x).filter(k => !ALLOWED.has(k) && x[k] !== undefined && x[k] !== '');
    if (extra.length) return { error: `Count ${n + 1}: ${extra.join(', ')} is not part of an aggregate count (counts only, never anything about a person)` };
    const indicator = str(x.indicator, 60).toLowerCase();
    if (!terms.indicators.includes(indicator)) return { error: `Count ${n + 1}: ${indicator || '(none)'} is not an indicator of ${p.number} (${terms.indicators.join(', ')})` };
    const breakdown = str(x.breakdown, 60).toLowerCase();
    if (breakdown && !KEY.test(breakdown)) return { error: `Count ${n + 1}: a breakdown is a key from the nation's approved breakdowns` };
    const supplyItem = str(x.supplyItem, 80);
    if (supplyItem && !terms.supplyItems.some(s => s.id === supplyItem)) return { error: `Count ${n + 1}: ${supplyItem} is not a supply item of ${p.number}` };
    const basis = str(x.basis) as CountBasis;
    if (!COUNT_BASES.includes(basis)) return { error: `Count ${n + 1}: say whether it is ${COUNT_BASES.join(', ')} (they are kept apart)` };
    const quality = str(x.quality) as CountQuality;
    if (!COUNT_QUALITY.includes(quality)) return { error: `Count ${n + 1}: say whether it is ${COUNT_QUALITY.join(', ')}` };
    const has = x.value !== undefined && x.value !== null && x.value !== '';
    const value = has ? Number(x.value) : undefined;
    if (has && (!Number.isInteger(value) || value! < 0)) return { error: `Count ${n + 1}: a count is a whole number, 0 or more` };
    if (quality === 'not-available' && has) return { error: `Count ${n + 1}: a count not available has no value (a missing count is never a zero)` };
    if (quality !== 'not-available' && !has) return { error: `Count ${n + 1}: give the count, or mark it not available` };
    if (out.some(e => e.indicator === indicator && (e.breakdown ?? '') === breakdown && (e.supplyItem ?? '') === supplyItem && e.basis === basis)) return { error: `Count ${n + 1}: ${indicator}${breakdown ? ` (${breakdown})` : ''} ${basis} is given twice` };
    out.push({ indicator, ...(breakdown ? { breakdown } : {}), ...(supplyItem ? { supplyItem } : {}), basis, quality, ...(has ? { value } : {}) });
  }
  return { programme: p, entries: out };
}

/** Record an accepted return (or, naming the return it corrects, a new version of it: the earlier version kept). */
export function recordProgrammeReturn(input: { programme: string; reporter: string; area: string; period: { from?: string; to?: string }; entries: unknown; complete: boolean; method?: string; corrects?: string; sample?: true }, caseId: string, by: string, now = new Date()): ProgrammeReturn | { error: string } {
  const checked = checkEntries(input.programme, input.entries);
  if ('error' in checked) return checked;
  const { programme: p, entries } = checked;
  const o = getOrganisation(str(input.reporter, 80));
  if (!o) return { error: `The reporter must be an organisation in the register of organisations (${str(input.reporter, 80) || 'none given'})` };
  const area = str(input.area, 120);
  const bad = area ? regionsOk([area]) : 'Name the area the counts cover (one of the nation\'s regions)';
  if (bad) return { error: bad };
  const terms = latest(p).terms;
  if (terms.areas.length && !terms.areas.includes(area)) return { error: `${area} is not an area of ${p.number}` };
  const from = str(input.period.from), to = str(input.period.to);
  if (!DATE.test(from) || !DATE.test(to) || to < from) return { error: 'Give the period the counts cover (from and to)' };
  if (to > now.toISOString().slice(0, 10)) return { error: 'The period has not ended yet' };
  if (db().returns.some(r => r.versions.some(v => v.case === caseId))) return { error: 'This case has already recorded its return' };
  const at = now.toISOString();
  const v = (n: number): ReturnVersion => ({ n, entries, complete: input.complete, ...(input.method?.trim() ? { method: input.method.trim().slice(0, 2000) } : {}), case: caseId, at, by, ...(input.corrects ? { corrects: input.corrects } : {}) });
  if (input.corrects) {
    const r = db().returns.find(x => x.number === input.corrects || x.id === input.corrects);
    if (!r) return { error: `No return ${input.corrects} to correct` };
    if (r.programme !== p.number || r.area !== area || r.period.from !== from || r.period.to !== to || r.reporter !== o.number) return { error: `${r.number} is for another programme, reporter, area or period: a correction keeps them` };
    r.versions.push(v(r.versions.length + 1));
    recordAudit(by, 'programme.return.correct', `ProgrammeReturn:${r.number}`, 'ok', `version ${r.versions.length} · case ${caseId}`);
    return clone(r);
  }
  if (db().returns.some(r => r.programme === p.number && r.reporter === o.number && r.area === area && r.period.from === from && r.period.to === to)) return { error: `${o.number} has already returned ${p.number} for ${area}, ${from} to ${to}: send a correction naming that return` };
  const r: ProgrammeReturn = { id: uuid7(), number: nextNumber(db() as unknown as Record<string, unknown>, 'phrSeq', 'PHR', now), programme: p.number, reporter: o.number, area, period: { from, to }, versions: [v(1)], ...(input.sample ? { sample: true as const } : {}) };
  db().returns.push(r);
  recordAudit(by, 'programme.return', `ProgrammeReturn:${r.number}`, 'ok', `${p.number} · ${area} · ${from}..${to} · ${entries.length} count(s) · case ${caseId}${r.sample ? ' · sample' : ''}`);
  return clone(r);
}

// ── Reads ────────────────────────────────────────────────────────────────────

export const getProgramme = (ref: string): Programme | undefined => { const p = find(ref); return p ? clone(p) : undefined; };
export const listProgrammes = (): Programme[] => db().programmes.map(clone);
export const programmeOfCase = (caseId: string): Programme | undefined => { const p = db().programmes.find(x => x.case === caseId || x.history.some(h => h.case === caseId)); return p ? clone(p) : undefined; };
export const termsOf = (p: Programme): ProgrammeTerms => clone(latest(p).terms);
export const listInterventions = (): Intervention[] => db().interventions.map(clone);
export const interventionOfCase = (caseId: string): Intervention | undefined => { const i = db().interventions.find(x => x.case === caseId); return i ? clone(i) : undefined; };
export const interventionRules = (): Rules & { version: number } => clone(db().adopted);
export const interventionRuleChanges = (): PolicyChanges<Rules> => clone(db().ruleChanges);
export const getReturn = (ref: string): ProgrammeReturn | undefined => { const r = db().returns.find(x => x.number === ref || x.id === ref); return r ? clone(r) : undefined; };
export const returnOfCase = (caseId: string): ProgrammeReturn | undefined => { const r = db().returns.find(x => x.versions.some(v => v.case === caseId)); return r ? clone(r) : undefined; };

/** A published count: its class and quality kept, the small-cell rule applied. */
export interface PublishedCount { indicator: string; breakdown?: string; supplyItem?: string; basis: CountBasis; quality: CountQuality; cell: Cell }
export interface PublishedReturn { number: string; programme: string; area: string; period: { from: string; to: string }; version: number; complete: boolean; corrected: boolean; counts: PublishedCount[]; rule: { threshold: number; version: number } | null; sample?: true }
/** The one shape a return leaves the keeping authority's case in: the latest version, every count through the small-cell rule; a count not available stays missing. */
export function publishedReturn(r: ProgrammeReturn, rule = smallCellRule()): PublishedReturn {
  const v = r.versions[r.versions.length - 1]!;
  return {
    number: r.number, programme: r.programme, area: r.area, period: { ...r.period }, version: v.n, complete: v.complete, corrected: r.versions.length > 1,
    counts: v.entries.map(e => ({ indicator: e.indicator, ...(e.breakdown ? { breakdown: e.breakdown } : {}), ...(e.supplyItem ? { supplyItem: e.supplyItem } : {}), basis: e.basis, quality: e.quality, cell: protect(e.value, rule) })),
    rule, ...(r.sample ? { sample: true as const } : {}),
  };
}
export const listPublishedReturns = (programme?: string): PublishedReturn[] => { const rule = smallCellRule(); return db().returns.filter(r => !programme || r.programme === programme).map(r => publishedReturn(r, rule)); };

/** Counts of what the register holds (no content). */
export function programmeCounts(): { programmes: Record<ProgrammeState, number>; interventions: number; returns: number; samples: number } {
  const programmes: Record<ProgrammeState, number> = { established: 0, suspended: 0, closed: 0 };
  for (const p of db().programmes) programmes[p.state] += 1;
  const samples = db().programmes.filter(p => p.sample).length + db().returns.filter(r => r.sample).length + db().interventions.filter(i => i.sample).length;
  return { programmes, interventions: db().interventions.length, returns: db().returns.length, samples };
}

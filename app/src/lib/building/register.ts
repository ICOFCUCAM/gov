// Planning and building control records (plan step I7; Institutional
// specification Part 3 §D.13 "Housing, Planning and Building Control";
// catalogue Part 9 §6 REG-INF-002 construction permit register, REG-INF-004
// planning decisions register, REG-INF-005 inspection and defect register;
// supplement Part 20 HPC-PLN-009, HPC-BLD-014 … 020).
//
// What the specification asks to keep apart is kept apart: planning
// permission (a planning decision), building approval (the permit, against
// one approved design version), construction (commenced, stopped, completed)
// and occupancy (a certificate) are separate states of separate records,
// never one "approved" flag. Every decision names the parcel version it was
// taken on (the authoritative parcel record, lib/data/parcels.ts; no map,
// model or drawing overrides it) and the version of the nation's building
// control rules it applied (categories, uses, inspection stages and their
// checklists, finding severities), which two officials adopt citing the law
// (lib/law/policy-change.ts). Inspections are findings with reasons, each
// observation with its severity, never a score; the inspector is the
// signed-in official who records it.
//
// Written only by the effects of the building control procedures
// (lib/building/procedures.ts), and the rules only through their change
// process (/api/building); read by everyone who works the cases.

import { createHash } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges, type PolicyVersion } from '@/lib/law/policy-change';
import type { Citation } from '@/lib/law/register';

/** The nation's building control rules: what a permit may be for and what an inspection checks. None ship. */
export interface BuildingRuleValues {
  /** Building categories (the nation's building classes, e.g. by occupancy or risk). */
  categories: string[];
  /** Uses a planning application or permit may propose. */
  uses: string[];
  /** Inspection stages and the checklist items for each. */
  checklists: { stage: string; items: string[] }[];
  /** How serious a finding is, in the nation's words (none is a score). */
  severities: string[];
}
export interface AdoptedBuildingRules extends BuildingRuleValues { version: number; digest: string; basis: Citation[]; by: string; confirmedBy?: string; at: string }

export interface CaseRef { id: string; ref: string }
export interface ParcelRef { id: string; parcelId: string; version: number }
export interface RulesRef { version: number; digest: string }

export interface PlanningDecision {
  number: string;
  case: CaseRef;
  parcel: ParcelRef;
  proposedUse: string;
  description: string;
  outcome: 'granted' | 'granted-with-conditions' | 'refused';
  conditions: string[];
  representations: number;
  rules: RulesRef;
  decision?: string;
  at: string; by: string;
  sample?: true;
}

export interface DesignVersion { n: number; document: string; sha256?: string; at: string; by: string; note?: string }
export interface InspectionFinding { item: string; observation: string; severity: string }
export interface Inspection {
  number: string;
  permit: string;
  case: CaseRef;
  stage: string;
  date: string;
  inspector: { id?: string; name: string };
  checklist: { rules: RulesRef; items: string[] };
  findings: InspectionFinding[];
  result: 'pass' | 'conditional' | 'remediation-required' | 'fail';
  reasons: string;
  at: string;
  sample?: true;
}
export interface StopWorkOrder { number: string; permit: string; case: CaseRef; grounds: string; decision?: string; at: string; by: string; lifted?: { decision?: string; at: string; by: string; reasons: string }; sample?: true }

export interface BuildingPermit {
  number: string;
  case: CaseRef;
  parcel: ParcelRef;
  planning?: string;
  category: string;
  use: string;
  floorAreaM2?: number;
  designs: DesignVersion[];
  /** The design version the permit (or its latest approved variation) approved: the only one built to. */
  approvedDesign?: number;
  /** A changed design waits for its own decision; until then the approved one stands. */
  variationPending?: number;
  conditions: string[];
  rules: RulesRef;
  permit: { state: 'pending' | 'granted' | 'refused'; decision?: string; at?: string };
  construction: { state: 'not-started' | 'commenced' | 'stopped' | 'completed'; commencedOn?: string; completedOn?: string; stopOrder?: string };
  occupancy: { state: 'none' | 'certified' | 'refused'; certificate?: string; decision?: string; at?: string; finalInspection?: string };
  inspections: string[];
  stopOrders: string[];
  sample?: true;
}

interface Db {
  rules?: AdoptedBuildingRules; ruleChanges: PolicyChanges<BuildingRuleValues>;
  planning: PlanningDecision[]; permits: BuildingPermit[]; inspections: Inspection[]; stops: StopWorkOrder[]; seq: Record<string, number>;
}
const g = globalThis as unknown as { __civicosBuilding?: Db };
const db = (): Db => {
  const d = touch('__civicosBuilding', g.__civicosBuilding ??= { ruleChanges: {}, planning: [], permits: [], inspections: [], stops: [], seq: {} });
  d.ruleChanges ??= {}; d.planning ??= []; d.permits ??= []; d.inspections ??= []; d.stops ??= []; d.seq ??= {};
  return d;
};
export function resetBuilding(): void { g.__civicosBuilding = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const next = (prefix: string, now: Date) => { const d = db(); d.seq[prefix] = (d.seq[prefix] ?? 0) + 1; return `${prefix}-${now.getUTCFullYear()}-${String(d.seq[prefix]).padStart(6, '0')}`; };
const AUDIT = 'building.rules';
const words = (v: unknown, max = 60) => (Array.isArray(v) ? v : []).map(x => String(x ?? '').trim().slice(0, 120)).filter(Boolean).slice(0, max);

export const RESULTS: Inspection['result'][] = ['pass', 'conditional', 'remediation-required', 'fail'];
export const PERMIT_STATE_LABEL = { pending: 'Applied for', granted: 'Building approval granted', refused: 'Refused' } as const;
export const CONSTRUCTION_STATE_LABEL = { 'not-started': 'Not started', commenced: 'Under construction', stopped: 'Stopped by order', completed: 'Completion notified' } as const;
export const OCCUPANCY_STATE_LABEL = { none: 'No occupancy decision', certified: 'Occupancy certified', refused: 'Occupancy refused' } as const;

// ── The nation's building control rules (two officials, citing the law) ───────

const EMPTY: BuildingRuleValues = { categories: [], uses: [], checklists: [], severities: [] };
const valuesOf = (r?: AdoptedBuildingRules): BuildingRuleValues => (r ? { categories: [...r.categories], uses: [...r.uses], checklists: clone(r.checklists), severities: [...r.severities] } : clone(EMPTY));
const digestOf = (v: BuildingRuleValues) => createHash('sha256').update(JSON.stringify([v.categories, v.uses, v.checklists, v.severities]), 'utf8').digest('hex');
function checkRules(v: BuildingRuleValues): string | null {
  if (!v.categories.length) return 'Name at least one building category';
  if (!v.uses.length) return 'Name at least one use';
  if (!v.checklists.length || v.checklists.some(c => !c.stage || !c.items.length)) return 'Give each inspection stage its checklist items';
  if (new Set(v.checklists.map(c => c.stage)).size !== v.checklists.length) return 'Each inspection stage once';
  if (!v.severities.length) return 'Name how serious a finding may be (the nation\'s words, never a score)';
  return null;
}
const describe = (v: BuildingRuleValues) => `${v.categories.length} categories, ${v.uses.length} uses, ${v.checklists.length} inspection stages, ${v.severities.length} severities`;

/** The rules in force, or null: until two officials adopt them, no permit is granted and no inspection recorded against a checklist. */
export const buildingRules = (): AdoptedBuildingRules | null => (db().rules ? clone(db().rules!) : null);
export const buildingRuleChanges = (): PolicyChanges<BuildingRuleValues> => clone(db().ruleChanges);
export const rulesRef = (r: AdoptedBuildingRules): RulesRef => ({ version: r.version, digest: r.digest });

/** An official of the building control authority proposes the rules, citing the law (checked by the route). */
export function proposeBuildingRules(input: { categories?: unknown; uses?: unknown; checklists?: unknown; severities?: unknown; legalBasis?: unknown }, by: string, byId?: string, now = new Date()): ReturnType<typeof proposePolicy<BuildingRuleValues>> {
  const lists = (Array.isArray(input.checklists) ? input.checklists : []).slice(0, 30).map(c => ({ stage: String((c as { stage?: unknown })?.stage ?? '').trim().slice(0, 80), items: words((c as { items?: unknown })?.items, 80) }));
  const change: Partial<BuildingRuleValues> = {
    ...(input.categories !== undefined ? { categories: words(input.categories) } : {}),
    ...(input.uses !== undefined ? { uses: words(input.uses) } : {}),
    ...(input.checklists !== undefined ? { checklists: lists } : {}),
    ...(input.severities !== undefined ? { severities: words(input.severities, 12) } : {}),
  };
  return proposePolicy(db().ruleChanges, valuesOf(db().rules), change, input.legalBasis, { by, ...(byId ? { byId } : {}), now, pendingHours: 72, audit: AUDIT, context: 'Building control rules', check: checkRules, describe });
}
/** A different official confirms: the rules apply to decisions and inspections from now; earlier ones keep the version they applied. */
export function confirmBuildingRules(by: string, byId?: string, now = new Date()): PolicyVersion<BuildingRuleValues> | { error: string } {
  const d = db();
  return confirmPolicy(d.ruleChanges, { by, ...(byId ? { byId } : {}), now, audit: AUDIT, describe, adopt: v => {
    d.rules = { ...clone(v.values), version: (d.rules?.version ?? 0) + 1, digest: digestOf(v.values), basis: clone(v.basis), by: v.by, ...(v.confirmed ? { confirmedBy: v.confirmed.by } : {}), at: now.toISOString() };
  } });
}
export function withdrawBuildingRules(by: string, reason?: string): { ok: true } | { error: string } {
  return withdrawPolicy(db().ruleChanges, { by, ...(reason ? { reason } : {}), audit: AUDIT });
}

// ── Changes (only from lib/building/procedures.ts) ────────────────────────────

export function recordPlanningDecision(input: Omit<PlanningDecision, 'number' | 'at' | 'sample'> & { sample?: boolean }, now = new Date()): PlanningDecision {
  const { sample, ...rest } = input;
  const p: PlanningDecision = { ...clone(rest), number: next('PLD', now), at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().planning.push(p);
  recordAudit(p.by, 'building.planning.decide', `Planning:${p.number}`, 'ok', `${p.parcel.parcelId} v${p.parcel.version} · ${p.outcome} · rules v${p.rules.version} · ${p.case.ref}`);
  return clone(p);
}

/** A permit application enters the register when it is validated (pending), on the parcel version it names. */
export function openPermit(input: Pick<BuildingPermit, 'case' | 'parcel' | 'planning' | 'category' | 'use' | 'floorAreaM2' | 'rules'> & { sample?: boolean }): BuildingPermit {
  const existing = db().permits.find(p => p.case.id === input.case.id);
  if (existing) return clone(existing);
  const { sample, ...rest } = input;
  const p: BuildingPermit = { ...clone(rest), number: next('BPM', new Date()), designs: [], conditions: [], permit: { state: 'pending' }, construction: { state: 'not-started' }, occupancy: { state: 'none' }, inspections: [], stopOrders: [], ...(sample ? { sample: true as const } : {}) };
  db().permits.push(p);
  return clone(p);
}
const permitOf = (caseId: string) => db().permits.find(p => p.case.id === caseId);

/** A design version submitted (plans, drawings): kept by its document and digest; the approved one is never replaced silently. */
export function submitDesign(caseId: string, d: Omit<DesignVersion, 'n' | 'at'>, now = new Date()): BuildingPermit | { error: string } {
  const p = permitOf(caseId);
  if (!p) return { error: 'No permit is recorded for this case' };
  if (p.designs.some(x => x.document === d.document)) return clone(p);
  p.designs.push({ ...d, n: p.designs.length + 1, at: now.toISOString() });
  if (p.permit.state === 'granted') p.variationPending = p.designs.length;
  return clone(p);
}

export function decidePermit(caseId: string, input: { granted: boolean; conditions: string[]; rules: RulesRef; decision?: string }, now = new Date()): BuildingPermit | { error: string } {
  const p = permitOf(caseId);
  if (!p) return { error: 'No permit is recorded for this case' };
  p.permit = { state: input.granted ? 'granted' : 'refused', ...(input.decision ? { decision: input.decision } : {}), at: now.toISOString() };
  if (input.granted) { p.approvedDesign = p.designs.length; p.conditions = [...input.conditions]; p.rules = input.rules; }
  return clone(p);
}

/** A variation decided: the new design approved (or refused, the approved design standing). */
export function decideVariation(caseId: string, approved: boolean): BuildingPermit | { error: string } {
  const p = permitOf(caseId);
  if (!p?.variationPending) return { error: 'No changed design waits for a decision' };
  if (approved) p.approvedDesign = p.variationPending;
  delete p.variationPending;
  return clone(p);
}

export function setConstruction(caseId: string, change: { state: BuildingPermit['construction']['state']; on?: string; stopOrder?: string }): BuildingPermit | { error: string } {
  const p = permitOf(caseId);
  if (!p) return { error: 'No permit is recorded for this case' };
  p.construction = {
    ...p.construction, state: change.state,
    ...(change.state === 'commenced' && change.on && !p.construction.commencedOn ? { commencedOn: change.on } : {}),
    ...(change.state === 'completed' && change.on ? { completedOn: change.on } : {}),
  };
  if (change.state === 'stopped' && change.stopOrder) p.construction.stopOrder = change.stopOrder;
  if (change.state !== 'stopped') delete p.construction.stopOrder;
  return clone(p);
}

export function recordInspection(input: Omit<Inspection, 'number' | 'at' | 'sample'> & { sample?: boolean }, now = new Date()): Inspection {
  const { sample, ...rest } = input;
  const i: Inspection = { ...clone(rest), number: next('BIN', now), at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().inspections.push(i);
  const p = db().permits.find(x => x.number === i.permit);
  if (p) p.inspections.push(i.number);
  recordAudit(i.inspector.name, 'building.inspection', `Inspection:${i.number}`, 'ok', `${i.permit} · ${i.stage} · ${i.result} · ${i.findings.length} finding(s) · rules v${i.checklist.rules.version}`);
  return clone(i);
}

export function issueStopWork(input: Omit<StopWorkOrder, 'number' | 'at' | 'sample' | 'lifted'> & { sample?: boolean }, now = new Date()): StopWorkOrder {
  const { sample, ...rest } = input;
  const o: StopWorkOrder = { ...clone(rest), number: next('SWO', now), at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().stops.push(o);
  const p = db().permits.find(x => x.number === o.permit);
  if (p) { p.stopOrders.push(o.number); p.construction = { ...p.construction, state: 'stopped', stopOrder: o.number }; }
  return clone(o);
}
export function liftStopWork(permit: string, lifted: NonNullable<StopWorkOrder['lifted']>): StopWorkOrder | { error: string } {
  const p = db().permits.find(x => x.number === permit);
  const o = p?.construction.stopOrder ? db().stops.find(x => x.number === p.construction.stopOrder) : undefined;
  if (!p || !o) return { error: 'No stop-work order is in force on this permit' };
  o.lifted = clone(lifted);
  p.construction = { ...p.construction, state: 'commenced' };
  delete p.construction.stopOrder;
  return clone(o);
}

export function decideOccupancy(caseId: string, input: { certified: boolean; finalInspection: string; decision?: string }, now = new Date()): BuildingPermit | { error: string } {
  const p = permitOf(caseId);
  if (!p) return { error: 'No permit is recorded for this case' };
  p.occupancy = { state: input.certified ? 'certified' : 'refused', ...(input.certified ? { certificate: next('OCC', now) } : {}), ...(input.decision ? { decision: input.decision } : {}), at: now.toISOString(), finalInspection: input.finalInspection };
  return clone(p);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export const permitOfCase = (caseId: string): BuildingPermit | undefined => { const p = permitOf(caseId); return p ? clone(p) : undefined; };
export const getPermit = (number: string): BuildingPermit | undefined => { const p = db().permits.find(x => x.number === number); return p ? clone(p) : undefined; };
export const planningOfCase = (caseId: string): PlanningDecision | undefined => { const p = db().planning.find(x => x.case.id === caseId); return p ? clone(p) : undefined; };
export const getPlanning = (number: string): PlanningDecision | undefined => { const p = db().planning.find(x => x.number === number); return p ? clone(p) : undefined; };
export const inspectionsOf = (permit: string): Inspection[] => db().inspections.filter(i => i.permit === permit).map(clone);
export const stopOrdersOf = (permit: string): StopWorkOrder[] => db().stops.filter(o => o.permit === permit).map(clone);
const onParcel = (parcel: string) => (x: { parcel: ParcelRef }) => x.parcel.id === parcel || x.parcel.parcelId.toUpperCase() === parcel.toUpperCase();
export const planningOnParcel = (parcel: string): PlanningDecision[] => db().planning.filter(onParcel(parcel)).map(clone);
export const permitsOnParcel = (parcel: string): BuildingPermit[] => db().permits.filter(onParcel(parcel)).map(clone);
export function buildingRegister(limit = 100): { planning: PlanningDecision[]; permits: BuildingPermit[]; inspections: Inspection[]; stops: StopWorkOrder[] } {
  const d = db();
  return { planning: d.planning.slice(-limit).reverse().map(clone), permits: d.permits.slice(-limit).reverse().map(clone), inspections: d.inspections.slice(-limit).reverse().map(clone), stops: d.stops.slice(-limit).reverse().map(clone) };
}
export function buildingCounts(): { planning: number; granted: number; permits: number; permitted: number; underConstruction: number; stopped: number; occupancy: number; inspections: number; samples: number } {
  const d = db();
  return {
    planning: d.planning.length, granted: d.planning.filter(p => p.outcome !== 'refused').length,
    permits: d.permits.length, permitted: d.permits.filter(p => p.permit.state === 'granted').length,
    underConstruction: d.permits.filter(p => p.construction.state === 'commenced').length, stopped: d.permits.filter(p => p.construction.state === 'stopped').length,
    occupancy: d.permits.filter(p => p.occupancy.state === 'certified').length, inspections: d.inspections.length,
    samples: [...d.planning, ...d.permits, ...d.inspections, ...d.stops].filter(x => x.sample).length,
  };
}

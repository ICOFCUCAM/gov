// The register of controlled-medicine authorisations (HLT-MED-014; Health I4
// dependency procedure-import-and-controlled). Kept for the institution the
// nation names in the `controlledSubstances` slot of its deployment profile
// (lib/data/register-owners.ts), which may be another body than the medicines
// regulator; never a ministry by name. Until the nation names it, nobody keeps
// it: provisional owners never decide.
//
// An authorisation is for an organisation of the organisations register (by
// its number), an authorised product of the register of medicines and medical
// devices (by its number), a schedule from the nation's list
// (medicines.country.controlled_schedules, shipped empty), an activity and a
// quantity, for the period the decision states. Never a named patient:
// supply to a person is a dispensing record, which the approved scope excludes.
//
// The quantity is checked against the limits the nation's controlled-
// substances law sets, which ship unset: a country rule set changed only
// through lib/law/policy-change.ts (one administrator proposes citing the laws
// register, a different official confirms, every version kept). A production
// installation refuses an authorisation for a schedule no adopted limit
// covers; demonstrations record that none was adopted.
//
// It changes only through the controlled-medicine procedure's effects
// (lib/health/products/procedures.ts; lib/casework/register-writes.test.ts).
// Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber, raiseCounter } from '@/lib/data/numbering';
import { withDefaults } from '@/lib/data/defaults';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges } from '@/lib/law/policy-change';

/** One limit of the nation's controlled-substances law: the most one authorisation may cover, for a schedule, in a unit. */
export interface ControlledLimit { schedule: string; unit: string; max: number }
type Limits = { limits: ControlledLimit[] };

export interface ControlledAuthorisation {
  id: string;
  /** CMA-YYYY-NNNNNN. */
  number: string;
  organisation: string;
  product: string;
  schedule: string;
  activity: string;
  quantity: { amount: number; unit: string };
  period?: { from: string; to?: string };
  /** The limit the quantity was checked against, or that none was adopted (demonstrations only). */
  limit: { schedule: string; unit: string; max: number; version: number } | { none: true };
  case: string;
  at: string; by: string;
  decision?: string;
  sample?: true;
}

type Db = { authorisations: ControlledAuthorisation[]; cmaSeq: number; limits: PolicyChanges<Limits>; adopted: Limits & { version: number } };
const seed = (): Db => ({ authorisations: [], cmaSeq: 0, limits: {}, adopted: { limits: [], version: 0 } });
const g = globalThis as unknown as { __civicosControlledMedicines?: Db };
const db = (): Db => touch('__civicosControlledMedicines', g.__civicosControlledMedicines = withDefaults(g.__civicosControlledMedicines ??= seed(), seed()));
export function resetControlled(): void { g.__civicosControlledMedicines = undefined; }

/** Every controlled-medicine authorisation as kept, for an institution's portable export (lib/portability/export.ts). Read only. */
export const controlledRecords = (): ControlledAuthorisation[] => db().authorisations.map(a => structuredClone(a));
/** Put back controlled-medicine authorisations keeping their ids and numbers (lib/portability/import.ts only: the confirmed import of an institution's own export (two officials) into an installation that holds none of these records). */
export function restoreControlled(list: ControlledAuthorisation[]): { restored: number } | { error: string } {
  const d = db();
  const clash = list.find(a => d.authorisations.some(x => x.id === a.id || x.number === a.number));
  if (clash) return { error: `Controlled-medicine authorisation ${clash.number} is already in this installation` };
  d.authorisations.push(...list.map(a => structuredClone(a)));
  raiseCounter(d as unknown as Record<string, unknown>, 'cmaSeq', list.map(a => a.number));
  return { restored: list.length };
}
const clone = <T,>(x: T): T => structuredClone(x);

/** The limit in force for a schedule and unit (none until the nation adopts its limits). */
export function limitFor(schedule: string, unit: string): (ControlledLimit & { version: number }) | undefined {
  const l = db().adopted.limits.find(x => x.schedule === schedule && x.unit === unit);
  return l ? { ...l, version: db().adopted.version } : undefined;
}

/**
 * Record a controlled-medicine authorisation a decision makes. The quantity
 * must be within the adopted limit for its schedule and unit; without one,
 * `required` (production) refuses.
 */
export function authoriseControlled(input: { organisation: string; product: string; schedule: string; activity: string; quantity: { amount: number; unit: string }; period?: { from: string; to?: string }; sample?: true }, caseId: string, by: string, opts: { required: boolean }, now = new Date()): ControlledAuthorisation | { error: string } {
  if (!input.organisation.trim()) return { error: 'Name the organisation (its register number)' };
  if (!input.product.trim()) return { error: 'Name the authorised product (its register number)' };
  if (!input.schedule.trim()) return { error: 'Give the schedule, from the nation\'s list' };
  if (!(input.quantity.amount > 0) || !input.quantity.unit.trim()) return { error: 'Give the quantity, with its unit' };
  if (db().authorisations.some(a => a.case === caseId)) return { error: 'This case has already recorded its authorisation' };
  const unit = input.quantity.unit.trim().slice(0, 20);
  const lim = limitFor(input.schedule.trim(), unit);
  if (lim && input.quantity.amount > lim.max) return { error: `The quantity (${input.quantity.amount} ${unit}) is above the limit the nation's law sets for ${lim.schedule} (${lim.max} ${unit}, version ${lim.version})` };
  if (!lim && opts.required) return { error: `No limit for schedule ${input.schedule.trim()} in ${unit} is adopted under the nation's controlled-substances law: two officials adopt the limits first, citing the law` };
  const a: ControlledAuthorisation = {
    id: uuid7(), number: nextNumber(db() as unknown as Record<string, unknown>, 'cmaSeq', 'CMA', now), organisation: input.organisation.trim(), product: input.product.trim(),
    schedule: input.schedule.trim().slice(0, 80), activity: input.activity.trim().slice(0, 80), quantity: { amount: input.quantity.amount, unit },
    ...(input.period ? { period: input.period } : {}), limit: lim ? { schedule: lim.schedule, unit: lim.unit, max: lim.max, version: lim.version } : { none: true },
    case: caseId, at: now.toISOString(), by, ...(input.sample ? { sample: true as const } : {}),
  };
  db().authorisations.push(a);
  recordAudit(by, 'controlled.authorise', `ControlledAuthorisation:${a.number}`, 'ok', `product ${a.product} · organisation ${a.organisation} · schedule ${a.schedule} · ${lim ? `limit version ${lim.version}` : 'no adopted limit (demonstration)'} · case ${caseId}${a.sample ? ' · sample' : ''}`);
  return clone(a);
}

/** Attach the sealed decision that made a case's authorisation. */
export function attachControlledDecision(caseId: string, decision: string): void {
  const a = db().authorisations.find(x => x.case === caseId);
  if (a && !a.decision) a.decision = decision;
}

// ── The nation's limits: a country rule set, two officials citing the law ──

const AUDIT = 'controlled.limits';
const checkLimits = (v: Limits): string | null => {
  if (!Array.isArray(v.limits) || v.limits.length > 200) return 'Give the limits as a list (at most 200)';
  const seen = new Set<string>();
  for (const l of v.limits) {
    if (typeof l?.schedule !== 'string' || !l.schedule.trim() || l.schedule.length > 80) return 'Each limit names its schedule';
    if (typeof l.unit !== 'string' || !l.unit.trim() || l.unit.length > 20) return `${l.schedule}: name the unit`;
    if (typeof l.max !== 'number' || !Number.isFinite(l.max) || l.max <= 0) return `${l.schedule}: the limit is a number above zero`;
    const k = `${l.schedule.trim()}|${l.unit.trim()}`;
    if (seen.has(k)) return `${l.schedule} in ${l.unit} is given twice`;
    seen.add(k);
  }
  return null;
};
const describeLimits = (v: Limits) => v.limits.length ? v.limits.map(l => `${l.schedule}: ${l.max} ${l.unit}`).join('; ') : 'no limit';

/** An administrator proposes the limits the nation's controlled-substances law sets, citing it; a different official confirms. */
export function proposeControlledLimits(limits: unknown, legalBasis: unknown, by: string, byId?: string, now = new Date(), pendingHours = 24) {
  const want = (Array.isArray(limits) ? limits : []).map(x => ({ schedule: String((x as ControlledLimit)?.schedule ?? '').trim(), unit: String((x as ControlledLimit)?.unit ?? '').trim(), max: Number((x as ControlledLimit)?.max) }));
  return proposePolicy(db().limits, { limits: clone(db().adopted.limits) }, { limits: want }, legalBasis, {
    by, ...(byId ? { byId } : {}), now, pendingHours, audit: AUDIT, context: 'Controlled-medicine quantity limits', check: checkLimits, describe: describeLimits,
  });
}
/** A different official confirms: the limits apply to decisions from now (earlier authorisations keep the version they were checked against). */
export function confirmControlledLimits(by: string, byId?: string, now = new Date(), requireIdentityBinding = false) {
  const d = db();
  return confirmPolicy(d.limits, {
    by, ...(byId ? { byId } : {}), now, audit: AUDIT, requireIdentityBinding, describe: describeLimits,
    adopt: v => { d.adopted = { limits: clone(v.values.limits), version: d.adopted.version + 1 }; },
  });
}
export const withdrawControlledLimits = (by: string, reason?: string) => withdrawPolicy(db().limits, { by, ...(reason ? { reason } : {}), audit: AUDIT });

// ── Reads ────────────────────────────────────────────────────────────────────

/** The limits in force (none until two officials adopt them). */
export const controlledLimits = (): Limits & { version: number } => clone(db().adopted);
/** The waiting proposal and earlier versions of the limits. */
export const controlledLimitChanges = (): PolicyChanges<Limits> => clone(db().limits);
/** The authorisation a case recorded. */
export const controlledOfCase = (caseId: string): ControlledAuthorisation | undefined => { const a = db().authorisations.find(x => x.case === caseId); return a ? clone(a) : undefined; };
/** The full record (the controlled-substances authority's). */
export const getControlledAuthorisation = (number: string): ControlledAuthorisation | undefined => { const a = db().authorisations.find(x => x.number === number.trim()); return a ? clone(a) : undefined; };
/** Counts (no record content). */
export const controlledCounts = (): { total: number; samples: number } => ({ total: db().authorisations.length, samples: db().authorisations.filter(a => a.sample).length });

// The nation's small-cell rule for health aggregates (field series Part 6
// §4.3: "Apply small-cell disclosure protections where necessary"; CFG-DAT-001;
// HLT-PH-015's binding rule small_cell_suppression_from_policy). A country
// rule set, changed only through lib/law/policy-change.ts: one administrator
// proposes the threshold citing the laws register, a different official
// confirms it, every version kept. It ships unset.
//
// A count above zero and below the threshold is suppressed before anything
// leaves the keeping authority's own screens: published views, the twin and
// any exchange. Until the nation adopts a threshold nothing is published at
// all (every cell is held back as "no threshold adopted"), so an unset rule
// never reads as "no protection needed". Zero is shown as zero only where a
// count of zero was reported; a missing report is never a zero.
//
// Used by the public-health programme returns (lib/health/programmes) and the
// workforce counts from the professions register (lib/professions/workforce.ts).
// Held in platform state.

import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges } from '@/lib/law/policy-change';

type Rule = { threshold: number };
type Db = { changes: PolicyChanges<Rule>; adopted: { threshold: number; version: number } | null };
const seed = (): Db => ({ changes: {}, adopted: null });
const g = globalThis as unknown as { __civicosHealthSmallCells?: Db };
const db = (): Db => touch('__civicosHealthSmallCells', g.__civicosHealthSmallCells = withDefaults(g.__civicosHealthSmallCells ??= seed(), seed()));
export function resetSmallCells(): void { g.__civicosHealthSmallCells = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);

/** A cell as it may leave the keeping authority: its value, or why it is held back. */
export type Cell = { value: number } | { suppressed: 'below-threshold' | 'no-threshold' } | { missing: true };

/** The threshold in force, with its version (null until two officials adopt one). */
export const smallCellRule = (): { threshold: number; version: number } | null => (db().adopted ? clone(db().adopted!) : null);
/** The waiting proposal and earlier versions. */
export const smallCellChanges = (): PolicyChanges<Rule> => clone(db().changes);

/** Apply the rule to one count (undefined: nothing was reported, which is never a zero). */
export function protect(value: number | undefined | null, rule = smallCellRule()): Cell {
  if (value === undefined || value === null) return { missing: true };
  if (!rule) return { suppressed: 'no-threshold' };
  if (value > 0 && value < rule.threshold) return { suppressed: 'below-threshold' };
  return { value };
}

const AUDIT = 'health.small-cells';
const check = (v: Rule): string | null => (Number.isInteger(v.threshold) && v.threshold >= 1 && v.threshold <= 1000 ? null : 'The threshold is a whole number from 1 to 1000, as the nation\'s rule sets it');
const describe = (v: Rule) => `counts above zero and below ${v.threshold} are suppressed before publication or exchange`;

/** One administrator proposes the threshold the nation's statistics or data-protection rules set, citing the law; a different official confirms. */
export function proposeSmallCellRule(threshold: unknown, legalBasis: unknown, by: string, byId?: string, now = new Date(), pendingHours = 24) {
  return proposePolicy(db().changes, { threshold: db().adopted?.threshold ?? 0 }, { threshold: Number(threshold) }, legalBasis, {
    by, ...(byId ? { byId } : {}), now, pendingHours, audit: AUDIT, context: 'Small-cell rule for health aggregates', check, describe,
  });
}
/** A different official confirms: the rule applies to every published view from now. */
export function confirmSmallCellRule(by: string, byId?: string, now = new Date(), requireIdentityBinding = false) {
  const d = db();
  return confirmPolicy(d.changes, {
    by, ...(byId ? { byId } : {}), now, audit: AUDIT, requireIdentityBinding, describe,
    adopt: v => { d.adopted = { threshold: v.values.threshold, version: (d.adopted?.version ?? 0) + 1 }; },
  });
}
export const withdrawSmallCellRule = (by: string, reason?: string) => withdrawPolicy(db().changes, { by, ...(reason ? { reason } : {}), audit: AUDIT });

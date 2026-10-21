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
// Since plan step I3 the rule's mechanics are the platform's
// (lib/data/small-cells.ts, shared with the indicator register); this rule set
// keeps its own key, audit name and versions. Held in platform state.

import { smallCellRuleSet, type Cell } from '@/lib/data/small-cells';

export type { Cell };

const set = smallCellRuleSet('__civicosHealthSmallCells', 'health.small-cells', 'Small-cell rule for health aggregates');

export function resetSmallCells(): void { set.reset(); }

/** The threshold in force, with its version (null until two officials adopt one). */
export const smallCellRule = (): { threshold: number; version: number } | null => set.rule();
/** The waiting proposal and earlier versions. */
export const smallCellChanges = () => set.changes();

/** Apply the rule to one count (undefined: nothing was reported, which is never a zero). */
export function protect(value: number | undefined | null, rule = smallCellRule()): Cell {
  return set.protect(value, rule);
}

/** One administrator proposes the threshold the nation's statistics or data-protection rules set, citing the law; a different official confirms. */
export function proposeSmallCellRule(threshold: unknown, legalBasis: unknown, by: string, byId?: string, now = new Date(), pendingHours = 24) {
  return set.propose(threshold, legalBasis, by, byId, now, pendingHours);
}
/** A different official confirms: the rule applies to every published view from now. */
export function confirmSmallCellRule(by: string, byId?: string, now = new Date(), requireIdentityBinding = false) {
  return set.confirm(by, byId, now, requireIdentityBinding);
}
export const withdrawSmallCellRule = (by: string, reason?: string) => set.withdraw(by, reason);

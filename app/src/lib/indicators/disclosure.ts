// The approved-aggregate disclosure rule of the indicator register (plan step
// I3; spec Part 1 §5.5 "the national twin receives approved aggregate figures",
// Part 6 D.8 "an approved purpose and disclosure-control policy"; CFG-DAT-001).
// The platform's small-cell rule (lib/data/small-cells.ts) under its own key:
// proposed by one administrator citing the laws register, confirmed by a
// different official (lib/law/policy-change.ts), every version kept, shipped
// unset. A definition whose disclosure is `small-cells` publishes nothing
// until it is adopted; one marked `not-personal` states why, and two officials
// approve that statement with the definition.

import { smallCellRuleSet, type Cell } from '@/lib/data/small-cells';
import type { Disclosure } from './types';

const set = smallCellRuleSet('__civicosIndicatorSmallCells', 'indicators.small-cells', 'Small-cell rule for indicator values');

export const indicatorSmallCells = set;
export function resetIndicatorSmallCells(): void { set.reset(); }

/** The rule's name and version as a value carries it (legal_basis_ref of the twin contract). */
export function disclosureRef(d: Disclosure): { rule: string; version?: number } {
  if (d.kind === 'not-personal') return { rule: `not personal data: ${d.reason}` };
  const r = set.rule();
  return r ? { rule: `small-cell rule (threshold ${r.threshold})`, version: r.version } : { rule: 'small-cell rule (no threshold adopted)' };
}

/** Apply a definition's disclosure to one cell (a count of records). */
export function disclose(d: Disclosure, base: number): Cell {
  if (d.kind === 'not-personal') return { value: base };
  return set.protect(base);
}

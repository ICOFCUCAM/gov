// The small-cell disclosure rule, generalised (plan step I3; field series Part 6
// §4.3, CFG-DAT-001; spec Part 6 D.8 "an approved purpose and disclosure-control
// policy"). One rule set per keeping context, each a country rule set changed
// only through lib/law/policy-change.ts: one administrator proposes the
// threshold citing the laws register, a different official confirms it, every
// version kept. Each ships unset.
//
// A count above zero and below the threshold is suppressed before it leaves
// the keeping authority's own screens: published views, the twin and any
// exchange. Until the nation adopts a threshold nothing protected is published
// at all (every cell is held back as "no threshold adopted"), so an unset rule
// never reads as "no protection needed". A missing count is never a zero.
//
// Two rule sets use it today: the health aggregates (lib/health/small-cells.ts,
// kept where it was) and the platform's indicator register
// (lib/indicators/disclosure.ts). Held in platform state; each rule set names
// its own `__civicos…` key so lib/data/persist.ts saves it like any store.

import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges } from '@/lib/law/policy-change';

export type SmallCellValues = { threshold: number };
type Db = { changes: PolicyChanges<SmallCellValues>; adopted: { threshold: number; version: number } | null };
const seed = (): Db => ({ changes: {}, adopted: null });

/** A cell as it may leave the keeping authority: its value, or why it is held back. */
export type Cell = { value: number } | { suppressed: 'below-threshold' | 'no-threshold' } | { missing: true };

/** Apply a threshold to one count (undefined: nothing was reported, which is never a zero). */
export function protectWith(value: number | undefined | null, rule: { threshold: number } | null): Cell {
  if (value === undefined || value === null) return { missing: true };
  if (!rule) return { suppressed: 'no-threshold' };
  if (value > 0 && value < rule.threshold) return { suppressed: 'below-threshold' };
  return { value };
}

const clone = <T,>(x: T): T => structuredClone(x);
const check = (v: SmallCellValues): string | null => (Number.isInteger(v.threshold) && v.threshold >= 1 && v.threshold <= 1000 ? null : 'The threshold is a whole number from 1 to 1000, as the nation\'s rule sets it');
const describe = (v: SmallCellValues) => `counts above zero and below ${v.threshold} are suppressed before publication or exchange`;

export interface SmallCellRuleSet {
  /** The threshold in force, with its version (null until two officials adopt one). */
  rule(): { threshold: number; version: number } | null;
  /** The waiting proposal and earlier versions. */
  changes(): PolicyChanges<SmallCellValues>;
  protect(value: number | undefined | null, rule?: { threshold: number } | null): Cell;
  propose(threshold: unknown, legalBasis: unknown, by: string, byId?: string, now?: Date, pendingHours?: number): ReturnType<typeof proposePolicy<SmallCellValues>>;
  confirm(by: string, byId?: string, now?: Date, requireIdentityBinding?: boolean): ReturnType<typeof confirmPolicy<SmallCellValues>>;
  withdraw(by: string, reason?: string): ReturnType<typeof withdrawPolicy<SmallCellValues>>;
  reset(): void;
}

/**
 * One small-cell rule set kept under `key` (a `__civicos…` name on globalThis),
 * audited as `audit`, its proposals described with `context`.
 */
export function smallCellRuleSet(key: `__civicos${string}`, audit: string, context: string): SmallCellRuleSet {
  const g = globalThis as unknown as Record<string, Db | undefined>;
  const db = (): Db => touch(key, g[key] = withDefaults(g[key] ??= seed(), seed()));
  const rule = () => (db().adopted ? clone(db().adopted!) : null);
  return {
    rule,
    changes: () => clone(db().changes),
    protect: (value, r = rule()) => protectWith(value, r),
    propose: (threshold, legalBasis, by, byId, now = new Date(), pendingHours = 24) =>
      proposePolicy(db().changes, { threshold: db().adopted?.threshold ?? 0 }, { threshold: Number(threshold) }, legalBasis, {
        by, ...(byId ? { byId } : {}), now, pendingHours, audit, context, check, describe,
      }),
    confirm: (by, byId, now = new Date(), requireIdentityBinding = false) => {
      const d = db();
      return confirmPolicy(d.changes, {
        by, ...(byId ? { byId } : {}), now, audit, requireIdentityBinding, describe,
        adopt: v => { d.adopted = { threshold: v.values.threshold, version: (d.adopted?.version ?? 0) + 1 }; },
      });
    },
    withdraw: (by, reason) => withdrawPolicy(db().changes, { by, ...(reason ? { reason } : {}), audit }),
    reset: () => { g[key] = undefined; },
  };
}

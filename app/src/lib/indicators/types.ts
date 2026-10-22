// The indicator register's records (plan step I3, plan §3.2 "a definition
// before a number"; spec Part 1 §3.6 and §12, Part 2 F, Part 3 F, Part 6 D.8;
// forms catalogue part 13 §8.2, GOV-STA-006). Pure types.

import type { AuthorityKey } from '@/lib/nation/deployment';
import type { SignalKind } from '@/lib/twin/signal';

/** Who owns a definition: the institution the deployment profile names for a slot, or each institution for its own records. */
export type IndicatorOwner = { slot: AuthorityKey } | { each: 'institution' };

/**
 * The approved-aggregate disclosure rule (spec Part 6 D.8): a count about
 * people goes through the platform's small-cell rule (lib/indicators/
 * disclosure.ts); a count that describes no attribute of any person (an
 * institution's own workload, a public register) says why, and two officials
 * approve that statement with the definition.
 */
export type Disclosure = { kind: 'small-cells' } | { kind: 'not-personal'; reason: string };

/** The terms of one version of a definition. No target value: a target is a policy the nation sets, never typed here. */
export interface IndicatorTerms {
  title: string;
  /** What it means, in words (spec Part 2 F `definition`). */
  definition: string;
  /** What it may and may not be used for. */
  intendedUse: string;
  /** The domain it belongs to (Courts, Civil registration, Case work …). */
  domain: string;
  /** The unit (UCUM) of its values, as its method computes them. */
  unit: string;
  /** What is counted (the numerator), in words. */
  numerator: string;
  /** What it is divided by, in words; absent for a count. */
  denominator?: string;
  /** The computation and its version (lib/indicators/methods.ts); a changed method needs a new version of the definition. */
  method: { id: string; version: number; params?: Record<string, string> };
  /** The reporting period. */
  period: 'month';
  /** How coverage is decided (from the method), in words. */
  coverage: string;
  disclosure: Disclosure;
  /** The domain's essential qualifications (spec Part 3 F): what the figure must not be read as. */
  qualifications: string[];
  /** Known limitations and missing-data treatment. */
  limitations: string[];
  /** The register and record type it is computed from (spec Part 1 §12 source_record_type, Part 2 F source.register_id). */
  source: { registerId: string; recordType: string };
}

export interface IndicatorVersion {
  n: number;
  terms: IndicatorTerms;
  by: string; byId?: string; at: string;
  /** Why this version was drafted. */
  reason: string;
  /** Shipped by the platform as a reference draft (never approved by shipping). */
  reference?: true;
}

/** One institution's approval of one version: an act of a signed-in official who can sign there, other than the drafter. */
export interface IndicatorApproval {
  version: number;
  institution: string;
  by: string; byId?: string; at: string;
  independence: 'identity-provider' | 'accounts-only' | 'unverified';
  /** Withdrawn later (with reason, by whom): the version is no longer approved there; kept. */
  withdrawn?: { by: string; byId?: string; at: string; reason: string };
}

export interface IndicatorDefinition {
  /** Stable id (spec indicator_id), e.g. civil.births_registered. */
  id: string;
  owner: IndicatorOwner;
  versions: IndicatorVersion[];
  approvals: IndicatorApproval[];
}

/** Coverage of one value (spec Part 1 §12 coverage, Part 2 F quality.coverage). */
export interface Coverage {
  expected: number;
  reporting: number;
  completeness: 'complete' | 'partial' | 'none' | 'not_calculated';
  /** What the sources are (procedures, regions). */
  of: string;
}

/** One computed value with everything a screen or the twin needs to show it honestly. */
export interface IndicatorValue {
  indicatorId: string;
  /** The version computed under: the one approved for this institution, else the latest draft. */
  version: number;
  status: 'approved' | 'draft';
  /** A newer draft waiting for approval, when the value uses an earlier approved version. */
  newerDraft?: number;
  institution?: string;
  title: string;
  unit: string;
  period: { start: string; end: string };
  /** The value, or null with `reason` (never a zero for missing data). */
  value: number | null;
  numerator?: number;
  denominator?: number;
  /** Where it comes from: `record` (counted from records), `sample` (sample records counted; demo and training only), `unavailable` (no source). */
  kind: SignalKind;
  source: { institution?: string; institutionName?: string; registerId: string; recordType: string; method: string };
  coverage: Coverage;
  /** The disclosure rule applied and its version. */
  disclosure: { rule: string; version?: number; suppressed?: 'below-threshold' | 'no-threshold'; breakdownWithheld?: boolean };
  /** Records counted: how many and the SHA-256 of their ids (lineage, never shown as personal data). */
  records: { count: number; sha256: string };
  /** When the newest record counted changed (last update). */
  lastUpdated?: string;
  computedAt: string;
  /** Why no value is shown. */
  reason?: string;
  /** Breakdown (regions, procedures), each through the same disclosure rule. */
  groups?: { key: string; label: string; value: number | null; suppressed?: 'below-threshold' | 'no-threshold'; numerator?: number; denominator?: number; /** SHA-256 of the group's record ids, where the method keeps them. */ sha256?: string }[];
}

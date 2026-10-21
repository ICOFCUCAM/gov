// Observations nobody may type (plan step I3, the twin contract; spec Part 1
// §12 "the actual value, source method and quality status must be computed
// from real records"). The indicator register (lib/indicators/) publishes each
// approved indicator's value to the twin as an observation of one registered
// internal source; that source, and every metric under the `indicator.`
// prefix, accept rows only from a run that carries this capability, which only
// lib/indicators/twin.ts passes, with rows it computed from the registers and
// cases itself (lib/indicators/twin.test.ts checks that no other module
// imports it, and that an uploaded CSV, a fetched file or a hand-registered
// source is refused).
//
// Pure: no imports.

/** The capability a computed run carries (a unique symbol: a request body or a CSV can never hold it). */
export const COMPUTED_FROM_RECORDS: unique symbol = Symbol('civicos.twin.computed-from-records');
export type ComputedCapability = typeof COMPUTED_FROM_RECORDS;

/** The system name of the indicator register's internal source. */
export const INDICATOR_SYSTEM = 'indicators';
/** Every indicator's twin metric starts with this. */
export const INDICATOR_METRIC_PREFIX = 'indicator.';

export const isIndicatorMetric = (metric: string): boolean => metric.startsWith(INDICATOR_METRIC_PREFIX);

export const TYPED_REFUSAL = 'Indicator observations are computed from the platform\'s records by the indicator register (lib/indicators), never typed, uploaded or fetched';

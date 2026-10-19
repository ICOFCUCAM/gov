// The figures the client engines (lib/gov/*) read from the twin (review M3,
// R18; register 16.3). Each is a metric id with the definition the nation
// would register for it (lib/twin/metrics.ts): once it is registered and a
// source reports it, the engine shows the observed value through
// readTwin() / readTwinValue() (lib/twin/read.ts); until then the engine's
// own value, marked sample. Engines keep their exported shapes.
//
// `scope` says where the figure is read: the nation's own figure (national;
// a source reporting for the nation, or every region reporting a metric
// that combines), or each operational region. Pure data: runs in the browser.
//
// Engine indexes without a metric of their own are either derived metrics (a
// formula over observed metrics, lib/twin/derived.ts) or modelled indexes
// marked on screen (lib/twin/engine-indexes.ts).

import type { Aggregation, MetricPeriod } from './metrics';
import { DERIVED_METRIC_IDS } from './derived';

export interface EngineMetric {
  id: string;
  label: string;
  /** UCUM unit of the registered metric. */
  unit: string;
  aggregation: Aggregation;
  weightMetric?: string;
  period: MetricPeriod;
  scope: 'national' | 'regional';
  /** The engine figures that read it (file · function · field). */
  engines: string[];
  /** Whether the platform defines it in every nation (lib/twin/metrics.ts STANDARD_METRICS). */
  standard?: boolean;
}

export const ENGINE_METRICS: readonly EngineMetric[] = [
  { id: 'population', label: 'Population', unit: '{persons}', aggregation: 'sum', period: 'instant', scope: 'regional', standard: true,
    engines: ['regions.ts · regionalModel · populationM', 'agriculture-rural.ts · ruralZones · population'] },
  { id: 'households', label: 'Households', unit: '{households}', aggregation: 'sum', period: 'instant', scope: 'regional', standard: true,
    engines: ['communications-continuity.ts · communicationsBoard · regions[].households'] },
  { id: 'corrections.population', label: 'People in custody', unit: '{persons}', aggregation: 'sum', period: 'instant', scope: 'national',
    engines: ['judicial-operations.ts · prisonCoordination · population', 'justice-systems.ts · justiceSystems · corrections.population'] },
  { id: 'corrections.capacity', label: 'Places in custodial facilities', unit: '{places}', aggregation: 'sum', period: 'instant', scope: 'national',
    engines: ['judicial-operations.ts · prisonCoordination · capacity', 'justice-systems.ts · justiceSystems · corrections.capacity'] },
  { id: 'budget.execution_rate', label: 'Budget executed', unit: '%', aggregation: 'none', period: 'year', scope: 'national',
    engines: ['treasury-systems.ts · budgetOps · executionPct'] },
  { id: 'revenue.collection_rate', label: 'Revenue collected against target', unit: '%', aggregation: 'none', period: 'year', scope: 'national',
    engines: ['treasury-systems.ts · revenueOps · collectionRatePct'] },
  { id: 'revenue.taxpayers', label: 'Registered taxpayers', unit: '{taxpayers}', aggregation: 'sum', period: 'instant', scope: 'national',
    engines: ['treasury-systems.ts · revenueOps · taxpayersM'] },
  { id: 'fiscal.debt_to_gdp', label: 'Public debt to GDP', unit: '%', aggregation: 'none', period: 'year', scope: 'national',
    engines: ['treasury-systems.ts · fiscalCommand · debtToGdp'] },
  { id: 'health.insurance_coverage', label: 'Population with health cover', unit: '%', aggregation: 'weighted-mean', weightMetric: 'population', period: 'year', scope: 'national',
    engines: ['health-systems.ts · patientServices · insuranceCoverage'] },
];

/** The metric ids a page with these engines primes (useTwinPrimed): the metrics above and the derived ones. */
export const ENGINE_METRIC_IDS: readonly string[] = [...ENGINE_METRICS.map(m => m.id), ...DERIVED_METRIC_IDS];

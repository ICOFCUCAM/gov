// Derived metrics (review M1–M3, register 16.3): an engine index that is a
// plain formula over metrics the twin observes. The formula is fixed here,
// with its inputs; the twin computes it on read from the inputs' observed
// values (lib/twin/derived-server.ts, /api/twin/state?metric=…) and returns it
// as modelled, never observed, with every input it used (metric, value, unit,
// date, source and run). A derived metric is never imported or stored: a
// source row that names one is refused (lib/twin/register.ts).
//
// Every input is a metric the nation registers (the definitions below are the
// ones offered with "Use this definition" on the Metrics tab), or a standard
// one. Pure data and arithmetic: runs in the browser too.

import type { Aggregation, MetricPeriod } from './metrics';

export interface DerivedInput {
  id: string;
  label: string;
  /** UCUM unit of the registered input metric. */
  unit: string;
  aggregation: Aggregation;
  period: MetricPeriod;
  /** Whether the platform defines it in every nation (STANDARD_METRICS). */
  standard?: boolean;
}

export interface DerivedMetric {
  id: string;
  label: string;
  /** UCUM unit of the result. */
  unit: string;
  /** value = factor × numerator ÷ denominator, both observed for the same entity and the same date. */
  numerator: DerivedInput;
  denominator: DerivedInput;
  factor: number;
  /** Where it is read: the nation's own figure, or each entity (an institution) the engine shows. */
  scope: 'national' | 'entity';
  /** The engine figures that read it (file · function · field). */
  engines: string[];
}

export const DERIVED_METRICS: readonly DerivedMetric[] = [
  {
    id: 'population.share_65_plus', label: 'Share of the population aged 65 and over', unit: '%', factor: 100, scope: 'national',
    numerator: { id: 'population.age_65_plus', label: 'Population aged 65 and over', unit: '{persons}', aggregation: 'sum', period: 'instant' },
    denominator: { id: 'population', label: 'Population', unit: '{persons}', aggregation: 'sum', period: 'instant', standard: true },
    engines: ['workforce-continuity.ts · workforceContinuityBoard · demographics.agingIndex'],
  },
  {
    id: 'health.hospital_mortality', label: 'Deaths in hospital per 1,000 admissions', unit: '/10*3{admissions}', factor: 1000, scope: 'entity',
    numerator: { id: 'health.hospital_deaths', label: 'Deaths in hospital', unit: '{deaths}', aggregation: 'sum', period: 'year' },
    denominator: { id: 'health.admissions', label: 'Hospital admissions', unit: '{admissions}', aggregation: 'sum', period: 'year' },
    engines: ['health-systems.ts · hospitalOps · mortalityIndex'],
  },
];

export const DERIVED_METRIC_IDS: readonly string[] = DERIVED_METRICS.map(d => d.id);

export const derivedMetric = (id: string): DerivedMetric | undefined => DERIVED_METRICS.find(d => d.id === id);

/** The formula in words, e.g. "100 × population.age_65_plus ÷ population". */
export const formulaOf = (d: DerivedMetric): string => `${d.factor === 1 ? '' : `${d.factor.toLocaleString('en')} × `}${d.numerator.id} ÷ ${d.denominator.id}`;

/** The result for two observed inputs, or why there is none. */
export function derive(d: DerivedMetric, numerator: number, denominator: number): { value: number } | { error: string } {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return { error: 'An input is not a number' };
  if (!(denominator > 0)) return { error: `${d.denominator.id} is zero` };
  return { value: Number(((d.factor * numerator) / denominator).toPrecision(12)) };
}

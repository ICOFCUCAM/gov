// Derived metrics computed from the register (lib/twin/derived.ts): for each
// entity whose numerator and denominator are both observed, true for the same
// date, the formula's value, recorded as modelled with the inputs it used.
// The nation's figure comes from the national figures of both inputs when
// both are observed for the same dates (nationalTotal), else from a value
// recorded for the nation itself. Nothing is stored; nothing is guessed: an
// entity with one input missing, or inputs for different dates, has no value.

import { stateAsOf, nationalTotal, listSources, type Observation, type NationalFigure } from './register';
import { derive, formulaOf, type DerivedMetric } from './derived';
import type { Signal } from './signal';

export interface DerivedInputUsed { metric: string; value: number; unit?: string; validFrom?: string; sourceId?: string; runId?: string; source?: string }

/** One entity's derived value: modelled, with its inputs. */
export interface DerivedObservation {
  entityId: string;
  metric: string;
  value: number;
  unit: string;
  validFrom: string;
  kind: 'modelled';
  formula: string;
  inputs: DerivedInputUsed[];
}

export interface DerivedNational extends Signal<number> { formula: string; inputs: DerivedInputUsed[]; refused?: string }

const used = (o: Observation, names: Map<string, string>): DerivedInputUsed => ({ metric: o.metric, value: o.value, unit: o.unit, validFrom: o.validFrom, sourceId: o.sourceId, runId: o.runId, source: names.get(o.sourceId) ?? o.sourceId });

/** Every entity's value of a derived metric as of a moment (as known by `knownAt`), optionally for one entity. */
export function derivedState(d: DerivedMetric, q: { asOf?: string; knownAt?: string; entityId?: string } = {}): DerivedObservation[] {
  const names = new Map(listSources().map(s => [s.id, s.name]));
  const num = stateAsOf({ ...q, metric: d.numerator.id });
  const den = new Map(stateAsOf({ ...q, metric: d.denominator.id }).map(o => [o.entityId, o]));
  const out: DerivedObservation[] = [];
  for (const n of num) {
    const m = den.get(n.entityId);
    if (!m || m.validFrom !== n.validFrom) continue;
    const r = derive(d, n.value, m.value);
    if ('error' in r) continue;
    out.push({ entityId: n.entityId, metric: d.id, value: r.value, unit: d.unit, validFrom: n.validFrom, kind: 'modelled', formula: formulaOf(d), inputs: [used(n, names), used(m, names)] });
  }
  return out;
}

const fromNational = (metric: string, f: NationalFigure): DerivedInputUsed => ({ metric, value: f.value!, unit: f.unit, validFrom: f.asOf, source: f.source });

/** The nation's value of a derived metric, modelled with its inputs; null when the twin observes neither input, or a refusal with the reason. */
export function derivedNational(d: DerivedMetric, asOf?: string): DerivedNational | null {
  const formula = formulaOf(d);
  const a = nationalTotal(d.numerator.id, asOf), b = nationalTotal(d.denominator.id, asOf);
  if (!a && !b) return null;
  const refuse = (refused: string): DerivedNational => ({ value: null, unit: d.unit, kind: 'unavailable', source: `Derived: ${formula}`, formula, inputs: [], refused });
  if (!a || a.value === null || a.kind !== 'observed') return refuse(a?.refused ?? `${d.numerator.id} is not observed for the nation`);
  if (!b || b.value === null || b.kind !== 'observed') return refuse(b?.refused ?? `${d.denominator.id} is not observed for the nation`);
  const same = a.vintage && b.vintage && a.vintage.oldest === b.vintage.oldest && a.vintage.newest === b.vintage.newest;
  if (!same) return refuse(`${d.numerator.id} and ${d.denominator.id} are not for the same dates; they are not combined`);
  const r = derive(d, a.value, b.value);
  if ('error' in r) return refuse(r.error);
  return { value: r.value, unit: d.unit, kind: 'modelled', source: `Derived: ${formula} (inputs: ${a.source}; ${b.source})`, asOf: a.asOf, formula, inputs: [fromNational(d.numerator.id, a), fromNational(d.denominator.id, b)] };
}

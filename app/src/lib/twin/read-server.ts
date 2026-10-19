// The server side of the twin read API (lib/twin/read.ts): a figure from the
// register itself, observed when the twin knows it (a national figure only
// when every region reports in one unit, or a figure for one entity), else the
// caller's sample, marked. Same rule as the client (figureFrom). Server only:
// it reads the register directly. A derived metric (lib/twin/derived.ts) is
// computed from its observed inputs and stays modelled.

import { syncRegister, nationalTotal, signalFor } from './register';
import { figureFrom, type ReadOptions, type ObservedFigure } from './read';
import { derivedMetric, formulaOf } from './derived';
import { derivedState, derivedNational } from './derived-server';
import type { Signal } from './signal';

export async function twinFigure(metric: string, sampleValue: number, opts: Pick<ReadOptions, 'entityId' | 'unit' | 'source' | 'scale'> & { asOf?: string } = {}): Promise<Signal<number>> {
  await syncRegister();
  const d = derivedMetric(metric);
  if (d) {
    const one = opts.entityId ? derivedState(d, { asOf: opts.asOf, entityId: opts.entityId })[0] : undefined;
    const figure: ObservedFigure | null = opts.entityId
      ? (one ? { value: one.value, unit: one.unit, source: `Derived: ${formulaOf(d)}`, asOf: one.validFrom, kind: 'modelled' } : null)
      : derivedNational(d, opts.asOf);
    return figureFrom(figure, sampleValue, opts);
  }
  const observed = opts.entityId ? signalFor(opts.entityId, metric, opts.asOf) : nationalTotal(metric, opts.asOf);
  return figureFrom(observed, sampleValue, opts);
}

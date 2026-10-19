// The server side of the twin read API (lib/twin/read.ts): a figure from the
// register itself, observed when the twin knows it (a national figure only
// when every region reports in one unit, or a figure for one entity), else the
// caller's sample, marked. Same rule as the client (figureFrom). Server only:
// it reads the register directly.

import { syncRegister, nationalTotal, signalFor } from './register';
import { figureFrom, type ReadOptions } from './read';
import type { Signal } from './signal';

export async function twinFigure(metric: string, sampleValue: number, opts: Pick<ReadOptions, 'entityId' | 'unit' | 'source' | 'scale'> & { asOf?: string } = {}): Promise<Signal<number>> {
  await syncRegister();
  const observed = opts.entityId ? signalFor(opts.entityId, metric, opts.asOf) : nationalTotal(metric, opts.asOf);
  return figureFrom(observed, sampleValue, opts);
}

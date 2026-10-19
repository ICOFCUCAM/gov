// The national twin's server store (lib/twin/register.ts), on globalThis under
// __civicosTwin so lib/data/persist.ts saves and restores it. Kept in its own
// module so the register and the metric registry (lib/twin/metrics.ts) share
// one store without importing each other. Fields added since a snapshot was
// saved get their defaults here (migrate).

import type { TwinEntity, TwinSource, TwinRun, Observation } from './register';
import type { MetricDef } from './metrics';

export interface TwinDb {
  entities: Record<string, TwinEntity>;
  keys: { entityId: string; system: string; key: string }[];
  sources: TwinSource[];
  runs: TwinRun[];
  observations: Observation[];
  seq: number;
  syncedFor?: string;
  /** Metric definitions registered by officials (lib/twin/metrics.ts). */
  metrics: Record<string, MetricDef>;
}

const g = globalThis as unknown as { __civicosTwin?: TwinDb };

/** Defaults for fields a snapshot saved before they existed does not have. */
function migrate(d: TwinDb): TwinDb {
  d.metrics ??= {};
  return d;
}

export const twinDb = (): TwinDb => migrate(g.__civicosTwin ??= { entities: {}, keys: [], sources: [], runs: [], observations: [], seq: 1, metrics: {} });
export function resetTwinDb(): void { g.__civicosTwin = undefined; }

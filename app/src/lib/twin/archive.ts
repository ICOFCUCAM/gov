// The twin's history archive (review D3, R5). When the live register holds
// more observations or runs than its working limits (lib/twin/register.ts
// LIMITS), the oldest move here instead of being dropped: kept per metric,
// still read by every as-of query and the history view, still withdrawable,
// and every move is audited. A durable store on globalThis under
// __civicosTwinArchive, saved and restored by lib/data/persist.ts like the
// register itself. Nothing is ever removed from it.

import type { Observation, TwinRun } from './register';
import { touch } from '@/lib/data/repo/track';

export interface ArchiveMove { at: string; observations: number; runs: number; oldestRecordedAt?: string; newestRecordedAt?: string }

interface TwinArchive {
  /** Archived observations by metric, oldest first. */
  observations: Record<string, Observation[]>;
  runs: TwinRun[];
  moves: ArchiveMove[];
}

const g = globalThis as unknown as { __civicosTwinArchive?: TwinArchive };
function adb(): TwinArchive {
  const a = touch('__civicosTwinArchive', g.__civicosTwinArchive ??= { observations: {}, runs: [], moves: [] });
  a.observations ??= {}; a.runs ??= []; a.moves ??= [];
  return a;
}
export function resetTwinArchive(): void { g.__civicosTwinArchive = undefined; }

/** Keep observations and runs that left the live register; returns the move recorded. */
export function archive(observations: Observation[], runs: TwinRun[], at: string): ArchiveMove {
  const a = adb();
  for (const o of observations) (a.observations[o.metric] ??= []).push(o);
  a.runs.push(...runs);
  const times = observations.map(o => o.recordedAt).sort();
  const move: ArchiveMove = { at, observations: observations.length, runs: runs.length, ...(times.length ? { oldestRecordedAt: times[0], newestRecordedAt: times.at(-1) } : {}) };
  a.moves.push(move);
  return move;
}

/** Archived observations, of one metric or all. */
export function archivedObservations(metric?: string): Observation[] {
  const a = adb();
  return metric ? a.observations[metric] ?? [] : Object.values(a.observations).flat();
}

/** Visit every archived observation (of one metric, or all) without copying. */
export function forEachArchived(metric: string | undefined, fn: (o: Observation) => void): void {
  const a = adb();
  if (metric) { for (const o of a.observations[metric] ?? []) fn(o); return; }
  for (const list of Object.values(a.observations)) for (const o of list) fn(o);
}

export const archivedMetrics = (): string[] => Object.keys(adb().observations).filter(m => adb().observations[m]!.length > 0);
export const archivedRuns = (): TwinRun[] => adb().runs;

export function archiveStatus(): { observations: number; runs: number; moves: ArchiveMove[] } {
  const a = adb();
  return { observations: Object.values(a.observations).reduce((n, l) => n + l.length, 0), runs: a.runs.length, moves: a.moves.slice(-20) };
}

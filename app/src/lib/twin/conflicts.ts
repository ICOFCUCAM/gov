// Conflicting values in the twin (design §9.4, directions 11.6-11.7): two
// different sources giving different values for the same entity, metric and
// date are a conflict, never settled by which import came last. They are
// listed for officials, and a screen marks the figure "In conflict" until a
// named official chooses the source that stands (with a reason, audited);
// from then the twin's state takes that source's value for that date.
// Corrections within one source (a publisher's revision) are not conflicts:
// the later import of the same source still stands. Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import type { Observation } from './register';

export interface Resolution { entityId: string; metric: string; validFrom: string; chosenSource: string; by: string; at: string; reason: string }
interface ConflictDb { resolutions: Resolution[] }
const g = globalThis as unknown as { __civicosTwinConflicts?: ConflictDb };
const db = (): ConflictDb => touch('__civicosTwinConflicts', g.__civicosTwinConflicts ??= { resolutions: [] });
export function resetConflicts(): void { g.__civicosTwinConflicts = undefined; }

const key = (entityId: string, metric: string, validFrom: string) => `${entityId}|${metric}|${validFrom}`;

/** The source an official chose for a value, if any (read by stateAsOf). */
export function chosenSource(entityId: string, metric: string, validFrom: string): string | undefined {
  const k = key(entityId, metric, validFrom);
  for (let i = db().resolutions.length - 1; i >= 0; i--) { const r = db().resolutions[i]!; if (key(r.entityId, r.metric, r.validFrom) === k) return r.chosenSource; }
  return undefined;
}

export interface Conflict { entityId: string; metric: string; validFrom: string; values: { sourceId: string; value: number; unit: string; runId: string }[]; resolved?: Resolution }

/**
 * Conflicts among standing observations: for each entity, metric and date,
 * the latest value of each source (superseded ones left out), when two
 * sources disagree.
 */
export function findConflicts(observations: Observation[], filter: { metric?: string; entityId?: string } = {}): Conflict[] {
  const latest = new Map<string, Map<string, Observation>>();
  for (const o of observations) {
    if (o.supersededAt) continue;
    if (filter.metric && o.metric !== filter.metric) continue;
    if (filter.entityId && o.entityId !== filter.entityId) continue;
    const k = key(o.entityId, o.metric, o.validFrom);
    const bySource = latest.get(k) ?? new Map<string, Observation>();
    const cur = bySource.get(o.sourceId);
    if (!cur || o.recordedAt >= cur.recordedAt) bySource.set(o.sourceId, o);
    latest.set(k, bySource);
  }
  const out: Conflict[] = [];
  for (const [k, bySource] of latest) {
    if (bySource.size < 2) continue;
    const vals = [...bySource.values()];
    if (new Set(vals.map(v => v.value)).size < 2) continue;
    const [entityId, metric, validFrom] = k.split('|') as [string, string, string];
    const resolved = [...db().resolutions].reverse().find(r => key(r.entityId, r.metric, r.validFrom) === k);
    out.push({ entityId, metric, validFrom, values: vals.map(v => ({ sourceId: v.sourceId, value: v.value, unit: v.unit, runId: v.runId })), ...(resolved ? { resolved } : {}) });
  }
  return out;
}

/** A named official chooses the source that stands for a conflicting value. */
export function resolveConflict(input: { entityId: string; metric: string; validFrom: string; chosenSource: string; reason: string }, conflicts: Conflict[], by: string, now = new Date()): Resolution | { error: string } {
  const c = conflicts.find(x => x.entityId === input.entityId && x.metric === input.metric && x.validFrom === input.validFrom);
  if (!c) return { error: 'There is no conflict for that entity, metric and date' };
  if (!c.values.some(v => v.sourceId === input.chosenSource)) return { error: 'Choose one of the sources in conflict' };
  if (!input.reason?.trim()) return { error: 'Say why this source stands' };
  if (!by.trim()) return { error: 'Name the official deciding' };
  const r: Resolution = { ...input, reason: input.reason.trim().slice(0, 300), by, at: now.toISOString() };
  db().resolutions.push(r);
  recordAudit(by, 'twin.conflict.resolve', `Twin:${input.entityId}/${input.metric}`, 'ok', `${input.validFrom}: ${input.chosenSource} stands · ${r.reason}`);
  return r;
}

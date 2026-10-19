// Repeated refusals from people who are not signed in (failed sign-ins,
// wrong reset codes, email-update requests) written to the audit chain in a
// bounded way (go-live review M-9): within a window, the first few of one
// kind against one subject are written as they happen, the rest are counted
// and written once, as a summary, when the window closes. A flood therefore
// adds a handful of entries per subject and window, never one per request,
// and nothing is lost: the summary says how many more there were and when.
//
// Open windows are platform state (`__civicosAuditAggregate`, saved by
// lib/data/persist.ts), so counts survive a restart. Windows close on the
// next refusal after they end, or from the retention sweep
// (/api/cron/retention). The number of open windows is bounded.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';

export const AGGREGATE_WINDOW_MS = 15 * 60_000;
/** Entries written one by one per subject and window before counting starts. */
export const WRITTEN_PER_WINDOW = 5;
/** Open windows kept at most; the oldest is closed (its summary written) to make room. */
export const MAX_WINDOWS = 2_000;

export interface AggregatedEntry { actor: string; action: string; resource: string; outcome: string; detail?: string }
interface Window extends AggregatedEntry { first: number; last: number; written: number; counted: number }
interface Db { windows: Record<string, Window> }

const g = globalThis as unknown as { __civicosAuditAggregate?: Db };
const db = (): Db => {
  const d = touch('__civicosAuditAggregate', g.__civicosAuditAggregate ??= { windows: {} });
  d.windows ??= {};
  return d;
};
export function resetAuditAggregate(): void { g.__civicosAuditAggregate = undefined; }

function close(d: Db, key: string): void {
  const w = d.windows[key];
  delete d.windows[key];
  if (!w || !w.counted) return;
  recordAudit(w.actor, w.action, w.resource, w.outcome,
    `${w.counted} more like this between ${new Date(w.first).toISOString()} and ${new Date(w.last).toISOString()} (counted, not written one by one)${w.detail ? ` · ${w.detail}` : ''}`);
}

/**
 * Record one refusal under `key` (the subject: an account, a site). Returns
 * 'written' when it went to the chain now, 'counted' when it will be in the
 * window's summary.
 */
export function recordAggregated(key: string, e: AggregatedEntry, now = Date.now(), perWindow = WRITTEN_PER_WINDOW): 'written' | 'counted' {
  const d = db();
  let w = d.windows[key];
  if (w && now - w.first >= AGGREGATE_WINDOW_MS) { close(d, key); w = undefined; }
  if (!w) {
    const keys = Object.keys(d.windows);
    // Insertion order is opening order: close the oldest windows to stay within the bound.
    for (let i = 0; i <= keys.length - MAX_WINDOWS; i++) close(d, keys[i]!);
    w = d.windows[key] = { ...e, first: now, last: now, written: 0, counted: 0 };
  }
  w.last = now;
  if (w.written < perWindow) {
    w.written++;
    recordAudit(e.actor, e.action, e.resource, e.outcome, e.detail);
    return 'written';
  }
  w.counted++;
  return 'counted';
}

/** Close every window that has ended (writes their summaries). Returns how many summaries were written. */
export function flushAggregated(now = Date.now()): number {
  const d = db();
  let n = 0;
  for (const [key, w] of Object.entries(d.windows)) {
    if (now - w.first < AGGREGATE_WINDOW_MS) continue;
    if (w.counted) n++;
    close(d, key);
  }
  return n;
}

/** Open windows (for tests and the retention sweep's report). */
export const openAggregates = (): number => Object.keys(db().windows).length;

// A list read of personal data in the access log (baseline audit §3.3, step
// I0.1): one `search` entry per request naming the register, the query and how
// many records it returned (never the records). Screens re-read lists (the
// audit chain's screen every 15 seconds), so the same official's same query is
// written once per SEARCH_REPEAT_MS; a different query, or another official,
// is written at once. Held per server instance in memory (runtime state, not a
// store; nothing to back up).

import { recordAccess } from './access-log';
import { accessBy } from './access-by';

export const SEARCH_REPEAT_MS = 60_000;
const MAX_KEYS = 5_000;
const seen = new Map<string, number>();

/** Forget the windows (tests). */
export function resetSearchLog(): void { seen.clear(); }

/** Who searched: the official of the request (session subject, the name it is recorded under, institution). */
export interface Searcher { id?: string; label: string; institution?: string }

/**
 * Write one search entry: `query` (at most 200 characters with the count) and
 * the rule that allowed it. False when the same search was written within
 * SEARCH_REPEAT_MS.
 */
export function recordSearch(who: Searcher, register: string, query: string, count: number, rule: string, now = new Date()): boolean {
  const key = `${who.id ?? `name:${who.label}`}|${register}|${query}`;
  const t = now.getTime();
  const last = seen.get(key);
  if (last !== undefined && t - last < SEARCH_REPEAT_MS) return false;
  seen.delete(key);
  if (seen.size >= MAX_KEYS) seen.delete(seen.keys().next().value!);
  seen.set(key, t);
  recordAccess({ ...accessBy(who, now), record: { register, query: `${query.slice(0, 160)} → ${count}` }, action: 'search', result: 'allowed', rule }, now);
  return true;
}

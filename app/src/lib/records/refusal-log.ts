// Refused requests in the access log (spec Part 4 test 14; baseline audit
// §3.3, step I0.1): the middleware's 403 for an API change (written when the
// middleware asks GET /api/auth/official about the change, since the edge
// cannot write the log) and every refusal() / readRefusal() of a route
// (lib/auth/official.ts). An entry names who was refused, what they asked for
// (a record reference, or the request's method and path) and the rule that
// refused them: never the protected content, never the request body.
//
// A loop must not flood the log: the same refusal (same official, same
// reference, same rule) is written once per DEDUPE_MS, and at most
// PER_OFFICIAL_MAX refusals of one official are written per DEDUPE_MS; the
// rest are counted in the operator log only. The windows are held per server
// instance in memory (runtime state, not a store; nothing to back up).

import { recordAccess } from './access-log';
import { accessBy } from './access-by';
import { logger } from '@/lib/ops/log';

export const DEDUPE_MS = 60_000;
export const PER_OFFICIAL_MAX = 30;
const MAX_KEYS = 5_000;

/** What a refused request asked for: a register and record, or `api` and the request's method and path. */
export interface RefusalRef { register: string; id?: string }
/** Who was refused: the official of the request (session subject, the name it is recorded under, institution). */
export interface RefusalWho { id?: string; label: string; institution?: string }

const seen = new Map<string, number>();
const perOfficial = new Map<string, { from: number; n: number; dropped: number }>();

/** Forget the windows (tests). */
export function resetRefusalLog(): void { seen.clear(); perOfficial.clear(); }

/**
 * Write one `refused` entry, unless the same refusal was written within
 * DEDUPE_MS or this official reached PER_OFFICIAL_MAX in the window. Never
 * throws: a refusal is answered whether or not it could be written.
 */
export function logRefusal(who: RefusalWho, ref: RefusalRef, rule: string, now = new Date()): boolean {
  try {
    const t = now.getTime();
    const official = who.id ?? `name:${who.label}`;
    const key = `${official}|${ref.register}|${ref.id ?? ''}|${rule}`;
    const last = seen.get(key);
    if (last !== undefined && t - last < DEDUPE_MS) return false;
    const w = perOfficial.get(official);
    const win = w && t - w.from < DEDUPE_MS ? w : { from: t, n: 0, dropped: 0 };
    if (win.n >= PER_OFFICIAL_MAX) {
      if (win.dropped++ === 0) logger.warn('access.refusals_suppressed', { official, windowMs: DEDUPE_MS, max: PER_OFFICIAL_MAX });
      perOfficial.set(official, win);
      return false;
    }
    win.n++;
    // Most recent last, so the oldest is dropped first when a map is full.
    perOfficial.delete(official);
    if (perOfficial.size >= MAX_KEYS) perOfficial.delete(perOfficial.keys().next().value!);
    perOfficial.set(official, win);
    seen.delete(key);
    if (seen.size >= MAX_KEYS) seen.delete(seen.keys().next().value!);
    seen.set(key, t);
    recordAccess({ ...accessBy(who, now), record: { register: ref.register, ...(ref.id ? { id: ref.id } : {}) }, action: 'refused', result: 'refused', rule }, now);
    return true;
  } catch (e) {
    logger.error('access.refusal_unrecorded', { error: (e as Error).message });
    return false;
  }
}

// Watching the public professional check for harvesting (acceptance
// hardening): a caller who keeps asking for people who are not on the
// register, or asks far more than one person needs, is flagged once a day in
// the audit chain as a prompt for review (never a conclusion). Callers are
// kept only as a salted SHA-256 of their address or account, in memory
// (protection, not records), and the counts are dropped after a day. On a
// server running CIVICOS_STATE=postgres the counts are shared by every
// instance in hourly windows (lib/ops/shared-limits.ts: a harvest spread
// across servers is still seen, and flagged once a day); if the database
// cannot answer, this server's own counts apply.

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { recordsBackend } from '@/lib/data/persist';
import { logger } from '@/lib/ops/log';
import { sharedWatch } from '@/lib/ops/shared-limits';

const WINDOW_MS = 3_600_000;
/** Lookups in an hour from one caller that suggest harvesting, and misses among them. */
export const HARVEST = { lookups: 60, misses: 25 };

interface Seen { at: number[]; misses: number[]; flagged?: string }
const g = globalThis as unknown as { __registerWatch?: { salt: string; callers: Map<string, Seen> } };
const state = () => (g.__registerWatch ??= { salt: createHash('sha256').update(String(Math.random()) + Date.now()).digest('hex'), callers: new Map() });
export function resetRegisterWatch(): void { g.__registerWatch = undefined; }

/** Note one public check; returns true when this caller has just been flagged. */
export function noteCheck(caller: string, found: boolean, now = Date.now()): boolean {
  const s = state();
  const key = createHash('sha256').update(`${s.salt}|${caller}`).digest('hex').slice(0, 16);
  const seen: Seen = s.callers.get(key) ?? { at: [], misses: [] };
  seen.at = [...seen.at.filter(t => now - t < WINDOW_MS), now];
  seen.misses = [...seen.misses.filter(t => now - t < WINDOW_MS), ...(found ? [] : [now])];
  s.callers.set(key, seen);
  if (s.callers.size > 20_000) for (const [k, v] of s.callers) if (!v.at.some((t: number) => now - t < WINDOW_MS)) s.callers.delete(k);
  const day = new Date(now).toISOString().slice(0, 10);
  if (seen.flagged === day || (seen.at.length < HARVEST.lookups && seen.misses.length < HARVEST.misses)) return false;
  seen.flagged = day;
  recordAudit('System (register watch)', 'register.harvest.suspected', `Caller:${key}`, 'ok', `${seen.at.length} checks and ${seen.misses.length} misses in an hour on the professional register`);
  return true;
}

/** Note one public check: counted across instances in postgres mode, else on this server. Returns true when the caller has just been flagged. */
export async function watchCheck(caller: string, found: boolean, now = Date.now()): Promise<boolean> {
  const sql = recordsBackend()?.sql;
  if (sql) {
    try {
      const flag = await sharedWatch(sql, caller, found, HARVEST, now);
      if (flag) recordAudit('System (register watch)', 'register.harvest.suspected', `Caller:${flag.key}`, 'ok', `${flag.lookups} checks and ${flag.misses} misses in an hour on the professional register (all instances)`);
      return !!flag;
    } catch (e) { logger.warn('register.watch.shared_unavailable', { message: (e as Error).message }); }
  }
  return noteCheck(caller, found, now);
}

// Rate limits and the register watch shared by every instance (acceptance
// hardening). With CIVICOS_STATE=postgres several servers answer the same
// callers; counted in each server's memory, a limit is multiplied by the
// number of servers and a harvest spread across them goes unseen. Here the
// counters are rows in civicos (migration 20261026000000_civicos_rate_limits),
// each taken or counted by one atomic statement, so concurrent requests on
// any instance never share a token and a caller is flagged once a day across
// them all. Protection, not records: never backed up, and old rows pruned.
//
// The middleware runs on the edge and keeps its per-server limits
// (rate-limit-core.ts); route limits (lib/ops/rate-limit.ts) and the public
// register's watch (lib/professions/watch.ts) use these when the server runs
// on postgres, and fall back to their in-memory counts if the database fails.

import { createHash, randomBytes } from 'node:crypto';
import type { Sql } from '@/lib/data/repo/postgres';
import type { Policy } from './rate-limit-core';

const HOUR = 3_600_000;
/** One statement in this many also prunes rows nobody has used for a day. */
const PRUNE_EVERY = 500;

/** Take one token from a shared bucket: the same answer as take() in rate-limit-core.ts, across instances. */
export async function sharedTake(sql: Sql, key: string, p: Policy, now = Date.now()): Promise<{ ok: boolean; remaining: number; retryAfterS: number }> {
  const rate = p.perMinute / 60_000;
  const rows = await sql.unsafe(
    `insert into civicos.rate_bucket as b (key, tokens, at_ms, last_ok) values ($1, $2::float8 - 1, $3::bigint, true)
     on conflict (key) do update set
       last_ok = least($2::float8, b.tokens + ($3::bigint - b.at_ms) * $4::float8) >= 1,
       tokens = least($2::float8, b.tokens + ($3::bigint - b.at_ms) * $4::float8)
                - case when least($2::float8, b.tokens + ($3::bigint - b.at_ms) * $4::float8) >= 1 then 1 else 0 end,
       at_ms = greatest(b.at_ms, $3::bigint)
     returning tokens, last_ok`,
    [key, p.burst, now, rate],
  );
  if (Math.random() * PRUNE_EVERY < 1) void sql.unsafe(`delete from civicos.rate_bucket where at_ms < $1`, [now - 24 * HOUR]).catch(() => undefined);
  const r = rows[0]!;
  const tokens = Number(r.tokens), ok = r.last_ok === true;
  return { ok, remaining: Math.max(0, Math.floor(tokens)), retryAfterS: ok ? 0 : Math.ceil((1 - tokens) / rate / 1000) };
}

/** The salt callers are hashed with, the same on every instance (made once). */
async function salt(sql: Sql): Promise<string> {
  const g = globalThis as unknown as { __sharedWatchSalt?: string };
  if (g.__sharedWatchSalt) return g.__sharedWatchSalt;
  await sql.unsafe(`insert into civicos.runtime_secret (name, value) values ('register-watch-salt', $1) on conflict (name) do nothing`, [randomBytes(32).toString('hex')]);
  const v = String((await sql.unsafe(`select value from civicos.runtime_secret where name = 'register-watch-salt'`))[0]!.value);
  return (g.__sharedWatchSalt = v);
}
export function resetSharedWatchSalt(): void { (globalThis as unknown as { __sharedWatchSalt?: string }).__sharedWatchSalt = undefined; }

/**
 * Count one public register check across instances, in hourly windows.
 * Returns the caller's salted key when this check crosses the threshold and
 * no instance has flagged that caller today (the caller then records the
 * audit entry), else null.
 */
export async function sharedWatch(sql: Sql, caller: string, found: boolean, threshold: { lookups: number; misses: number }, now = Date.now()): Promise<{ key: string; lookups: number; misses: number } | null> {
  const key = createHash('sha256').update(`${await salt(sql)}|${caller}`).digest('hex').slice(0, 16);
  const window = Math.floor(now / HOUR) * HOUR;
  const counted = (await sql.unsafe(
    `insert into civicos.register_watch as w (caller, window_start, lookups, misses) values ($1, $2::bigint, 1, $3::int)
     on conflict (caller, window_start) do update set lookups = w.lookups + 1, misses = w.misses + $3::int
     returning lookups, misses`,
    [key, window, found ? 0 : 1],
  ))[0]!;
  if (Math.random() * PRUNE_EVERY < 1) {
    void sql.unsafe(`delete from civicos.register_watch where window_start < $1`, [window - 2 * HOUR]).catch(() => undefined);
    void sql.unsafe(`delete from civicos.register_watch_flag where day < current_date - 2`).catch(() => undefined);
  }
  const lookups = Number(counted.lookups), misses = Number(counted.misses);
  if (lookups < threshold.lookups && misses < threshold.misses) return null;
  const day = new Date(now).toISOString().slice(0, 10);
  const first = await sql.unsafe(`insert into civicos.register_watch_flag (caller, day) values ($1, $2::date) on conflict do nothing returning caller`, [key, day]);
  return first.length ? { key, lookups, misses } : null;
}

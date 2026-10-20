// Shared rate limits and register watch (lib/ops/shared-limits.ts) against a
// real Postgres, with two connection pools standing for two instances of the
// platform. Skipped unless TEST_DATABASE_URL is set (scripts/test-postgres.sh).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, ensureSchema, type Sql } from './postgres';
import { sharedTake, sharedWatch, resetSharedWatchSalt } from '@/lib/ops/shared-limits';
import { POLICIES } from '@/lib/ops/rate-limit-core';

const URL_ = process.env.TEST_DATABASE_URL;

describe.skipIf(!URL_)('rate limits and the register watch shared across instances (TEST_DATABASE_URL)', { timeout: 60_000 }, () => {
  let admin: Sql, a: Sql, b: Sql, dbName: string;
  beforeAll(async () => {
    admin = await connect(URL_!, { max: 1 });
    dbName = `civicos_limits_${process.pid}_${Date.now()}`;
    await admin.unsafe(`create database ${dbName}`);
    const u = new URL(URL_!); u.pathname = `/${dbName}`;
    a = await connect(u.toString(), { max: 5 });
    b = await connect(u.toString(), { max: 5 });
    await ensureSchema(a);
  });
  afterAll(async () => {
    await a?.end?.({ timeout: 2 }); await b?.end?.({ timeout: 2 });
    await admin.unsafe(`drop database if exists ${dbName} with (force)`);
    await admin.end?.({ timeout: 2 });
  });

  it('gives one caller exactly the burst across both instances, however the requests interleave, and refills at the policy rate', async () => {
    const p = POLICIES.registerCheck; // 20 a minute, burst 10
    const now = Date.parse('2026-10-20T12:00:00Z');
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => sharedTake(i % 2 ? a : b, 'registerCheck|a:203.0.113.9', p, now)));
    expect(results.filter(r => r.ok)).toHaveLength(p.burst);
    expect(results.filter(r => !r.ok).every(r => r.retryAfterS >= 1)).toBe(true);
    // One token comes back every 3 seconds (20 a minute), on either instance.
    expect((await sharedTake(b, 'registerCheck|a:203.0.113.9', p, now + 1_000)).ok).toBe(false);
    expect((await sharedTake(a, 'registerCheck|a:203.0.113.9', p, now + 3_100)).ok).toBe(true);
    expect((await sharedTake(b, 'registerCheck|a:203.0.113.9', p, now + 3_200)).ok).toBe(false);
    // Another caller has its own bucket.
    expect((await sharedTake(a, 'registerCheck|a:198.51.100.7', p, now)).ok).toBe(true);
  });

  it('sees a harvest spread over both instances and flags it once a day', async () => {
    const threshold = { lookups: 60, misses: 25 };
    const now = Date.parse('2026-10-20T13:10:00Z');
    let flags = 0;
    for (let i = 0; i < 40; i++) {
      // Each instance hashes the caller with the same salt (made once, in the database).
      if (i === 20) resetSharedWatchSalt();
      if (await sharedWatch(i % 2 ? a : b, 'a:203.0.113.50', false, threshold, now + i * 1000)) flags++;
    }
    expect(flags).toBe(1);
    const rows = await a.unsafe(`select lookups, misses from civicos.register_watch`);
    expect(rows).toEqual([{ lookups: 40, misses: 40 }]);
    // The caller is kept only as a salted hash, never the address.
    expect(JSON.stringify(await a.unsafe(`select * from civicos.register_watch_flag`))).not.toContain('203.0.113.50');
    // The next day it can be flagged again.
    expect(await sharedWatch(a, 'a:203.0.113.50', false, threshold, now + 86_400_000)).toBeNull(); // a new hour starts at one
    for (let i = 1; i < 25; i++) await sharedWatch(b, 'a:203.0.113.50', false, threshold, now + 86_400_000 + i);
    expect((await a.unsafe(`select count(*)::int as n from civicos.register_watch_flag`))[0]!.n).toBe(2);
  });
});

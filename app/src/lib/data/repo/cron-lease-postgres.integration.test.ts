// The scheduled jobs' shared lease (lib/ops/cron-runs.ts, civicos.cron_lease,
// register 18.39) against a real Postgres, with two connection pools standing
// for two serverless instances. Skipped unless TEST_DATABASE_URL is set
// (scripts/test-postgres.sh).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, ensureSchema, type Sql } from './postgres';
import { takeLease, releaseLease } from '@/lib/ops/cron-runs';

const URL_ = process.env.TEST_DATABASE_URL;

describe.skipIf(!URL_)('one run of a scheduled job at a time, across instances (TEST_DATABASE_URL)', { timeout: 60_000 }, () => {
  let admin: Sql, a: Sql, b: Sql, dbName: string;
  beforeAll(async () => {
    admin = await connect(URL_!, { max: 1 });
    dbName = `civicos_cron_${process.pid}_${Date.now()}`;
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

  it('lets exactly one of many simultaneous calls run, refuses the rest, and never runs a slot that succeeded again', async () => {
    const now = Date.parse('2026-10-20T12:05:01Z');
    const until = now + 10 * 60_000;
    const got = await Promise.all(Array.from({ length: 20 }, (_, i) => takeLease(i % 2 ? a : b, 'deliver-events', 'slot:2026-10-20T12:05Z', `CR-${i}`, until, now)));
    expect(got.filter(g => g === 'run')).toHaveLength(1);
    expect(got.filter(g => g === 'duplicate')).toHaveLength(19); // the same slot, while it runs
    expect(await takeLease(a, 'deliver-events', 'slot:2026-10-20T12:10Z', 'CR-x', until, now + 60_000)).toBe('overlap');
    const holder = `CR-${got.indexOf('run')}`;
    await releaseLease(b, 'deliver-events', holder, true);
    expect(await takeLease(a, 'deliver-events', 'slot:2026-10-20T12:05Z', 'CR-y', until, now + 120_000)).toBe('duplicate');
    expect(await takeLease(b, 'deliver-events', 'slot:2026-10-20T12:10Z', 'CR-z', until + 300_000, now + 300_000)).toBe('run');
    // A failed run frees the job but its slot may be retried.
    await releaseLease(a, 'deliver-events', 'CR-z', false);
    expect(await takeLease(a, 'deliver-events', 'slot:2026-10-20T12:10Z', 'CR-r', until + 360_000, now + 360_000)).toBe('run');
    // A run that never finished stops holding the job when its lease runs out.
    expect(await takeLease(b, 'deliver-events', 'slot:2026-10-20T12:30Z', 'CR-s', now + 2_000_000, until + 360_001)).toBe('run');
    // Other jobs are not held by it.
    expect(await takeLease(b, 'backup', 'slot:2026-10-20T11:41Z', 'CR-b', until, now)).toBe('run');
  });
});

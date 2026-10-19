// CIVICOS_STATE=postgres from the server's start (lib/data/persist.ts
// startFromEnv), against a real Postgres: skipped unless TEST_DATABASE_URL is
// set (scripts/test-postgres.sh). Its own test file, so its own globals.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { startFromEnv, persistenceStatus, stateWritable, recordsBackend, flush } from '@/lib/data/persist';
import { recordAudit, verifyAuditChain, setSovereign } from '@/lib/data/store';
import { backend, useBackend } from '.';
import { connect, postgresSnapshotAdapter, type Sql } from './postgres';
import { GET as health } from '@/app/api/health/route';

const URL_ = process.env.TEST_DATABASE_URL;

describe.skipIf(!URL_)('the server in postgres mode (TEST_DATABASE_URL)', { timeout: 60_000 }, () => {
  let admin: Sql, dbName: string, dbUrl: string;
  beforeAll(async () => {
    admin = await connect(URL_!, { max: 1 });
    dbName = `civicos_persist_${process.pid}_${Date.now()}`;
    await admin.unsafe(`create database ${dbName}`);
    const u = new URL(URL_!); u.pathname = `/${dbName}`; dbUrl = u.toString();
  });
  afterAll(async () => {
    await recordsBackend()?.stop();
    await recordsBackend()?.sql.end?.({ timeout: 2 });
    useBackend(null);
    await admin.unsafe(`drop database if exists ${dbName} with (force)`);
    await admin.end?.({ timeout: 2 });
  });

  it('starts as the writer with the record tables, writes the audit chain through and reports it in /api/health', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-pgstate-'));
    const status = await startFromEnv({ CIVICOS_STATE: 'postgres', DATABASE_URL: dbUrl, CIVICOS_STATE_DIR: dir, CIVICOS_STATE_LEASE_WAIT_MS: '0', CIVICOS_STATE_INTERVAL_MS: '600000' } as unknown as NodeJS.ProcessEnv);
    expect(status).toMatchObject({ adapter: 'postgres', role: 'writer', fencing: 'lease+version' });
    expect(status.error).toBeUndefined();
    expect(backend().name).toBe('postgres');
    const e = recordAudit('Registrar', 'test.persist.postgres', 'Test:1', 'ok');
    expect(persistenceStatus().records?.queueDepth).toBe(1);
    expect(await recordsBackend()!.drain()).toBe(true);
    const rows = await recordsBackend()!.sql.unsafe(`select hash from civicos.audit_entry where id = $1`, [e.id]);
    expect(rows[0]?.hash).toBe(e.hash);
    expect(verifyAuditChain().ok).toBe(true);
    expect(stateWritable('/api/sovereign')).toBe(true);

    // Every other store is per-record documents: a change is written with its audit entry, and no snapshot is kept.
    expect(recordsBackend()!.ownsAll).toBe(true);
    expect('error' in setSovereign({ motto: 'Service to every citizen' }, 'Registrar')).toBe(false);
    expect(await recordsBackend()!.drain()).toBe(true);
    const motto = await recordsBackend()!.sql.unsafe(`select doc from civicos.record_doc where store = '__civicos' and path = $1`, [JSON.stringify([['k', 'sovereign'], ['k', 'motto']])]);
    expect(motto[0]?.doc).toBe('Service to every citizen');
    expect(await flush(postgresSnapshotAdapter(recordsBackend()!.sql, m => new Error(m)))).toEqual([]);

    const body = await (await health(new Request('http://localhost/api/health'))).json() as { persistence: { mode: string; database: { adapter: string; queueDepth: number; lagMs: number; postgis: boolean; documents: unknown } | null } };
    expect(body.persistence.mode).toBe('postgres');
    expect(body.persistence.database).toMatchObject({ adapter: 'postgres', queueDepth: 0, lagMs: expect.any(Number), postgis: expect.any(Boolean), documents: { stores: expect.any(Number), rows: expect.any(Number), conflicts: 0 } });
  });
});

// Backups and data restore in postgres mode (lib/data/backups.ts,
// lib/backup/state.ts) against a real Postgres: skipped unless
// TEST_DATABASE_URL is set (scripts/test-postgres.sh). The record tables are
// exported in one repeatable-read transaction, verified by loading them into
// a scratch schema that is rolled back, and restored four-eyes in one
// transaction (the audit chain's append-only guard lifted only inside it),
// after which the read model is loaded again from the restored tables.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { startFromEnv, recordsBackend } from '@/lib/data/persist';
import { recordAudit, verifyAuditChain, setSovereign, getSovereign, listAudit } from '@/lib/data/store';
import { useBackend } from '.';
import { connect, type Sql } from './postgres';
import { useTarget, dirTarget } from '@/lib/backup/target';
import { createBackup, verifyBackup, requestRestore, listBackups } from '@/lib/data/backups';

const URL_ = process.env.TEST_DATABASE_URL;
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };

describe.skipIf(!URL_)('backups in postgres mode (TEST_DATABASE_URL)', { timeout: 120_000 }, () => {
  let admin: Sql, dbName: string, dbUrl: string;
  beforeAll(async () => {
    admin = await connect(URL_!, { max: 1 });
    dbName = `civicos_backup_${process.pid}_${Date.now()}`;
    await admin.unsafe(`create database ${dbName}`);
    const u = new URL(URL_!); u.pathname = `/${dbName}`; dbUrl = u.toString();
    process.env.CIVICOS_DATA_KEK = randomBytes(32).toString('hex');
    useTarget(dirTarget(mkdtempSync(path.join(os.tmpdir(), 'civicos-pgbk-'))));
    const dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-pgbk-state-'));
    const status = await startFromEnv({ CIVICOS_STATE: 'postgres', DATABASE_URL: dbUrl, CIVICOS_STATE_DIR: dir, CIVICOS_STATE_LEASE_WAIT_MS: '0', CIVICOS_STATE_INTERVAL_MS: '600000' } as unknown as NodeJS.ProcessEnv);
    expect(status.error).toBeUndefined();
  });
  afterAll(async () => {
    await recordsBackend()?.stop();
    await recordsBackend()?.sql.end?.({ timeout: 2 });
    useBackend(null);
    useTarget(null);
    await admin.unsafe(`drop database if exists ${dbName} with (force)`);
    await admin.end?.({ timeout: 2 });
  });

  const sql = () => recordsBackend()!.sql;
  const mottoInDb = async () => (await sql().unsafe(`select doc from civicos.record_doc where store = '__civicos' and path = $1`, [JSON.stringify([['k', 'sovereign'], ['k', 'motto']])]))[0]?.doc;
  const auditRows = async () => Number((await sql().unsafe(`select count(*)::int as n from civicos.audit_entry`))[0]!.n);

  it('backs up the record tables in one transaction, verifies in a scratch schema, and restores four-eyes', async () => {
    ok(setSovereign({ motto: 'Before the backup' }, 'Registrar'));
    recordAudit('Registrar', 'test.pg.before', 'Test:1', 'ok');
    expect(await recordsBackend()!.drain()).toBe(true);

    const b = ok(await createBackup({ by: 'Admin Ada' }));
    expect(b).toMatchObject({ mode: 'postgres', adapter: 'postgres' });
    const rowsAtBackup = b.audit.entries;
    expect(b.audit.seq).toBe(rowsAtBackup);
    const v = ok(await verifyBackup(b.id, { by: 'Admin Ada' }));
    expect(v.verification?.problem).toBeUndefined();
    expect(v.verification).toMatchObject({ ok: true, scratch: 'schema' });
    expect(v.verification!.checks.join(' ')).toMatch(/tables loaded into a scratch schema \(rolled back\)/);
    // The scratch schema did not stay.
    expect((await sql().unsafe(`select 1 from pg_namespace where nspname like 'civicos_dryrun_%'`)).length).toBe(0);

    ok(setSovereign({ motto: 'Written after the backup' }, 'Registrar'));
    recordAudit('Clerk', 'test.pg.after', 'Test:2', 'ok');
    expect(await recordsBackend()!.drain()).toBe(true);
    expect(await mottoInDb()).toBe('Written after the backup');

    const p = ok(await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true }));
    expect(p.pending).toBe(true);
    expect(await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true })).toMatchObject({ status: 409 });
    const done = ok(await requestRestore(b.id, { by: 'Officer Ben', acknowledgeLoss: true }));
    if (done.pending) throw new Error('expected the restore');
    expect(done.restore.check.differing).toEqual([]);
    expect(await recordsBackend()!.drain()).toBe(true);

    // The tables and the read model hold the backup's state, and one entry more: the restore.
    expect(await mottoInDb()).toBe('Before the backup');
    expect(getSovereign().motto).toBe('Before the backup');
    expect(await auditRows()).toBe(rowsAtBackup + 1);
    expect(verifyAuditChain().ok).toBe(true);
    const last = listAudit()[0]!;
    expect(last).toMatchObject({ action: 'backup.restore', actor: 'Officer Ben', seq: b.audit.seq + 1 });
    expect(last.detail).toContain(`kept as backup ${done.restore.safetyBackupId}`);
    const head = (await sql().unsafe(`select seq, hash from civicos.audit_entry order by seq desc limit 1`))[0]!;
    expect(head).toMatchObject({ seq: String(b.audit.seq + 1), hash: last.hash });
    // The append-only guard is back: the restored chain cannot be changed.
    await expect(sql().unsafe(`delete from civicos.audit_entry where seq = 1`)).rejects.toThrow(/append-only/);
    // An outbox row tells other instances to restart.
    expect((await sql().unsafe(`select 1 from civicos.outbox where topic = 'state.restore'`)).length).toBe(1);
    // The pre-restore copy holds what was replaced.
    expect((await listBackups()).find(x => x.id === done.restore.safetyBackupId)).toMatchObject({ reason: 'pre-restore', mode: 'postgres' });
    // The platform takes changes again, written through.
    recordAudit('Clerk', 'test.pg.after.restore', 'Test:3', 'ok');
    expect(await recordsBackend()!.drain()).toBe(true);
    expect(await auditRows()).toBe(rowsAtBackup + 2);
  });

  it('takes a pg_dump in the same snapshot when configured', async () => {
    const bin = process.env.PG_BIN ?? '/usr/lib/postgresql/16/bin';
    process.env.CIVICOS_BACKUP_PG_DUMP = `${bin}/pg_dump`;
    process.env.DATABASE_URL = dbUrl;
    try {
      const b = ok(await createBackup({ by: 'Admin Ada' }));
      expect(b.parts).toBeGreaterThan(5);
      const v = ok(await verifyBackup(b.id, { by: 'Admin Ada' }));
      expect(v.verification!.ok).toBe(true);
    } finally { delete process.env.CIVICOS_BACKUP_PG_DUMP; delete process.env.DATABASE_URL; }
  });
});

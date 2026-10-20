// Restore drill in postgres mode with a live event consumer (acceptance
// hardening, recovery): what events/restore-delivery.test.ts proves in
// memory, against a real Postgres, checked in the database itself, as a
// restarted server would load it. Skipped unless TEST_DATABASE_URL is set
// (scripts/test-postgres.sh).
//
// A consumer takes events, some acknowledged and some not; the platform is
// restored to a backup taken in between. The tables then hold the backup's
// registers, while the event outbox (kept through a restore) holds the
// events about removed records marked void, cursors back at the restored
// point and the new restore epoch: written through, so a restart neither
// delivers a voided event again nor loses the epoch.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { startFromEnv, recordsBackend } from '@/lib/data/persist';
import { useBackend } from '.';
import { connect, type Sql } from './postgres';
import { build } from './documents';
import { useTarget, dirTarget } from '@/lib/backup/target';
import { createBackup, requestRestore } from '@/lib/data/backups';
import { registerTaxpayer, getTaxpayer } from '@/lib/tax/register';
import { pendingFor, advanceCursor, recentEvents, type CloudEvent } from '@/lib/events/outbox';

const URL_ = process.env.TEST_DATABASE_URL;
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };

/** A consumer that applies each event id once and orders by (restore epoch, audit sequence). */
class Consumer {
  seen = new Set<string>();
  epoch = 0;
  resyncs = 0;
  take(e: CloudEvent): boolean {
    if (this.seen.has(e.id)) return false;
    this.seen.add(e.id);
    const ep = e.restoreepoch ?? 0;
    if (ep > this.epoch) { this.epoch = ep; this.resyncs++; }
    return ep >= this.epoch;
  }
}

describe.skipIf(!URL_)('restore drill in postgres mode with a live event consumer (TEST_DATABASE_URL)', { timeout: 120_000 }, () => {
  let admin: Sql, dbName: string;
  beforeAll(async () => {
    admin = await connect(URL_!, { max: 1 });
    dbName = `civicos_restore_events_${process.pid}_${Date.now()}`;
    await admin.unsafe(`create database ${dbName}`);
    const u = new URL(URL_!); u.pathname = `/${dbName}`;
    process.env.CIVICOS_DATA_KEK = randomBytes(32).toString('hex');
    useTarget(dirTarget(mkdtempSync(path.join(os.tmpdir(), 'civicos-pgev-'))));
    const status = await startFromEnv({ CIVICOS_STATE: 'postgres', DATABASE_URL: u.toString(), CIVICOS_STATE_DIR: mkdtempSync(path.join(os.tmpdir(), 'civicos-pgev-state-')), CIVICOS_STATE_LEASE_WAIT_MS: '0', CIVICOS_STATE_INTERVAL_MS: '600000' } as unknown as NodeJS.ProcessEnv);
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
  /** A store as a restarted server loads it: rebuilt from its rows in civicos.record_doc. */
  const fromDb = async <T,>(store: string): Promise<T> => build(
    (await sql().unsafe(`select path, kind, doc::text as json from civicos.record_doc where store = $1 order by path`, [store])) as unknown as { path: string; kind: 'value' | 'object' | 'map' | 'list'; json: string }[],
  ) as T;
  type Outbox = { events: CloudEvent[]; cursors: Record<string, number>; epoch?: number };
  const tax = (wh: string) => pendingFor(wh, 'tax', 100);
  /** Register a taxpayer and wait for the commit: in postgres mode the event is written once the audit entry is committed. */
  const register = async (id: string, caseId: string) => {
    const t = ok(registerTaxpayer({ party: { kind: 'person', id, name: id }, taxTypes: ['income'] }, caseId, 'Officer'));
    expect(await recordsBackend()!.drain()).toBe(true);
    return t;
  };

  it('voids events about what the restore removed, resets cursors and raises the epoch, in the database as well as in memory', async () => {
    const consumer = new Consumer();
    const before = await register('PG-1', 'pg-c1');
    // The consumer takes and acknowledges the first event before the backup.
    const first = tax('wh-pg').find(e => e.subject === `Taxpayer:${before.tin}`)!;
    expect(consumer.take(first)).toBe(true);
    advanceCursor('wh-pg', first.auditseq);
    expect(await recordsBackend()!.drain()).toBe(true);

    const b = ok(await createBackup({ by: 'Admin Ada' }));
    const head = b.audit.seq;

    // After the backup: one event delivered and acknowledged, one delivered with its acknowledgement lost, one not delivered.
    const acked = await register('PG-2', 'pg-c2');
    const lost = await register('PG-3', 'pg-c3');
    const unsent = await register('PG-4', 'pg-c4');
    const evAcked = tax('wh-pg').find(e => e.subject === `Taxpayer:${acked.tin}`)!;
    const evLost = tax('wh-pg').find(e => e.subject === `Taxpayer:${lost.tin}`)!;
    expect(consumer.take(evAcked) && consumer.take(evLost)).toBe(true);
    advanceCursor('wh-pg', evAcked.auditseq);
    // The same event retried: applied once.
    expect(consumer.take(tax('wh-pg').find(e => e.id === evLost.id)!)).toBe(false);
    expect(await recordsBackend()!.drain()).toBe(true);
    expect((await fromDb<Outbox>('__civicosEventOutbox')).cursors['wh-pg']).toBe(evAcked.auditseq);

    ok(await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true, reason: 'Drill' }));
    const done = ok(await requestRestore(b.id, { by: 'Officer Ben', acknowledgeLoss: true }));
    if (done.pending) throw new Error('expected the restore');
    expect(await recordsBackend()!.drain()).toBe(true);

    // The registers hold the backup's state.
    expect(getTaxpayer(before.tin)).toBeDefined();
    for (const t of [acked, lost, unsent]) expect(getTaxpayer(t.tin)).toBeUndefined();

    // In memory: the three events after the backup are void and never delivered again; the cursor is back at the restored point.
    // Everything after the restored point is void: the three taxpayers, and the audit entries of the backups taken
    // after it (this backup's own and the pre-restore copy), which leave the chain too; the backups themselves are
    // kept (the catalogue is kept through a restore) and the restore's entry names the pre-restore copy.
    expect(recentEvents(200).filter(e => e.voided === b.id && !e.subject.startsWith('Taxpayer:')).map(e => e.type)).toEqual(['org.civicos.backup.create', 'org.civicos.backup.create']);
    expect(recentEvents(200).filter(e => e.voided === b.id).every(e => e.auditseq > head)).toBe(true);
    const voided = recentEvents(200).filter(e => e.voided === b.id && e.subject.startsWith('Taxpayer:')).map(e => e.subject).sort();
    expect(voided).toEqual([acked, lost, unsent].map(t => `Taxpayer:${t.tin}`).sort());
    expect(tax('wh-pg').map(e => e.subject)).not.toEqual(expect.arrayContaining([`Taxpayer:${unsent.tin}`]));

    // In the database, as a restarted server loads it: the same.
    const stored = await fromDb<Outbox>('__civicosEventOutbox');
    expect(stored.epoch).toBe(1);
    expect(stored.cursors['wh-pg']).toBe(head);
    expect(stored.events.filter(e => e.voided === b.id).map(e => e.id).sort()).toEqual(recentEvents(200).filter(e => e.voided === b.id).map(e => e.id).sort());
    const restoreEvent = stored.events.find(e => e.type.endsWith('backup.restore'))!;
    expect(restoreEvent).toMatchObject({ restoreepoch: 1 });
    expect(restoreEvent.voided).toBeUndefined();
    // The taxpayers the restore removed are not in the restored register's rows either.
    const taxRows = JSON.stringify(await fromDb<unknown>('__civicosTax'));
    expect(taxRows).toContain(before.tin);
    for (const t of [acked, lost, unsent]) expect(taxRows).not.toContain(t.tin);

    // The consumer learns of the restore from the epoch and re-reads; later changes carry the new epoch.
    expect(consumer.take(pendingFor('wh-pg', 'backup.restore', 10)[0]!)).toBe(true);
    expect(consumer.resyncs).toBe(1);
    const later = await register('PG-5', 'pg-c5');
    const evLater = tax('wh-pg').find(e => e.subject === `Taxpayer:${later.tin}`)!;
    expect(evLater.restoreepoch).toBe(1);
    expect(consumer.take(evLater)).toBe(true);
    // A late copy of an event from before the restore is not applied over the new epoch.
    expect(consumer.take({ ...evLost, id: 'late-copy', restoreepoch: 0 })).toBe(false);
    // No number given after the backup is given again.
    expect([acked.tin, lost.tin, unsent.tin]).not.toContain(later.tin);
    expect(await recordsBackend()!.drain()).toBe(true);
    expect((await fromDb<Outbox>('__civicosEventOutbox')).events.find(e => e.id === evLater.id)).toMatchObject({ restoreepoch: 1 });
  });
});

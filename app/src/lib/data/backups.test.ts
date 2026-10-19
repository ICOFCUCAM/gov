// Backups and data restore in memory mode (lib/data/backups.ts): the round
// trip, verification as a dry run, tamper detection, the wrong key, four-eyes
// restore with the loss warning and the audit record, retention, the
// schedule, and the Update Center's restore points as real backups.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { useTarget, dirTarget } from '@/lib/backup/target';
import { openArchive } from '@/lib/backup/archive';
import {
  createBackup, verifyBackup, listBackups, requestRestore, cancelRestore, restorePreview, retained, applyRetention, setPolicy, runScheduled,
  resetBackups, DEFAULT_POLICY, type BackupEntry,
} from './backups';
import { setSovereign, getSovereign, recordAudit, listAudit, verifyAuditChain } from './store';
import { resetUpdates, decide, HOME_NATION, getChamber } from './updates';
import { resetReadiness } from './readiness';
import { resetSecurity } from './security-store';
import { stagingOff, cosign } from './testkit';
import { POST as decisionPOST } from '@/app/api/releases/[id]/decision/route';
import { POST as restoreDataPOST } from '@/app/api/releases/[id]/restore-data/route';
import { GET as listGET, POST as createPOST } from '@/app/api/platform/backups/route';
import { POST as restorePOST, DELETE as cancelDELETE } from '@/app/api/platform/backups/[id]/restore/route';
import { GET as cronGET } from '@/app/api/cron/backup/route';

let dir = '';
const KEK = randomBytes(32).toString('hex');
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const json = (method: string, body: unknown) => new Request('http://x/api', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeAll(() => { process.env.CIVICOS_DATA_KEK = KEK; });
afterAll(() => { delete process.env.CIVICOS_DATA_KEK; useTarget(null); });
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-backups-'));
  useTarget(dirTarget(dir));
  resetBackups();
  process.env.CIVICOS_DATA_KEK = KEK;
});

describe('backup and restore (memory mode)', () => {
  it('takes an encrypted backup with its manifest and the audit chain head, and verifies it by a dry run', async () => {
    recordAudit('Registrar', 'test.backup.before', 'Test:1', 'ok');
    const head = listAudit()[0]!;
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    expect(b).toMatchObject({ reason: 'manual', mode: 'snapshot', adapter: 'memory', keyProvider: 'env', audit: { seq: head.seq, hash: head.hash } });
    expect(readdirSync(dir).sort()).toEqual([`${b.id}.cvb`, `${b.id}.json`]);
    // At rest: the sealed archive holds no plaintext state; the description holds hashes only.
    const raw = readFileSync(path.join(dir, `${b.id}.cvb`));
    expect(raw.includes(Buffer.from(getSovereign().motto ?? "motto"))).toBe(false);
    const opened = await openArchive(raw, b.id);
    expect(opened.manifest.parts.some(p => p.name === 'store/__civicos')).toBe(true);
    expect(opened.manifest.excluded.some(e => /tile archives/i.test(e.what))).toBe(true);
    const v = ok(await verifyBackup(b.id, { by: 'Admin Ada' }));
    expect(v.verification).toMatchObject({ ok: true, scratch: 'store' });
    expect(v.verification!.checks.join(' ')).toMatch(/Audit chain: \d+ entries verified/);
    expect(listAudit()[0]).toMatchObject({ action: 'backup.verify', outcome: 'ok' });
  });

  it('detects a changed archive and a wrong key, and records the failed verification', async () => {
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    const file = path.join(dir, `${b.id}.cvb`);
    const good = readFileSync(file);
    const bad = Buffer.from(good); bad[bad.length - 5] = bad[bad.length - 5]! ^ 0xff;
    writeFileSync(file, bad);
    const v1 = ok(await verifyBackup(b.id, { by: 'Admin Ada' }));
    expect(v1.verification).toMatchObject({ ok: false });
    expect(v1.verification!.problem).toMatch(/SHA-256 recorded/);
    expect(listAudit()[0]).toMatchObject({ action: 'backup.verify', outcome: 'failed' });
    writeFileSync(file, good);
    process.env.CIVICOS_DATA_KEK = randomBytes(32).toString('hex');
    const v2 = ok(await verifyBackup(b.id, { by: 'Admin Ada' }));
    expect(v2.verification!.problem).toMatch(/key/);
    process.env.CIVICOS_DATA_KEK = KEK;
    expect(ok(await verifyBackup(b.id, { by: 'Admin Ada' })).verification!.ok).toBe(true);
  });

  it('refuses a backup without a key', async () => {
    delete process.env.CIVICOS_DATA_KEK;
    expect(await createBackup({ by: 'Admin Ada' })).toMatchObject({ status: 503, error: expect.stringMatching(/no key is configured/) });
    expect(readdirSync(dir)).toEqual([]);
  });

  it('restores four-eyes: a loss warning, a second official, the state of the backup, the replaced state kept and named', async () => {
    ok(setSovereign({ motto: 'Before the backup' }, 'Registrar'));
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    const backupHead = b.audit;
    ok(setSovereign({ motto: 'Written after the backup' }, 'Registrar'));
    recordAudit('Clerk', 'test.after.backup', 'Test:2', 'ok');

    // The proposal needs the acknowledgement, and says what will be lost.
    const noAck = await requestRestore(b.id, { by: 'Admin Ada' });
    expect(noAck).toMatchObject({ status: 422, error: expect.stringMatching(/Everything recorded after that time is lost/) });
    const p = ok(await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true, reason: 'Data corrupted by a faulty import' }));
    if (!p.pending) throw new Error('expected a proposal');
    expect(p.proposal.warning.auditEntriesLost).toBeGreaterThanOrEqual(3);
    expect(p.proposal.warning.changed).toContain('store/__civicos');
    expect(p.proposal.warning.divergent).toBe(false);
    expect(getSovereign().motto).toBe('Written after the backup'); // nothing changed yet

    // Not the same official; the second must acknowledge too.
    expect(await requestRestore(b.id, { by: 'admin ada', acknowledgeLoss: true })).toMatchObject({ status: 409, error: expect.stringMatching(/second, different official/) });
    expect(await requestRestore(b.id, { by: 'Officer Ben' })).toMatchObject({ status: 422 });
    const done = ok(await requestRestore(b.id, { by: 'Officer Ben', acknowledgeLoss: true }));
    if (done.pending) throw new Error('expected the restore');

    expect(getSovereign().motto).toBe('Before the backup');
    expect(done.restore.check.differing).toEqual([]);
    // The restored chain, plus one entry naming both officials, the backup and the replaced state.
    expect(verifyAuditChain().ok).toBe(true);
    const chain = [...listAudit()].reverse();
    const last = chain[chain.length - 1]!;
    expect(chain[chain.length - 2]).toMatchObject({ seq: backupHead.seq, hash: backupHead.hash });
    expect(last).toMatchObject({ action: 'backup.restore', actor: 'Officer Ben', resource: `Backup:${b.id}`, outcome: 'ok', seq: backupHead.seq + 1 });
    expect(last.detail).toContain('proposed by Admin Ada');
    expect(last.detail).toContain(`kept as backup ${done.restore.safetyBackupId}`);
    expect(last.detail).toContain(done.restore.replacedDigest);
    // The replaced state is in the pre-restore backup, later entries included.
    const safety = (await listBackups()).find(x => x.id === done.restore.safetyBackupId)!;
    expect(safety).toMatchObject({ reason: 'pre-restore', stateDigest: done.restore.replacedDigest });
    const kept = await openArchive(readFileSync(path.join(dir, safety.archive)), safety.id);
    const civicos = kept.parts.get('store/__civicos')!.toString();
    expect(civicos).toContain('Written after the backup');
    expect(civicos).toContain('test.after.backup');
    // A second restore of the same proposal is not possible: it was used.
    expect(await requestRestore(b.id, { by: 'Officer Ben', acknowledgeLoss: true })).toMatchObject({ pending: true });
  });

  it('cancels a proposal, and refuses a restore whose dry run fails', async () => {
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    ok(await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true }));
    expect(ok(cancelRestore(b.id, { by: 'Admin Ada' })).cancelled.by).toBe('Admin Ada');
    expect(cancelRestore(b.id, { by: 'Admin Ada' })).toMatchObject({ status: 404 });
    ok(await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true }));
    const file = path.join(dir, `${b.id}.cvb`);
    const bad = readFileSync(file); bad[bad.length - 1] = bad[bad.length - 1]! ^ 1; writeFileSync(file, bad);
    expect(await requestRestore(b.id, { by: 'Officer Ben', acknowledgeLoss: true })).toMatchObject({ status: 409, error: expect.stringMatching(/cannot be restored/) });
  });

  it('previews the loss without changing anything', async () => {
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    recordAudit('Clerk', 'test.preview', 'Test:3', 'ok');
    const p = ok(await restorePreview(b.id));
    expect(p.warning.text).toMatch(new RegExp(`returns the platform's data to ${b.createdAt}`));
    expect(p.warning.kept).toContain('__civicosUpdates');
  });
});

describe('retention and schedule', () => {
  const entry = (id: string, createdAt: string, extra: Partial<BackupEntry> = {}): BackupEntry => ({
    id, createdAt, createdBy: 'x', reason: 'scheduled', mode: 'snapshot', adapter: 'memory', archive: `${id}.cvb`, sizeBytes: 1, sha256: '', keyProvider: 'env',
    audit: { seq: 1, hash: null, entries: 1 }, release: null, parts: 1, stateDigest: '', verification: { at: createdAt, by: 'x', ok: true, scratch: 'store', checks: [] }, ...extra,
  });

  it('keeps the newest of each of the last N days, weeks and months, held restore points and recent pre-restore copies', () => {
    const now = Date.parse('2026-10-19T12:00:00Z');
    const days = Array.from({ length: 120 }, (_, i) => entry(`D${i}`, new Date(now - i * 86400000).toISOString()));
    const twoToday = [entry('T2', new Date(now + 1000).toISOString()), ...days];
    const keep = retained([...twoToday, entry('P1', new Date(now - 5 * 86400000).toISOString(), { reason: 'pre-restore' }), entry('P2', new Date(now - 200 * 86400000).toISOString(), { reason: 'pre-restore' })],
      { ...DEFAULT_POLICY, daily: 3, weekly: 2, monthly: 3 }, new Set(['D100']), now);
    expect(keep.has('T2')).toBe(true);            // newest
    expect(keep.has('D0')).toBe(false);           // same day as T2, older
    expect(keep.has('D1') && keep.has('D2')).toBe(true);
    expect(keep.has('D100')).toBe(true);          // held by a restore point
    expect(keep.has('P1')).toBe(true);            // recent pre-restore copy
    expect(keep.has('P2')).toBe(false);
    expect(keep.has('D50')).toBe(false);
    expect(keep.size).toBeLessThanOrEqual(3 + 2 + 3 + 2);
  });

  it('prunes what the policy no longer keeps, audited; the policy is set by a named official', async () => {
    ok(setPolicy({ daily: 1, weekly: 0, monthly: 0, by: 'Admin Ada' }));
    expect(setPolicy({ daily: 0, weekly: 0, monthly: 0, by: 'Admin Ada' })).toMatchObject({ status: 422 });
    expect(setPolicy({ intervalMinutes: 1, by: 'Admin Ada' })).toMatchObject({ status: 422 });
    const a = ok(await createBackup({ by: 'Admin Ada' }));
    const b2 = ok(await createBackup({ by: 'Admin Ada' }));
    const r = ok(await applyRetention({ by: 'Admin Ada' }));
    expect(r.pruned).toEqual([a.id]);
    expect((await listBackups()).map(x => x.id)).toEqual([b2.id]);
    expect(listAudit()[0]).toMatchObject({ action: 'backup.prune' });
  });

  it('the schedule takes and verifies a backup when one is due, then waits for the interval', async () => {
    const first = await runScheduled();
    expect(first.took).toBeTruthy();
    expect(first.verified).toBe(true);
    expect(first.rpo.met).toBe(true);
    const second = await runScheduled();
    expect(second.took).toBeUndefined();
    expect(second.skipped).toMatch(/younger than/);
  });

  it('the cron route needs CIVICOS_CRON_SECRET', async () => {
    delete process.env.CIVICOS_CRON_SECRET;
    expect((await cronGET(new Request('http://x/api/cron/backup'))).status).toBe(401);
    process.env.CIVICOS_CRON_SECRET = 'cron-secret';
    const res = await cronGET(new Request('http://x/api/cron/backup', { headers: { authorization: 'Bearer cron-secret' } }));
    expect(res.status).toBe(200);
    expect((await res.json()).summary.took).toMatch(/^BK-/);
    delete process.env.CIVICOS_CRON_SECRET;
  });
});

describe('platform routes', () => {
  it('lists, creates and restores four-eyes over HTTP; an unknown backup is not found', async () => {
    const created = await createPOST(json('POST', { by: 'Admin Ada' }));
    expect(created.status).toBe(201);
    const id = (await created.json()).backup.id as string;
    const list = await (await listGET()).json();
    expect(list.backups.map((b: BackupEntry) => b.id)).toContain(id);
    expect(list.status.policy.daily).toBe(DEFAULT_POLICY.daily);
    expect((await restorePOST(json('POST', { by: 'Admin Ada', acknowledgeLoss: true }), params('BK-9001'))).status).toBe(404);
    expect((await restorePOST(json('POST', { by: 'Admin Ada', acknowledgeLoss: true }), params(id))).status).toBe(202);
    expect((await cancelDELETE(json('DELETE', { by: 'Admin Ada' }), params(id))).status).toBe(200);
    expect((await restorePOST(json('POST', { by: 'Admin Ada', acknowledgeLoss: true }), params(id))).status).toBe(202);
    const done = await restorePOST(json('POST', { by: 'Officer Ben', acknowledgeLoss: true }), params(id));
    expect(done.status).toBe(200);
    expect((await done.json()).restore.confirmedBy).toBe('Officer Ben');
  });
});

describe('Update Center restore points are real backups', () => {
  beforeEach(() => { resetUpdates(); resetReadiness(); stagingOff(); resetSecurity(); delete process.env.CIVICOS_RESTORE_POINTS; });
  afterAll(() => { process.env.CIVICOS_RESTORE_POINTS = 'simulated'; });

  it('refuses to install over a simulated restore point of the installed nation', () => {
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    const rp = ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' })).install.restorePoint!;
    expect(rp.simulated).toBe(true);
    const r = cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    expect(r).toMatchObject({ status: 409, error: expect.stringMatching(/simulated, not a backup/) });
  });

  it('takes a verified backup as the restore point, installs over it, and restores it four-eyes after a rollback', async () => {
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    const prep = await decisionPOST(json('POST', { action: 'prepare', by: 'Ops' }), params('DR-141'));
    expect(prep.status).toBe(200);
    const rp = (await prep.json()).install.restorePoint;
    expect(rp).toMatchObject({ verified: true, backupId: expect.stringMatching(/^BK-/) });
    expect(rp.simulated).toBeUndefined();
    expect(rp.checks.join(' ')).toMatch(/scratch store/);
    ok(setSovereign({ motto: 'Before 1.4.1' }, 'Registrar'));
    // The motto was set after the restore point: it is what the restore will lose.
    ok(cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true }));
    ok(setSovereign({ motto: 'Written under 1.4.1' }, 'Registrar'));
    ok(decide(HOME_NATION, 'DR-141', { action: 'rollback', by: 'CIO', note: 'Payments failing after install' }));

    // The domain refuses to record a real backup's restore by itself.
    const first = await restoreDataPOST(json('POST', { by: 'Admin Ada', acknowledgeLoss: true }), params('DR-141'));
    expect(first.status).toBe(202);
    expect((await first.json()).proposal.warning.text).toMatch(/lost/);
    const done = await restoreDataPOST(json('POST', { by: 'Officer Ben', acknowledgeLoss: true }), params('DR-141'));
    expect(done.status).toBe(200);
    const body = await done.json();
    expect(body.restore).toMatchObject({ backupId: rp.backupId, proposedBy: 'Admin Ada', confirmedBy: 'Officer Ben' });
    expect(getSovereign().motto).not.toBe('Written under 1.4.1');
    // The Update Center's record is kept (the software that runs) and notes the restore.
    const c = getChamber(HOME_NATION);
    if ('error' in c) throw new Error(c.error);
    const inst = c.releases.find(x => x.id === 'DR-141')!.install;
    expect(inst.state).toBe('rolled-back');
    expect(inst.restorePoint!.restoredAt).toBeTruthy();
    expect(listAudit()[0]).toMatchObject({ action: 'update.restore-data' });
    expect(listAudit()[1]).toMatchObject({ action: 'backup.restore' });
    expect(verifyAuditChain().ok).toBe(true);
  });
});

afterAll(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp */ } });

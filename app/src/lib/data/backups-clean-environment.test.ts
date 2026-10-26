// Restore into a clean environment (plan I9; specification Part 5 L tests 10
// and 11; acceptance P5-10, P5-11; docs/DISASTER_RECOVERY.md). A backup taken
// in one installation is restored into a fresh one that holds nothing of it:
// every platform store removed from the process and every module loaded anew
// (as a new server starts), with only the backup target and the key custody
// it was sealed under, as the documented procedure gives a standby. Two
// officials restore it; the records, their relationships and the audit chain
// come back and verify there.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const KEK = randomBytes(32).toString('hex');
let dir = '';
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
/** A new server: no platform store on globalThis, every module loaded afresh. */
function cleanEnvironment(): void {
  const g = globalThis as Record<string, unknown>;
  for (const k of Object.keys(g)) if (k.startsWith('__civicos')) delete g[k];
  vi.resetModules();
}

beforeAll(() => { process.env.CIVICOS_DATA_KEK = KEK; dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-clean-restore-')); });
afterAll(async () => { delete process.env.CIVICOS_DATA_KEK; (await import('@/lib/backup/target')).useTarget(null); rmSync(dir, { recursive: true, force: true }); });

describe('a backup restored into a clean environment', () => {
  it('brings back the records, their relationships and a verifying audit chain, by two officials, in an installation that held none of it', async () => {
    // Installation A.
    cleanEnvironment();
    const tA = await import('@/lib/backup/target');
    tA.useTarget(tA.dirTarget(dir));
    const storeA = await import('@/lib/data/store');
    const relA = await import('@/lib/data/store/relationships');
    const lawA = await import('@/lib/law/register');
    const backupsA = await import('./backups');
    const m1 = ok(storeA.createMinistry({ archetype: 'GENERIC', name: 'Water Authority', slug: 'water-authority-clean' }));
    const m2 = ok(storeA.createMinistry({ archetype: 'GENERIC', name: 'Environment Agency', slug: 'environment-agency-clean' }));
    const law = ok(lawA.recordVersion({ instrument: { title: 'Water Act', type: 'act', jurisdiction: 'x', year: 2020, number: '3', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_2', num: '2', text: 'Sharing for permits.' }] }, 'L1', 'l1'));
    lawA.confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    const { relationship } = ok(relA.proposeRelationship({ from: m2.id, to: m1.id, type: 'exchange', scope: { recordTypes: ['event:permit.issued'], purposes: ['Environmental permits'] }, legalBasis: [{ instrument: law.instrument.id, eId: 'sec_2' }] }, { by: 'Admin A', byId: 'local:a' }));
    ok(relA.confirmRelationship(relationship.id, { by: 'Admin B', byId: 'local:b', role: 'administrator' }, () => false));
    const backup = ok(await backupsA.createBackup({ by: 'Admin Ada' }));
    expect(ok(await backupsA.verifyBackup(backup.id, { by: 'Admin Ada' })).verification).toMatchObject({ ok: true });

    // Installation B: a clean environment. None of A's records are there.
    cleanEnvironment();
    const tB = await import('@/lib/backup/target');
    tB.useTarget(tB.dirTarget(dir));
    const storeB = await import('@/lib/data/store');
    const relB = await import('@/lib/data/store/relationships');
    const backupsB = await import('./backups');
    expect(storeB.getMinistry(m1.id)).toBeUndefined();
    expect(relB.listRelationships()).toEqual([]);
    expect(storeB.listAudit().some(e => e.resource === `Ministry:${m1.id}`)).toBe(false);

    // Found at the target, proposed by one official with the loss warning, carried out by a different one.
    expect((await backupsB.listBackups()).map(b => b.id)).toContain(backup.id);
    const p = ok(await backupsB.requestRestore(backup.id, { by: 'Standby Admin', acknowledgeLoss: true, reason: 'Recovering into the standby site' }));
    expect(p.pending).toBe(true);
    expect(await backupsB.requestRestore(backup.id, { by: 'standby admin', acknowledgeLoss: true })).toMatchObject({ error: expect.stringMatching(/second, different official/) });
    const done = ok(await backupsB.requestRestore(backup.id, { by: 'Second Official', acknowledgeLoss: true }));
    if (done.pending) throw new Error('expected the restore');
    expect(done.restore.check.differing).toEqual([]);

    // The records, with their identifiers and their relationships, and the audit chain verifying in B.
    expect(storeB.getMinistry(m1.id)).toMatchObject({ id: m1.id, name: 'Water Authority' });
    expect(storeB.getMinistry(m2.id)).toMatchObject({ id: m2.id });
    const rel = relB.getRelationship(relationship.id);
    expect(rel).toMatchObject({ status: 'approved', inForce: true, version: 1, terms: { from: m2.id, to: m1.id, type: 'exchange' } });
    expect(relB.relationshipGrants().map(g => g.id)).toEqual([relationship.id]);
    expect(storeB.verifyAuditChain().ok).toBe(true);
    const chain = [...storeB.listAudit()].reverse();
    expect(chain.find(e => e.seq === backup.audit.seq)).toMatchObject({ hash: backup.audit.hash });
    expect(chain.at(-1)).toMatchObject({ action: 'backup.restore', actor: 'Second Official', outcome: 'ok' });
  });
});

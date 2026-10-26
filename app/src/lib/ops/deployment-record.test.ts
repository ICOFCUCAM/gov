// The installation's deployment record (plan I9; specification Part 5 I):
// recovery objectives, residency, administrator access, network zones and
// exit terms are one rule set changed through policy-change.ts (an
// administrator proposes citing the laws register, a different official
// confirms, every version kept, values left out kept), shipped empty, and
// read where the platform already asks for these values: the backup
// service's RPO and RTO targets and its schedule, and the hosting request's
// residency rule.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { useTarget, dirTarget } from '@/lib/backup/target';
import { backupStatus, setPolicy, getPolicy } from '@/lib/data/backups';
import { requestAssessment, resetHosting } from '@/lib/data/hosting';
import { nationRecord, HOME_NATION, resetUpdates } from '@/lib/data/updates';
import { listAudit } from '@/lib/data/store';
import { resetDeploymentRecord, deploymentRecord, deploymentRecordChanges, proposeDeploymentRecord, confirmDeploymentRecord, withdrawDeploymentRecord, residencyRefusal } from './deployment-record';

const dir = join(tmpdir(), `civicos-deployment-record-${process.pid}`);
let basis: { instrument: string; eId: string }[] = [];
const A = { name: 'Administrator A', id: 'a' }, B = { name: 'Administrator B', id: 'b' };
const RECORD = {
  recovery: { rpoMinutes: 60, rtoMinutes: 240, drLocation: 'Second government data centre' },
  residency: { rule: 'in-country', locations: ['National data centre', 'Second government data centre'], statement: 'Data Protection Act s 30' },
  administratorAccess: [{ party: 'National operations team', access: 'operations', conditions: 'Named officials, second sign-in step' }, { party: 'Publisher support', access: 'break-glass', conditions: 'Break-glass by two officials, recorded' }],
  networkZones: [{ key: 'public', label: 'Public front door', purpose: 'Public sites and the citizen journey', exposure: 'public' }, { key: 'core', label: 'Registers', purpose: 'Casework and registers', exposure: 'restricted' }],
  exit: { exportFormat: 'Institution exports (civicos-institution-export/1) and a full backup', noticeDays: 180, steps: ['Export each institution', 'Verify offline', 'Delete at the provider with a certificate'], dataReturn: 'Returned as sealed exports; the provider deletes and certifies' },
};

describe('the deployment record', () => {
  beforeEach(() => {
    resetDeploymentRecord(); resetLaw(); resetHosting(); resetUpdates();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    rmSync(dir, { recursive: true, force: true });
    useTarget(dirTarget(dir));
    const law = recordVersion({ instrument: { title: 'Hosting Services Agreement', type: 'act', jurisdiction: 'X', year: 2026, number: '7', issuingAuthority: 'Parliament' }, dates: { inForce: '2026-01-01' }, provisions: [{ eId: 'sec_4', num: '4', text: 'The platform is hosted in the country, with stated recovery objectives and exit terms.' }] }, 'L1', 'l1') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    basis = [{ instrument: law.instrument.id, eId: 'sec_4' }];
  });
  afterEach(() => { useTarget(null); vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

  it('ships empty, and is adopted only by two officials citing the law or contract, every version kept', async () => {
    expect(deploymentRecord()).toEqual({ recovery: null, residency: null, administratorAccess: null, networkZones: null, exit: null, version: 0 });
    // Not recorded: the backup service keeps its own policy's targets and says so.
    expect((await backupStatus()).rpo).toMatchObject({ targetMinutes: getPolicy().rpoMinutes, source: 'backup-policy' });
    expect(proposeDeploymentRecord({}, basis, A)).toMatchObject({ error: expect.stringMatching(/at least one part/) });
    expect(proposeDeploymentRecord({ recovery: { rpoMinutes: 0, rtoMinutes: 10, drLocation: 'x' } }, basis, A)).toMatchObject({ error: expect.stringMatching(/whole minutes/) });
    expect(proposeDeploymentRecord({ administratorAccess: [{ party: 'Vendor', access: 'support' }] }, basis, A)).toMatchObject({ error: expect.stringMatching(/on which conditions/) });
    expect(proposeDeploymentRecord(RECORD, [], A)).toMatchObject({ error: expect.stringMatching(/Cite the legal basis/) });
    expect(proposeDeploymentRecord(RECORD, basis, A)).toMatchObject({ values: { recovery: { rpoMinutes: 60 } } });
    expect(confirmDeploymentRecord(A)).toMatchObject({ error: expect.stringMatching(/different/) });
    expect(confirmDeploymentRecord(B)).toMatchObject({ confirmed: { by: 'Administrator B' } });
    expect(deploymentRecord()).toMatchObject({ version: 1, recovery: { rpoMinutes: 60, rtoMinutes: 240 }, residency: { rule: 'in-country' }, networkZones: [{ key: 'public' }, { key: 'core' }] });
    // Values left out keep their setting; every version is kept.
    proposeDeploymentRecord({ exit: { ...RECORD.exit, noticeDays: 365 } }, basis, B);
    confirmDeploymentRecord(A);
    expect(deploymentRecord()).toMatchObject({ version: 2, recovery: { rpoMinutes: 60 }, exit: { noticeDays: 365 } });
    expect(deploymentRecordChanges().history!.map(h => h.outcome)).toEqual(['adopted', 'adopted']);
    proposeDeploymentRecord({ networkZones: null }, basis, A);
    expect(withdrawDeploymentRecord('Administrator A', 'Not yet')).toEqual({ ok: true });
    expect(deploymentRecord().networkZones).toHaveLength(2);
    expect(listAudit().filter(e => e.action.startsWith('ops.deployment-record')).map(e => e.action)).toEqual(expect.arrayContaining(['ops.deployment-record.propose', 'ops.deployment-record', 'ops.deployment-record.withdraw']));
  });

  it('sets the backup service\'s recovery targets, which the backup policy can no longer change or fail to meet', async () => {
    proposeDeploymentRecord({ recovery: RECORD.recovery }, basis, A);
    confirmDeploymentRecord(B);
    const s = await backupStatus();
    expect(s.rpo).toMatchObject({ targetMinutes: 60, source: 'deployment-record', version: 1, met: false });
    expect(s.rtoMinutes).toBe(240);
    expect(setPolicy({ rpoMinutes: 1440, by: 'Ops' })).toMatchObject({ error: expect.stringMatching(/set by the deployment record/) });
    expect(setPolicy({ intervalMinutes: 120, by: 'Ops' })).toMatchObject({ error: expect.stringMatching(/cannot meet the recovery-point objective of 60 min/) });
    expect(setPolicy({ intervalMinutes: 60, daily: 14, by: 'Ops' })).toMatchObject({ intervalMinutes: 60, daily: 14 });
  });

  it('holds a hosting request to the residency rule, and starts its questionnaire from the record', () => {
    proposeDeploymentRecord({ residency: RECORD.residency, recovery: RECORD.recovery }, basis, A);
    confirmDeploymentRecord(B);
    expect(residencyRefusal('regional')).toMatch(/requires in-country residency/);
    expect(residencyRefusal('in-country')).toBeNull();
    const n = nationRecord(HOME_NATION)!;
    expect(requestAssessment(n, { path: 'other-cloud', questionnaire: { residency: 'regional' }, by: 'Ops' })).toMatchObject({ error: expect.stringMatching(/requires in-country residency/) });
    const r = requestAssessment(n, { path: 'other-cloud', questionnaire: {}, by: 'Ops' });
    if ('error' in r) throw new Error(r.error);
    expect(r.questionnaire).toMatchObject({ residency: 'in-country', rpoMinutes: 60, rtoHours: 4 });
  });
});

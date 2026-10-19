import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { resetTwin, syncRegister, registerSource, runSource, stateAsOf, proposeWithdrawal, confirmWithdrawal, cancelWithdrawal, getRun, type TwinRun } from './register';
import { twinPolicy, setTwinPolicy, resetTwinPolicy } from './policy';
import { applyNation } from '@/lib/nation/registry';
import { listAudit } from '@/lib/data/store';
import { apiPermission } from '@/lib/auth/roles';
import { POST as withdrawRoute } from '@/app/api/twin/runs/[id]/withdraw/route';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const mapping = { entity: 'region', value: 'value', metric: { fixed: 'population' }, unit: { fixed: 'persons' }, date: { column: 'year' } } as const;

async function anImport(): Promise<TwinRun> {
  const s = ok(registerSource({ by: 'Director', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping }));
  return ok(await runSource(s.id, { by: 'Director', csv: 'region,value,year\nMombasa,1208333,2019\nKisumu,1155574,2019\n' }));
}

describe('four-eyes withdrawal of twin imports', () => {
  beforeEach(async () => {
    resetTwin(); resetTwinPolicy();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('is on by default: one official proposes, a different one confirms', async () => {
    expect(twinPolicy().fourEyesWithdrawal).toBe(true);
    const run = await anImport();
    const p = ok(proposeWithdrawal(run.id, 'Officer A', 'keyed against the wrong year'));
    expect(p.pending).toBe(true);
    // Nothing is withdrawn until confirmed.
    expect(stateAsOf({ metric: 'population', entityId: 'place:KE-28' })).toHaveLength(1);
    expect(proposeWithdrawal(run.id, 'Officer C', 'again')).toEqual({ error: expect.stringMatching(/already proposed/) });
    expect(confirmWithdrawal(run.id, ' officer a ')).toEqual({ error: expect.stringMatching(/different official/) });
    const c = ok(confirmWithdrawal(run.id, 'Signer B'));
    expect(c).toMatchObject({ pending: false, superseded: 2 });
    expect(getRun(run.id)?.withdrawn).toMatchObject({ by: 'Signer B', proposedBy: 'Officer A', reason: 'keyed against the wrong year' });
    expect(getRun(run.id)?.withdrawalProposed).toBeUndefined();
    expect(stateAsOf({ metric: 'population', entityId: 'place:KE-28' })).toHaveLength(0);
    const actions = listAudit().filter(a => a.resource.endsWith(`/${run.id}`)).map(a => a.action);
    expect(actions).toEqual(expect.arrayContaining(['twin.run.withdraw.propose', 'twin.run.withdraw']));
  });

  it('a proposal can be cancelled, and then proposed again', async () => {
    const run = await anImport();
    ok(proposeWithdrawal(run.id, 'Officer A', 'wrong file'));
    ok(cancelWithdrawal(run.id, 'Signer B', 'the file is right'));
    expect(confirmWithdrawal(run.id, 'Signer B')).toEqual({ error: expect.stringMatching(/No withdrawal/) });
    expect(ok(proposeWithdrawal(run.id, 'Signer B', 'wrong file after all')).pending).toBe(true);
    expect(listAudit().some(a => a.action === 'twin.run.withdraw.cancel')).toBe(true);
  });

  it('withdraws at once when the nation turns the rule off (named, audited)', async () => {
    expect(setTwinPolicy({ fourEyesWithdrawal: 'no' }, 'Admin')).toEqual({ error: expect.any(String) });
    expect(ok(setTwinPolicy({ fourEyesWithdrawal: false }, 'Admin'))).toMatchObject({ fourEyesWithdrawal: false, changedBy: 'Admin' });
    expect(listAudit().some(a => a.action === 'twin.policy.change')).toBe(true);
    const run = await anImport();
    expect(ok(proposeWithdrawal(run.id, 'Officer A', 'wrong file'))).toMatchObject({ pending: false, superseded: 2 });
  });

  it('through the route: propose, then the same official cannot confirm (403), another can', async () => {
    const run = await anImport();
    const post = (body: Record<string, unknown>) => withdrawRoute(new NextRequest(`https://gov.example/api/twin/runs/${run.id}/withdraw`, { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ id: run.id }) });
    const a = await post({ by: 'Officer A', reason: 'wrong year' });
    expect(a.status).toBe(200);
    expect((await a.json()).pending).toBe(true);
    expect((await post({ by: 'Officer A', action: 'confirm' })).status).toBe(403);
    expect((await post({ by: 'Officer A', action: 'undo' })).status).toBe(400);
    const b = await post({ by: 'Signer B', action: 'confirm' });
    expect(b.status).toBe(200);
    expect((await b.json()).superseded).toBe(2);
  });

  it('only administrators change the rule', () => {
    expect(apiPermission({ role: 'administrator' }, 'POST', '/api/twin/policy')).toBeNull();
    expect(apiPermission({ role: 'signatory' }, 'POST', '/api/twin/policy')).toMatch(/administrator/);
    expect(apiPermission({ role: 'officer' }, 'POST', '/api/twin/runs/RUN-1/withdraw')).toBeNull();
  });
});

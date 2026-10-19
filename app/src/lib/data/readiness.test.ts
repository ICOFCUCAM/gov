import { describe, it, expect, beforeEach } from 'vitest';
import { resetUpdates, decide, nationRecord, releaseFor, updateSettings, HOME_NATION } from './updates';
import { resetSecurity } from './security-store';
import { resetReadiness, scan, runPreflight, waiveFinding, latestPreflight, stagingEnvironment, registerStaging, stagingInstall, stagingFail, superviseStaging, signUat, stagingGate } from './readiness';
import { stageForProduction, cosign } from './testkit';
import { listAudit } from './store';
import { GET as readinessGET, POST as readinessPOST } from '@/app/api/releases/[id]/readiness/route';
import { getChamber } from './updates';

const home = () => nationRecord(HOME_NATION)!;
const rel = (id: string) => releaseFor(HOME_NATION, id)!;
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };

beforeEach(() => { resetUpdates(); resetSecurity(); resetReadiness(); });

describe('preflight compatibility', () => {
  it('reports each customisation as compatible, needs change or blocking, with reasons', () => {
    // 1.5.0 removes the legacy CSV import: the nation's own module blocks, its integration needs a change.
    updateSettings(HOME_NATION, { ring: 'pilot' }, 'CIO');
    const f = scan(home(), rel('DR-150'));
    expect(f.find(x => x.subject.startsWith('Revenue rules module'))).toMatchObject({ kind: 'module', status: 'blocking' });
    expect(f.find(x => x.subject.startsWith('Land registry connector'))).toMatchObject({ kind: 'integration', status: 'needs-change' });
    expect(f.every(x => x.reason.length > 10)).toBe(true);
    // 1.4.1 changes nothing they depend on.
    expect(scan(home(), rel('DR-141')).every(x => x.status === 'compatible')).toBe(true);
  });

  it('covers the installation’s integrations, configuration and custom-charter institutions', () => {
    const kinds = new Set(scan(home(), rel('DR-140')).map(x => x.kind));
    expect(kinds.has('integration')).toBe(true);
    expect(kinds.has('configuration')).toBe(true);
    // 1.4.0 has an in-place migration and a breaking API change.
    expect(scan(home(), rel('DR-140')).some(x => x.kind === 'integration' && x.status === 'needs-change')).toBe(true);
  });

  it('blocking findings prevent approval until waived by two different officials', () => {
    updateSettings(HOME_NATION, { ring: 'pilot' }, 'CIO');
    const r = cosign(HOME_NATION, 'DR-150', { action: 'approve', by: 'CIO' });
    expect(r).toMatchObject({ status: 409 });
    if ('error' in r) expect(r.error).toMatch(/blocking/);
    const blocking = latestPreflight(HOME_NATION, 'DR-150')!.findings.find(x => x.status === 'blocking')!;
    // A typed second name is refused (review H-5): the second official confirms in their own request.
    expect(waiveFinding(home(), rel('DR-150'), blocking.key, { by: 'CIO', secondBy: 'Head of Revenue IT', reason: 'Module does not use the CSV import; tested on staging' })).toMatchObject({ status: 422 });
    expect(waiveFinding(home(), rel('DR-150'), blocking.key, { by: 'CIO', reason: 'short' })).toMatchObject({ status: 422 });
    const proposed = ok(waiveFinding(home(), rel('DR-150'), blocking.key, { by: 'CIO', reason: 'Module does not use the CSV import; tested on staging' }));
    expect(proposed.pending).toBe(true);
    expect(proposed.approvable).toBe(false);
    expect(proposed.findings.find(x => x.key === blocking.key)!.waiverProposal).toMatchObject({ by: 'CIO' });
    // The proposer cannot confirm their own proposal, whatever the case of the name.
    expect(waiveFinding(home(), rel('DR-150'), blocking.key, { by: 'cio' })).toMatchObject({ status: 409 });
    const after = ok(waiveFinding(home(), rel('DR-150'), blocking.key, { by: 'Head of Revenue IT' }));
    expect(after.approvable).toBe(true);
    expect(after.findings.find(x => x.key === blocking.key)!.waiver).toMatchObject({ by: 'CIO', secondBy: 'Head of Revenue IT' });
    expect(listAudit().some(a => a.action === 'update.preflight.waive' && a.actor === 'CIO + Head of Revenue IT')).toBe(true);
    expect(cosign(HOME_NATION, 'DR-150', { action: 'approve', by: 'CIO' })).not.toMatchObject({ status: 409 });
  });

  it('only blocking findings can be waived; every run is audited', () => {
    const rep = runPreflight(home(), rel('DR-141'), 'CIO');
    expect(rep.approvable).toBe(true);
    expect(listAudit()[0]).toMatchObject({ action: 'update.preflight', actor: 'CIO' });
    expect(waiveFinding(home(), rel('DR-141'), rep.findings[0]!.key, { by: 'A', reason: 'Nothing to waive here really' })).toMatchObject({ status: 409 });
  });
});

describe('staging and user acceptance', () => {
  it('production install needs staging passed and a UAT sign-off', () => {
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' }));
    const refused = cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    expect(refused).toMatchObject({ status: 409 });
    if ('error' in refused) expect(refused.error).toMatch(/staging/);
    stageForProduction(HOME_NATION, 'DR-141');
    expect(cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true })).not.toHaveProperty('error');
  });

  it('self-hosted nations register staging; hosted nations have it provisioned', () => {
    expect(stagingEnvironment(home()).provisioned).toBe(false);
    expect(stagingInstall(home(), rel('DR-141'), 'Ops')).toMatchObject({ status: 409 });
    expect(registerStaging(home(), { name: 'x', url: 'not a url', by: 'Ops' })).toMatchObject({ status: 422 });
    ok(registerStaging(home(), { name: 'National staging', url: 'https://staging.gov.example', by: 'Ops' }));
    expect(stagingEnvironment(nationRecord('sandbox')!)).toMatchObject({ provisioned: true, provisionedBy: 'publisher' });
  });

  it('staging probation passes at the end of its window, or fails with a reason; UAT only after a pass', () => {
    registerStaging(home(), { name: 'National staging', url: 'https://staging.gov.example', by: 'Ops' });
    const run = ok(stagingInstall(home(), rel('DR-141'), 'Ops'));
    expect(signUat(home(), rel('DR-141'), { tester: 'T', date: new Date().toISOString(), evidence: 'All scripts passed fine' })).toMatchObject({ status: 409 });
    superviseStaging(Date.parse(run.endsAt) - 1000);
    expect(stagingGate(home(), rel('DR-141'))).toMatchObject({ ok: false });
    superviseStaging(Date.parse(run.endsAt) + 1000);
    expect(signUat(home(), rel('DR-141'), { tester: 'T', date: new Date().toISOString(), evidence: 'short' })).toMatchObject({ status: 422 });
    ok(signUat(home(), rel('DR-141'), { tester: 'UAT lead, Registry', date: new Date().toISOString(), evidence: 'Certificates, permits and payments scripts passed' }));
    expect(stagingGate(home(), rel('DR-141'))).toEqual({ ok: true });
    expect(listAudit().some(a => a.action === 'update.staging.uat')).toBe(true);
    // A failed run blocks production until staged again.
    const r2 = ok(stagingInstall(home(), rel('DR-141-H1'), 'Ops'));
    ok(stagingFail(home(), rel('DR-141-H1'), 'Ops', 'Certificate rendering broken on staging'));
    expect(stagingGate(home(), rel('DR-141-H1'))).toMatchObject({ ok: false });
    expect(r2.state).toBe('failed');
  });

  it('the policy is per nation and can be turned off', () => {
    updateSettings(HOME_NATION, { stagingRequired: false }, 'CIO');
    expect(stagingGate(home(), rel('DR-141'))).toEqual({ ok: true });
  });
});

describe('readiness route isolation', () => {
  it('another nation’s release is not found; another nation’s link sees its own staging', async () => {
    expect((await readinessGET(new Request('http://x/api/releases/DR-141-S1/readiness') as never, { params: Promise.resolve({ id: 'DR-141-S1' }) })).status).toBe(404);
    const c = getChamber('sandbox'); if ('error' in c) throw new Error(c.error);
    const res = await readinessGET(new Request(`http://x/api/releases/DR-141-S1/readiness?link=${c.nation.channelKey}`) as never, { params: Promise.resolve({ id: 'DR-141-S1' }) });
    expect(res.status).toBe(200);
    expect((await res.json()).staging.nationId).toBe('sandbox');
    const post = await readinessPOST(new Request('http://x/api/releases/DR-141/readiness', { method: 'POST', body: JSON.stringify({ action: 'preflight', by: 'CIO' }), headers: { 'content-type': 'application/json' } }) as never, { params: Promise.resolve({ id: 'DR-141' }) });
    expect((await post.json()).preflight.approvable).toBe(true);
  });
});

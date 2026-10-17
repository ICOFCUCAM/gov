import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetUpdates, decide, getChamber, HOME_NATION } from './updates';
import { resetSecurity } from './security-store';
import { resetReadiness } from './readiness';
import { resetChangeControl, addBlackout, setFreeze, setWindows, changeControl, removeBlackout } from './change-control';
import { stagingOff, cosign } from './testkit';
import { listAudit } from './store';
import { POST as ccPOST } from '@/app/api/releases/change-control/route';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const future = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

beforeEach(() => { resetUpdates(); resetSecurity(); resetReadiness(); resetChangeControl(); stagingOff(); });
afterEach(() => resetChangeControl());

describe('four-eyes', () => {
  it('approve is proposed by one official and carried out by a different one', () => {
    const p = ok(decide(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    expect(p.pending).toBe(true);
    expect(p.install.state).toBe('available');
    expect(p.install.pending).toMatchObject({ action: 'approve', by: 'CIO' });
    expect(decide(HOME_NATION, 'DR-141', { action: 'approve', by: 'cio' })).toMatchObject({ status: 409 });
    const done = ok(decide(HOME_NATION, 'DR-141', { action: 'approve', by: 'Permanent Secretary' }));
    expect(done.install.state).toBe('approved');
    expect(done.install.pending).toBeUndefined();
    expect(listAudit().find(a => a.action === 'update.approve.propose')).toMatchObject({ actor: 'CIO' });
    expect(listAudit().find(a => a.action === 'update.approve')).toMatchObject({ actor: 'Permanent Secretary' });
  });

  it('install too: nothing changes until the second official approves', () => {
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' }));
    const p = ok(decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true }));
    expect(p.pending).toBe(true);
    expect(p.chamber.installed).toBe('1.4.0');
    expect(decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops' })).toMatchObject({ status: 409 });
    const done = ok(decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Head of Infrastructure' }));
    expect(done.chamber.installed).toBe('1.4.1');
    expect(done.install.state).toBe('probation');
    expect(done.install.mode).toBe('self-hosted'); // carried from the proposal
  });

  it('a proposal can be cancelled, with an audit entry', () => {
    ok(decide(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    const c = ok(decide(HOME_NATION, 'DR-141', { action: 'cancel-proposal', by: 'CIO', note: 'Waiting for the vendor note' }));
    expect(c.install.pending).toBeUndefined();
    expect(listAudit()[0]!.action).toBe('update.cancel-proposal');
  });
});

describe('maintenance calendar and blackouts', () => {
  it('scheduling inside a blackout is refused', () => {
    ok(addBlackout(HOME_NATION, { label: 'General election', kind: 'election', start: future(12), end: future(96), by: 'Electoral liaison' }));
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    const r = decide(HOME_NATION, 'DR-141', { action: 'schedule', by: 'CIO', window: { start: future(24), end: future(26) } });
    expect(r).toMatchObject({ status: 409 });
    if ('error' in r) expect(r.error).toMatch(/General election/);
    expect(decide(HOME_NATION, 'DR-141', { action: 'schedule', by: 'CIO', window: { start: future(100), end: future(102) } })).not.toHaveProperty('error');
  });

  it('validates and audits blackouts and windows', () => {
    expect(addBlackout(HOME_NATION, { label: 'Budget', kind: 'budget', start: future(5), end: future(1), by: 'x' })).toMatchObject({ status: 422 });
    expect(addBlackout(HOME_NATION, { label: 'Budget week', kind: 'party', start: future(1), end: future(5), by: 'x' })).toMatchObject({ status: 422 });
    const cc = ok(addBlackout(HOME_NATION, { label: 'Budget week', kind: 'budget', start: future(1), end: future(5), by: 'Treasury' }));
    expect(listAudit()[0]).toMatchObject({ action: 'update.change.blackout.add', actor: 'Treasury' });
    ok(removeBlackout(HOME_NATION, cc.blackouts[0]!.id, 'Treasury'));
    expect(changeControl(HOME_NATION).blackouts).toEqual([]);
    expect(setWindows(HOME_NATION, [{ day: 9, start: '02:00', hours: 4 }], 'CIO')).toMatchObject({ status: 422 });
    ok(setWindows(HOME_NATION, [{ day: 3, start: '22:00', hours: 3 }], 'CIO'));
  });
});

describe('change freeze', () => {
  it('blocks feature installs; security releases still install, with four-eyes', () => {
    expect(setFreeze(HOME_NATION, true, { by: 'CIO', reason: 'x' })).toMatchObject({ status: 422 });
    ok(setFreeze(HOME_NATION, true, { by: 'CIO', reason: 'National emergency response' }));
    expect(listAudit()[0]).toMatchObject({ action: 'update.change.freeze' });
    // Feature build: refused at the proposal.
    ok(cosign(HOME_NATION, 'DR-141-H1', { action: 'approve', by: 'CIO' }));
    ok(decide(HOME_NATION, 'DR-141-H1', { action: 'prepare', by: 'Ops' }));
    const f = decide(HOME_NATION, 'DR-141-H1', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    expect(f).toMatchObject({ status: 409 });
    if ('error' in f) expect(f.error).toMatch(/change freeze/);
    // Security release: allowed, but still needs a second official.
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' }));
    expect(ok(decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true })).pending).toBe(true);
    expect(ok(decide(HOME_NATION, 'DR-141', { action: 'install', by: 'CISO' })).chamber.installed).toBe('1.4.1');
    ok(setFreeze(HOME_NATION, false, { by: 'CIO' }));
    expect(listAudit()[0]).toMatchObject({ action: 'update.change.unfreeze' });
  });
});

describe('isolation', () => {
  it('a nation’s link changes only its own calendar', async () => {
    const c = getChamber('sandbox'); if ('error' in c) throw new Error(c.error);
    const res = await ccPOST(new Request('http://x/api/releases/change-control', { method: 'POST', body: JSON.stringify({ action: 'freeze', by: 'Sandbox owner', reason: 'Training week freeze', link: c.nation.channelKey }), headers: { 'content-type': 'application/json' } }) as never);
    expect(res.status).toBe(200);
    expect(changeControl('sandbox').freeze?.on).toBe(true);
    expect(changeControl(HOME_NATION).freeze?.on).toBeFalsy();
  });
});

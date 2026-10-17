import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetReadiness } from '@/lib/data/readiness';
import { stagingOff } from '@/lib/data/testkit';
import { POST as healthPOST } from './health/route';
import { POST as credentialPOST } from './settings/agent-credential/route';
import { POST as decisionPOST } from './[id]/decision/route';
import { GET as chamberGET } from './route';
import { GET as watchdogGET } from '../cron/update-watchdog/route';
import { resetUpdates, getChamber, issueAgentCredential, nationRecord, updateSettings, HEALTH_CHECKS, HOME_NATION } from '@/lib/data/updates';
import { resetSecurity } from '@/lib/data/security-store';
import { listAudit } from '@/lib/data/store';
import type { UpdateChamber } from '@/lib/api/types';

const healthy = () => HEALTH_CHECKS.map(c => ({ key: c.key, ok: true, value: c.key === 'latency' ? 230 : c.key === 'error-rate' ? 0.3 : undefined }));
const report = (auth: string | null, body: Record<string, unknown> = { checks: healthy() }) => healthPOST(new Request('http://x/api/releases/health', {
  method: 'POST', body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...(auth === null ? {} : { authorization: `Bearer ${auth}` }), cookie: 'civicos_session=demo' },
}) as never);
const post = (body: unknown) => new Request('http://x/api', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;
const chamber = (id = HOME_NATION): UpdateChamber => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c; };
const MIN = 60_000;
/** Four-eyes over HTTP: a proposal returns `pending`; a second official then approves. */
async function cosignPOST(body: Record<string, unknown>, id = 'DR-141') {
  const first = await decisionPOST(post(body), { params: { id } });
  if (first.status !== 200 || !(await first.clone().json()).pending) return first;
  return decisionPOST(post({ ...body, by: 'Second official' }), { params: { id } });
}

async function installSecurityRelease() {
  updateSettings(HOME_NATION, { healthSource: 'agent' }, 'CIO');
  await cosignPOST({ action: 'approve', by: 'CIO' });
  await decisionPOST(post({ action: 'prepare', by: 'Ops' }), { params: { id: 'DR-141' } });
  const r = await cosignPOST({ action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
  expect(r.status).toBe(200);
}

beforeEach(() => { resetUpdates(); resetReadiness(); stagingOff(); resetSecurity(); });
afterEach(() => { vi.useRealTimers(); delete process.env.CIVICOS_CRON_SECRET; });

describe('deployment-agent credential', () => {
  it('is issued once from settings, stored only as a hash, and audited', async () => {
    const res = await credentialPOST(post({ by: 'CIO' }));
    expect(res.status).toBe(201);
    const { credential, prefix } = await res.json();
    expect(credential).toMatch(/^cag_[0-9a-f]{8}_[0-9a-f]{40}$/);
    expect(credential.startsWith(`cag_${prefix}_`)).toBe(true);
    const view = chamber().nation;
    expect(view.agentCredential).toMatchObject({ prefix, issuedBy: 'CIO', rotations: 0 });
    // Nothing the chamber exposes contains the secret.
    expect(JSON.stringify(chamber())).not.toContain(credential.slice(13));
    expect(listAudit()[0]).toMatchObject({ action: 'update.agent.issue', actor: 'CIO' });
    expect((await credentialPOST(post({ by: '' }))).status).toBe(422);
  });

  it('refuses a user session or the distribution link key', async () => {
    await installSecurityRelease();
    issueAgentCredential(HOME_NATION, 'CIO');
    expect((await report(null)).status).toBe(401); // session cookie only
    expect((await report(chamber().nation.channelKey)).status).toBe(401); // link key as bearer
    expect((await report('cag_00000000_' + '0'.repeat(40))).status).toBe(401); // unknown credential
  });

  it('accepts the right nation’s credential', async () => {
    await installSecurityRelease();
    const c = issueAgentCredential(HOME_NATION, 'CIO');
    if ('error' in c) throw new Error(c.error);
    const res = await report(c.credential);
    expect(res.status).toBe(200);
    expect((await res.json()).probation.reports.length).toBe(1);
  });

  it('refuses another nation’s credential', async () => {
    await installSecurityRelease();
    issueAgentCredential(HOME_NATION, 'CIO');
    const sandbox = issueAgentCredential('sandbox', 'Sandbox owner');
    if ('error' in sandbox) throw new Error(sandbox.error);
    // Naming this nation with the sandbox's credential is refused…
    expect((await report(sandbox.credential, { checks: healthy(), link: chamber().nation.channelKey })).status).toBe(403);
    // …and without naming it, the sandbox credential speaks only for the sandbox (nothing on probation there).
    expect((await report(sandbox.credential)).status).toBe(409);
    expect(chamber().probation!.reports.length).toBe(0);
  });

  it('rotation revokes the previous credential and is audited', async () => {
    await installSecurityRelease();
    const a = issueAgentCredential(HOME_NATION, 'CIO');
    const b = issueAgentCredential(HOME_NATION, 'CISO');
    if ('error' in a || 'error' in b) throw new Error('issue failed');
    expect(b.rotated).toBe(true);
    expect((await report(a.credential)).status).toBe(401);
    expect((await report(b.credential)).status).toBe(200);
    expect(listAudit().some(x => x.action === 'update.agent.rotate' && x.actor === 'CISO')).toBe(true);
  });
});

describe('scheduled watchdog (/api/cron/update-watchdog)', () => {
  it('requires the cron secret', () => {
    process.env.CIVICOS_CRON_SECRET = 'cron-test-secret';
    expect(watchdogGET(new Request('http://x/api/cron/update-watchdog')).status).toBe(401);
    expect(watchdogGET(new Request('http://x/api/cron/update-watchdog', { headers: { authorization: 'Bearer wrong' } })).status).toBe(401);
    expect(watchdogGET(new Request('http://x/api/cron/update-watchdog', { headers: { authorization: 'Bearer cron-test-secret' } })).status).toBe(200);
  });

  it('records missing reports and falls back to last known good with no one reading the chamber', async () => {
    process.env.CIVICOS_CRON_SECRET = 'cron-test-secret';
    await installSecurityRelease();
    const start = Date.parse(chamber().probation!.startedAt);
    const tick = async (minutes: number) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(start + minutes * MIN);
      const res = watchdogGET(new Request('http://x/api/cron/update-watchdog', { headers: { authorization: 'Bearer cron-test-secret' } }));
      vi.useRealTimers();
      return (await res.json()).summary;
    };
    const first = await tick(4); // one silent interval: degraded, still watching
    expect(first.missingReports).toBe(1);
    expect(first.watching).toEqual([expect.objectContaining({ nationId: HOME_NATION, version: '1.4.1', degraded: true })]);
    expect(nationRecord(HOME_NATION)!.installedVersion).toBe('1.4.1');
    const later = await tick(10); // three in a row: switch back
    expect(later.fellBack).toEqual([{ nationId: HOME_NATION, from: '1.4.1', to: '1.4.0' }]);
    expect(nationRecord(HOME_NATION)!.installedVersion).toBe('1.4.0');
  });

  it('passes a healthy probation at the end of its window', async () => {
    process.env.CIVICOS_CRON_SECRET = 'cron-test-secret';
    updateSettings(HOME_NATION, { healthSource: 'simulated' }, 'CIO');
    await cosignPOST({ action: 'approve', by: 'CIO' });
    await decisionPOST(post({ action: 'prepare', by: 'Ops' }), { params: { id: 'DR-141' } });
    await cosignPOST({ action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    const end = Date.parse(chamber().probation!.endsAt);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(end + MIN);
    const res = watchdogGET(new Request('http://x/api/cron/update-watchdog', { headers: { authorization: 'Bearer cron-test-secret' } }));
    vi.useRealTimers();
    expect((await res.json()).summary.passed).toEqual([{ nationId: HOME_NATION, version: '1.4.1' }]);
    expect(nationRecord(HOME_NATION)!.lkg!.version).toBe('1.4.1');
  });

  it('never installs anything: a year of minutes changes no newer release and no installed version', async () => {
    process.env.CIVICOS_CRON_SECRET = 'cron-test-secret';
    const snapshot = () => Object.fromEntries(['home', 'sandbox'].map(id => {
      const c = chamber(id);
      return [id, { installed: c.installed, newer: c.releases.filter(r => r.newer).map(r => [r.id, r.install.state]) }];
    }));
    const before = snapshot();
    const mark = listAudit()[0]?.seq ?? 0;
    vi.useFakeTimers({ toFake: ['Date'] });
    const t0 = Date.now();
    for (let i = 1; i <= 400; i++) {
      vi.setSystemTime(t0 + i * 22 * 60 * MIN); // ~1 year in 400 runs
      const res = watchdogGET(new Request('http://x/api/cron/update-watchdog', { headers: { authorization: 'Bearer cron-test-secret' } }));
      expect(res.status).toBe(200);
    }
    vi.useRealTimers();
    expect(snapshot()).toEqual(before);
    // No install, approval or schedule was written by the watchdog.
    expect(listAudit().filter(a => a.seq > mark).some(a => /^update\.(install|approve|schedule|prepare)$/.test(a.action))).toBe(false);
  });

  it('only concludes or switches back during a probation — the version can only go to last known good', async () => {
    process.env.CIVICOS_CRON_SECRET = 'cron-test-secret';
    await installSecurityRelease();
    const lkg = nationRecord(HOME_NATION)!.lkg!.version;
    vi.useFakeTimers({ toFake: ['Date'] });
    const t0 = Date.now();
    for (let i = 1; i <= 60; i++) {
      vi.setSystemTime(t0 + i * MIN);
      watchdogGET(new Request('http://x/api/cron/update-watchdog', { headers: { authorization: 'Bearer cron-test-secret' } }));
      expect(['1.4.1', lkg]).toContain(nationRecord(HOME_NATION)!.installedVersion);
    }
    vi.useRealTimers();
    expect(nationRecord(HOME_NATION)!.installedVersion).toBe(lkg);
    // The on-read evaluation still works as a fallback mechanism.
    expect((await chamberGET(new Request('http://x/api/releases') as never).json()).chamber.installed).toBe(lkg);
  });
});

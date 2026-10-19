import { describe, it, expect, beforeEach } from 'vitest';
import { resetUpdates, getChamber, decide, reportHealth, updateSettings, superviseProbations, HEALTH_CHECKS, HOME_NATION } from './updates';
import { resetReadiness } from './readiness';
import { stagingOff, cosign } from './testkit';
import { resetSecurity } from './security-store';
import { resetSupport, ticketAction } from './support';
import { listAudit } from './store';
import { resetSovereignty, sharing, setSharing, transmit, received, samplePayload, CATEGORY_KEYS } from './sovereignty';
import { POST as telPOST } from '@/app/api/releases/telemetry/route';
import { GET as pubTelGET } from '@/app/api/releases/publisher/telemetry/route';
import { GET as sovGET, POST as sovPOST } from '@/app/api/releases/sovereignty/route';
import type { HealthCheck } from '@/lib/api/types';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const key = (id: string) => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c.nation.channelKey; };
const json = (url: string, body: unknown) => new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;
const healthy = (): HealthCheck[] => HEALTH_CHECKS.map(c => ({ key: c.key, ok: true, value: c.key === 'latency' ? 200 : c.key === 'error-rate' ? 0.2 : undefined }));
const confirmed = (): HealthCheck[] => healthy().map(c => (c.key === 'smoke-sign-in' || c.key === 'smoke-payments' ? { ...c, ok: false } : c));

function installUnderAgent() {
  ok(updateSettings(HOME_NATION, { healthSource: 'agent' }, 'CIO'));
  ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
  ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' }));
  ok(cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true }));
}

beforeEach(() => { resetUpdates(); resetReadiness(); stagingOff(); resetSecurity(); resetSupport(); resetSovereignty(); });

describe('every category is off unless enabled', () => {
  it('defaults to off for every nation and category', () => {
    for (const n of [HOME_NATION, 'sandbox']) expect(sharing(n).every(s => !s.enabled)).toBe(true);
    expect(CATEGORY_KEYS.sort()).toEqual(['ai-advisory', 'crash-reports', 'health-reports', 'support-attachments', 'usage-metrics']);
  });

  it('enabling needs a named approver and a reason; both directions are audited', () => {
    expect(setSharing(HOME_NATION, 'crash-reports', { enabled: true, by: 'CIO' })).toMatchObject({ status: 422 });
    expect(setSharing(HOME_NATION, 'crash-reports', { enabled: true, reason: 'Faster fixes for crashes' })).toMatchObject({ status: 422 });
    const s = ok(setSharing(HOME_NATION, 'crash-reports', { enabled: true, by: 'Data Protection Officer', reason: 'Faster fixes for crashes in permits' }));
    expect(s).toMatchObject({ enabled: true, approvedBy: 'Data Protection Officer' });
    expect(listAudit()[0]).toMatchObject({ action: 'sovereignty.share.enable', actor: 'Data Protection Officer', resource: `DataSovereignty:${HOME_NATION}/crash-reports` });
    ok(setSharing(HOME_NATION, 'crash-reports', { enabled: false, by: 'CIO' }));
    expect(listAudit()[0]).toMatchObject({ action: 'sovereignty.share.disable' });
  });

  it('each category shows a sample of exactly what would be shared — no personal data fields', () => {
    for (const k of CATEGORY_KEYS) {
      const p = JSON.stringify(samplePayload(k, { version: '1.4.0' }));
      expect(p).not.toMatch(/citizen|officerName|email|ip"|address/i);
    }
  });
});

describe('disabled categories are never transmitted', () => {
  it('the gate keeps nothing on the publisher side, only a local count', () => {
    for (const k of CATEGORY_KEYS) expect(transmit(HOME_NATION, k, 'x', { a: 1 })).toEqual({ sent: false });
    expect(received()).toEqual([]);
    expect(sharing(HOME_NATION).every(s => s.heldBack === 1 && s.sent === 0)).toBe(true);
  });

  it('health reports: probation still evaluates and falls back locally, but nothing reaches the publisher', () => {
    installUnderAgent();
    ok(reportHealth(HOME_NATION, { checks: healthy() }));
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    const c = getChamber(HOME_NATION); if ('error' in c) throw new Error(c.error);
    expect(c.releases.find(r => r.id === 'DR-141')!.install.state).toBe('fallen-back'); // local safety unchanged
    expect(received({ category: 'health-reports' })).toEqual([]);
    expect(sharing(HOME_NATION).find(s => s.category === 'health-reports')!.heldBack).toBe(2);
  });

  it('health reports flow once the nation enables them, and stop again when it disables them', () => {
    ok(setSharing(HOME_NATION, 'health-reports', { enabled: true, by: 'CIO', reason: 'Help the publisher halt bad releases' }));
    installUnderAgent();
    ok(reportHealth(HOME_NATION, { checks: healthy() }));
    expect(received({ nationId: HOME_NATION, category: 'health-reports' }).length).toBe(1);
    ok(setSharing(HOME_NATION, 'health-reports', { enabled: false, by: 'CIO' }));
    ok(reportHealth(HOME_NATION, { checks: healthy() }));
    expect(received({ nationId: HOME_NATION, category: 'health-reports' }).length).toBe(1);
  });

  it('simulated probation reports for hosted nations obey the same gate', () => {
    const sb = getChamber('sandbox'); if ('error' in sb) throw new Error(sb.error);
    superviseProbations(Date.now() + 3_600_000);
    expect(received({ nationId: 'sandbox' })).toEqual([]);
  });

  it('support attachments are refused at the ticket when off', () => {
    expect(ticketAction('nation', HOME_NATION, 'SUP-3003', { action: 'attach', by: 'CIO', filename: 'logs.tar.gz', sizeBytes: 2048 })).toMatchObject({ status: 403 });
    expect(received()).toEqual([]);
    ok(setSharing(HOME_NATION, 'support-attachments', { enabled: true, by: 'DPO', reason: 'Diagnostics for the duplicate permit ticket' }));
    const t = ok(ticketAction('nation', HOME_NATION, 'SUP-3003', { action: 'attach', by: 'CIO', filename: 'logs.tar.gz', sizeBytes: 2048 }));
    expect(t.thread[t.thread.length - 1]!.text).toMatch(/Attached logs\.tar\.gz/);
    expect(received({ category: 'support-attachments' }).length).toBe(1);
  });

  it('routes: telemetry is held back when off; the publisher sees only what was shared', async () => {
    const r = await (await telPOST(json('http://x', { category: 'crash-reports', payload: { error: 'TypeError' } }))).json();
    expect(r).toEqual({ sent: false, heldBack: true });
    await sovPOST(json(`http://x?link=${key('sandbox')}`, { category: 'usage-metrics', enabled: true, by: 'Owner', reason: 'Help plan the next modules' }));
    const r2 = await (await telPOST(json(`http://x?link=${key('sandbox')}`, { category: 'usage-metrics', payload: { calls: 10 } }))).json();
    expect(r2.sent).toBe(true);
    const pub = await (await pubTelGET(new Request('http://x') as never)).json();
    expect(pub.recent.every((t: { nationId: string; category: string }) => t.nationId === 'sandbox' && t.category === 'usage-metrics')).toBe(true);
    const home = pub.nations.find((n: { id: string }) => n.id === HOME_NATION);
    expect(home.categories['crash-reports']).toEqual({ shared: false, received: 0 });
    const g = await (await sovGET(new Request('http://x') as never)).json();
    expect(g.categories.length).toBe(5);
    expect(g.state.every((s: { enabled: boolean }) => !s.enabled)).toBe(true); // the sandbox's choice does not touch home
  });
});

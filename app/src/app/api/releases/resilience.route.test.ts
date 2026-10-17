import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const platformAuth = vi.fn();
vi.mock('@/lib/platform-auth', () => ({ platformOrCronAuthorized: (req: Request) => platformAuth(req) }));

import { GET as chamberGET } from './route';
import { POST as decisionPOST } from './[id]/decision/route';
import { GET as checksGET, POST as healthPOST } from './health/route';
import { PUT as settingsPUT } from './settings/route';
import { POST as ackPOST } from './incidents/[id]/route';
import { POST as breakGlassPOST } from './break-glass/route';
import { GET as securityGET } from './security/route';
import { POST as quotePOST } from './security/orders/route';
import { POST as orderPOST } from './security/orders/[id]/route';
import { POST as byoPOST } from './security/byo/route';
import { POST as softwarePOST } from './security/software/route';
import { POST as defsPOST } from './security/definitions/route';
import { GET as secDownloadGET } from './security/download/[key]/[order]/route';
import { POST as statusPOST } from './publisher/releases/[id]/route';
import { GET as publisherGET } from './publisher/route';
import { resetUpdates, HEALTH_CHECKS } from '@/lib/data/updates';
import { resetSecurity } from '@/lib/data/security-store';
import type { UpdateChamber, SecurityCenter, PublisherOverview } from '@/lib/api/types';

const get = (url: string) => new Request(`http://x${url}`) as never;
const send = (method: string, body: unknown) => new Request('http://x/api', {
  method, body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' },
}) as never;
const post = (body: unknown) => send('POST', body);
const chamber = async (): Promise<UpdateChamber> => (await chamberGET(get('/api/releases')).json()).chamber;
const security = async (): Promise<SecurityCenter> => (await securityGET(get('/api/releases/security')).json()).security;
const decide = (id: string, body: unknown) => decisionPOST(post(body), { params: { id } });
const healthy = () => HEALTH_CHECKS.map(c => ({ key: c.key, ok: true, value: c.key === 'latency' ? 230 : c.key === 'error-rate' ? 0.3 : undefined }));

async function installSecurityRelease() {
  await settingsPUT(send('PUT', { healthSource: 'agent', by: 'CIO' }));
  await decide('DR-141', { action: 'approve', by: 'CIO' });
  await decide('DR-141', { action: 'prepare', by: 'Ops' });
  const r = await decide('DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
  expect(r.status).toBe(200);
}

beforeEach(() => { resetUpdates(); resetSecurity(); platformAuth.mockReset(); });
afterEach(() => { delete process.env.CIVICOS_AUTH; });

describe('health, probation and fallback over HTTP', () => {
  it('lists the checks the agent must report', async () => {
    expect((await checksGET().json()).checks.length).toBe(9);
  });

  it('validates health reports', async () => {
    expect((await healthPOST(post('x'))).status).toBe(400);
    expect((await healthPOST(post({ checks: healthy() }))).status).toBe(409); // nothing on probation
    await installSecurityRelease();
    expect((await healthPOST(post({ checks: [{ key: 'bogus', ok: true }] }))).status).toBe(422);
  });

  it('a failing smoke test falls back to last known good and opens an incident the nation acknowledges', async () => {
    await installSecurityRelease();
    expect((await chamber()).probation?.state).toBe('running');
    // One failure only degrades; two independent critical failures are confirmed.
    const one = await healthPOST(post({ checks: healthy().map(c => c.key === 'smoke-registry' ? { ...c, ok: false } : c) }));
    expect((await one.json()).probation).toMatchObject({ state: 'running', degraded: true });
    const res = await healthPOST(post({ checks: healthy().map(c => c.key === 'smoke-registry' || c.key === 'readiness' ? { ...c, ok: false } : c) }));
    expect(res.status).toBe(200);
    const c = await chamber();
    expect(c.installed).toBe('1.4.0');
    const inc = c.incidents[0]!;
    expect(inc).toMatchObject({ trigger: 'automatic' });
    expect(inc.failedChecks).toEqual(expect.arrayContaining(['smoke-registry', 'readiness']));
    expect((await ackPOST(post({ by: '' }), { params: { id: inc.id } })).status).toBe(422);
    expect((await ackPOST(post({ by: 'CIO' }), { params: { id: inc.id } })).status).toBe(200);
  });

  it('settings validate', async () => {
    expect((await settingsPUT(send('PUT', { probationMinutes: 1, by: 'CIO' }))).status).toBe(422);
    const r = await settingsPUT(send('PUT', { probationMinutes: 60, fallback: 'ask', by: 'CIO' }));
    expect(r.status).toBe(200);
    expect((await r.json()).nation.settings).toMatchObject({ probationMinutes: 60, fallback: 'ask' });
  });

  it('break-glass needs two people', async () => {
    expect((await breakGlassPOST(post({ by: 'CIO', reason: 'Total outage after the upgrade' }))).status).toBe(422);
    const r = await breakGlassPOST(post({ by: 'CIO', secondBy: 'CISO', reason: 'Total outage after the upgrade' }));
    expect(r.status).toBe(200);
    expect((await r.json()).incident.trigger).toBe('break-glass');
  });
});

describe('publisher halt / recall', () => {
  it('halts a release; nations can no longer approve it; the console shows failure rates', async () => {
    const res = await statusPOST(post({ action: 'halt', reason: 'Failures reported in the pilot ring' }), { params: { id: 'DR-141' } });
    expect(res.status).toBe(200);
    expect((await decide('DR-141', { action: 'approve', by: 'CIO' })).status).toBe(409);
    const o: PublisherOverview = (await (await publisherGET(get('/api/releases/publisher'))).json()).overview;
    expect(o.releases.find(r => r.id === 'DR-141')!.status).toBe('halted');
    expect(o.releases.find(r => r.id === 'DR-141-S1')!.stats).toMatchObject({ fallbacks: 1, failureRate: 100 });
    expect(o.incidents.length).toBeGreaterThan(0);
    expect((await statusPOST(post({ action: 'explode' }), { params: { id: 'DR-141' } })).status).toBe(422);
    expect((await statusPOST(post({ action: 'halt' }), { params: { id: 'NOPE' } })).status).toBe(404);
  });

  it('is gated under CIVICOS_AUTH=enforce', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    platformAuth.mockResolvedValue(false);
    expect((await statusPOST(post({ action: 'halt', reason: 'Failures reported' }), { params: { id: 'DR-141' } })).status).toBe(401);
  });
});

describe('security store over HTTP', () => {
  it('quote → order → pay → active licence → download', async () => {
    const before = await security();
    expect(before.catalogue).toHaveLength(7);
    expect(before.baseline.active).toBe(true);
    expect(before.catalogue.every(p => p.placeholder)).toBe(true);
    const q = await quotePOST(post({ productId: 'SEC-EDR', edition: 'standard', seats: 48, years: 1, by: 'CIO' }));
    expect(q.status).toBe(201);
    const id = (await q.json()).order.id as string;
    const home = (await chamber()).nation;
    expect(secDownloadGET(get('/x'), { params: { key: home.channelKey, order: id } }).status).toBe(403);
    expect((await orderPOST(post({ action: 'order', poNumber: 'P', by: 'CIO' }), { params: { id } })).status).toBe(422);
    expect((await orderPOST(post({ action: 'order', poNumber: 'PO-2026-12', by: 'CIO' }), { params: { id } })).status).toBe(200);
    expect((await orderPOST(post({ action: 'pay', by: 'Accountant General' }), { params: { id } })).status).toBe(422);
    const paid = await orderPOST(post({ action: 'pay', paymentReference: 'TRF-55120', by: 'Accountant General' }), { params: { id } });
    expect((await paid.json()).order.stage).toBe('active');
    expect(secDownloadGET(get('/x'), { params: { key: home.channelKey, order: id } }).status).toBe(200);
    expect((await security()).posture.gate.platformCovered).toBe(true);
  });

  it('another nation cannot act on this nation’s order', async () => {
    const q = await quotePOST(post({ productId: 'SEC-WAF', edition: 'standard', seats: 10, by: 'CIO' }));
    const id = (await q.json()).order.id as string;
    const sandboxKey = (await (await publisherGET(get('/api/releases/publisher'))).json()).overview.nations.find((n: { id: string }) => n.id === 'sandbox').channelKey;
    expect((await orderPOST(post({ action: 'cancel', by: 'x', link: sandboxKey }), { params: { id } })).status).toBe(404);
  });

  it('BYO, nation software and definitions', async () => {
    expect((await byoPOST(post({ product: 'x' }))).status).toBe(422);
    const b = await byoPOST(post({ product: 'Own EDR', vendor: 'National CERT', version: '4.1', category: 'edr', servers: 48, endpoints: 1250, lastScanAt: new Date().toISOString(), attestation: 'Full estate scan, no critical findings outstanding.', scope: 'estate', by: 'CISO' }));
    expect(b.status).toBe(201);
    const s = await softwarePOST(post({ name: 'Courts calendar', version: '0.3.0', kind: 'module', by: 'National IT' }));
    expect(s.status).toBe(201);
    expect((await defsPOST(post({ by: '' }))).status).toBe(422);
    expect((await defsPOST(post({ by: 'CISO' }))).status).toBe(200);
    const sec = await security();
    expect(sec.byo.length).toBe(2);
    expect(sec.software.length).toBe(2);
  });
});

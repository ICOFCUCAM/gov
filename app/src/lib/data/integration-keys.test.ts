import { describe, it, expect, beforeEach } from 'vitest';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { NextRequest } from 'next/server';
import { registerIntegration, verifyIntegrationKey, rotateIntegrationKey, listIntegrations } from './store';
import { resetRateLimits } from '@/lib/exchange/rate-limit';
import { GET as verifyRoute } from '@/app/api/integrations/verify/route';

let n = 0;
function register(scopes = ['permit:read']) {
  const r = registerIntegration({ kind: 'integration', name: `svc-${++n}-${Date.now()}`, ownerOrg: 'Org', contact: 'a@b', scopes });
  if ('error' in r) throw new Error(r.error);
  return r;
}
const bearer = (k: string) => `Bearer ${k}`;
const db = () => (globalThis as unknown as { __civicos: { integrationKeys: Record<string, string> } }).__civicos;

describe('integration API keys', () => {
  beforeEach(() => resetRateLimits());

  it('issues 32 random bytes with a prefix, shown once and kept only as a SHA-256 hash', () => {
    const r = register();
    expect(r.apiKey).toMatch(/^civ_[0-9a-f]{8}_[A-Za-z0-9_-]{43}$/);
    const c = listIntegrations().find(x => x.id === r.id)!;
    expect(c.keyPrefix).toBe(r.apiKey.slice(4, 12));
    expect(JSON.stringify(listIntegrations())).not.toContain(r.apiKey);
    expect(JSON.stringify(db())).not.toContain(r.apiKey);
    expect(db().integrationKeys[r.id]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies on use: approved clients only, the right key, the granted scope', () => {
    const r = register(['permit:read']);
    expect(verifyIntegrationKey(bearer(r.apiKey))).toMatchObject({ ok: false, status: 403, error: expect.stringMatching(/pending/) });
    approveIntegration(r.id);
    expect(verifyIntegrationKey(bearer(r.apiKey))).toMatchObject({ ok: true, client: { id: r.id } });
    expect(verifyIntegrationKey(bearer(r.apiKey), 'payment:write')).toMatchObject({ ok: false, status: 403 });
    const forged = r.apiKey.slice(0, -1) + (r.apiKey.endsWith('A') ? 'B' : 'A');
    expect(verifyIntegrationKey(bearer(forged))).toMatchObject({ ok: false, status: 401 });
    expect(verifyIntegrationKey('Bearer civ_nope')).toMatchObject({ ok: false, status: 401 });
  });

  it('enforces rateLimitRpm per key as a token bucket', () => {
    const r = register();
    approveIntegration(r.id);
    const c = listIntegrations().find(x => x.id === r.id)!;
    c.rateLimitRpm = 3;
    const t = Date.now();
    for (let i = 0; i < 3; i++) expect(verifyIntegrationKey(bearer(r.apiKey), undefined, t).ok).toBe(true);
    expect(verifyIntegrationKey(bearer(r.apiKey), undefined, t)).toMatchObject({ ok: false, status: 429, retryAfterSeconds: expect.any(Number) });
    expect(verifyIntegrationKey(bearer(r.apiKey), undefined, t + 20_000).ok).toBe(true);
  });

  it('rotates: the new key works, the old one stops', () => {
    const r = register();
    approveIntegration(r.id);
    const next = rotateIntegrationKey(r.id, 'Official');
    if ('error' in next) throw new Error(next.error);
    expect(verifyIntegrationKey(bearer(r.apiKey)).ok).toBe(false);
    expect(verifyIntegrationKey(bearer(next.apiKey)).ok).toBe(true);
  });

  it('answers on the verify route with Retry-After when limited', async () => {
    const r = register();
    approveIntegration(r.id);
    listIntegrations().find(x => x.id === r.id)!.rateLimitRpm = 1;
    const call = () => verifyRoute(new NextRequest('http://localhost/api/integrations/verify', { headers: { authorization: bearer(r.apiKey) } }));
    const first = call();
    expect(first.status).toBe(200);
    expect((await first.json()).integration).toMatchObject({ id: r.id });
    const second = call();
    expect(second.status).toBe(429);
    expect(second.headers.get('retry-after')).toMatch(/^\d+$/);
  });
});

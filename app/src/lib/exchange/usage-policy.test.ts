import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { parseUsagePolicy, usageRefusal, grantAsOdrl } from './usage-policy';
import { registerIntegration, setIntegrationStatus, proposeGrant, setGrantStatus, listAudit, listGrants } from '@/lib/data/store';
import { resetRateLimits } from './rate-limit';
import { POST as federationPost } from '@/app/api/federation/exchange/route';
import { POST as proposePost } from '@/app/api/federation/propose/route';
import { GET as policyGet } from '@/app/api/federation/grants/[id]/policy/route';

describe('usage policies', () => {
  it('parses purposes, retention and onward sharing', () => {
    expect(parseUsagePolicy({ purposes: 'Oversight, public statistics', retentionDays: 90, onwardSharing: false }))
      .toEqual({ purposes: ['oversight', 'public-statistics'], retentionDays: 90, onwardSharing: false });
    expect(parseUsagePolicy({ purposes: [], retentionDays: 90, onwardSharing: false })).toHaveProperty('error');
    expect(parseUsagePolicy({ purposes: ['x'], retentionDays: 0, onwardSharing: false })).toHaveProperty('error');
    expect(parseUsagePolicy({ purposes: ['x'], retentionDays: 9, onwardSharing: 'yes' })).toHaveProperty('error');
    expect(parseUsagePolicy(undefined)).toHaveProperty('error');
  });

  it('refuses requests outside the policy, with the reason', () => {
    const p = { purposes: ['oversight'], retentionDays: 30, onwardSharing: false };
    expect(usageRefusal(p, { purpose: 'oversight', retainDays: 30 })).toBeNull();
    expect(usageRefusal(p, { purpose: 'marketing' })).toMatch(/outside the grant/);
    expect(usageRefusal(p, {})).toMatch(/state the purpose/);
    expect(usageRefusal(p, { purpose: 'oversight', retainDays: 31 })).toMatch(/exceeds the grant's retention of 30 days/);
    expect(usageRefusal(p, { purpose: 'oversight', onward: true })).toMatch(/onward sharing is not allowed/);
    expect(usageRefusal({ ...p, onwardSharing: true }, { purpose: 'oversight', onward: true })).toBeNull();
    expect(usageRefusal(undefined, { purpose: 'oversight' })).toMatch(/no usage policy/);
  });

  it('publishes the policy as an ODRL agreement', () => {
    const odrl = grantAsOdrl({ id: 'FG-1', fromTenant: 'home', toTenant: 'min-health', scopes: ['permit:read'], status: 'approved', reason: 'r', createdAt: '2026-01-01', policy: { purposes: ['oversight'], retentionDays: 30, onwardSharing: false } });
    expect(odrl).toMatchObject({ '@type': 'Agreement', permission: [{ action: 'use', constraint: [{ leftOperand: 'purpose', operator: 'isAnyOf', rightOperand: ['oversight'] }], duty: [{ action: 'delete' }] }], prohibition: [{ action: 'distribute' }] });
  });
});

describe('usage policies enforced at the exchange', () => {
  beforeEach(() => resetRateLimits());

  it('requires a policy to propose, enforces it when the partner calls, and audits the decision', async () => {
    const tenant = `partner-${Date.now()}`;
    const propose = (body: unknown) => proposePost(new NextRequest('http://localhost/api/federation/propose', { method: 'POST', body: JSON.stringify(body) }));
    expect((await propose({ toTenant: tenant, scopes: ['permit:read'], reason: 'Oversight' })).status).toBe(422);
    const res = await propose({ toTenant: tenant, scopes: ['permit:read'], reason: 'Oversight', policy: { purposes: ['oversight'], retentionDays: 30, onwardSharing: false } });
    expect(res.status).toBe(201);
    const { grant } = await res.json();
    expect(grant.policy).toEqual({ purposes: ['oversight'], retentionDays: 30, onwardSharing: false });
    expect(listAudit()[0]).toMatchObject({ action: 'federation.propose', detail: expect.stringMatching(/keep 30 days/) });
    setGrantStatus(grant.id, 'approved', 'Official');
    expect((await policyGet(new Request('http://x'), { params: { id: grant.id } })).headers.get('content-type')).toMatch(/ld\+json/);

    const reg = registerIntegration({ kind: 'integration', name: `p-${tenant}`, ownerOrg: 'Partner', contact: 'x@y', scopes: ['federation:exchange'] });
    if ('error' in reg) throw new Error(reg.error);
    setIntegrationStatus(reg.id, 'approved', 'Official');
    const call = (body: Record<string, unknown>) => federationPost(new NextRequest('http://localhost/api/federation/exchange', { method: 'POST', headers: { authorization: `Bearer ${reg.apiKey}` }, body: JSON.stringify({ tenant, scope: 'permit:read', ...body }) }));

    const off = await call({ purpose: 'marketing' });
    expect(off.status).toBe(403);
    expect((await off.json()).reason).toMatch(/purpose 'marketing' is outside the grant/);
    expect(listAudit()[0]).toMatchObject({ action: 'federation.exchange', outcome: 'denied', detail: expect.stringMatching(/marketing/) });
    expect((await call({ purpose: 'oversight', onward: true })).status).toBe(403);
    expect((await call({ purpose: 'oversight', retainDays: 400 })).status).toBe(403);

    const ok = await call({ purpose: 'oversight', retainDays: 10 });
    expect(ok.status).toBe(200);
    expect((await ok.json()).obligations).toMatchObject({ purposes: ['oversight'], retentionDays: 30, onwardSharing: false, deleteBy: expect.any(String) });

    // Expired grants are refused as before.
    listGrants().find(g => g.id === grant.id)!.expiresAt = '2020-01-01T00:00:00Z';
    expect((await (await call({ purpose: 'oversight' })).json()).reason).toBe('grant expired');
  });

  it('refuses exchanges under a grant that predates usage policies', async () => {
    const tenant = `legacy-${Date.now()}`;
    const g = proposeGrant({ toTenant: tenant, scopes: ['permit:read'], reason: 'Old grant' });
    if ('error' in g) throw new Error(g.error);
    setGrantStatus(g.id, 'approved', 'Official');
    const reg = registerIntegration({ kind: 'integration', name: `l-${tenant}`, ownerOrg: 'Partner', contact: 'x@y', scopes: ['federation:exchange'] });
    if ('error' in reg) throw new Error(reg.error);
    setIntegrationStatus(reg.id, 'approved', 'Official');
    const res = await federationPost(new NextRequest('http://localhost/api/federation/exchange', { method: 'POST', headers: { authorization: `Bearer ${reg.apiKey}` }, body: JSON.stringify({ tenant, scope: 'permit:read', purpose: 'oversight' }) }));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toMatch(/no usage policy/);
  });
});

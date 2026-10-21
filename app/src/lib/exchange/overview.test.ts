import { describe, it, expect, beforeEach } from 'vitest';
import { buildOverview, countCalls, refusalReason, serviceOverview } from './overview';
import { callService } from './services';
import { noteUnauthenticated, resetExchangeLog, type ExchangeEntry } from './log';
import { registerIntegration } from '@/lib/data/store';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import type { IntegrationClient } from '@/lib/api/types';

const entry = (over: Partial<ExchangeEntry>): ExchangeEntry => ({
  id: `EXL-${Math.random()}`, at: '2026-10-01T10:00:00.000Z', channel: 'service', feedId: 'integration:int-1', method: 'POST', path: 'service:taxpayer.status',
  requestDigest: 'sha-256=:x:', signature: 'absent', status: 200, result: 'active · purpose: paying a benefit', receiptId: 'EX-1', ...over,
});
const client = (over: Partial<IntegrationClient>): IntegrationClient => ({
  id: 'int-1', kind: 'integration', name: 'Benefits system', ownerOrg: 'Social security', scopes: ['service:taxpayer.status'], status: 'approved', rateLimitRpm: 60, createdAt: '2026-01-01T00:00:00.000Z', ...over,
});

describe('data-sharing services overview', () => {
  it('names the reason of a refusal without the caller\'s purpose or the approved list', () => {
    expect(refusalReason('purpose not approved (approved: a, b) · purpose: Name Of A Person')).toBe('purpose not approved');
    expect(refusalReason('valid · purposes not yet approved')).toBe('valid');
  });

  it('counts calls, refusals and callers for one service only, never what was asked', () => {
    const entries = [
      entry({}),
      entry({ at: '2026-10-02T10:00:00.000Z', status: 403, result: 'purpose not approved (approved: x) · purpose: checking Jane Doe' }),
      entry({ feedId: 'module:customs', status: 422, result: 'nationality needed · purpose: y' }),
      entry({ path: 'service:customs.release' }),
      entry({ channel: 'federation' }),
    ];
    const c = countCalls('taxpayer.status', entries, [{ channel: 'service', feedId: 'taxpayer.status', result: 'no key', count: 3, first: '', last: '' }], id => id);
    expect(c).toMatchObject({ total: 3, answered: 1, refused: 1, failed: 1, firstAt: '2026-10-01T10:00:00.000Z', lastAt: '2026-10-02T10:00:00.000Z', unauthenticated: 3 });
    expect(c.reasons).toEqual([{ reason: 'nationality needed', count: 1 }, { reason: 'purpose not approved', count: 1 }]);
    expect(c.byCaller.map(x => [x.caller, x.kind, x.total, x.refused])).toEqual([['integration:int-1', 'integration', 2, 1], ['module:customs', 'module', 1, 1]]);
    expect(JSON.stringify(c)).not.toContain('Jane Doe');
  });

  it('joins each service with its authority from the deployment profile, its register and approved integrations', () => {
    const out = buildOverview({
      integrations: [
        client({}),
        client({ id: 'int-2', name: 'Old system', scopes: ['service:taxpayer.status'], status: 'approved', approval: undefined }),
        client({ id: 'int-3', name: 'Unrelated', scopes: ['permit:read'] }),
        client({ id: 'int-4', name: 'Proposed', scopes: ['permit:read'], status: 'pending', pendingApproval: { scopes: ['service:taxpayer.status'], purposes: { 'taxpayer.status': ['licensing'] }, by: 'A', at: '2026-10-01T00:00:00.000Z' } }),
      ].map((c, n) => (n === 0 ? { ...c, purposes: { 'taxpayer.status': ['paying-a-benefit'] }, approval: { scopes: c.scopes, purposes: {}, by: 'A', at: '', closedAt: '2026-01-02', outcome: 'confirmed', confirmedBy: 'B' } as IntegrationClient['approval'] } : c)),
      webhooks: [{ id: 'wh-1', topic: 'civil', url: 'https://x.example', status: 'active', failures: 0, createdAt: '' }],
      entries: [entry({})],
      unauthenticated: [],
      authorityFor: k => (k === 'tax' ? 'min-revenue' : undefined),
      institutionName: id => (id === 'min-revenue' ? 'Revenue Authority' : undefined),
    });
    const tax = out.find(s => s.id === 'taxpayer.status')!;
    expect(tax.owner).toEqual({ key: 'tax', label: 'Tax administration', named: true, institution: { id: 'min-revenue', name: 'Revenue Authority' } });
    expect(tax.register?.id).toBe('tax');
    expect(tax.integrations.map(i => [i.id, i.purposes, i.legacy, !!i.waiting])).toEqual([['int-1', ['paying-a-benefit'], false, false], ['int-2', [], true, false], ['int-4', [], false, true]]);
    expect(tax.calls.total).toBe(1);
    const imm = out.find(s => s.id === 'immigration.status')!;
    expect(imm.owner).toMatchObject({ key: 'immigration', named: false });
    expect(imm.owner.institution).toBeUndefined();
    const ev = out.find(s => s.kind === 'event')!;
    expect(ev.webhooks).toEqual([{ id: 'wh-1', topic: 'civil', status: 'active' }]);
  });

  describe('as the installation stands', () => {
    beforeEach(() => resetExchangeLog());
    it('counts real calls through callService and the unauthenticated summary', async () => {
      const r = registerIntegration({ kind: 'integration', name: `Labour inspectorate ${Date.now()}`, ownerOrg: 'Labour', contact: 'ops@example.gov', scopes: ['service:immigration.status'] });
      if ('error' in r) throw new Error(r.error);
      const a = approveIntegration(r.id, { purposes: { 'immigration.status': ['right-to-work-check'] } });
      if ('error' in a) throw new Error(a.error);
      const caller = { kind: 'integration' as const, id: r.id, name: 'Labour' };
      await callService(caller, 'immigration.status', { nationality: 'KEN', documentNumber: 'AB1' }, 'Right-to-work check');
      await callService(caller, 'immigration.status', { nationality: 'KEN', documentNumber: 'AB1' }, 'Curiosity');
      noteUnauthenticated({ channel: 'service', feedId: 'immigration.status', result: 'no key' });
      const imm = serviceOverview().find(s => s.id === 'immigration.status')!;
      expect(imm.calls).toMatchObject({ total: 2, answered: 1, refused: 1, unauthenticated: 1 });
      expect(imm.integrations.find(i => i.id === r.id)).toMatchObject({ status: 'approved', purposes: ['right-to-work-check'], legacy: false });
      expect(imm.calls.byCaller[0]).toMatchObject({ caller: `integration:${r.id}`, total: 2, refused: 1 });
      expect(JSON.stringify(imm)).not.toContain('AB1');
    });
  });
});

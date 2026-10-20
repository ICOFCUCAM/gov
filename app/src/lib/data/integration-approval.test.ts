// Approving an outside caller takes two officials (lib/data/store/federation.ts):
// one proposes the integration's scopes and purposes per service, a different
// one confirms; an unconfirmed proposal lapses and is kept.
import { describe, it, expect, afterEach } from 'vitest';
import { registerIntegration, setIntegrationStatus, proposeIntegrationApproval, confirmIntegrationApproval, withdrawIntegrationApproval, listIntegrations, integrationPurposes, listAudit } from './store';
import { setDualControlPolicy, resetDualControl } from '@/lib/casework/dual-control-policy';
import type { IntegrationClient } from '@/lib/api/types';

let n = 0;
function client(scopes = ['service:person.verify']): string {
  const r = registerIntegration({ kind: 'integration', name: `approval-${++n}-${Date.now()}`, ownerOrg: 'Identity authority', contact: 'ops@example.gov', scopes });
  if ('error' in r) throw new Error(r.error);
  return r.id;
}
const get = (id: string) => listIntegrations().find(c => c.id === id)!;
const ok = <T>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('approving an integration', () => {
  afterEach(() => resetDualControl());

  it('cannot be done by one official in one step', () => {
    const id = client();
    expect(setIntegrationStatus(id, 'approved', 'Admin A')).toMatchObject({ error: expect.stringMatching(/two officials/) });
    expect(get(id).status).toBe('pending');
  });

  it('needs purposes for every service scope, and only for scopes it holds', () => {
    const id = client(['service:person.verify', 'permit:read']);
    expect(proposeIntegrationApproval(id, {}, 'Admin A')).toMatchObject({ error: expect.stringMatching(/purposes approved for person\.verify/) });
    expect(proposeIntegrationApproval(id, { purposes: { 'taxpayer.status': ['check'] } }, 'Admin A')).toMatchObject({ error: expect.stringMatching(/need the scope service:taxpayer\.status/) });
    expect(proposeIntegrationApproval(id, { purposes: { 'person.verify': ['Not a slug!'] } }, 'Admin A')).toMatchObject({ error: expect.stringMatching(/short words/) });
    ok(proposeIntegrationApproval(id, { purposes: { 'person.verify': 'Identity card enrolment, benefits' } }, 'Admin A'));
    expect(get(id).pendingApproval?.purposes).toEqual({ 'person.verify': ['identity-card-enrolment', 'benefits'] });
  });

  it('refuses confirmation by the official who proposed it (declared names and verified sessions)', () => {
    const id = client();
    ok(proposeIntegrationApproval(id, { purposes: { 'person.verify': ['enrolment'] } }, 'Admin A', 'sub-a'));
    expect(confirmIntegrationApproval(id, 'Admin A (renamed)', 'sub-a')).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(confirmIntegrationApproval(id, 'Admin B')).toMatchObject({ error: expect.stringMatching(/sign in to confirm/) });
    expect(get(id).status).toBe('pending');
    const id2 = client();
    ok(proposeIntegrationApproval(id2, { purposes: { 'person.verify': ['enrolment'] } }, 'Admin A'));
    expect(confirmIntegrationApproval(id2, ' admin a ')).toMatchObject({ error: expect.stringMatching(/different official/) });
  });

  it('is approved when a different official confirms: scopes and purposes in force, history kept, audited', () => {
    const id = client();
    ok(proposeIntegrationApproval(id, { purposes: { 'person.verify': ['enrolment'] }, note: 'Identity card programme' }, 'Admin A', 'sub-a'));
    const c = ok<IntegrationClient>(confirmIntegrationApproval(id, 'Admin B', 'sub-b'));
    expect(c).toMatchObject({ status: 'approved', approvedBy: 'Admin B', purposes: { 'person.verify': ['enrolment'] } });
    expect(c.pendingApproval).toBeUndefined();
    expect(c.approval).toMatchObject({ by: 'Admin A', byId: 'sub-a', confirmedBy: 'Admin B', confirmedById: 'sub-b', outcome: 'confirmed', independence: 'accounts-only' });
    expect(c.approvalHistory?.map(h => h.outcome)).toEqual(['confirmed']);
    expect(integrationPurposes(id, 'person.verify')).toEqual({ kind: 'approved', purposes: ['enrolment'] });
    expect(integrationPurposes(id, 'taxpayer.status')).toEqual({ kind: 'approved', purposes: [] });
    const actions = listAudit().filter(e => e.resource === `Integration:${id}`).map(e => e.action);
    expect(actions).toEqual(expect.arrayContaining(['integration.approval.propose', 'integration.approved']));
  });

  it('keeps the approved terms in force while a change waits for its second official', () => {
    const id = client(['service:person.verify', 'service:taxpayer.status']);
    ok(proposeIntegrationApproval(id, { purposes: { 'person.verify': ['enrolment'], 'taxpayer.status': ['tender'] } }, 'Admin A'));
    ok(confirmIntegrationApproval(id, 'Admin B'));
    ok(proposeIntegrationApproval(id, { scopes: ['service:person.verify'], purposes: { 'person.verify': ['enrolment', 'benefits'] } }, 'Admin B'));
    expect(get(id).scopes).toEqual(['service:person.verify', 'service:taxpayer.status']);
    expect(integrationPurposes(id, 'person.verify')).toEqual({ kind: 'approved', purposes: ['enrolment'] });
    ok(confirmIntegrationApproval(id, 'Admin A'));
    expect(get(id).scopes).toEqual(['service:person.verify']);
    expect(integrationPurposes(id, 'person.verify')).toEqual({ kind: 'approved', purposes: ['enrolment', 'benefits'] });
  });

  it('lapses after the dual-control waiting period and is kept in history', () => {
    ok(setDualControlPolicy({ pendingHours: 2, basis: 'Test instrument' }, 'Admin'));
    const id = client();
    const at = new Date('2026-10-01T08:00:00Z');
    ok(proposeIntegrationApproval(id, { purposes: { 'person.verify': ['enrolment'] } }, 'Admin A', undefined, at));
    // Within the period it can still be confirmed (checked on a second client below); after it, not.
    expect(confirmIntegrationApproval(id, 'Admin B', undefined, new Date(at.getTime() + 3 * 3_600_000))).toMatchObject({ error: expect.stringMatching(/No proposal waits/) });
    const c = get(id);
    expect(c.status).toBe('pending');
    expect(c.pendingApproval).toBeUndefined();
    expect(c.approvalHistory).toEqual([expect.objectContaining({ outcome: 'lapsed', by: 'Admin A' })]);
    expect(listAudit().some(e => e.resource === `Integration:${id}` && e.action === 'integration.approval.lapse')).toBe(true);
    const id2 = client();
    ok(proposeIntegrationApproval(id2, { purposes: { 'person.verify': ['enrolment'] } }, 'Admin A', undefined, at));
    expect(confirmIntegrationApproval(id2, 'Admin B', undefined, new Date(at.getTime() + 3_600_000))).toMatchObject({ status: 'approved' });
  });

  it('a proposal can be withdrawn or replaced; both are kept', () => {
    const id = client();
    ok(proposeIntegrationApproval(id, { purposes: { 'person.verify': ['one'] } }, 'Admin A'));
    ok(proposeIntegrationApproval(id, { purposes: { 'person.verify': ['two'] } }, 'Admin C'));
    ok(withdrawIntegrationApproval(id, 'Admin B'));
    expect(get(id).approvalHistory?.map(h => h.outcome)).toEqual(['superseded', 'withdrawn']);
    expect(confirmIntegrationApproval(id, 'Admin B')).toMatchObject({ error: expect.stringMatching(/No proposal/) });
  });

  it('an integration approved before two-official approval (a snapshot) loads and reads as legacy', () => {
    const id = client();
    const c = get(id);
    // As restored from a snapshot saved before this change: approved, no approval record, no purposes.
    Object.assign(c, { status: 'approved', approvedBy: 'L. Petrov' });
    delete c.approvalHistory;
    expect(integrationPurposes(id, 'person.verify')).toEqual({ kind: 'legacy' });
    ok(proposeIntegrationApproval(id, { purposes: { 'person.verify': ['enrolment'] } }, 'Admin A'));
    expect(get(id).approvalHistory).toEqual([]);
    ok(confirmIntegrationApproval(id, 'Admin B'));
    expect(integrationPurposes(id, 'person.verify')).toEqual({ kind: 'approved', purposes: ['enrolment'] });
  });
});

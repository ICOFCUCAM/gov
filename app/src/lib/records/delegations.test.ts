import { describe, it, expect, beforeEach } from 'vitest';
import { grantDelegation, revokeDelegation, delegationFor, resetDelegations } from './delegations';

describe('delegations', () => {
  beforeEach(() => resetDelegations());
  it('let an agent act for a principal in the procedures and dates granted, until revoked', () => {
    const d = grantDelegation({ principal: { kind: 'organisation', id: 'ORG-1', name: 'Acme Ltd' }, agent: { kind: 'citizen', id: 'sub-9', name: 'B. Clerk' }, procedures: ['licensing.trade'], basis: 'Board resolution 12/2026', validFrom: '2026-01-01', validUntil: '2027-01-01' }, 'Registrar');
    if ('error' in d) throw new Error(d.error);
    expect(delegationFor({ kind: 'citizen', id: 'sub-9' }, { kind: 'organisation', id: 'ORG-1' }, 'licensing.trade', '2026-06-01')?.id).toBe(d.id);
    expect(delegationFor({ kind: 'citizen', id: 'sub-9' }, { kind: 'organisation', id: 'ORG-1' }, 'civil.birth', '2026-06-01')).toBeUndefined();
    expect(delegationFor({ kind: 'citizen', id: 'sub-9' }, { kind: 'organisation', id: 'ORG-1' }, 'licensing.trade', '2027-01-01')).toBeUndefined();
    revokeDelegation(d.id, 'Left the company', 'Registrar');
    expect(delegationFor({ kind: 'citizen', id: 'sub-9' }, { kind: 'organisation', id: 'ORG-1' }, 'licensing.trade', '2026-06-01')).toBeUndefined();
    expect(grantDelegation({ principal: { kind: 'person', id: 'p', name: 'X' }, agent: { kind: 'person', id: 'p', name: 'X' }, procedures: ['*'], basis: 'b', validFrom: '2026-01-01' }, 'R')).toHaveProperty('error');
    expect(grantDelegation({ principal: { kind: 'person', id: 'child', name: 'C' }, agent: { kind: 'citizen', id: 'parent', name: 'P' }, procedures: ['*'], basis: '', validFrom: '2026-01-01' }, 'R')).toHaveProperty('error');
  });
});

// Step I0.1 (docs/reviews/2026-10-institutional-baseline-audit.md §3.4): the
// country can require that every two-person control is done by two different
// persons at the national identity provider (requireIdentityProvider). Off by
// default and never shipped on; adopted only through lib/law/policy-change.ts.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDualControl, proposeDualControlPolicy, confirmDualControlPolicy, dualControlPolicy, DEFAULT_DUAL_CONTROL } from './dual-control-policy';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { registerPersonResolver, dualControlRefusal, identityProviderRequired } from '@/lib/data/dual-control';
import { currentParts } from '@/lib/constitution/parts';

// Accounts linked to the identity provider (two persons), and accounts not linked.
const PEOPLE: Record<string, string> = { p1: 'idp:gov|sub|person-1', p2: 'idp:gov|sub|person-2', p3: 'idp:gov|sub|person-3' };

function law() {
  const l = recordLaw({ instrument: { title: 'Public Service Regulations', type: 'regulation', jurisdiction: 'X', year: 2026, number: '7', issuingAuthority: 'Minister' }, dates: { inForce: '2026-01-01' }, provisions: [{ eId: 'reg_7', num: '7', text: 'Two persons.' }] }, 'L1', 'l1');
  if ('error' in l) throw new Error(l.error);
  confirmLaw(l.instrument.id, l.version.id, 'L2', 'l2');
  return [{ instrument: l.instrument.id, eId: 'reg_7' }];
}

beforeEach(() => {
  resetDualControl(); resetLaw();
  registerPersonResolver(sub => (PEOPLE[sub] ? { key: PEOPLE[sub]!, bound: true } : undefined));
});
afterEach(() => { registerPersonResolver(() => undefined); resetDualControl(); });

describe('requireIdentityProvider', () => {
  it('ships off: two different accounts are enough, as before', () => {
    expect(DEFAULT_DUAL_CONTROL.requireIdentityProvider).toBe(false);
    expect(dualControlPolicy().requireIdentityProvider).toBe(false);
    expect(identityProviderRequired()).toBe(false);
    expect(dualControlRefusal({ by: 'A', byId: 'acct-a' }, { by: 'B', byId: 'acct-b' })).toBeNull();
  });

  it('is adopted only through the policy change (cited, a different official confirms) and then refuses accounts-only pairs', () => {
    const legalBasis = law();
    expect(proposeDualControlPolicy({ requireIdentityProvider: true, legalBasis }, 'Admin A', 'acct-a')).toHaveProperty('expiresAt');
    // Proposed is not adopted.
    expect(identityProviderRequired()).toBe(false);
    expect(dualControlRefusal({ by: 'A', byId: 'acct-a' }, { by: 'B', byId: 'acct-b' })).toBeNull();
    expect(confirmDualControlPolicy('Admin B', 'acct-b')).toMatchObject({ confirmed: { by: 'Admin B', independence: 'accounts-only' } });
    expect(dualControlPolicy()).toMatchObject({ adopted: true, requireIdentityProvider: true });
    expect(identityProviderRequired()).toBe(true);

    // One administrator with a second, unlinked account can no longer confirm alone.
    expect(dualControlRefusal({ by: 'A', byId: 'acct-a' }, { by: 'A2', byId: 'acct-a2' })).toMatch(/two different persons at the national identity provider/);
    // One side linked, the other not: refused.
    expect(dualControlRefusal({ by: 'P1', byId: 'p1' }, { by: 'B', byId: 'acct-b' })).toMatch(/identity provider/);
    // Without sign-in (declared names): refused.
    expect(dualControlRefusal({ by: 'A' }, { by: 'B' })).toMatch(/identity provider/);
    // Two different persons at the identity provider: allowed.
    expect(dualControlRefusal({ by: 'P1', byId: 'p1' }, { by: 'P2', byId: 'p2' })).toBeNull();

    // Changing the rule back is itself a two-person control under the rule.
    expect(proposeDualControlPolicy({ requireIdentityProvider: false, legalBasis }, 'P1', 'p1')).toHaveProperty('expiresAt');
    expect(confirmDualControlPolicy('Admin B', 'acct-b')).toMatchObject({ error: expect.stringMatching(/identity provider/) });
    expect(confirmDualControlPolicy('P3', 'p3')).toMatchObject({ confirmed: { independence: 'identity-provider' } });
    expect(identityProviderRequired()).toBe(false);
  });

  it('changes the dual-control part of the constitutional profile once adopted', () => {
    const before = currentParts().find(p => p.key === 'dualControl')!.digest;
    const legalBasis = law();
    proposeDualControlPolicy({ requireIdentityProvider: true, legalBasis }, 'Admin A', 'acct-a');
    confirmDualControlPolicy('Admin B', 'acct-b');
    const after = currentParts().find(p => p.key === 'dualControl')!.digest;
    expect(after).not.toBe(before);
  });
});

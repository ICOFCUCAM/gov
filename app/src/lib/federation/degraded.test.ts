// Declared degraded states (plan I9; specification Part 5 E and L test 13;
// acceptance P5-13): every exchange service and kernel dependency has a state
// computed from the facts and a declared behaviour while it is not available;
// what the platform then does matches the declaration: "unable to verify" or
// "not connected" (never a negative answer), nothing signed with a
// development key in production, no payment marked paid without a provider.
// The case-level hold is proven in lib/social/social.test.ts "holds a claim
// whose identity check cannot be made, and never refuses on that alone (P2-08)".
import { describe, it, expect, afterEach, vi } from 'vitest';
import { setSovereign, createMinistry } from '@/lib/data/store';
import { payBill } from '@/lib/data/store/payments';
import { callService } from '@/lib/exchange/services';
import { resetSigningKeys } from '@/lib/crypto/signing-key';
import { declaredStates } from './degraded';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === "object" && "error" in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const state = (key: string) => declaredStates().find(c => c.key === key)!;
afterEach(() => { vi.unstubAllEnvs(); resetSigningKeys(); setSovereign({ deployment: { authorities: {}, edition: null } as never }, 'test'); });

describe('declared degraded states', () => {
  it('declares every query service and dependency, each with what happens while it is unavailable and where that is enforced', () => {
    const all = declaredStates();
    expect(all.filter(c => c.kind === 'exchange-service').map(c => c.key)).toEqual(expect.arrayContaining(['service:identity.verify', 'service:taxpayer.status', 'service:organisation.standing']));
    expect(all.map(c => c.key)).toEqual(expect.arrayContaining(['dependency:key-custody', 'dependency:messaging-email', 'dependency:messaging-sms', 'dependency:payments', 'dependency:ai-assistant']));
    for (const c of all) {
      expect(c.whileUnavailable.length, c.key).toBeGreaterThan(20);
      expect(c.enforcedIn, c.key).toMatch(/app\/src\//);
    }
  });

  it('a service with no institution named is declared not configured and answers "unable to verify", never a negative result', async () => {
    setSovereign({ deployment: { authorities: {} } }, 'test');
    expect(state('service:identity.verify')).toMatchObject({ state: 'not-configured', why: expect.stringMatching(/No institution is named/) });
    const r = await callService({ kind: 'module', id: 'socialProtection', name: 'Social protection' }, 'identity.verify', { number: 'ID-1' }, 'benefit claim');
    expect(r.status).toBe(503);
    expect(r.data).toMatchObject({ result: 'unable_to_verify' });
  });

  it('a service outside the Institutional Edition is declared unavailable and answers "not connected"', async () => {
    const health = ok(createMinistry({ archetype: 'GENERIC', name: 'Health Regulator', slug: `hr-${Date.now()}` })).id;
    const tax = ok(createMinistry({ archetype: 'GENERIC', name: 'Revenue', slug: `rev-${Date.now()}` })).id;
    setSovereign({ deployment: { authorities: { healthRegulation: health, tax }, edition: { label: 'Health alone', institutions: [health], modules: ['health'] } } as never }, 'Administrator');
    expect(state('service:taxpayer.status')).toMatchObject({ state: 'unavailable', why: expect.stringMatching(/Not connected: .*The check was not performed/) });
    const r = await callService({ kind: 'module', id: 'health.facility', name: 'x', institution: health }, 'taxpayer.status', { tin: 'T-1' }, 'licensing');
    expect(r).toMatchObject({ status: 503, data: { connected: 'no' } });
  });

  it('in production: key custody without production keys is declared degraded and refuses to sign; payments are not configured and nothing is marked paid', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    for (const k of ['CIVICOS_AUDIT_KEY', 'CIVICOS_EXCHANGE_KEY', 'CIVICOS_TOKEN_KEY', 'CIVICOS_DECISION_KEY']) vi.stubEnv(k, '');
    resetSigningKeys();
    expect(state('dependency:key-custody')).toMatchObject({ state: 'degraded', why: expect.stringMatching(/No production key for audit, exchange, token, decision/) });
    expect(state('dependency:payments')).toMatchObject({ state: 'not-configured' });
    expect(payBill('any-bill', 'card')).toMatchObject({ error: expect.stringMatching(/No payment provider is connected/) });
    expect(state('dependency:messaging-email').whileUnavailable).toMatch(/nothing is said to be sent/);
  });
});

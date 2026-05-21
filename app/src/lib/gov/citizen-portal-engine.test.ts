import { describe, it, expect } from 'vitest';
import { citizenPortalBoard, CITIZEN_PORTAL_SAFEGUARDS } from './citizen-portal-engine';

describe('citizenPortalBoard', () => {
  it('is deterministic per operational epoch', () => {
    const a = citizenPortalBoard(1_700_000_000_000);
    const b = citizenPortalBoard(1_700_000_000_000);
    expect(a).toEqual(b);
  });

  it('returns 15 service domains and 5 inbox kinds', () => {
    const b = citizenPortalBoard(1_700_000_000_000);
    expect(b.servicesByDomain).toHaveLength(15);
    expect(b.inbox).toHaveLength(5);
  });

  it('keeps every service success rate within [0,100]', () => {
    const b = citizenPortalBoard(1_700_000_000_000);
    for (const s of b.servicesByDomain) {
      expect(s.successPct).toBeGreaterThan(0);
      expect(s.successPct).toBeLessThanOrEqual(100);
    }
  });

  it('exposes the safeguards prohibited list verbatim', () => {
    const b = citizenPortalBoard(1_700_000_000_000);
    expect(b.prohibited).toBe(CITIZEN_PORTAL_SAFEGUARDS.prohibited);
  });

  it('encodes the constitutional invariants on the safeguards object', () => {
    expect(CITIZEN_PORTAL_SAFEGUARDS.citizenOwnedIdentity).toBe(true);
    expect(CITIZEN_PORTAL_SAFEGUARDS.consentBoundDataSharing).toBe(true);
    expect(CITIZEN_PORTAL_SAFEGUARDS.noServiceDenialFromScore).toBe(true);
    expect(CITIZEN_PORTAL_SAFEGUARDS.prohibited).toContain('state-scored-citizen-rating');
  });

  it('latency, uptime, and identity-verified fields stay in plausible ranges', () => {
    const b = citizenPortalBoard(1_700_000_000_000);
    expect(b.meanLatencyMs).toBeGreaterThan(0);
    expect(b.servicesUptimePct).toBeGreaterThan(95);
    expect(b.servicesUptimePct).toBeLessThanOrEqual(100);
    expect(b.identityVerifiedPct).toBeGreaterThanOrEqual(80);
    expect(b.identityVerifiedPct).toBeLessThanOrEqual(100);
  });
});

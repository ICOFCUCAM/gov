import { describe, it, expect } from 'vitest';
import { inbox, raiseReferral, advanceReferral, referralDigest, version, REFERRAL_FLOW } from './referral-store';

describe('referral-store', () => {
  it('seeds a deterministic inbox addressed to the ministry', () => {
    const a = inbox('LABOR', 1_000_000);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a.every(r => r.toKey === 'LABOR')).toBe(true);
    expect(a.every(r => REFERRAL_FLOW.includes(r.status))).toBe(true);
  });

  it('raises a referral into the addressee inbox and bumps version', () => {
    const v0 = version();
    raiseReferral('HEALTH', 'FINANCE', 'Reimbursement authorisation', 'Health liaison', 2_000_000);
    expect(version()).toBeGreaterThan(v0);
    const fin = inbox('FINANCE', 2_000_000);
    const mine = fin.find(r => r.by === 'Health liaison')!;
    expect(mine.fromKey).toBe('HEALTH');
    expect(mine.status).toBe('raised');
  });

  it('advances raised → accepted → actioned → closed and stops', () => {
    raiseReferral('HEALTH', 'JUSTICE', 'Determination', 'Officer', 3_000_000);
    const r = inbox('JUSTICE', 3_000_000).find(x => x.by === 'Officer')!;
    for (let i = 0; i < 6; i++) advanceReferral('JUSTICE', r.id, 3_000_000);
    expect(inbox('JUSTICE', 3_000_000).find(x => x.id === r.id)!.status).toBe('closed');
  });

  it('carries optional record provenance', () => {
    raiseReferral('HEALTH', 'EDUCATION', 'Records cross-check', 'Health liaison', 4_000_000, 'HSP-2-CLI-104');
    const r = inbox('EDUCATION', 4_000_000).find(x => x.by === 'Health liaison')!;
    expect(r.recordRef).toBe('HSP-2-CLI-104');
    raiseReferral('HEALTH', 'EDUCATION', 'No source', 'Health liaison', 4_100_000);
    expect(inbox('EDUCATION', 4_100_000).find(x => x.subject === 'No source')!.recordRef).toBeUndefined();
  });

  it('referralDigest does not reorder the underlying inboxes', () => {
    raiseReferral('HEALTH', 'LABOR', 'p1', 'L', 7_000_000);
    raiseReferral('HEALTH', 'LABOR', 'p2', 'L', 7_100_000);
    const before = inbox('LABOR', 7_100_000).map(r => r.id);
    referralDigest(['LABOR'], 7_100_000, 999);
    expect(inbox('LABOR', 7_100_000).map(r => r.id)).toEqual(before);
  });

  it('caps an inbox at 40 live referrals, keeping the newest', () => {
    for (let i = 0; i < 60; i++) raiseReferral('HEALTH', 'ENVIRONMENT', `r${i}`, 'L', 9_000_000 + i);
    const inb = inbox('ENVIRONMENT', 9_100_000);
    expect(inb.filter(r => !r.id.startsWith('seed-')).length).toBeLessThanOrEqual(40);
    expect(inb[inb.length - 1]!.subject).toBe('r59');
  });

  it('referralDigest merges inboxes newest-last within the limit', () => {
    raiseReferral('HEALTH', 'INTERIOR', 'A', 'L', 5_000_000);
    raiseReferral('FINANCE', 'INTERIOR', 'B', 'L', 5_100_000);
    const d = referralDigest(['INTERIOR', 'FINANCE'], 5_100_000, 5);
    expect(d.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < d.length; i++) expect(d[i]!.at).toBeGreaterThanOrEqual(d[i - 1]!.at);
  });
});

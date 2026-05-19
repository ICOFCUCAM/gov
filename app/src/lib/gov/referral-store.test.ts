import { describe, it, expect } from 'vitest';
import { inbox, raiseReferral, advanceReferral, version, REFERRAL_FLOW } from './referral-store';

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
});

import { describe, it, expect } from 'vitest';
import { citizenWallet, officerConsole } from './citizen-systems';

describe('citizen & officer systems', () => {
  it('citizen wallet deterministic & bounded', () => {
    expect(citizenWallet('C', 50)).toEqual(citizenWallet('C', 50));
    const w = citizenWallet('C', 50);
    expect(w.channels.length).toBe(5);
    expect(w.topServices.length).toBe(6);
    expect(w.identityVerifiedPct).toBeLessThanOrEqual(100);
    expect(w.channels.every(c => ['ok', 'warn', 'alert'].includes(c.tone))).toBe(true);
  });
  it('officer console deterministic & bounded', () => {
    expect(officerConsole('O', 50)).toEqual(officerConsole('O', 50));
    const o = officerConsole('O', 50);
    expect(o.byDesk.length).toBe(5);
    expect(o.slaMetPct).toBeLessThanOrEqual(100);
    expect(o.byDesk.every(d => ['ok', 'warn', 'alert'].includes(d.tone))).toBe(true);
  });
});

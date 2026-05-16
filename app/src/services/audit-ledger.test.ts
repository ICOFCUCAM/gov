import { describe, it, expect } from 'vitest';
import { appendAudit, auditTrail, verifyChain, auditStats } from './audit-ledger';

describe('sovereign audit ledger', () => {
  it('hash-chains entries per scope and verifies intact', () => {
    appendAudit('app:health', 'K. Otieno (commander)', 'advance', 'EN-1001', 'Intake → Triage');
    appendAudit('app:health', 'K. Otieno (commander)', 'approve', 'EN-1001', 'Treatment disposed');
    const t = auditTrail('app:health');
    expect(t.length).toBe(2);
    expect(t[0]!.seq).toBe(2); // newest first
    const v = verifyChain('app:health');
    expect(v.intact).toBe(true);
    expect(v.brokenAt).toBeNull();
    expect(v.entries).toBe(2);
  });

  it('chains are isolated per scope', () => {
    appendAudit('app:judiciary', 'Registrar (officer)', 'advance', 'JU-2400', 'Filed → Pre-trial');
    expect(verifyChain('app:judiciary').entries).toBe(1);
    expect(verifyChain('app:health').entries).toBe(2);
  });

  it('aggregate stats reflect scopes & integrity', () => {
    const s = auditStats();
    expect(s.scopes).toBeGreaterThanOrEqual(2);
    expect(s.entries).toBeGreaterThanOrEqual(3);
    expect(s.intact).toBe(true);
  });
});

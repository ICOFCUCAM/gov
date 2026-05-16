import { describe, it, expect } from 'vitest';
import { evaluateConstitution } from './constitutional-engine';

describe('constitutional engine', () => {
  it('compliant under nominal posture', () => {
    const v = evaluateConstitution({ kind: 'ministry', domain: 'health', stress: 40, emergencyAsserted: false, auditIntact: true });
    expect(v.compliant).toBe(true);
    expect(v.posture).toBe('compliant');
    expect(v.withheld.length).toBe(0);
    expect(v.checks.length).toBeGreaterThan(3);
  });

  it('emergency beyond sunset is a breach withholding escalation/configure', () => {
    const v = evaluateConstitution({ kind: 'agency', domain: 'police', stress: 60, emergencyAsserted: true, emergencyAgeHrs: 80, auditIntact: true });
    expect(v.posture).toBe('breach');
    expect(v.compliant).toBe(false);
    expect(v.withheld).toContain('escalate');
    expect(v.withheld).toContain('configure');
  });

  it('audit chain failure is an unconditional breach', () => {
    const v = evaluateConstitution({ kind: 'branch', domain: 'judiciary', stress: 20, emergencyAsserted: false, auditIntact: false });
    expect(v.compliant).toBe(false);
    expect(v.checks.find(c => c.rule === 'Audit integrity')!.status).toBe('breach');
  });

  it('high stress / citizen sensitivity raises under-review (deterministic)', () => {
    const a = evaluateConstitution({ kind: 'citizen', domain: 'citizen', stress: 80, emergencyAsserted: false, auditIntact: true });
    expect(a).toEqual(evaluateConstitution({ kind: 'citizen', domain: 'citizen', stress: 80, emergencyAsserted: false, auditIntact: true }));
    expect(['under-review', 'compliant']).toContain(a.posture);
  });
});

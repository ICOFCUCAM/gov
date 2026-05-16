import { describe, it, expect } from 'vitest';
import {
  branchesFor, branchFor, legislativePipeline, judicialDocket,
  separationIntegrity, branchReadiness, chambersFor, courtHierarchyFor,
  BILL_STAGES, CASE_STAGES,
} from './branches';

describe('constitutional process engines', () => {
  it('branches resolve from the configured form', () => {
    expect(branchesFor('republic').some(b => b.key === 'legislature')).toBe(true);
    expect(branchFor('republic', 'judiciary').name).toBe('Judiciary');
    expect(branchFor('monarchy', 'crown').name).toMatch(/Crown/);
  });

  it('chambers reflect the form (city-state is unicameral)', () => {
    expect(chambersFor('city-state', 100).length).toBe(1);
    expect(chambersFor('federation', 100).length).toBe(2);
    for (const c of chambersFor('republic', 50)) expect(c.quorum).toBeLessThanOrEqual(c.seats);
  });

  it('court hierarchy reflects the form', () => {
    const fed = courtHierarchyFor('federation', 60).map(c => c.name);
    expect(fed[0]).toMatch(/Federal Constitutional Court/);
    for (const c of courtHierarchyFor('republic', 60)) {
      expect(c.clearance).toBeGreaterThan(0);
      expect(c.clearance).toBeLessThanOrEqual(100);
    }
  });

  it('legislative pipeline & judicial docket cover every stage', () => {
    expect(legislativePipeline(120).map(s => s.stage)).toEqual([...BILL_STAGES]);
    expect(judicialDocket(60).map(s => s.stage)).toEqual([...CASE_STAGES]);
  });

  it('branch readiness is deterministic and bounded', () => {
    const a = branchReadiness('judiciary', 100);
    const b = branchReadiness('judiciary', 100);
    expect(a).toEqual(b);
    expect(a.total).toBeGreaterThanOrEqual(0);
    expect(a.total).toBeLessThanOrEqual(100);
  });

  it('separation checks are deterministic and complete', () => {
    const s = separationIntegrity(100);
    expect(s.checks.length).toBe(6);
    expect(typeof s.intact).toBe('boolean');
  });
});

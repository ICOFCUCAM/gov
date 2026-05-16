import { describe, it, expect } from 'vitest';
import {
  BRANCHES, branchFor, legislativePipeline, judicialDocket, separationIntegrity, BILL_STAGES, CASE_STAGES,
} from './branches';

describe('branches of government', () => {
  it('models four branches each with bodies', () => {
    expect(BRANCHES.map(b => b.key)).toEqual(['legislature', 'judiciary', 'executive', 'oversight']);
    for (const b of BRANCHES) expect(b.bodies.length).toBeGreaterThanOrEqual(4);
  });

  it('branchFor resolves and falls back to executive', () => {
    expect(branchFor('judiciary').name).toBe('Judiciary');
    // @ts-expect-error unknown key
    expect(branchFor('nope').key).toBe('executive');
  });

  it('legislative pipeline covers every stage with non-negative counts', () => {
    const p = legislativePipeline(120);
    expect(p.map(s => s.stage)).toEqual([...BILL_STAGES]);
    for (const s of p) { expect(s.count).toBeGreaterThanOrEqual(0); expect(s.blocked).toBeGreaterThanOrEqual(0); }
  });

  it('judicial docket covers every stage', () => {
    const d = judicialDocket(60);
    expect(d.map(s => s.stage)).toEqual([...CASE_STAGES]);
    for (const s of d) expect(s.count).toBeGreaterThan(0);
  });

  it('separation-of-powers checks are deterministic and structurally complete', () => {
    const a = separationIntegrity(100);
    const b = separationIntegrity(100);
    expect(a).toEqual(b);
    expect(a.checks.length).toBe(6);
    expect(typeof a.intact).toBe('boolean');
  });
});

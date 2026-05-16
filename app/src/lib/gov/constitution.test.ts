import { describe, it, expect } from 'vitest';
import { constitutionFor, branchDef } from './constitution';
import type { StateForm } from '@/lib/api/types';

const FORMS: StateForm[] = ['republic', 'parliamentary', 'monarchy', 'federation', 'city-state', 'union'];

describe('constitution engine', () => {
  it('resolves a distinct, coherent topology for every sovereign form', () => {
    for (const f of FORMS) {
      const m = constitutionFor(f);
      expect(m.form).toBe(f === 'republic' ? 'republic' : f);
      expect(m.branches.length).toBeGreaterThanOrEqual(4);
      expect(m.branches.some(b => b.key === 'judiciary')).toBe(true);
      expect(m.branches.some(b => b.key === 'executive')).toBe(true);
      expect(m.authorityChain.length).toBeGreaterThanOrEqual(3);
      expect(m.judicialTiers.length).toBeGreaterThanOrEqual(3);
      expect(m.judicialTiers).toContain(m.judicialApex);
    }
  });

  it('does not hardcode parliament/senate — structure varies by form', () => {
    expect(constitutionFor('city-state').legislature.structure).toBe('unicameral');
    expect(constitutionFor('federation').legislature.structure).toBe('bicameral');
    expect(constitutionFor('monarchy').branches.some(b => b.key === 'crown')).toBe(true);
    expect(constitutionFor('federation').branches.some(b => b.key === 'federal-council')).toBe(true);
    expect(constitutionFor('parliamentary').executiveType).toMatch(/Prime Minister/);
    expect(constitutionFor('republic').executiveType).toMatch(/President/);
  });

  it('branchDef resolves a body set per form', () => {
    expect(branchDef('monarchy', 'crown')?.bodies.length).toBeGreaterThan(0);
    expect(branchDef('republic', 'nope')).toBeUndefined();
  });
});

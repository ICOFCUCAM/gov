import { describe, it, expect } from 'vitest';
import { SAFEGUARD_REGISTRY, allProhibitedTerms } from './sovereign-safeguards';

describe('sovereign safeguards registry', () => {
  it('declares six structural safeguard families, none allowing per-citizen data', () => {
    expect(SAFEGUARD_REGISTRY.length).toBe(6);
    for (const s of SAFEGUARD_REGISTRY) {
      expect(s.perCitizenData).toBe(false);
      expect(s.scope.length).toBeGreaterThan(0);
      expect(s.prohibited.length).toBeGreaterThan(0);
    }
  });

  it('the union of distinct prohibitions is rich, and no single set monopolizes', () => {
    const all = allProhibitedTerms();
    const distinct = new Set(all);
    expect(all.length).toBeGreaterThanOrEqual(30);
    expect(distinct.size).toBeGreaterThanOrEqual(25);
    for (const s of SAFEGUARD_REGISTRY) {
      expect(s.prohibited.length).toBeLessThanOrEqual(12);
    }
  });

  it('every prohibited term is a kebab-case structural identifier', () => {
    for (const t of allProhibitedTerms()) {
      expect(t).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(t.length).toBeGreaterThan(6);
    }
  });
});

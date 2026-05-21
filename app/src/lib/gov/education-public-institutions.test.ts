import { describe, it, expect } from 'vitest';
import {
  educationPublicInstitutions,
  totalEducationPublicSites,
  type EducationBranchTier,
} from './education-public-institutions';

describe('educationPublicInstitutions', () => {
  it('returns the documented branch set', () => {
    expect(educationPublicInstitutions()).toHaveLength(11);
  });

  it('every branch declares a positive publicSites count and a glyph', () => {
    for (const b of educationPublicInstitutions()) {
      expect(b.publicSites).toBeGreaterThan(0);
      expect(b.glyph.length).toBeGreaterThan(0);
    }
  });

  it('every tier is one of the documented categories', () => {
    const tiers: EducationBranchTier[] = ['Tertiary', 'Secondary', 'Primary', 'Specialist', 'Research', 'Civic', 'Futurist'];
    for (const b of educationPublicInstitutions()) {
      expect(tiers).toContain(b.tier);
    }
  });

  it('every branch has at least one flagship example', () => {
    for (const b of educationPublicInstitutions()) {
      expect(b.flagshipExamples.length).toBeGreaterThan(0);
    }
  });

  it('every href points under the /education subtree', () => {
    for (const b of educationPublicInstitutions()) {
      expect(b.href.startsWith('/education')).toBe(true);
    }
  });
});

describe('totalEducationPublicSites', () => {
  it('equals the sum of every branch publicSites', () => {
    const sum = educationPublicInstitutions().reduce((s, b) => s + b.publicSites, 0);
    expect(totalEducationPublicSites()).toBe(sum);
  });

  it('is a positive total', () => {
    expect(totalEducationPublicSites()).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { TREASURY_GROUPS, TREASURY_DOMAINS, treasuryByPillar, domainBySurface } from './domains';

describe('TREASURY_GROUPS / TREASURY_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(TREASURY_GROUPS.map(g => g.key));
    for (const d of TREASURY_DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = TREASURY_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('treasuryByPillar', () => {
  it('partitions domains by their pillar group', () => {
    const groups = treasuryByPillar();
    expect(groups).toHaveLength(TREASURY_GROUPS.length);
    const total = groups.reduce((s, g) => s + g.domains.length, 0);
    expect(total).toBe(TREASURY_DOMAINS.length);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = TREASURY_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

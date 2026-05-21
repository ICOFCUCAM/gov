import { describe, it, expect } from 'vitest';
import { HEALTH_GROUPS, HEALTH_DOMAINS, domainBySurface } from './domains';

describe('HEALTH_GROUPS / HEALTH_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(HEALTH_GROUPS.map(g => g.key));
    for (const d of HEALTH_DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = HEALTH_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = HEALTH_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });

  it('returns undefined for unknown surfaces', () => {
    expect(domainBySurface('nope' as never)).toBeUndefined();
  });
});

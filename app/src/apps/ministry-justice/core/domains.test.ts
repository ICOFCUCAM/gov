import { describe, it, expect } from 'vitest';
import { JUSTICE_GROUPS, JUSTICE_DOMAINS, domainBySurface } from './domains';

describe('JUSTICE_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(JUSTICE_GROUPS.map(g => g.key));
    for (const d of JUSTICE_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });

  it('surface ids are unique', () => {
    const ids = JUSTICE_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = JUSTICE_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });

  it('returns undefined for unknown surfaces', () => {
    expect(domainBySurface('nope' as never)).toBeUndefined();
  });
});

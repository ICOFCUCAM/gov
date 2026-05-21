import { describe, it, expect } from 'vitest';
import {
  FOREIGN_GROUPS, FOREIGN_DOMAINS, FOREIGN_LEGACY_KEYS,
  domainBySurface, resolveForeignSurface,
} from './domains';

describe('FOREIGN_GROUPS / FOREIGN_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(FOREIGN_GROUPS.map(g => g.key));
    for (const d of FOREIGN_DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = FOREIGN_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveForeignSurface', () => {
  it('returns the input when it is a valid surface', () => {
    const surface = FOREIGN_DOMAINS[0]!.surface;
    expect(resolveForeignSurface(surface)).toBe(surface);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(FOREIGN_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveForeignSurface(legacy)).toBe(FOREIGN_LEGACY_KEYS[legacy]);
  });

  it('returns the same fallback for null/undefined and unknown keys', () => {
    const fallback = resolveForeignSurface(null);
    expect(resolveForeignSurface(undefined)).toBe(fallback);
    expect(resolveForeignSurface('totally-bogus-key')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = FOREIGN_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

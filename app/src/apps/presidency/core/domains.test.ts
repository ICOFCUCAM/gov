import { describe, it, expect } from 'vitest';
import {
  PRESIDENCY_GROUPS, PRESIDENCY_DOMAINS, PRESIDENCY_LEGACY_KEYS,
  domainBySurface, resolvePresidencySurface, presidencyNav,
} from './domains';

describe('PRESIDENCY_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(PRESIDENCY_GROUPS.map(g => g.key));
    for (const d of PRESIDENCY_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });

  it('surface ids are unique', () => {
    const ids = PRESIDENCY_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolvePresidencySurface', () => {
  it('returns the input when it is a valid surface', () => {
    const s = PRESIDENCY_DOMAINS[0]!.surface;
    expect(resolvePresidencySurface(s)).toBe(s);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(PRESIDENCY_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolvePresidencySurface(legacy)).toBe(PRESIDENCY_LEGACY_KEYS[legacy]);
  });

  it('falls back deterministically for null/unknown', () => {
    const fallback = resolvePresidencySurface(null);
    expect(resolvePresidencySurface('totally-bogus')).toBe(fallback);
  });
});

describe('presidencyNav / domainBySurface', () => {
  it('presidencyNav returns a non-empty list', () => {
    expect(presidencyNav().length).toBeGreaterThan(0);
  });

  it('domainBySurface returns the matching domain', () => {
    const d = PRESIDENCY_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

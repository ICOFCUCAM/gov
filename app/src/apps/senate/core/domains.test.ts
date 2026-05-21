import { describe, it, expect } from 'vitest';
import {
  SENATE_GROUPS, SENATE_DOMAINS, SENATE_LEGACY_KEYS,
  domainBySurface, resolveSenateSurface, senateNav,
} from './domains';

describe('SENATE_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(SENATE_GROUPS.map(g => g.key));
    for (const d of SENATE_DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = SENATE_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveSenateSurface', () => {
  it('returns the input when it is a valid surface', () => {
    const s = SENATE_DOMAINS[0]!.surface;
    expect(resolveSenateSurface(s)).toBe(s);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(SENATE_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveSenateSurface(legacy)).toBe(SENATE_LEGACY_KEYS[legacy]);
  });

  it('falls back deterministically for null/unknown', () => {
    const fallback = resolveSenateSurface(null);
    expect(resolveSenateSurface('definitely-bogus')).toBe(fallback);
  });
});

describe('senateNav', () => {
  it('returns a non-empty list of { key, label } pairs', () => {
    const nav = senateNav();
    expect(nav.length).toBeGreaterThan(0);
    expect(nav.every(n => typeof n.key === 'string' && typeof n.label === 'string')).toBe(true);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = SENATE_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

import { describe, it, expect } from 'vitest';
import {
  PORTAL_GROUPS, PORTAL_DOMAINS, PORTAL_LEGACY_KEYS,
  domainBySurface, resolvePortalSurface, portalNav,
} from './domains';

describe('PORTAL_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(PORTAL_GROUPS.map(g => g.key));
    for (const d of PORTAL_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });

  it('surface ids are unique', () => {
    const ids = PORTAL_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolvePortalSurface', () => {
  it('returns the input when it is a valid surface', () => {
    const s = PORTAL_DOMAINS[0]!.surface;
    expect(resolvePortalSurface(s)).toBe(s);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(PORTAL_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolvePortalSurface(legacy)).toBe(PORTAL_LEGACY_KEYS[legacy]);
  });

  it('falls back deterministically for null/unknown', () => {
    const fallback = resolvePortalSurface(null);
    expect(resolvePortalSurface('definitely-bogus')).toBe(fallback);
  });
});

describe('portalNav / domainBySurface', () => {
  it('portalNav returns a non-empty list', () => {
    expect(portalNav().length).toBeGreaterThan(0);
  });

  it('domainBySurface returns the matching domain', () => {
    const d = PORTAL_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

import { describe, it, expect } from 'vitest';
import {
  TRANSPORT_GROUPS, TRANSPORT_DOMAINS, TRANSPORT_LEGACY_KEYS,
  domainBySurface, resolveTransportSurface,
} from './domains';

describe('TRANSPORT_GROUPS / TRANSPORT_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(TRANSPORT_GROUPS.map(g => g.key));
    for (const d of TRANSPORT_DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = TRANSPORT_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveTransportSurface', () => {
  it('returns the input when it is a valid surface', () => {
    const surface = TRANSPORT_DOMAINS[0]!.surface;
    expect(resolveTransportSurface(surface)).toBe(surface);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(TRANSPORT_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveTransportSurface(legacy)).toBe(TRANSPORT_LEGACY_KEYS[legacy]);
  });

  it('falls back for null/undefined and unknown keys', () => {
    const fallback = resolveTransportSurface(null);
    expect(resolveTransportSurface(undefined)).toBe(fallback);
    expect(resolveTransportSurface('definitely-not-a-surface')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = TRANSPORT_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

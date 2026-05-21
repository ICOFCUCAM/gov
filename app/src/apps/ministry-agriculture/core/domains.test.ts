import { describe, it, expect } from 'vitest';
import {
  AGRICULTURE_GROUPS, AGRICULTURE_DOMAINS, AGRICULTURE_LEGACY_KEYS,
  domainBySurface, resolveAgricultureSurface,
} from './domains';

describe('AGRICULTURE_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(AGRICULTURE_GROUPS.map(g => g.key));
    for (const d of AGRICULTURE_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });
  it('surface ids are unique', () => {
    const ids = AGRICULTURE_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveAgricultureSurface', () => {
  it('passes through valid surfaces', () => {
    const s = AGRICULTURE_DOMAINS[0]!.surface;
    expect(resolveAgricultureSurface(s)).toBe(s);
  });
  it('migrates legacy keys', () => {
    const legacy = Object.keys(AGRICULTURE_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveAgricultureSurface(legacy)).toBe(AGRICULTURE_LEGACY_KEYS[legacy]);
  });
  it('falls back deterministically', () => {
    const fallback = resolveAgricultureSurface(null);
    expect(resolveAgricultureSurface('totally-bogus')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = AGRICULTURE_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

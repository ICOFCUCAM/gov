import { describe, it, expect } from 'vitest';
import {
  NOC_GROUPS, NOC_DOMAINS, NOC_LEGACY_KEYS,
  domainBySurface, resolveNocSurface,
} from './domains';

describe('NOC_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(NOC_GROUPS.map(g => g.key));
    for (const d of NOC_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });
  it('surface ids are unique', () => {
    const ids = NOC_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveNocSurface', () => {
  it('passes through valid surfaces', () => {
    const s = NOC_DOMAINS[0]!.surface;
    expect(resolveNocSurface(s)).toBe(s);
  });
  it('migrates legacy keys', () => {
    const legacy = Object.keys(NOC_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveNocSurface(legacy)).toBe(NOC_LEGACY_KEYS[legacy]);
  });
  it('falls back deterministically', () => {
    const fallback = resolveNocSurface(null);
    expect(resolveNocSurface('totally-bogus')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = NOC_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

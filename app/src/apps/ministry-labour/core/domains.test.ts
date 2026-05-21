import { describe, it, expect } from 'vitest';
import {
  LABOUR_GROUPS, LABOUR_DOMAINS, LABOUR_LEGACY_KEYS,
  domainBySurface, resolveLabourSurface,
} from './domains';

describe('LABOUR_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(LABOUR_GROUPS.map(g => g.key));
    for (const d of LABOUR_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });
  it('surface ids are unique', () => {
    const ids = LABOUR_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveLabourSurface', () => {
  it('passes through valid surfaces', () => {
    const s = LABOUR_DOMAINS[0]!.surface;
    expect(resolveLabourSurface(s)).toBe(s);
  });
  it('migrates legacy keys', () => {
    const legacy = Object.keys(LABOUR_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveLabourSurface(legacy)).toBe(LABOUR_LEGACY_KEYS[legacy]);
  });
  it('falls back deterministically', () => {
    const fallback = resolveLabourSurface(null);
    expect(resolveLabourSurface('totally-bogus')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = LABOUR_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

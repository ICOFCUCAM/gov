import { describe, it, expect } from 'vitest';
import {
  ASSEMBLY_GROUPS, ASSEMBLY_DOMAINS, ASSEMBLY_LEGACY_KEYS,
  domainBySurface, resolveAssemblySurface,
} from './domains';

describe('ASSEMBLY_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(ASSEMBLY_GROUPS.map(g => g.key));
    for (const d of ASSEMBLY_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });
  it('surface ids are unique', () => {
    const ids = ASSEMBLY_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveAssemblySurface', () => {
  it('passes through valid surfaces', () => {
    const s = ASSEMBLY_DOMAINS[0]!.surface;
    expect(resolveAssemblySurface(s)).toBe(s);
  });
  it('migrates legacy keys', () => {
    const legacy = Object.keys(ASSEMBLY_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveAssemblySurface(legacy)).toBe(ASSEMBLY_LEGACY_KEYS[legacy]);
  });
  it('falls back deterministically', () => {
    const fallback = resolveAssemblySurface(null);
    expect(resolveAssemblySurface('totally-bogus')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = ASSEMBLY_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

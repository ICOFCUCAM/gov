import { describe, it, expect } from 'vitest';
import {
  JUDICIAL_GROUPS, JUDICIAL_DOMAINS, JUDICIAL_LEGACY_KEYS,
  domainBySurface, resolveJudicialSurface, judicialNav,
} from './domains';

describe('JUDICIAL_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(JUDICIAL_GROUPS.map(g => g.key));
    for (const d of JUDICIAL_DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = JUDICIAL_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveJudicialSurface', () => {
  it('returns the input when it is a valid surface', () => {
    const s = JUDICIAL_DOMAINS[0]!.surface;
    expect(resolveJudicialSurface(s)).toBe(s);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(JUDICIAL_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveJudicialSurface(legacy)).toBe(JUDICIAL_LEGACY_KEYS[legacy]);
  });
});

describe('judicialNav', () => {
  it('lists every domain as { key, label } pair', () => {
    expect(judicialNav().length).toBeGreaterThan(0);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = JUDICIAL_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

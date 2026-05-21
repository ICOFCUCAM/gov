import { describe, it, expect } from 'vitest';
import {
  ENERGY_GROUPS, ENERGY_DOMAINS, ENERGY_LEGACY_KEYS,
  domainBySurface, resolveEnergySurface,
} from './domains';

describe('ENERGY_GROUPS / ENERGY_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(ENERGY_GROUPS.map(g => g.key));
    for (const d of ENERGY_DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = ENERGY_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = ENERGY_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });

  it('returns undefined for unknown surfaces', () => {
    expect(domainBySurface('totally-unknown' as never)).toBeUndefined();
  });
});

describe('resolveEnergySurface', () => {
  it('returns the input when it is a valid surface', () => {
    const surface = ENERGY_DOMAINS[1]!.surface;
    expect(resolveEnergySurface(surface)).toBe(surface);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(ENERGY_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveEnergySurface(legacy)).toBe(ENERGY_LEGACY_KEYS[legacy]);
  });

  it('falls back for null/unknown', () => {
    const fallback = resolveEnergySurface(null);
    expect(typeof fallback).toBe('string');
    expect(resolveEnergySurface('definitely-bogus')).toBe(fallback);
  });
});

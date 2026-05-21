import { describe, it, expect } from 'vitest';
import {
  EMERGENCY_GROUPS, EMERGENCY_DOMAINS, EMERGENCY_LEGACY_KEYS,
  domainBySurface, resolveEmergencySurface,
} from './domains';

describe('EMERGENCY_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(EMERGENCY_GROUPS.map(g => g.key));
    for (const d of EMERGENCY_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });
  it('surface ids are unique', () => {
    const ids = EMERGENCY_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveEmergencySurface', () => {
  it('passes through valid surfaces', () => {
    const s = EMERGENCY_DOMAINS[0]!.surface;
    expect(resolveEmergencySurface(s)).toBe(s);
  });
  it('migrates legacy keys', () => {
    const legacy = Object.keys(EMERGENCY_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveEmergencySurface(legacy)).toBe(EMERGENCY_LEGACY_KEYS[legacy]);
  });
  it('falls back deterministically', () => {
    const fallback = resolveEmergencySurface(null);
    expect(resolveEmergencySurface('totally-bogus')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = EMERGENCY_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

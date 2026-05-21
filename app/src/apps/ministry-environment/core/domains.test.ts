import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENT_GROUPS, ENVIRONMENT_DOMAINS, ENVIRONMENT_LEGACY_KEYS,
  domainBySurface, resolveEnvironmentSurface,
} from './domains';

describe('ENVIRONMENT_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(ENVIRONMENT_GROUPS.map(g => g.key));
    for (const d of ENVIRONMENT_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });
  it('surface ids are unique', () => {
    const ids = ENVIRONMENT_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveEnvironmentSurface', () => {
  it('passes through valid surfaces', () => {
    const s = ENVIRONMENT_DOMAINS[0]!.surface;
    expect(resolveEnvironmentSurface(s)).toBe(s);
  });
  it('migrates legacy keys', () => {
    const legacy = Object.keys(ENVIRONMENT_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveEnvironmentSurface(legacy)).toBe(ENVIRONMENT_LEGACY_KEYS[legacy]);
  });
  it('falls back deterministically for null/unknown', () => {
    const fallback = resolveEnvironmentSurface(null);
    expect(resolveEnvironmentSurface('totally-bogus')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = ENVIRONMENT_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

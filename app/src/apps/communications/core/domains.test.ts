import { describe, it, expect } from 'vitest';
import {
  COMMS_GROUPS, COMMS_DOMAINS, COMMS_LEGACY_KEYS,
  domainBySurface, resolveCommsSurface,
} from './domains';

describe('COMMS_GROUPS / COMMS_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(COMMS_GROUPS.map(g => g.key));
    for (const d of COMMS_DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = COMMS_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveCommsSurface', () => {
  it('returns the input when it is a valid surface', () => {
    const s = COMMS_DOMAINS[0]!.surface;
    expect(resolveCommsSurface(s)).toBe(s);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(COMMS_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveCommsSurface(legacy)).toBe(COMMS_LEGACY_KEYS[legacy]);
  });

  it('falls back deterministically for null/undefined/unknown', () => {
    const fallback = resolveCommsSurface(null);
    expect(resolveCommsSurface(undefined)).toBe(fallback);
    expect(resolveCommsSurface('totally-bogus')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = COMMS_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});

import { describe, it, expect } from 'vitest';
import {
  POLICE_GROUPS, POLICE_DOMAINS, POLICE_LEGACY_KEYS, POLICE_DEFAULT_DOMAIN,
  resolvePoliceDomain, policeNav, policeNavGroups,
} from './domains';

describe('POLICE_GROUPS / POLICE_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(POLICE_GROUPS.map(g => g.key));
    for (const d of POLICE_DOMAINS) {
      expect(groupKeys.has(d.group), `domain ${d.key}`).toBe(true);
    }
  });

  it('domain keys are unique', () => {
    const keys = POLICE_DOMAINS.map(d => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every legacy mapping points to a current domain key', () => {
    const keys = new Set(POLICE_DOMAINS.map(d => d.key));
    for (const v of Object.values(POLICE_LEGACY_KEYS)) {
      expect(keys.has(v as never)).toBe(true);
    }
  });
});

describe('resolvePoliceDomain', () => {
  it('returns the default when key is null/undefined', () => {
    expect(resolvePoliceDomain(null).key).toBe(POLICE_DEFAULT_DOMAIN);
    expect(resolvePoliceDomain(undefined).key).toBe(POLICE_DEFAULT_DOMAIN);
  });

  it('returns the matching domain by key', () => {
    const k = POLICE_DOMAINS[1]!.key;
    expect(resolvePoliceDomain(k).key).toBe(k);
  });

  it('migrates legacy keys to their current counterpart', () => {
    const legacy = Object.keys(POLICE_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolvePoliceDomain(legacy).key).toBe(POLICE_LEGACY_KEYS[legacy]);
  });

  it('falls back to the default for unknown keys', () => {
    expect(resolvePoliceDomain('definitely-not-a-domain').key).toBe(POLICE_DEFAULT_DOMAIN);
  });
});

describe('policeNav / policeNavGroups', () => {
  it('policeNav exposes every domain', () => {
    expect(policeNav()).toHaveLength(POLICE_DOMAINS.length);
  });

  it('policeNavGroups partitions domains by their group', () => {
    const groups = policeNavGroups();
    expect(groups).toHaveLength(POLICE_GROUPS.length);
    const total = groups.reduce((s, g) => s + g.domains.length, 0);
    expect(total).toBe(POLICE_DOMAINS.length);
  });
});

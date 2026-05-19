import { describe, it, expect } from 'vitest';
import { DOMAINS, GROUPS, interiorNav, interiorNavGroups, resolveDomain, LEGACY_KEYS } from './domains';

describe('Interior domain registry invariants', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(GROUPS.map(g => g.key));
    for (const d of DOMAINS) {
      expect(groupKeys.has(d.group)).toBe(true);
    }
  });

  it('every domain has a unique key and a real surface id', () => {
    const keys = DOMAINS.map(d => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of DOMAINS) {
      expect(d.surface.length).toBeGreaterThan(0);
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.identity.length).toBeGreaterThan(0);
    }
  });

  it('apex domain (civilization-organism) lives in the National group', () => {
    const apex = DOMAINS.find(d => d.key === 'civilization-organism');
    expect(apex).toBeTruthy();
    expect(apex!.group).toBe('national');
  });

  it('legacy keys resolve to real domains', () => {
    for (const [oldKey] of Object.entries(LEGACY_KEYS)) {
      const r = resolveDomain(oldKey);
      expect(r.key.length).toBeGreaterThan(0);
    }
    expect(resolveDomain('unknown-key-xyz').key).toBe(DOMAINS[0]!.key);
  });

  it('every group contains at least one domain', () => {
    const grouped = interiorNavGroups();
    for (const { group, domains } of grouped) {
      expect(domains.length).toBeGreaterThan(0);
      expect(group.label.length).toBeGreaterThan(0);
    }
  });
});

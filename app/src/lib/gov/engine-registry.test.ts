import { describe, it, expect } from 'vitest';
import { ENGINE_REGISTRY, enginesByLayer } from './engine-registry';
import { SAFEGUARD_REGISTRY } from './sovereign-safeguards';

describe('engine registry invariants', () => {
  it('every safeguard family in SAFEGUARD_REGISTRY is claimed by an engine', () => {
    const claimed = new Set(ENGINE_REGISTRY.map(e => e.safeguardFamily).filter(Boolean));
    for (const s of SAFEGUARD_REGISTRY) {
      expect(claimed.has(s.key)).toBe(true);
    }
  });

  it('every engine has a unique key and a known layer', () => {
    const keys = ENGINE_REGISTRY.map(e => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const e of ENGINE_REGISTRY) {
      expect(['primary', 'continuity', 'apex', 'meta']).toContain(e.layer);
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.module.length).toBeGreaterThan(0);
    }
  });

  it('enginesByLayer partitions cleanly', () => {
    const sum = (['primary', 'continuity', 'apex', 'meta'] as const)
      .reduce((s, k) => s + enginesByLayer(k).length, 0);
    expect(sum).toBe(ENGINE_REGISTRY.length);
  });
});

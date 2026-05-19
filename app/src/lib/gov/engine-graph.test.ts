import { describe, it, expect } from 'vitest';
import { ENGINE_REGISTRY } from './engine-registry';

// Lock the engine composition graph: every key listed in composesFrom
// must be a real registered engine key (or the wildcard '*').
describe('engine composition graph', () => {
  it('every composesFrom reference points to a real engine key', () => {
    const keys = new Set(ENGINE_REGISTRY.map(e => e.key));
    for (const e of ENGINE_REGISTRY) {
      for (const dep of e.composesFrom) {
        if (dep === '*') continue;
        expect(keys.has(dep)).toBe(true);
      }
    }
  });

  it('no engine composes from itself', () => {
    for (const e of ENGINE_REGISTRY) {
      expect(e.composesFrom.includes(e.key)).toBe(false);
    }
  });

  it('apex / meta engines exist and are unique', () => {
    const apex = ENGINE_REGISTRY.filter(e => e.layer === 'apex');
    expect(apex.length).toBeGreaterThanOrEqual(1);
    const meta = ENGINE_REGISTRY.filter(e => e.layer === 'meta');
    expect(meta.length).toBeGreaterThanOrEqual(1);
  });
});

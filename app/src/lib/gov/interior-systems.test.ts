import { describe, it, expect } from 'vitest';
import { interiorOps, interiorInstability } from './interior-systems';

describe('interior systems engine', () => {
  it('deterministic & bounded', () => {
    expect(interiorOps('I', 50)).toEqual(interiorOps('I', 50));
    const o = interiorOps('I', 50);
    expect(o.border.open).toBeLessThanOrEqual(o.border.posts);
    expect(o.identity.uptimePct).toBeLessThanOrEqual(100);
    expect(['low', 'guarded', 'elevated', 'high']).toContain(o.internalThreatLevel);
    for (const t of [10, 90, 280]) {
      const v = interiorInstability('I', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { continuityMatrix } from './continuity-matrix';

describe('continuity matrix', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(continuityMatrix(4000 * 280)))
      .toEqual(JSON.stringify(continuityMatrix(4000 * 280 + 900)));
  });

  it('collects 10 layer modes + the organism master mode', () => {
    const m = continuityMatrix(4000 * 333);
    expect(m.layers.length).toBe(10);
    for (const row of m.layers) {
      expect(row.layer.length).toBeGreaterThan(0);
      expect(row.mode.length).toBeGreaterThan(0);
    }
    expect(m.organismMode.length).toBeGreaterThan(0);
  });
});

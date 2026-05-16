import { describe, it, expect } from 'vitest';
import { nationalAssets, nationalNetworks, networkPressure, ASSET_GLYPH } from './infrastructure';

describe('national infrastructure topology', () => {
  it('produces a dense deterministic asset set within map bounds', () => {
    const a = nationalAssets();
    expect(a.length).toBeGreaterThan(100);
    expect(a).toEqual(nationalAssets());
    for (const x of a) {
      expect(x.x).toBeGreaterThanOrEqual(20);
      expect(x.x).toBeLessThanOrEqual(980);
      expect(x.y).toBeGreaterThanOrEqual(20);
      expect(x.y).toBeLessThanOrEqual(600);
      expect([1, 2, 3]).toContain(x.tier);
      expect(ASSET_GLYPH[x.kind]).toBeTruthy();
    }
  });

  it('builds linear networks for every kind', () => {
    const n = nationalNetworks();
    const kinds = new Set(n.map(s => s.kind));
    for (const k of ['road', 'rail', 'grid', 'telecom', 'water', 'pipeline']) expect(kinds.has(k as never)).toBe(true);
    for (const s of n) expect(s.d.startsWith('M')).toBe(true);
  });

  it('network pressure is bounded and deterministic', () => {
    expect(networkPressure('grid', 100)).toBe(networkPressure('grid', 100));
    const v = networkPressure('rail', 250);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
});

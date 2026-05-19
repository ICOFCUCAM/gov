import { describe, it, expect } from 'vitest';
import { organismTrend } from './organism-trend';

describe('organism trend / look-back', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(organismTrend(4000 * 300)))
      .toEqual(JSON.stringify(organismTrend(4000 * 300 + 950)));
  });

  it('returns aligned epoch + health arrays with a bounded slope', () => {
    const t = organismTrend(4000 * 200);
    expect(t.epochs.length).toBe(t.health.length);
    expect(t.epochs.length).toBeGreaterThan(0);
    for (const h of t.health) {
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(100);
    }
    expect(['improving', 'steady', 'degrading']).toContain(t.direction);
  });

  it('lookback parameter controls window size', () => {
    expect(organismTrend(4000 * 100, 3).epochs.length).toBe(4); // 3 lookback + now
    expect(organismTrend(4000 * 100, 6).epochs.length).toBe(7);
  });
});

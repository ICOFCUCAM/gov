import { describe, it, expect } from 'vitest';
import { governancePulse } from './governance-pulse';

describe('governance pulse summary', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(governancePulse(4000 * 270)))
      .toEqual(JSON.stringify(governancePulse(4000 * 270 + 850)));
  });

  it('produces a bounded, header-friendly status line', () => {
    const p = governancePulse(4000 * 340);
    expect(p.health).toBeGreaterThanOrEqual(0);
    expect(p.health).toBeLessThanOrEqual(100);
    expect(p.dominantIndex).toBeGreaterThanOrEqual(0);
    expect(p.dominantIndex).toBeLessThanOrEqual(100);
    expect(p.line.length).toBeGreaterThan(20);
    expect(p.line.length).toBeLessThan(160);
    expect(p.line).toContain(p.mode.toUpperCase());
  });
});

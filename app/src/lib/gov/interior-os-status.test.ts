import { describe, it, expect } from 'vitest';
import { interiorOSStatus } from './interior-os-status';

describe('interior OS status synthesis', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(interiorOSStatus(4000 * 290)))
      .toEqual(JSON.stringify(interiorOSStatus(4000 * 290 + 950)));
  });

  it('composes pulse, trend, brief and registry counts', () => {
    const s = interiorOSStatus(4000 * 333);
    expect(s.pulse.line.length).toBeGreaterThan(20);
    expect(s.trend.health.length).toBeGreaterThan(0);
    expect(s.brief.nationalHealth).toBeGreaterThanOrEqual(0);
    expect(s.totalEngines).toBeGreaterThan(10);
    expect(s.totalSafeguardFamilies).toBe(6);
  });
});

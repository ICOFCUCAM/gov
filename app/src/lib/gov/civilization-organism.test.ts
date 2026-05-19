import { describe, it, expect } from 'vitest';
import { civilizationOrganism } from './civilization-organism';

describe('civilization organism apex synthesis', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(civilizationOrganism(4000 * 260)))
      .toEqual(JSON.stringify(civilizationOrganism(4000 * 260 + 980)));
  });

  it('braids all 11 continuity layers into one bounded organism reading', () => {
    const o = civilizationOrganism(4000 * 333);
    expect(o.layers.length).toBe(11);
    for (const l of o.layers) {
      expect(l.index).toBeGreaterThanOrEqual(0);
      expect(l.index).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(l.tone);
    }
    expect(o.nationalSovereignHealth).toBeGreaterThanOrEqual(0);
    expect(o.nationalSovereignHealth).toBeLessThanOrEqual(100);
    expect(['sovereign-stable', 'rising-strain', 'multi-layer-pressure', 'continuity-fracture', 'constitutional-strain', 'restoration-cycle', 'adaptive-equilibrium', 'civilizational-recovery', 'restored-sovereign-equilibrium', 'existential-watch']).toContain(o.organismMode);
    expect(o.safeguardSetCount).toBe(6);
    expect(o.totalProhibitedCount).toBeGreaterThan(30);
  });
});

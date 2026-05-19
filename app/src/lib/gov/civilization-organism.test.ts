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

  it('exposes a dominant (worst-performing) layer and a 3-layer reinforcement priority', () => {
    const o = civilizationOrganism(4000 * 410);
    expect(o.priorityLayers.length).toBeGreaterThan(0);
    expect(o.priorityLayers.length).toBeLessThanOrEqual(3);
    expect(o.dominantLayer.key).toBe(o.priorityLayers[0]!.key);
    for (let i = 1; i < o.priorityLayers.length; i++) {
      expect(o.priorityLayers[i - 1]!.index).toBeLessThanOrEqual(o.priorityLayers[i]!.index);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { REINFORCEMENT_DOCTRINE, reinforcementDoctrineFor } from './reinforcement-doctrine';
import { civilizationOrganism } from './civilization-organism';

describe('reinforcement doctrine', () => {
  it('declares a doctrine line for every possible organism mode', () => {
    const allModes = [
      'sovereign-stable', 'rising-strain', 'multi-layer-pressure', 'continuity-fracture',
      'constitutional-strain', 'restoration-cycle', 'adaptive-equilibrium',
      'civilizational-recovery', 'restored-sovereign-equilibrium', 'existential-watch',
    ] as const;
    for (const m of allModes) {
      const d = REINFORCEMENT_DOCTRINE[m];
      expect(d.length).toBeGreaterThan(30);
      expect(d).toMatch(/\.$/);
    }
  });

  it('resolves the live organism mode to a doctrine line', () => {
    const o = civilizationOrganism(4000 * 333);
    expect(reinforcementDoctrineFor(o.organismMode).length).toBeGreaterThan(20);
  });

  it('no doctrine line endorses centralizing authority', () => {
    for (const line of Object.values(REINFORCEMENT_DOCTRINE)) {
      const lower = line.toLowerCase();
      for (const bad of ['centralize control', 'absolute power', 'unchecked', 'authoritarian']) {
        expect(lower.includes(bad)).toBe(false);
      }
    }
  });
});

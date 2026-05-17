import { describe, it, expect } from 'vitest';
import { energyOps, energyInstability, energyCommand } from './energy-systems';

describe('energy systems engine', () => {
  it('deterministic & bounded', () => {
    expect(energyOps('E', 50)).toEqual(energyOps('E', 50));
    const o = energyOps('E', 50);
    expect(o.generation.length).toBe(5);
    expect(o.substations.online).toBeLessThanOrEqual(o.substations.total);
    expect(o.electrificationPct).toBeLessThanOrEqual(100);
    expect(typeof o.loadShedding).toBe('boolean');
    for (const t of [10, 80, 260]) {
      const v = energyInstability('E', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('energyCommand is a deterministic, bounded synthesis surface', () => {
    const c = energyCommand('E', 95);
    expect(c).toEqual(energyCommand('E', 95));
    expect(['steady', 'engaged', 'crisis']).toContain(c.posture);
    expect(c.postureIndex).toBeGreaterThanOrEqual(0);
    expect(c.postureIndex).toBeLessThanOrEqual(100);
    expect(c.domains.length).toBe(5);
    for (const d of c.domains) expect(['ok', 'warn', 'alert']).toContain(d.tone);
    const rank = { critical: 0, priority: 1, advisory: 2 } as const;
    for (let i = 1; i < c.directives.length; i++) {
      expect(rank[c.directives[i - 1]!.priority]).toBeLessThanOrEqual(rank[c.directives[i]!.priority]);
    }
  });
});

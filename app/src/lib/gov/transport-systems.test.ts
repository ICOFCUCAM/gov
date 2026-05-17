import { describe, it, expect } from 'vitest';
import { transportOps, transportInstability, transportCommand } from './transport-systems';

describe('transport systems engine', () => {
  it('deterministic & bounded', () => {
    expect(transportOps('T', 50)).toEqual(transportOps('T', 50));
    const o = transportOps('T', 50);
    expect(o.modes.length).toBe(4);
    expect(o.corridors.length).toBe(5);
    expect(o.networkAvailabilityPct).toBeLessThanOrEqual(100);
    expect(o.fleet.available).toBeLessThanOrEqual(o.fleet.vehicles);
    for (const m of o.modes) expect(['ok', 'warn', 'alert']).toContain(m.tone);
    for (const t of [10, 100, 320]) {
      const v = transportInstability('T', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('transportCommand is a deterministic, bounded synthesis surface', () => {
    const c = transportCommand('T', 90);
    expect(c).toEqual(transportCommand('T', 90));
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

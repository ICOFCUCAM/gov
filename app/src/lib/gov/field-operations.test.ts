import { describe, it, expect } from 'vitest';
import { fieldOperations, fieldStrain } from './field-operations';

describe('field operations engine', () => {
  it('is deterministic, bounded and archetype-aware', () => {
    const a = fieldOperations('INST', 'INTERIOR', 50);
    expect(a).toEqual(fieldOperations('INST', 'INTERIOR', 50));
    expect(a.unitClass).toContain('Patrol');
    expect(a.deployed).toBeLessThanOrEqual(a.fleet);
    expect(a.available).toBe(a.fleet - a.deployed);
    expect(a.units.length).toBe(10);
    expect(a.byRegion.length).toBe(6);
    expect(['nominal', 'surged', 'overstretched']).toContain(a.posture);
    for (const u of a.units) {
      expect(['staged', 'tasked', 'en-route', 'on-scene', 'cleared']).toContain(u.status);
      expect(u.telemetryPct).toBeGreaterThanOrEqual(0);
      expect(u.telemetryPct).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(u.tone);
    }
    expect(fieldOperations('INST', 'HEALTH', 50).unitClass).toContain('Ambulance');
  });

  it('field strain is a bounded propagation signal & evolves over time', () => {
    for (const t of [10, 90, 300]) {
      const v = fieldStrain('INST', 'AGRICULTURE', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    const a = fieldOperations('INST', 'ENVIRONMENT', 0);
    const b = fieldOperations('INST', 'ENVIRONMENT', 400);
    expect(a.units.some((u, i) => u.status !== b.units[i]!.status)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { archetypeOperations } from './archetype-operations';
import type { ArchetypeKey } from '@/lib/api/types';

const KEYS: ArchetypeKey[] = [
  'EDUCATION', 'TRANSPORT', 'AGRICULTURE', 'ENERGY', 'INTERIOR',
  'JUSTICE', 'ENVIRONMENT', 'LABOR', 'TRADE', 'GENERIC',
];

describe('archetype operations engine', () => {
  it('produces a deep, bounded, deterministic environment for every archetype', () => {
    for (const k of KEYS) {
      const a = archetypeOperations('INST', k, 60);
      expect(a).toEqual(archetypeOperations('INST', k, 60));
      expect(['NOMINAL', 'ELEVATED', 'CRISIS']).toContain(a.command.posture);
      expect(a.command.chain.length).toBeGreaterThan(0);
      expect(a.kpis.length).toBeGreaterThan(0);
      expect(a.queues.length).toBe(3);
      expect(a.regional.length).toBe(6);
      expect(a.inventory.length).toBeGreaterThan(0);
      expect(a.meanOperational).toBeGreaterThanOrEqual(0);
      expect(a.meanOperational).toBeLessThanOrEqual(100);
      for (const q of a.queues) expect(q.breaching).toBe(q.oldestHrs > q.slaHrs);
      for (const r of a.regional) {
        expect(r.opPct).toBeGreaterThanOrEqual(0);
        expect(r.opPct).toBeLessThanOrEqual(100);
        expect(['ok', 'warn', 'alert']).toContain(r.tone);
      }
      for (const s of a.intelligence) expect(['info', 'watch', 'risk']).toContain(s.level);
    }
  });

  it('evolves over time', () => {
    const t0 = archetypeOperations('INST', 'TRANSPORT', 0);
    const t1 = archetypeOperations('INST', 'TRANSPORT', 400);
    expect(t0.meanOperational !== t1.meanOperational || t0.command.directives !== t1.command.directives).toBe(true);
  });
});

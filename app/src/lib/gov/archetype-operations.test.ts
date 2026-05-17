import { describe, it, expect } from 'vitest';
import { archetypeOperations, sectorCommand } from './archetype-operations';
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

  it('sectorCommand is a deterministic, bounded synthesis for any archetype', () => {
    for (const k of ['JUSTICE', 'AGRICULTURE', 'ENVIRONMENT', 'INTERIOR', 'LABOR', 'TRADE'] as ArchetypeKey[]) {
      const c = sectorCommand('INST', k, 80);
      expect(c).toEqual(sectorCommand('INST', k, 80));
      expect(['steady', 'engaged', 'crisis']).toContain(c.posture);
      expect(c.postureIndex).toBeGreaterThanOrEqual(0);
      expect(c.postureIndex).toBeLessThanOrEqual(100);
      expect(c.domains.length).toBe(5);
      for (const d of c.domains) expect(['ok', 'warn', 'alert']).toContain(d.tone);
      const rank = { critical: 0, priority: 1, advisory: 2 } as const;
      for (let i = 1; i < c.directives.length; i++) {
        expect(rank[c.directives[i - 1]!.priority]).toBeLessThanOrEqual(rank[c.directives[i]!.priority]);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import { healthCommand } from '@/lib/gov/health-systems';
import { educationCommand } from '@/lib/gov/education-systems';
import { transportCommand } from '@/lib/gov/transport-systems';
import { energyCommand } from '@/lib/gov/energy-systems';
import { treasuryCommand } from '@/lib/gov/treasury-systems';
import { sectorCommand } from '@/lib/gov/archetype-operations';
import type { ArchetypeKey } from '@/lib/api/types';

// The command-synthesis layer is the per-institution authority surface
// (emergent posture + domain rollup + ranked directives). This consolidated
// guard asserts every command engine is deterministic, bounded, and ranks
// directives critical→priority→advisory — so a regression in any one
// institution's command authority fails CI.
const RANK = { critical: 0, priority: 1, advisory: 2 } as const;

function assertCommand(c: { postureIndex: number; posture: string; domains: { tone: string }[]; directives: { priority: keyof typeof RANK }[] }) {
  expect(c.postureIndex).toBeGreaterThanOrEqual(0);
  expect(c.postureIndex).toBeLessThanOrEqual(100);
  expect(['steady', 'engaged', 'crisis']).toContain(c.posture);
  expect(c.domains.length).toBeGreaterThanOrEqual(5);
  for (const d of c.domains) expect(['ok', 'warn', 'alert']).toContain(d.tone);
  for (let i = 1; i < c.directives.length; i++) {
    expect(RANK[c.directives[i - 1]!.priority]).toBeLessThanOrEqual(RANK[c.directives[i]!.priority]);
  }
}

describe('command synthesis layer (all institutions)', () => {
  it('bespoke command engines are deterministic & bounded', () => {
    for (const t of [40, 120, 300]) {
      assertCommand(healthCommand('I', t));
      assertCommand(educationCommand('I', t));
      assertCommand(transportCommand('I', t));
      assertCommand(energyCommand('I', t));
      assertCommand(treasuryCommand('I', t));
      expect(healthCommand('I', t)).toEqual(healthCommand('I', t));
      expect(treasuryCommand('I', t)).toEqual(treasuryCommand('I', t));
    }
  });

  it('generic sectorCommand synthesises every remaining archetype', () => {
    const arch: ArchetypeKey[] = ['JUSTICE', 'AGRICULTURE', 'ENVIRONMENT', 'INTERIOR', 'LABOR', 'TRADE', 'GENERIC'];
    for (const a of arch) {
      for (const t of [25, 150, 420]) {
        const c = sectorCommand('I', a, t);
        assertCommand(c);
        expect(c).toEqual(sectorCommand('I', a, t));
      }
    }
  });
});

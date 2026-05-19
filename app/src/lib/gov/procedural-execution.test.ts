import { describe, it, expect } from 'vitest';
import { proceduralLedger, proceduralBoard, PROC_STAGES } from './procedural-execution';

describe('procedural sovereign execution', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(proceduralLedger(4000 * 130)))
      .toEqual(JSON.stringify(proceduralLedger(4000 * 130 + 500)));
  });

  it('every file has a bounded stage, carried deadline and audit lineage', () => {
    for (const f of proceduralLedger(4000 * 260)) {
      expect(f.stageIndex).toBeGreaterThanOrEqual(0);
      expect(f.stageIndex).toBeLessThan(PROC_STAGES.length);
      expect(f.stage.key).toBe(PROC_STAGES[f.stageIndex]!.key);
      // Lineage records every traversed stage (deadline carried across).
      expect(f.lineage.length).toBe(f.stageIndex + 1);
      expect(f.remainingHrs).toBe(f.legalDeadlineHrs - f.ageHrs);
      // AI is constitutionally bounded.
      expect(f.ai.sovereignBlocked).toBe(true);
      expect(['expedite', 'reassign', 'escalate', 'monitor']).toContain(f.ai.action);
      expect(f.ai.confidence).toBeGreaterThan(0);
      expect(f.ai.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('judicial-hold freezes progression at/before judicial review', () => {
    let seen = 0;
    for (const f of proceduralLedger(4000 * 305)) {
      if (f.status === 'judicial-hold') {
        expect(f.judicialHoldReason).toBeTruthy();
        expect(f.stageIndex).toBeLessThanOrEqual(4);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('appealed files carry an immutable non-empty appeal chain that cannot be silently dismissed', () => {
    let seen = 0;
    for (const f of proceduralLedger(4000 * 412)) {
      if (f.status === 'appealed') {
        expect(f.appeal).toBeTruthy();
        expect(f.appeal!.chain.length).toBeGreaterThan(0);
        expect(f.appeal!.reviewDeadlineHrs).toBeGreaterThan(0);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('board aggregates are consistent and surface continuity + memory', () => {
    const b = proceduralBoard(4000 * 377);
    const sum = Object.values(b.byStatus).reduce((s, n) => s + n, 0);
    expect(sum).toBe(b.total);
    expect(b.stageCounts.reduce((s, x) => s + x.count, 0)).toBe(b.total);
    expect(['nominal', 'regional-fallback', 'ministry-failover', 'constitutional-emergency']).toContain(b.continuity);
    expect(b.unresolvedAppeals).toBeLessThanOrEqual(b.appealed);
    expect(b.recurringBottleneck.length).toBeGreaterThan(0);
  });
});

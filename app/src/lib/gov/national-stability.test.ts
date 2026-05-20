import { describe, it, expect } from 'vitest';
import { nationalStabilityBoard } from './national-stability';

describe('national stability command — eight Interior role areas', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(nationalStabilityBoard(4000 * 240)))
      .toEqual(JSON.stringify(nationalStabilityBoard(4000 * 240 + 980)));
  });

  it('declares all eight role areas with bounded indices and a federation route', () => {
    const b = nationalStabilityBoard(4000 * 333);
    const expected = ['stability', 'policing', 'identity', 'borders', 'emergency', 'investigations', 'cyber', 'intelligence'];
    expect(b.roleAreas.map(r => r.key)).toEqual(expected);
    for (const r of b.roleAreas) {
      expect(r.index).toBeGreaterThanOrEqual(0);
      expect(r.index).toBeLessThanOrEqual(100);
      expect(r.federationRoute.startsWith('/app/interior/')).toBe(true);
      expect(r.metric.length).toBeGreaterThan(0);
    }
    expect(b.stabilityIndex).toBeGreaterThanOrEqual(0);
    expect(b.stabilityIndex).toBeLessThanOrEqual(100);
    expect(['stable', 'engaged', 'strained', 'critical']).toContain(b.posture);
  });

  it('reinforcement priority is worst-first and bounded to three', () => {
    const b = nationalStabilityBoard(4000 * 410);
    expect(b.reinforcementPriority.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < b.reinforcementPriority.length; i++) {
      expect(b.reinforcementPriority[i - 1]!.index).toBeLessThanOrEqual(b.reinforcementPriority[i]!.index);
    }
  });

  it('every detected tension carries a rationale + severity', () => {
    for (const t of nationalStabilityBoard(4000 * 377).tensions) {
      expect(['advisory', 'elevated', 'critical']).toContain(t.severity);
      expect(t.rationale.length).toBeGreaterThan(20);
    }
  });
});

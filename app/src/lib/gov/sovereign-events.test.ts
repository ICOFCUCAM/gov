import { describe, it, expect } from 'vitest';
import { nationalEventStream, eventStreamBoard, operationalTimeline } from './sovereign-events';

describe('sovereign events — national incident stream', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(eventStreamBoard(4000 * 260)))
      .toEqual(JSON.stringify(eventStreamBoard(4000 * 260 + 990)));
  });

  it('every incident carries a bounded escalation chain that ends at the live stage', () => {
    const valid = ['detected', 'verified', 'tactical-response', 'regional-escalation', 'national-coordination', 'contained', 'recovery'];
    for (const i of nationalEventStream(4000 * 333)) {
      expect(valid).toContain(i.escalationStage);
      expect(i.escalationChain[i.escalationChain.length - 1]).toBe(i.escalationStage);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      expect(['open', 'escalating', 'contained', 'recovering', 'closed']).toContain(i.status);
    }
  });

  it('every incident propagates to at least one other ministry', () => {
    for (const i of nationalEventStream(4000 * 412)) {
      expect(i.propagation.length).toBeGreaterThan(0);
      for (const e of i.propagation) {
        expect(['pending', 'engaged', 'cleared']).toContain(e.status);
        expect(e.delayHrs).toBeGreaterThanOrEqual(0);
        expect(e.effect.length).toBeGreaterThan(0);
      }
    }
  });

  it('board posture banner is a valid enum + the lookback timeline is stable & aligned', () => {
    const b = eventStreamBoard(4000 * 377);
    expect(['STABLE', 'ENGAGED', 'ELEVATED', 'CRITICAL']).toContain(b.postureBanner);
    expect(b.byRegion.length).toBeGreaterThan(0);
    const tl = operationalTimeline(4000 * 377, 6);
    expect(tl.length).toBe(7);
    for (const row of tl) {
      expect(row.total).toBeGreaterThan(0);
      expect(row.critical).toBeLessThanOrEqual(row.total);
    }
  });
});

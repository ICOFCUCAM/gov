import { describe, it, expect } from 'vitest';
import { transportNetworkBoard } from './transport-network';

describe('transport network sovereign engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(transportNetworkBoard(4000 * 240)))
      .toEqual(JSON.stringify(transportNetworkBoard(4000 * 240 + 990)));
  });

  it('national mobility command is bounded with valid posture', () => {
    const b = transportNetworkBoard(4000 * 333);
    expect(b.command.corridors.length).toBe(8);
    expect(b.command.regionalCongestion.length).toBe(6);
    expect(['flowing', 'engaged', 'congested', 'critical', 'collapse-watch']).toContain(b.command.posture);
    for (const c of b.command.corridors) {
      expect(['free', 'flowing', 'heavy', 'bottleneck', 'collapse']).toContain(c.congestion);
      expect(['nominal', 'rerouting', 'emergency-corridor']).toContain(c.stabilization);
      expect(c.loadPct).toBeGreaterThanOrEqual(0);
    }
  });

  it('every transport incident propagates to at least one other ministry', () => {
    for (const i of transportNetworkBoard(4000 * 377).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      expect(['open', 'rerouting', 'evacuating', 'contained', 'recovering']).toContain(i.status);
    }
  });

  it('logistics lanes carry inter-ministry support + bounded continuity', () => {
    for (const l of transportNetworkBoard(4000 * 401).logistics) {
      expect(l.continuityPct).toBeGreaterThanOrEqual(0);
      expect(l.continuityPct).toBeLessThanOrEqual(100);
      expect(l.interMinistrySupport.length).toBeGreaterThan(0);
    }
  });

  it('infrastructure assets sort weakest-first with bounded integrity', () => {
    const arr = transportNetworkBoard(4000 * 412).infrastructure;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.integrityPct).toBeLessThanOrEqual(arr[i]!.integrityPct);
    }
    for (const a of arr) {
      expect(a.integrityPct).toBeGreaterThanOrEqual(0);
      expect(a.integrityPct).toBeLessThanOrEqual(100);
    }
  });

  it('forecast horizon arrays are aligned & bounded', () => {
    const f = transportNetworkBoard(4000 * 270).forecast;
    expect(f.horizonHrs.length).toBe(6);
    expect(f.congestionPct.length).toBe(6);
    expect(f.weatherImpact.length).toBe(6);
    expect(f.crisisRoutingReadiness).toBeGreaterThanOrEqual(0);
    expect(f.crisisRoutingReadiness).toBeLessThanOrEqual(100);
  });
});

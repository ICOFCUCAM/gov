import { describe, it, expect } from 'vitest';
import { communicationsBoard, COMMUNICATIONS_SAFEGUARDS } from './communications-continuity';

describe('communications & digital infrastructure engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(communicationsBoard(4000 * 280)))
      .toEqual(JSON.stringify(communicationsBoard(4000 * 280 + 1390)));
  });

  it('connectivity posture follows fractured regions and uptime thresholds', () => {
    const b = communicationsBoard(4000 * 322);
    const fractured = b.command.regions.filter(r => r.classification === 'fractured').length;
    const degraded = b.command.regions.filter(r => r.classification === 'degraded').length;
    const up = b.command.nationalUptimePct;
    const ech = b.command.emergencyChannelsActive;
    if (fractured >= 2 || up < 96.5) expect(b.command.posture).toBe('sovereign-lockdown');
    else if (fractured >= 1 || up < 98) expect(b.command.posture).toBe('critical');
    else if (degraded >= 2) expect(b.command.posture).toBe('degraded');
    else if (degraded >= 1 || ech) expect(b.command.posture).toBe('engaged');
    else expect(b.command.posture).toBe('nominal');
  });

  it('regional connectivity classifies by degradation index', () => {
    for (const r of communicationsBoard(4000 * 411).command.regions) {
      if (r.degradationIdx >= 50) expect(r.classification).toBe('fractured');
      else if (r.degradationIdx >= 30) expect(r.classification).toBe('degraded');
      else if (r.degradationIdx >= 15) expect(r.classification).toBe('observant');
      else expect(r.classification).toBe('nominal');
    }
  });

  it('network assets carry valid asset kinds and statuses', () => {
    for (const a of communicationsBoard(4000 * 277).networkAssets) {
      expect(['mobile-tower', 'fiber-trunk', 'submarine-cable', 'satellite-uplink', 'broadcast-tower', 'data-center']).toContain(a.kind);
      expect(['operational', 'degraded', 'maintenance', 'offline']).toContain(a.status);
      expect(['none', 'scheduled', 'overdue']).toContain(a.maintenanceWindow);
    }
  });

  it('cyber threat level follows incident severity counts', () => {
    const b = communicationsBoard(4000 * 533);
    const national = b.cyber.incidentsActive.filter(c => c.severity === 'national').length;
    const critical = b.cyber.incidentsActive.filter(c => c.severity === 'critical').length;
    if (national >= 1) expect(b.cyber.threatLevel).toBe('severe');
    else if (critical >= 2) expect(b.cyber.threatLevel).toBe('high');
    else if (b.cyber.incidentsActive.length >= 4) expect(b.cyber.threatLevel).toBe('elevated');
    else expect(b.cyber.threatLevel).toBe('normal');
  });

  it('cyber incidents sort by severity then recency; every incident propagates', () => {
    const arr = communicationsBoard(4000 * 444).cyber.incidentsActive;
    const sev = (s: typeof arr[number]['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1]!; const cur = arr[i]!;
      if (sev(prev.severity) === sev(cur.severity)) expect(prev.detectedHrsAgo).toBeLessThanOrEqual(cur.detectedHrsAgo);
      else expect(sev(prev.severity)).toBeGreaterThanOrEqual(sev(cur.severity));
      expect(cur.ministryCascade.length).toBeGreaterThan(0);
      for (const c of cur.ministryCascade) expect(['pending', 'engaged', 'cleared']).toContain(c.status);
    }
  });

  it('spectrum bands classify by utilisation; all 6 bands tracked', () => {
    const b = communicationsBoard(4000 * 422);
    expect(b.spectrum.map(s => s.band)).toEqual([
      'low-band', 'mid-band', 'high-band-mmwave', 'broadcast-tv', 'broadcast-radio', 'satellite',
    ]);
    for (const s of b.spectrum) {
      if (s.utilisationPct >= 100) expect(s.classification).toBe('oversubscribed');
      else if (s.utilisationPct >= 85) expect(s.classification).toBe('congested');
      else if (s.utilisationPct >= 60) expect(s.classification).toBe('observant');
      else expect(s.classification).toBe('optimal');
    }
  });

  it('forecast horizon spans 5 points; portal requests sort by recency', () => {
    const b = communicationsBoard(4000 * 305);
    const f = b.intelligence.forecast;
    expect(f.horizonYears).toEqual([5, 10, 15, 20, 25]);
    expect(f.bandwidthDemandTrajectoryTbps.length).toBe(5);
    expect(f.cyberThreatLevelTrajectory.length).toBe(5);
    const reqs = b.portal.requests;
    for (let i = 1; i < reqs.length; i++) {
      expect(reqs[i - 1]!.daysOpen).toBeLessThanOrEqual(reqs[i]!.daysOpen);
    }
  });

  it('safeguards prohibit mass surveillance and press censorship', () => {
    const b = communicationsBoard(4000 * 244);
    expect(b.prohibited).toEqual(COMMUNICATIONS_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('mass-surveillance-without-warrant');
    expect(b.prohibited).toContain('arbitrary-network-shutdown');
    expect(b.prohibited).toContain('press-censorship-without-court-order');
    expect(b.portal.portalAvailabilityPct).toBeGreaterThan(95);
  });
});

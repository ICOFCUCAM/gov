import { describe, it, expect } from 'vitest';
import { foreignAffairsBoard, DIPLOMATIC_SAFEGUARDS } from './foreign-affairs';

describe('foreign affairs & geopolitical continuity engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(foreignAffairsBoard(4000 * 270)))
      .toEqual(JSON.stringify(foreignAffairsBoard(4000 * 270 + 1350)));
  });

  it('geopolitical posture is consistent with fracturing regions and escalation', () => {
    const b = foreignAffairsBoard(4000 * 322);
    const fracturing = b.command.regionalTensions.filter(t => t.drift === 'fracturing').length;
    const esc = b.command.diplomaticEscalationIdx;
    const all = b.command.allianceStabilityIdx;
    const ali = b.command.globalAlignmentIdx;
    if (fracturing >= 2 || esc >= 70) expect(b.command.posture).toBe('crisis-engagement');
    else if (fracturing >= 1 || esc >= 58) expect(b.command.posture).toBe('pressured');
    else if (all < 65) expect(b.command.posture).toBe('realigning');
    else if (ali < 78) expect(b.command.posture).toBe('balanced');
    else expect(b.command.posture).toBe('aligned');
  });

  it('every mission security posture follows the regional tension threshold', () => {
    const b = foreignAffairsBoard(4000 * 411);
    for (const m of b.missions) {
      const t = b.command.regionalTensions.find(x => x.region === m.region)!;
      if (t.tensionIdx >= 78) expect(m.securityPosture).toBe('evacuation');
      else if (t.tensionIdx >= 65) expect(m.securityPosture).toBe('lockdown');
      else if (t.tensionIdx >= 50) expect(m.securityPosture).toBe('heightened');
      else expect(m.securityPosture).toBe('normal');
    }
  });

  it('treaties carry valid scope, domain and status; signatories > 0', () => {
    for (const t of foreignAffairsBoard(4000 * 277).treaties) {
      expect(['bilateral', 'regional', 'multilateral', 'universal']).toContain(t.scope);
      expect(['security', 'trade', 'climate', 'rights', 'maritime', 'tech']).toContain(t.domain);
      expect(['in-force', 'review', 'amendment', 'suspended', 'expired']).toContain(t.status);
      expect(t.signatories).toBeGreaterThan(0);
    }
  });

  it('every incident propagates with valid status, severity, negotiation stage', () => {
    for (const i of foreignAffairsBoard(4000 * 511).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      expect(['observation', 'consultation', 'demarche', 'mediation', 'arbitration', 'resolution']).toContain(i.negotiationStage);
      for (const c of i.ministryCascade) expect(['pending', 'engaged', 'cleared']).toContain(c.status);
    }
  });

  it('bilateral partners sorted by alignment descending', () => {
    const arr = foreignAffairsBoard(4000 * 244).economic.bilateralPartners;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.alignmentIdx).toBeGreaterThanOrEqual(arr[i]!.alignmentIdx);
    }
  });

  it('travel advisory escalates for fracturing regions', () => {
    const b = foreignAffairsBoard(4000 * 369);
    for (const t of b.command.regionalTensions.filter(x => x.tensionIdx >= 75)) {
      const adv = b.consular.travelAdvisoriesActive.find(a => a.region === t.region);
      expect(adv?.level).toBe('do-not-travel');
    }
  });

  it('forecast horizon arrays are aligned at 4 points; safeguards prohibit imperial coercion', () => {
    const b = foreignAffairsBoard(4000 * 305);
    const f = b.forecast;
    expect(f.horizonYears.length).toBe(4);
    expect(f.alignmentTrajectory.length).toBe(4);
    expect(f.allianceIntegrityTrajectory.length).toBe(4);
    expect(f.influenceTrajectory.length).toBe(4);
    expect(f.globalCoordinationTrajectory.length).toBe(4);
    expect(f.civilizationalStandingIdx).toBeGreaterThanOrEqual(0);
    expect(f.civilizationalStandingIdx).toBeLessThanOrEqual(100);
    expect(f.geopoliticalCrisisRisk).toBeGreaterThanOrEqual(0);
    expect(f.geopoliticalCrisisRisk).toBeLessThanOrEqual(100);
    // Constitutional safeguard
    expect(b.prohibited).toEqual(DIPLOMATIC_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('imperial-coercion');
    expect(b.prohibited).toContain('per-citizen-foreign-targeting');
  });
});

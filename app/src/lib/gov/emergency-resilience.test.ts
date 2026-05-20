import { describe, it, expect } from 'vitest';
import { emergencyResilienceBoard, EMERGENCY_SAFEGUARDS } from './emergency-resilience';

describe('emergency management & national resilience engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(emergencyResilienceBoard(4000 * 240)))
      .toEqual(JSON.stringify(emergencyResilienceBoard(4000 * 240 + 1290)));
  });

  it('emergency posture is consistent with crisis theatres and severity composite', () => {
    const b = emergencyResilienceBoard(4000 * 311);
    const crises = b.command.theatres.filter(t => t.status === 'crisis').length;
    const engaged = b.command.theatres.filter(t => t.status === 'engaged').length;
    const s = b.command.severityComposite;
    if (crises >= 2 || s >= 65) expect(b.command.posture).toBe('national-mobilisation');
    else if (crises >= 1 || s >= 45) expect(b.command.posture).toBe('crisis');
    else if (engaged >= 1 || s >= 25) expect(b.command.posture).toBe('engaged');
    else if (s >= 10) expect(b.command.posture).toBe('watch');
    else expect(b.command.posture).toBe('standby');
  });

  it('national escalation level corresponds to posture', () => {
    const b = emergencyResilienceBoard(4000 * 400);
    const map = { standby: 1, watch: 2, engaged: 3, crisis: 4, 'national-mobilisation': 5 } as const;
    expect(b.command.nationalEscalationLevel).toBe(map[b.command.posture]);
  });

  it('rescue operations sorted by severity then evacuee count', () => {
    const ops = emergencyResilienceBoard(4000 * 277).response.rescueOperations;
    const sev = (s: typeof ops[number]['severity']) => s === 'catastrophic' ? 3 : s === 'severe' ? 2 : s === 'elevated' ? 1 : 0;
    for (let i = 1; i < ops.length; i++) {
      const prev = ops[i - 1]!; const cur = ops[i]!;
      if (sev(prev.severity) === sev(cur.severity)) expect(prev.evacueesK).toBeGreaterThanOrEqual(cur.evacueesK);
      else expect(sev(prev.severity)).toBeGreaterThanOrEqual(sev(cur.severity));
    }
  });

  it('shelter networks utilisation bounded and status reflects thresholds', () => {
    for (const s of emergencyResilienceBoard(4000 * 333).humanitarian.shelterNetworks) {
      expect(s.utilisationPct).toBeGreaterThanOrEqual(0);
      expect(s.utilisationPct).toBeLessThanOrEqual(100);
      if (s.utilisationPct >= 95) expect(s.status).toBe('full');
      else if (s.utilisationPct >= 75) expect(s.status).toBe('pressured');
      else if (s.utilisationPct >= 40) expect(s.status).toBe('monitored');
      else expect(s.status).toBe('available');
    }
  });

  it('all 6 infrastructure domains modelled; status reflects survivability/recovery', () => {
    const infra = emergencyResilienceBoard(4000 * 444).resilience.infrastructure;
    expect(infra.length).toBe(6);
    for (const i of infra) {
      if (i.survivabilityIdx < 60) expect(i.status).toBe('degraded');
      else if (i.recoveryProgressPct < 95 && i.recoveryProgressPct > 5) expect(i.status).toBe('restoring');
      else if (i.survivabilityIdx < 80) expect(i.status).toBe('pressured');
      else expect(i.status).toBe('intact');
    }
  });

  it('national risks sorted by composite descending; classification mapped consistently', () => {
    const risks = emergencyResilienceBoard(4000 * 522).risks;
    for (let i = 1; i < risks.length; i++) {
      expect(risks[i - 1]!.composite).toBeGreaterThanOrEqual(risks[i]!.composite);
    }
    for (const r of risks) {
      if (r.composite >= 72) expect(r.classification).toBe('severe');
      else if (r.composite >= 48) expect(r.classification).toBe('elevated');
      else if (r.composite >= 28) expect(r.classification).toBe('moderate');
      else expect(r.classification).toBe('low');
    }
  });

  it('every incident propagates to at least one ministry with valid status', () => {
    for (const i of emergencyResilienceBoard(4000 * 488).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      expect(['rescue-mobilisation', 'mass-evacuation', 'continuity-stabilisation', 'reconstruction']).toContain(i.recoveryPathway);
      for (const c of i.ministryCascade) expect(['pending', 'engaged', 'cleared']).toContain(c.status);
    }
  });

  it('forecast horizon arrays align at 4 points; safeguards prohibit authoritarian extension', () => {
    const b = emergencyResilienceBoard(4000 * 305);
    const f = b.forecast;
    expect(f.horizonYears.length).toBe(4);
    expect(f.resilienceTrajectory.length).toBe(4);
    expect(f.preparednessTrajectory.length).toBe(4);
    expect(f.recoveryCapacityTrajectory.length).toBe(4);
    expect(f.cascadingFailureTrajectory.length).toBe(4);
    expect(f.catastropheSurvivabilityIdx).toBeGreaterThanOrEqual(0);
    expect(f.catastropheSurvivabilityIdx).toBeLessThanOrEqual(100);
    expect(b.prohibited).toEqual(EMERGENCY_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('authoritarian-emergency-extension');
    expect(b.prohibited).toContain('denial-of-humanitarian-access');
  });
});

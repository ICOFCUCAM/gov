import { describe, it, expect } from 'vitest';
import {
  pharmaceuticalSupply, laboratoryNetwork, healthFinance,
  healthRegulatory, emergencyMedical, healthCommand, laboratoryExecution,
} from './health-operations';

describe('ministry of health operations engine', () => {
  it('all domains deterministic & bounded', () => {
    const ph = pharmaceuticalSupply('MOH', 50);
    expect(ph).toEqual(pharmaceuticalSupply('MOH', 50));
    expect(ph.drugs.length).toBe(8);
    expect(ph.drugs.every(d => ['ok', 'warn', 'alert'].includes(d.tone))).toBe(true);

    const lb = laboratoryNetwork('MOH', 50);
    expect(lb.byDiscipline.length).toBe(5);
    expect(lb.syncIntegrityPct).toBeLessThanOrEqual(100);

    const hf = healthFinance('MOH', 50);
    expect(hf.insuranceCoveragePct).toBeLessThanOrEqual(100);
    expect(hf.claimsSlaMetPct).toBeLessThanOrEqual(100);

    const rg = healthRegulatory('MOH', 50);
    expect(rg.compliancePct).toBeLessThanOrEqual(100);

    const em = emergencyMedical('MOH', 50);
    expect(em.ambulancesAvailable).toBeLessThanOrEqual(em.ambulanceFleet);
    expect(['standby', 'elevated', 'major']).toContain(em.disasterPosture);

    const hc = healthCommand('MOH', 50, 3);
    expect(hc.posture).toBe('elevated');
    expect(hc.regionalEscalations.length).toBe(6);
    expect(hc.logisticsCorridorsOpen).toBeLessThanOrEqual(hc.logisticsCorridorsTotal);
    expect(healthCommand('MOH', 50, 0).posture).toBe('nominal');
    expect(healthCommand('MOH', 50, 5).posture).toBe('crisis');
  });

  it('laboratoryExecution is a deterministic, bounded deep execution system', () => {
    const a = laboratoryExecution('MOH', 120);
    expect(a).toEqual(laboratoryExecution('MOH', 120));
    expect(a.pipeline.length).toBe(6);
    expect(a.pipeline[0]!.stage).toBe('Collected');
    expect(a.pipeline.at(-1)!.stage).toBe('Reported');
    expect(a.queues.length).toBe(3);
    expect(a.queues.map(q => q.priority)).toEqual(['STAT', 'Urgent', 'Routine']);
    expect(a.outbreaks.length).toBe(6);
    for (let i = 1; i < a.outbreaks.length; i++) {
      expect(a.outbreaks[i - 1]!.positivityPct).toBeGreaterThanOrEqual(a.outbreaks[i]!.positivityPct);
    }
    expect(['nominal', 'regional', 'national']).toContain(a.escalationLevel);
    expect(['steady', 'strained', 'crisis']).toContain(a.posture);
    expect(a.criticalUnacked).toBe(a.criticalAlerts.filter(x => !x.acknowledged).length);
    expect(a.slaBreaches).toBe(a.queues.reduce((s, q) => s + q.breaching, 0));
    for (const q of a.queues) {
      expect(q.breaching).toBeGreaterThanOrEqual(0);
      expect(q.breaching).toBeLessThanOrEqual(q.depth);
      expect(['ok', 'warn', 'alert']).toContain(q.tone);
    }
    expect(a.timeline.length).toBeGreaterThan(3);
  });
});

import { describe, it, expect } from 'vitest';
import { strategicDecisions, strategicPosture, type StrategicSignals } from './strategic-decisions';

const healthy: StrategicSignals = {
  executionIndex: 88, executionBand: 'operational',
  fragility: 'resilient', amplification: 1, worstNode: null,
  chainConstraints: 0, chainWorstTarget: null, systemicDrag: 0,
  legislativeQuorum: true, legislativeBlocked: 0,
  judicialClearancePct: 85, judicialBacklog: 300,
  treasuryOperational: 82, lapsedEmergencies: 0,
  worstInstitution: { id: 'health', name: 'Health', operational: 78 },
};

describe('strategic decision engine', () => {
  it('produces no decisions under a healthy national posture', () => {
    const p = strategicPosture(healthy);
    expect(p.decisions.length).toBe(0);
    expect(p.posture).toBe('steady');
  });

  it('is deterministic', () => {
    expect(strategicDecisions(healthy)).toEqual(strategicDecisions(healthy));
  });

  it('every decision carries a concrete executable directive', () => {
    const stressed: StrategicSignals = {
      ...healthy,
      executionIndex: 38, executionBand: 'degraded',
      fragility: 'cascading', amplification: 18,
      worstNode: { id: 'energy', name: 'Energy', effective: 31 },
      chainConstraints: 2, chainWorstTarget: 'Transport', systemicDrag: 22,
      legislativeQuorum: false, legislativeBlocked: 4,
      judicialClearancePct: 52, judicialBacklog: 1200,
      treasuryOperational: 41, lapsedEmergencies: 1,
      worstInstitution: { id: 'energy', name: 'Energy', operational: 22 },
    };
    const ds = strategicDecisions(stressed);
    expect(ds.length).toBeGreaterThan(3);
    for (const d of ds) {
      expect(d.directive.scope).toMatch(/.+:.+/);
      expect(d.directive.kind).toBeTruthy();
      expect(d.directive.title.length).toBeGreaterThan(3);
      expect(['critical', 'priority', 'advisory']).toContain(d.severity);
    }
    // Ranked: urgency is non-increasing.
    for (let i = 1; i < ds.length; i++) {
      expect(ds[i - 1]!.urgency).toBeGreaterThanOrEqual(ds[i]!.urgency);
    }
    expect(strategicPosture(stressed).posture).toBe('crisis');
  });

  it('escalates lost quorum and lapsed emergencies as critical', () => {
    const ds = strategicDecisions({ ...healthy, legislativeQuorum: false, lapsedEmergencies: 2 });
    const ids = ds.map(d => d.id);
    expect(ids).toContain('leg-quorum');
    expect(ids).toContain('emergency-lapsed');
    expect(ds.find(d => d.id === 'leg-quorum')!.severity).toBe('critical');
    expect(ds.find(d => d.id === 'emergency-lapsed')!.severity).toBe('critical');
  });
});

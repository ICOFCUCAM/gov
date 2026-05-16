import { describe, it, expect } from 'vitest';
import { policeOps, emergencyOps, immigrationOps, customsOps } from './agency-systems';

describe('agency systems engine', () => {
  it('police ops deterministic & bounded', () => {
    expect(policeOps('P', 50)).toEqual(policeOps('P', 50));
    const o = policeOps('P', 50);
    expect(o.unitsDeployed).toBeLessThanOrEqual(o.unitsTotal);
    expect(o.regional.length).toBe(6);
    expect(o.patrols.length).toBe(5);
    expect(o.regional.every(r => ['ok', 'warn', 'alert'].includes(r.tone))).toBe(true);
  });
  it('emergency ops deterministic, severity coherent', () => {
    expect(emergencyOps('E', 50)).toEqual(emergencyOps('E', 50));
    const o = emergencyOps('E', 50);
    expect(o.respondersAvailable).toBeLessThanOrEqual(o.responders);
    expect(['standby', 'elevated', 'major', 'national']).toContain(o.severity);
  });
  it('immigration & customs bounded', () => {
    const i = immigrationOps('I', 50);
    expect(i.bordersOpen).toBeLessThanOrEqual(i.bordersTotal);
    expect(i.visaSlaMetPct).toBeLessThanOrEqual(100);
    const c = customsOps('C', 50);
    expect(c.corridorsOpen).toBeLessThanOrEqual(c.corridorsTotal);
    expect(c.revenueIdx).toBeLessThanOrEqual(100);
    expect(immigrationOps('I', 50)).toEqual(immigrationOps('I', 50));
    expect(customsOps('C', 50)).toEqual(customsOps('C', 50));
  });
});

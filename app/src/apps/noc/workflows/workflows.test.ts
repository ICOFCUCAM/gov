import { describe, it, expect } from 'vitest';
import { NOC_WORKFLOWS, CROSS_MINISTRY_COORDINATION, INCIDENT_FUSION, PUBLIC_BRIEFING } from './noc-workflows';

describe('NOC workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(NOC_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of NOC_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('cross-ministry coordination routes to Cabinet and never substitutes for it', () => {
    const order = CROSS_MINISTRY_COORDINATION.steps.map(s => s.id);
    expect(order.indexOf('recommend')).toBeLessThan(order.indexOf('cabinet'));
    const cab = CROSS_MINISTRY_COORDINATION.steps.find(s => s.id === 'cabinet')!;
    expect(cab.role).toBe('cabinet-secretary');
  });

  it('incident-fusion assigns a constitutional lead ministry before coordination', () => {
    const order = INCIDENT_FUSION.steps.map(s => s.id);
    expect(order.indexOf('assign')).toBeLessThan(order.indexOf('coord'));
    const assign = INCIDENT_FUSION.steps.find(s => s.id === 'assign')!;
    expect(assign.title.toLowerCase()).toContain('constitutional');
  });

  it('public-briefing translates before publishing', () => {
    const order = PUBLIC_BRIEFING.steps.map(s => s.id);
    expect(order.indexOf('translate')).toBeLessThan(order.indexOf('publish'));
  });

  it('every step carries an audit tag namespaced under noc.', () => {
    for (const w of NOC_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('noc.')).toBe(true);
      }
    }
  });
});

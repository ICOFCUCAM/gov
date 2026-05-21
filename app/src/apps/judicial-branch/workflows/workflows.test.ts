import { describe, it, expect } from 'vitest';
import { JUDICIAL_WORKFLOWS, CONSTITUTIONAL_RULING, JUDICIAL_CONDUCT_REVIEW, APPELLATE_HEARING } from './judicial-workflows';

describe('judicial branch workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(JUDICIAL_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of JUDICIAL_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('constitutional-ruling publishes reasoning before audit seal', () => {
    const order = CONSTITUTIONAL_RULING.steps.map(s => s.id);
    expect(order.indexOf('reasoning')).toBeLessThan(order.indexOf('seal'));
    const reasoning = CONSTITUTIONAL_RULING.steps.find(s => s.id === 'reasoning')!;
    expect(reasoning.requiresSignature).toBe(true);
  });

  it('judicial-conduct-review requires civilian-panel before tribunal', () => {
    const order = JUDICIAL_CONDUCT_REVIEW.steps.map(s => s.id);
    expect(order.indexOf('civilian')).toBeLessThan(order.indexOf('tribunal'));
    const civilian = JUDICIAL_CONDUCT_REVIEW.steps.find(s => s.id === 'civilian')!;
    expect(civilian.role).toBe('civilian-panel');
  });

  it('appellate-hearing ends with auditor sealing', () => {
    const last = APPELLATE_HEARING.steps[APPELLATE_HEARING.steps.length - 1]!;
    expect(last.role).toBe('auditor');
  });

  it('every step carries an audit tag namespaced under judicial.', () => {
    for (const w of JUDICIAL_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('judicial.')).toBe(true);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import { ENERGY_WORKFLOWS, BLACKOUT_RESTORATION, GENERATION_DISPATCH, RENEWABLE_GRID_CONNECTION } from './energy-workflows';

describe('ministry-energy workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(ENERGY_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of ENERGY_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('blackout-restoration isolates before dispatch and ends with an auditor seal', () => {
    const order = BLACKOUT_RESTORATION.steps.map(s => s.id);
    expect(order.indexOf('isolate')).toBeLessThan(order.indexOf('dispatch'));
    const last = BLACKOUT_RESTORATION.steps[BLACKOUT_RESTORATION.steps.length - 1]!;
    expect(last.role).toBe('auditor');
    expect(last.requiresSignature).toBe(true);
  });

  it('generation-dispatch commits before live dispatch', () => {
    const order = GENERATION_DISPATCH.steps.map(s => s.id);
    expect(order.indexOf('commit')).toBeLessThan(order.indexOf('dispatch'));
  });

  it('renewable-grid-connection requires grid-impact study before approval', () => {
    const order = RENEWABLE_GRID_CONNECTION.steps.map(s => s.id);
    expect(order.indexOf('study')).toBeLessThan(order.indexOf('approve'));
    const study = RENEWABLE_GRID_CONNECTION.steps.find(s => s.id === 'study')!;
    expect(study.requiresSignature).toBe(true);
  });

  it('every step carries an audit tag namespaced under energy.', () => {
    for (const w of ENERGY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('energy.')).toBe(true);
      }
    }
  });
});

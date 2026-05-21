import { describe, it, expect } from 'vitest';
import { PRESIDENCY_WORKFLOWS, EXECUTIVE_ORDER, CABINET_RESOLUTION, MINISTERIAL_APPOINTMENT } from './presidency-workflows';

describe('presidency workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(PRESIDENCY_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of PRESIDENCY_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('executive-order requires Attorney-General legality opinion before signing', () => {
    const order = EXECUTIVE_ORDER.steps.map(s => s.id);
    expect(order.indexOf('legality')).toBeLessThan(order.indexOf('sign'));
    const sign = EXECUTIVE_ORDER.steps.find(s => s.id === 'sign')!;
    expect(sign.role).toBe('president');
    expect(sign.requiresSignature).toBe(true);
  });

  it('cabinet-resolution requires ≥⅔ concurrence before presidential ratification', () => {
    const order = CABINET_RESOLUTION.steps.map(s => s.id);
    expect(order.indexOf('concur')).toBeLessThan(order.indexOf('ratify'));
    const concur = CABINET_RESOLUTION.steps.find(s => s.id === 'concur')!;
    expect(concur.title).toContain('⅔');
  });

  it('ministerial-appointment requires Senate concurrence before swearing-in', () => {
    const order = MINISTERIAL_APPOINTMENT.steps.map(s => s.id);
    expect(order.indexOf('concur')).toBeLessThan(order.indexOf('oath'));
    const oath = MINISTERIAL_APPOINTMENT.steps.find(s => s.id === 'oath')!;
    expect(oath.role).toBe('president');
  });

  it('every step carries an audit tag namespaced under presidency.', () => {
    for (const w of PRESIDENCY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('presidency.')).toBe(true);
      }
    }
  });
});

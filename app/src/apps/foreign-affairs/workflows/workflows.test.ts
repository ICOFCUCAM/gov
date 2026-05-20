import { describe, it, expect } from 'vitest';
import { FOREIGN_WORKFLOWS, TREATY_RATIFICATION, DEMARCHE_DELIVERY, CONSULAR_EVACUATION } from './foreign-workflows';

describe('foreign-affairs workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(FOREIGN_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of FOREIGN_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('treaty-ratification reaches a parliamentary step and a signed instrument deposit', () => {
    const parliament = TREATY_RATIFICATION.steps.find(s => s.id === 'parliament')!;
    const deposit = TREATY_RATIFICATION.steps.find(s => s.id === 'deposit')!;
    expect(parliament.role).toBe('parliament-rapporteur');
    expect(parliament.requiresSignature).toBe(true);
    expect(deposit.requiresSignature).toBe(true);
  });

  it('demarche-delivery requires legal review before delivery', () => {
    const order = DEMARCHE_DELIVERY.steps.map(s => s.id);
    expect(order.indexOf('legal')).toBeLessThan(order.indexOf('deliver'));
    const legal = DEMARCHE_DELIVERY.steps.find(s => s.id === 'legal')!;
    expect(legal.requiresSignature).toBe(true);
  });

  it('consular-evacuation ends with auditor reconciliation', () => {
    const last = CONSULAR_EVACUATION.steps[CONSULAR_EVACUATION.steps.length - 1]!;
    expect(last.role).toBe('auditor');
    expect(last.requiresSignature).toBe(true);
  });

  it('every step carries an audit tag namespaced under foreign.', () => {
    for (const w of FOREIGN_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('foreign.')).toBe(true);
      }
    }
  });
});

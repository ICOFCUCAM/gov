import { describe, it, expect } from 'vitest';
import { LABOUR_WORKFLOWS, UNEMPLOYMENT_BENEFIT_DISBURSEMENT, WORKPLACE_INSPECTION, INDUSTRIAL_TRIBUNAL } from './labour-workflows';

describe('ministry-labour workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(LABOUR_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of LABOUR_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('unemployment-benefit-disbursement verifies eligibility before approval', () => {
    const order = UNEMPLOYMENT_BENEFIT_DISBURSEMENT.steps.map(s => s.id);
    expect(order.indexOf('verify')).toBeLessThan(order.indexOf('approve'));
    const last = UNEMPLOYMENT_BENEFIT_DISBURSEMENT.steps[UNEMPLOYMENT_BENEFIT_DISBURSEMENT.steps.length - 1]!;
    expect(last.role).toBe('auditor');
  });

  it('workplace-inspection requires inspector signature and auditor seal', () => {
    const inspect = WORKPLACE_INSPECTION.steps.find(s => s.id === 'inspect')!;
    expect(inspect.role).toBe('inspector');
    expect(inspect.requiresSignature).toBe(true);
    const close = WORKPLACE_INSPECTION.steps.find(s => s.id === 'close')!;
    expect(close.role).toBe('auditor');
  });

  it('industrial-tribunal includes mediation before hearing and civilian-panel review', () => {
    const order = INDUSTRIAL_TRIBUNAL.steps.map(s => s.id);
    expect(order.indexOf('mediate')).toBeLessThan(order.indexOf('hearing'));
    const review = INDUSTRIAL_TRIBUNAL.steps.find(s => s.id === 'review')!;
    expect(review.role).toBe('civilian-panel');
  });

  it('every step carries an audit tag namespaced under labour.', () => {
    for (const w of LABOUR_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('labour.')).toBe(true);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import { AGRICULTURE_WORKFLOWS, SEED_SUBSIDY_DISBURSEMENT, PEST_RESPONSE, IRRIGATION_ALLOCATION } from './agriculture-workflows';

describe('ministry-agriculture workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(AGRICULTURE_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of AGRICULTURE_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('seed-subsidy-disbursement requires smallholder verification before approval', () => {
    const order = SEED_SUBSIDY_DISBURSEMENT.steps.map(s => s.id);
    expect(order.indexOf('verify')).toBeLessThan(order.indexOf('approve'));
    const verify = SEED_SUBSIDY_DISBURSEMENT.steps.find(s => s.id === 'verify')!;
    expect(verify.role).toBe('extension-officer');
    expect(verify.requiresSignature).toBe(true);
  });

  it('pest-response ends with an auditor seal', () => {
    const last = PEST_RESPONSE.steps[PEST_RESPONSE.steps.length - 1]!;
    expect(last.role).toBe('auditor');
    expect(last.requiresSignature).toBe(true);
  });

  it('irrigation-allocation requires cooperative-board review before ministerial approval', () => {
    const order = IRRIGATION_ALLOCATION.steps.map(s => s.id);
    expect(order.indexOf('review')).toBeLessThan(order.indexOf('approve'));
    const review = IRRIGATION_ALLOCATION.steps.find(s => s.id === 'review')!;
    expect(review.role).toBe('cooperative-board');
    expect(review.requiresSignature).toBe(true);
  });

  it('every step carries an audit tag namespaced under agriculture.', () => {
    for (const w of AGRICULTURE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('agriculture.')).toBe(true);
      }
    }
  });
});

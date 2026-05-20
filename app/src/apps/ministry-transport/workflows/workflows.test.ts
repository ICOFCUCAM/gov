import { describe, it, expect } from 'vitest';
import { TRANSPORT_WORKFLOWS, INFRASTRUCTURE_CLOSURE, EVACUATION_ROUTING, FREIGHT_PERMIT } from './transport-workflows';

describe('ministry-transport workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(TRANSPORT_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of TRANSPORT_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('infrastructure-closure requires inspection before ministerial order', () => {
    const order = INFRASTRUCTURE_CLOSURE.steps.map(s => s.id);
    expect(order.indexOf('inspect')).toBeLessThan(order.indexOf('order'));
  });

  it('evacuation-routing ends with auditor reconciliation', () => {
    const last = EVACUATION_ROUTING.steps[EVACUATION_ROUTING.steps.length - 1]!;
    expect(last.role).toBe('auditor');
    expect(last.requiresSignature).toBe(true);
  });

  it('freight-permit requires safety review and corridor check before issuance', () => {
    const order = FREIGHT_PERMIT.steps.map(s => s.id);
    expect(order.indexOf('review')).toBeLessThan(order.indexOf('issue'));
    expect(order.indexOf('corridor')).toBeLessThan(order.indexOf('issue'));
  });

  it('every step carries an audit tag namespaced under transport.', () => {
    for (const w of TRANSPORT_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('transport.')).toBe(true);
      }
    }
  });
});

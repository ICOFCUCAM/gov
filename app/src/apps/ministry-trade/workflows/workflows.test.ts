import { describe, it, expect } from 'vitest';
import { TRADE_WORKFLOWS, EXPORT_LICENCE, INDUSTRIAL_INCIDENT_RESPONSE, TRADE_AGREEMENT_RATIFICATION } from './trade-workflows';

describe('ministry-trade workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(TRADE_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of TRADE_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('export-licence requires sanctions review before ministerial decision', () => {
    const order = EXPORT_LICENCE.steps.map(s => s.id);
    expect(order.indexOf('sanctions')).toBeLessThan(order.indexOf('decide'));
    const sanctions = EXPORT_LICENCE.steps.find(s => s.id === 'sanctions')!;
    expect(sanctions.requiresSignature).toBe(true);
  });

  it('industrial-incident-response ends with auditor seal', () => {
    const last = INDUSTRIAL_INCIDENT_RESPONSE.steps[INDUSTRIAL_INCIDENT_RESPONSE.steps.length - 1]!;
    expect(last.role).toBe('auditor');
    expect(last.requiresSignature).toBe(true);
  });

  it('trade-agreement-ratification requires public consultation and cabinet review before signature', () => {
    const order = TRADE_AGREEMENT_RATIFICATION.steps.map(s => s.id);
    expect(order.indexOf('cabinet')).toBeLessThan(order.indexOf('sign'));
    expect(order.indexOf('consult')).toBeLessThan(order.indexOf('sign'));
    const consult = TRADE_AGREEMENT_RATIFICATION.steps.find(s => s.id === 'consult')!;
    expect(consult.role).toBe('civilian-panel');
  });

  it('every step carries an audit tag namespaced under trade.', () => {
    for (const w of TRADE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('trade.')).toBe(true);
      }
    }
  });
});

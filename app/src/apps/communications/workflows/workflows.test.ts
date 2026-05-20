import { describe, it, expect } from 'vitest';
import { COMMS_WORKFLOWS, CYBER_INCIDENT_RESPONSE, EMERGENCY_BROADCAST, SPECTRUM_LICENCE } from './communications-workflows';

describe('communications workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(COMMS_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of COMMS_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('cyber-incident-response contains before eradicate and ends with auditor', () => {
    const order = CYBER_INCIDENT_RESPONSE.steps.map(s => s.id);
    expect(order.indexOf('contain')).toBeLessThan(order.indexOf('eradicate'));
    const last = CYBER_INCIDENT_RESPONSE.steps[CYBER_INCIDENT_RESPONSE.steps.length - 1]!;
    expect(last.role).toBe('auditor');
  });

  it('emergency-broadcast requires ministerial authorisation before broadcast', () => {
    const order = EMERGENCY_BROADCAST.steps.map(s => s.id);
    expect(order.indexOf('authorise')).toBeLessThan(order.indexOf('broadcast'));
    const authorise = EMERGENCY_BROADCAST.steps.find(s => s.id === 'authorise')!;
    expect(authorise.role).toBe('minister');
    expect(authorise.requiresSignature).toBe(true);
  });

  it('spectrum-licence requires public tender before ministerial award', () => {
    const order = SPECTRUM_LICENCE.steps.map(s => s.id);
    expect(order.indexOf('tender')).toBeLessThan(order.indexOf('award'));
    const tender = SPECTRUM_LICENCE.steps.find(s => s.id === 'tender')!;
    expect(tender.role).toBe('civilian-panel');
    expect(tender.requiresSignature).toBe(true);
  });

  it('every step carries an audit tag namespaced under comms.', () => {
    for (const w of COMMS_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('comms.')).toBe(true);
      }
    }
  });
});

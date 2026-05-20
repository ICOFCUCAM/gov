import { describe, it, expect } from 'vitest';
import { EMERGENCY_WORKFLOWS, INCIDENT_ACTIVATION, EVACUATION_ORDER, RESOURCE_MOBILISATION } from './emergency-workflows';

describe('emergency-response workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(EMERGENCY_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of EMERGENCY_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('incident-activation reaches a declaration signed by the incident commander', () => {
    const declare = INCIDENT_ACTIVATION.steps.find(s => s.id === 'declare');
    expect(declare).toBeDefined();
    expect(declare!.role).toBe('incident-commander');
    expect(declare!.requiresSignature).toBe(true);
  });

  it('evacuation-order requires accessibility attestation and post-hoc civilian-panel review', () => {
    const access = EVACUATION_ORDER.steps.find(s => s.id === 'accessibility')!;
    const review = EVACUATION_ORDER.steps.find(s => s.id === 'review')!;
    expect(access.requiresSignature).toBe(true);
    expect(review.role).toBe('civilian-panel');
    expect(review.requiresSignature).toBe(true);
  });

  it('resource-mobilisation ends with a reserve-reconciliation step signed by the auditor', () => {
    const last = RESOURCE_MOBILISATION.steps[RESOURCE_MOBILISATION.steps.length - 1]!;
    expect(last.id).toBe('reconcile');
    expect(last.role).toBe('auditor');
    expect(last.requiresSignature).toBe(true);
  });

  it('every step carries an audit tag namespaced under emergency.', () => {
    for (const w of EMERGENCY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('emergency.')).toBe(true);
      }
    }
  });
});

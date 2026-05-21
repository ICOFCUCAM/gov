import { describe, it, expect } from 'vitest';
import { HEALTH_WORKFLOWS, PATIENT_ADMISSION, BREAK_GLASS_ACCESS } from './health-workflows';

describe('HEALTH_WORKFLOWS', () => {
  it('includes both documented workflows', () => {
    expect(HEALTH_WORKFLOWS).toContain(PATIENT_ADMISSION);
    expect(HEALTH_WORKFLOWS).toContain(BREAK_GLASS_ACCESS);
  });

  it('every workflow has a unique id and at least one step', () => {
    const ids = HEALTH_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of HEALTH_WORKFLOWS) {
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('every step has a unique id within its workflow', () => {
    for (const w of HEALTH_WORKFLOWS) {
      const stepIds = w.steps.map(s => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
    }
  });

  it('every step audit tag is namespaced under health.<workflow>', () => {
    for (const w of HEALTH_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('health.')).toBe(true);
      }
    }
  });

  it('every workflow cites at least one blueprint section', () => {
    for (const w of HEALTH_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
    }
  });

  it('PATIENT_ADMISSION begins with patient presenting at intake', () => {
    expect(PATIENT_ADMISSION.steps[0]!.role).toBe('patient');
    expect(PATIENT_ADMISSION.steps[0]!.kind).toBe('request');
  });

  it('BREAK_GLASS_ACCESS demands a signature on the access step', () => {
    const sig = BREAK_GLASS_ACCESS.steps.some(s => s.requiresSignature);
    expect(sig).toBe(true);
  });
});

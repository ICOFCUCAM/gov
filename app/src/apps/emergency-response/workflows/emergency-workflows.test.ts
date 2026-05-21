import { describe, it, expect } from 'vitest';
import {
  EMERGENCY_WORKFLOWS,
  INCIDENT_ACTIVATION, EVACUATION_ORDER, RESOURCE_MOBILISATION,
} from './emergency-workflows';

describe('EMERGENCY_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(EMERGENCY_WORKFLOWS).toEqual(expect.arrayContaining([
      INCIDENT_ACTIVATION, EVACUATION_ORDER, RESOURCE_MOBILISATION,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = EMERGENCY_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under emergency.', () => {
    for (const w of EMERGENCY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('emergency.')).toBe(true);
      }
    }
  });

  it('EVACUATION_ORDER requires officer authorisation', () => {
    expect(EVACUATION_ORDER.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

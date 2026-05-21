import { describe, it, expect } from 'vitest';
import {
  COMMS_WORKFLOWS,
  CYBER_INCIDENT_RESPONSE, EMERGENCY_BROADCAST, SPECTRUM_LICENCE,
} from './communications-workflows';

describe('COMMS_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(COMMS_WORKFLOWS).toEqual(expect.arrayContaining([
      CYBER_INCIDENT_RESPONSE, EMERGENCY_BROADCAST, SPECTRUM_LICENCE,
    ]));
  });

  it('workflow ids are unique and steps are non-empty', () => {
    const ids = COMMS_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of COMMS_WORKFLOWS) expect(w.steps.length).toBeGreaterThan(0);
  });

  it('every step audit tag is namespaced under comms.', () => {
    for (const w of COMMS_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('comms.')).toBe(true);
      }
    }
  });

  it('EMERGENCY_BROADCAST requires a signed authorisation step', () => {
    expect(EMERGENCY_BROADCAST.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

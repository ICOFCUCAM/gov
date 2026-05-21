import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENT_WORKFLOWS,
  ENVIRONMENTAL_IMPACT_ASSESSMENT, EXTRACTION_PERMIT, CLIMATE_INCIDENT_DECLARATION,
} from './environment-workflows';

describe('ENVIRONMENT_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(ENVIRONMENT_WORKFLOWS).toEqual(expect.arrayContaining([
      ENVIRONMENTAL_IMPACT_ASSESSMENT, EXTRACTION_PERMIT, CLIMATE_INCIDENT_DECLARATION,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = ENVIRONMENT_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under environment.', () => {
    for (const w of ENVIRONMENT_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('environment.')).toBe(true);
      }
    }
  });

  it('EXTRACTION_PERMIT requires officer sign-off', () => {
    expect(EXTRACTION_PERMIT.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

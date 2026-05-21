import { describe, it, expect } from 'vitest';
import {
  POLICE_WORKFLOWS,
  INCIDENT_DISPATCH, INVESTIGATION_HANDOFF, USE_OF_FORCE_REVIEW_WF,
} from './police-workflows';

describe('POLICE_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(POLICE_WORKFLOWS).toEqual(expect.arrayContaining([
      INCIDENT_DISPATCH, INVESTIGATION_HANDOFF, USE_OF_FORCE_REVIEW_WF,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = POLICE_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under police.', () => {
    for (const w of POLICE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('police.')).toBe(true);
      }
    }
  });

  it('USE_OF_FORCE_REVIEW_WF requires at least one signature', () => {
    expect(USE_OF_FORCE_REVIEW_WF.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

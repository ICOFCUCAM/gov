import { describe, it, expect } from 'vitest';
import {
  AGRICULTURE_WORKFLOWS,
  SEED_SUBSIDY_DISBURSEMENT, PEST_RESPONSE, IRRIGATION_ALLOCATION,
} from './agriculture-workflows';

describe('AGRICULTURE_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(AGRICULTURE_WORKFLOWS).toEqual(expect.arrayContaining([
      SEED_SUBSIDY_DISBURSEMENT, PEST_RESPONSE, IRRIGATION_ALLOCATION,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = AGRICULTURE_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under agriculture.', () => {
    for (const w of AGRICULTURE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('agriculture.')).toBe(true);
      }
    }
  });

  it('SEED_SUBSIDY_DISBURSEMENT requires officer authorisation', () => {
    expect(SEED_SUBSIDY_DISBURSEMENT.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

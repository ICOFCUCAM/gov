import { describe, it, expect } from 'vitest';
import {
  SENATE_WORKFLOWS,
  TREATY_RATIFICATION, COMMITTEE_INQUIRY, SENATE_BILL_REVIEW,
} from './senate-workflows';

describe('SENATE_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(SENATE_WORKFLOWS).toEqual(expect.arrayContaining([
      TREATY_RATIFICATION, COMMITTEE_INQUIRY, SENATE_BILL_REVIEW,
    ]));
  });

  it('workflow ids are unique and step ids are unique within workflows', () => {
    const ids = SENATE_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of SENATE_WORKFLOWS) {
      const stepIds = w.steps.map(s => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
    }
  });

  it('every step audit tag is namespaced under senate.', () => {
    for (const w of SENATE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('senate.')).toBe(true);
      }
    }
  });

  it('TREATY_RATIFICATION requires concurrence (signature) before deposit', () => {
    expect(TREATY_RATIFICATION.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

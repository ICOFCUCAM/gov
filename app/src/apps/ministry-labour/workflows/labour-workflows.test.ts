import { describe, it, expect } from 'vitest';
import {
  LABOUR_WORKFLOWS,
  UNEMPLOYMENT_BENEFIT_DISBURSEMENT, WORKPLACE_INSPECTION, INDUSTRIAL_TRIBUNAL,
} from './labour-workflows';

describe('LABOUR_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(LABOUR_WORKFLOWS).toEqual(expect.arrayContaining([
      UNEMPLOYMENT_BENEFIT_DISBURSEMENT, WORKPLACE_INSPECTION, INDUSTRIAL_TRIBUNAL,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = LABOUR_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under labour.', () => {
    for (const w of LABOUR_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('labour.')).toBe(true);
      }
    }
  });

  it('INDUSTRIAL_TRIBUNAL requires a signed ruling', () => {
    expect(INDUSTRIAL_TRIBUNAL.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

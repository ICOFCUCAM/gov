import { describe, it, expect } from 'vitest';
import {
  FOREIGN_WORKFLOWS,
  TREATY_RATIFICATION, DEMARCHE_DELIVERY, CONSULAR_EVACUATION,
} from './foreign-workflows';

describe('FOREIGN_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(FOREIGN_WORKFLOWS).toEqual(expect.arrayContaining([
      TREATY_RATIFICATION, DEMARCHE_DELIVERY, CONSULAR_EVACUATION,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = FOREIGN_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under foreign.', () => {
    for (const w of FOREIGN_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('foreign.')).toBe(true);
      }
    }
  });

  it('CONSULAR_EVACUATION declares ministerial sign-off', () => {
    expect(CONSULAR_EVACUATION.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

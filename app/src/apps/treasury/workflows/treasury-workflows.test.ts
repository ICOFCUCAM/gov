import { describe, it, expect } from 'vitest';
import {
  TREASURY_WORKFLOWS,
  DISBURSEMENT_AUTHORISATION, RESERVE_DRAWDOWN,
} from './treasury-workflows';

describe('TREASURY_WORKFLOWS', () => {
  it('includes the two documented workflows', () => {
    expect(TREASURY_WORKFLOWS).toEqual(expect.arrayContaining([
      DISBURSEMENT_AUTHORISATION, RESERVE_DRAWDOWN,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = TREASURY_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under treasury.', () => {
    for (const w of TREASURY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('treasury.')).toBe(true);
      }
    }
  });

  it('DISBURSEMENT_AUTHORISATION requires officer sign-off', () => {
    expect(DISBURSEMENT_AUTHORISATION.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

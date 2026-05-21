import { describe, it, expect } from 'vitest';
import {
  TRADE_WORKFLOWS,
  EXPORT_LICENCE, INDUSTRIAL_INCIDENT_RESPONSE, TRADE_AGREEMENT_RATIFICATION,
} from './trade-workflows';

describe('TRADE_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(TRADE_WORKFLOWS).toEqual(expect.arrayContaining([
      EXPORT_LICENCE, INDUSTRIAL_INCIDENT_RESPONSE, TRADE_AGREEMENT_RATIFICATION,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = TRADE_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under trade.', () => {
    for (const w of TRADE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('trade.')).toBe(true);
      }
    }
  });

  it('TRADE_AGREEMENT_RATIFICATION requires the Senate concurrence pathway', () => {
    expect(TRADE_AGREEMENT_RATIFICATION.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

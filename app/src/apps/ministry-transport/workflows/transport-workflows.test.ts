import { describe, it, expect } from 'vitest';
import {
  TRANSPORT_WORKFLOWS,
  INFRASTRUCTURE_CLOSURE, EVACUATION_ROUTING, FREIGHT_PERMIT,
} from './transport-workflows';

describe('TRANSPORT_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(TRANSPORT_WORKFLOWS).toEqual(expect.arrayContaining([
      INFRASTRUCTURE_CLOSURE, EVACUATION_ROUTING, FREIGHT_PERMIT,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = TRANSPORT_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under transport.', () => {
    for (const w of TRANSPORT_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('transport.')).toBe(true);
      }
    }
  });

  it('INFRASTRUCTURE_CLOSURE requires officer sign-off', () => {
    expect(INFRASTRUCTURE_CLOSURE.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import {
  PRESIDENCY_WORKFLOWS,
  EXECUTIVE_ORDER, CABINET_RESOLUTION, MINISTERIAL_APPOINTMENT,
} from './presidency-workflows';

describe('PRESIDENCY_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(PRESIDENCY_WORKFLOWS).toEqual(expect.arrayContaining([
      EXECUTIVE_ORDER, CABINET_RESOLUTION, MINISTERIAL_APPOINTMENT,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = PRESIDENCY_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under presidency.', () => {
    for (const w of PRESIDENCY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('presidency.')).toBe(true);
      }
    }
  });

  it('EXECUTIVE_ORDER includes a presidential signing step', () => {
    expect(EXECUTIVE_ORDER.steps.some(s => s.id === 'sign')).toBe(true);
  });
});

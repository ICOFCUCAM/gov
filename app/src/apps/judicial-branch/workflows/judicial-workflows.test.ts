import { describe, it, expect } from 'vitest';
import {
  JUDICIAL_WORKFLOWS,
  CONSTITUTIONAL_RULING, JUDICIAL_CONDUCT_REVIEW, APPELLATE_HEARING,
} from './judicial-workflows';

describe('JUDICIAL_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(JUDICIAL_WORKFLOWS).toEqual(
      expect.arrayContaining([CONSTITUTIONAL_RULING, JUDICIAL_CONDUCT_REVIEW, APPELLATE_HEARING]),
    );
  });

  it('workflow ids are unique and steps are non-empty', () => {
    const ids = JUDICIAL_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of JUDICIAL_WORKFLOWS) {
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('every step audit tag is namespaced under judicial.', () => {
    for (const w of JUDICIAL_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('judicial.')).toBe(true);
      }
    }
  });

  it('CONSTITUTIONAL_RULING requires at least one signed step', () => {
    expect(CONSTITUTIONAL_RULING.steps.some(s => s.requiresSignature)).toBe(true);
  });

  it('every step within a workflow has a unique id', () => {
    for (const w of JUDICIAL_WORKFLOWS) {
      const stepIds = w.steps.map(s => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
    }
  });
});

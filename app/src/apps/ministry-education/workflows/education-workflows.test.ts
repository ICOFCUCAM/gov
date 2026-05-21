import { describe, it, expect } from 'vitest';
import {
  EDUCATION_WORKFLOWS,
  CURRICULUM_REVIEW, EXAM_INTEGRITY_RESPONSE, RESEARCH_GRANT,
} from './education-workflows';

describe('EDUCATION_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(EDUCATION_WORKFLOWS).toEqual(expect.arrayContaining([
      CURRICULUM_REVIEW, EXAM_INTEGRITY_RESPONSE, RESEARCH_GRANT,
    ]));
  });

  it('workflow ids are unique and steps are non-empty', () => {
    const ids = EDUCATION_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of EDUCATION_WORKFLOWS) expect(w.steps.length).toBeGreaterThan(0);
  });

  it('every step audit tag is namespaced under education.', () => {
    for (const w of EDUCATION_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('education.')).toBe(true);
      }
    }
  });

  it('CURRICULUM_REVIEW concludes with a ministerial adoption step', () => {
    expect(CURRICULUM_REVIEW.steps.some(s => s.id === 'adopt')).toBe(true);
  });
});

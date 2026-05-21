import { describe, it, expect } from 'vitest';
import {
  ASSEMBLY_WORKFLOWS,
  BUDGET_APPROPRIATION, CITIZEN_PETITION_DEBATE, QUESTION_TIME_WORKFLOW,
} from './assembly-workflows';

describe('ASSEMBLY_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(ASSEMBLY_WORKFLOWS).toEqual(expect.arrayContaining([
      BUDGET_APPROPRIATION, CITIZEN_PETITION_DEBATE, QUESTION_TIME_WORKFLOW,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = ASSEMBLY_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under assembly.', () => {
    for (const w of ASSEMBLY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('assembly.')).toBe(true);
      }
    }
  });

  it('BUDGET_APPROPRIATION moves through committee scrutiny', () => {
    expect(BUDGET_APPROPRIATION.steps.some(s => s.id === 'scrutiny')).toBe(true);
  });
});

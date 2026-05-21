import { describe, it, expect } from 'vitest';
import { ASSEMBLY_WORKFLOWS, BUDGET_APPROPRIATION, CITIZEN_PETITION_DEBATE, QUESTION_TIME_WORKFLOW } from './assembly-workflows';

describe('assembly workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(ASSEMBLY_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of ASSEMBLY_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('budget-appropriation requires finance-committee scrutiny before vote', () => {
    const order = BUDGET_APPROPRIATION.steps.map(s => s.id);
    expect(order.indexOf('scrutiny')).toBeLessThan(order.indexOf('vote'));
    const vote = BUDGET_APPROPRIATION.steps.find(s => s.id === 'vote')!;
    expect(vote.title.toLowerCase()).toContain('roll-call');
  });

  it('citizen-petition-debate requires 5000-signature collection before scheduling', () => {
    const order = CITIZEN_PETITION_DEBATE.steps.map(s => s.id);
    expect(order.indexOf('collect')).toBeLessThan(order.indexOf('schedule'));
  });

  it('question-time ends with auditor sealing to Hansard', () => {
    const last = QUESTION_TIME_WORKFLOW.steps[QUESTION_TIME_WORKFLOW.steps.length - 1]!;
    expect(last.role).toBe('auditor');
    expect(last.title.toLowerCase()).toContain('hansard');
  });

  it('every step carries an audit tag namespaced under assembly.', () => {
    for (const w of ASSEMBLY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('assembly.')).toBe(true);
      }
    }
  });
});

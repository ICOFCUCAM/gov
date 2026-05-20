import { describe, it, expect } from 'vitest';
import { EDUCATION_WORKFLOWS, CURRICULUM_REVIEW, EXAM_INTEGRITY_RESPONSE, RESEARCH_GRANT } from './education-workflows';

describe('ministry-education workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(EDUCATION_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of EDUCATION_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('curriculum-review requires civilian-panel consultation before ministerial adoption', () => {
    const order = CURRICULUM_REVIEW.steps.map(s => s.id);
    expect(order.indexOf('consult')).toBeLessThan(order.indexOf('adopt'));
    const consult = CURRICULUM_REVIEW.steps.find(s => s.id === 'consult')!;
    expect(consult.role).toBe('civilian-panel');
  });

  it('exam-integrity-response ends with auditor closure', () => {
    const last = EXAM_INTEGRITY_RESPONSE.steps[EXAM_INTEGRITY_RESPONSE.steps.length - 1]!;
    expect(last.role).toBe('auditor');
    expect(last.requiresSignature).toBe(true);
  });

  it('research-grant requires peer-review and council vote before ministerial award', () => {
    const order = RESEARCH_GRANT.steps.map(s => s.id);
    expect(order.indexOf('peer')).toBeLessThan(order.indexOf('award'));
    expect(order.indexOf('council')).toBeLessThan(order.indexOf('award'));
  });

  it('every step carries an audit tag namespaced under education.', () => {
    for (const w of EDUCATION_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('education.')).toBe(true);
      }
    }
  });
});

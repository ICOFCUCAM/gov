import { describe, it, expect } from 'vitest';
import { SENATE_WORKFLOWS, TREATY_RATIFICATION, COMMITTEE_INQUIRY, SENATE_BILL_REVIEW } from './senate-workflows';

describe('senate workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(SENATE_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of SENATE_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('treaty-ratification requires public consultation before vote', () => {
    const order = TREATY_RATIFICATION.steps.map(s => s.id);
    expect(order.indexOf('consult')).toBeLessThan(order.indexOf('vote'));
    const vote = TREATY_RATIFICATION.steps.find(s => s.id === 'vote')!;
    expect(vote.requiresSignature).toBe(true);
    expect(vote.title.toLowerCase()).toContain('two-thirds');
  });

  it('committee-inquiry ends with auditor sealing to Hansard', () => {
    const last = COMMITTEE_INQUIRY.steps[COMMITTEE_INQUIRY.steps.length - 1]!;
    expect(last.role).toBe('auditor');
    expect(last.title.toLowerCase()).toContain('hansard');
  });

  it('senate-bill-review requires conference before vote if amended', () => {
    const order = SENATE_BILL_REVIEW.steps.map(s => s.id);
    expect(order.indexOf('conference')).toBeLessThan(order.indexOf('vote'));
  });

  it('every step carries an audit tag namespaced under senate.', () => {
    for (const w of SENATE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('senate.')).toBe(true);
      }
    }
  });
});

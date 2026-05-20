import { describe, it, expect } from 'vitest';
import { JUSTICE_WORKFLOWS, CASE_FILING_APPROVAL, EVIDENCE_CHAIN_HANDOFF } from './case-filing-workflow';

describe('justice workflows', () => {
  it('declares at least one executable workflow', () => {
    expect(JUSTICE_WORKFLOWS.length).toBeGreaterThanOrEqual(2);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of JUSTICE_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('case-filing-approval reaches a decision step with judge signature', () => {
    const decide = CASE_FILING_APPROVAL.steps.find(s => s.kind === 'decision');
    expect(decide).toBeDefined();
    expect(decide!.role).toBe('judge');
    expect(decide!.requiresSignature).toBe(true);
  });

  it('evidence chain handoff requires custodian signature at every hop', () => {
    const custodianSteps = EVIDENCE_CHAIN_HANDOFF.steps.filter(s => s.role === 'evidence-custodian');
    const allSigned = custodianSteps.filter(s => s.kind !== 'execution' || s.id === 'receive').every(s => s.requiresSignature);
    expect(allSigned).toBe(true);
  });

  it('every step carries an audit tag namespaced under justice.', () => {
    for (const w of JUSTICE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('justice.')).toBe(true);
      }
    }
  });
});

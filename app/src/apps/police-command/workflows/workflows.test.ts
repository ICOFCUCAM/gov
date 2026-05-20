import { describe, it, expect } from 'vitest';
import { POLICE_WORKFLOWS, INCIDENT_DISPATCH, INVESTIGATION_HANDOFF, USE_OF_FORCE_REVIEW_WF } from './police-workflows';

describe('police-command workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(POLICE_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of POLICE_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('incident-dispatch reaches a clearing step signed by the patrol officer', () => {
    const clear = INCIDENT_DISPATCH.steps.find(s => s.id === 'clear');
    expect(clear).toBeDefined();
    expect(clear!.role).toBe('patrol-officer');
    expect(clear!.requiresSignature).toBe(true);
  });

  it('investigation-handoff requires evidence custody signature and prosecutor file', () => {
    const evidence = INVESTIGATION_HANDOFF.steps.find(s => s.id === 'evidence')!;
    const file = INVESTIGATION_HANDOFF.steps.find(s => s.id === 'file')!;
    expect(evidence.role).toBe('evidence-custodian');
    expect(evidence.requiresSignature).toBe(true);
    expect(file.role).toBe('prosecutor');
    expect(file.requiresSignature).toBe(true);
  });

  it('use-of-force review mandates bodyworn audit and IA review at signed steps', () => {
    const bwc = USE_OF_FORCE_REVIEW_WF.steps.find(s => s.id === 'bwc')!;
    const ia = USE_OF_FORCE_REVIEW_WF.steps.find(s => s.id === 'ia')!;
    expect(bwc.requiresSignature).toBe(true);
    expect(ia.role).toBe('internal-affairs');
    expect(ia.requiresSignature).toBe(true);
  });

  it('every step carries an audit tag namespaced under police.', () => {
    for (const w of POLICE_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('police.')).toBe(true);
      }
    }
  });
});

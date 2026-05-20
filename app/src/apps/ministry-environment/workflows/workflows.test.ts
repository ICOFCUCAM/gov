import { describe, it, expect } from 'vitest';
import { ENVIRONMENT_WORKFLOWS, ENVIRONMENTAL_IMPACT_ASSESSMENT, EXTRACTION_PERMIT, CLIMATE_INCIDENT_DECLARATION } from './environment-workflows';

describe('ministry-environment workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(ENVIRONMENT_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of ENVIRONMENT_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('EIA includes a public-comment step signed by the citizen panel', () => {
    const comment = ENVIRONMENTAL_IMPACT_ASSESSMENT.steps.find(s => s.id === 'comment')!;
    expect(comment.role).toBe('citizen-panel');
    expect(comment.requiresSignature).toBe(true);
  });

  it('extraction-permit requires EIA before issue', () => {
    const order = EXTRACTION_PERMIT.steps.map(s => s.id);
    expect(order.indexOf('eia')).toBeLessThan(order.indexOf('issue'));
  });

  it('climate-incident-declaration cascades before restoration', () => {
    const order = CLIMATE_INCIDENT_DECLARATION.steps.map(s => s.id);
    expect(order.indexOf('cascade')).toBeLessThan(order.indexOf('restoration'));
  });

  it('every step carries an audit tag namespaced under environment.', () => {
    for (const w of ENVIRONMENT_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('environment.')).toBe(true);
      }
    }
  });
});

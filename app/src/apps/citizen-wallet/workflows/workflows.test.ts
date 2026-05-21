import { describe, it, expect } from 'vitest';
import { PORTAL_WORKFLOWS, SERVICE_REQUEST, CONSENT_GRANT, APPEAL_FILING } from './portal-workflows';

describe('citizen portal workflows', () => {
  it('declares at least three executable workflows', () => {
    expect(PORTAL_WORKFLOWS.length).toBeGreaterThanOrEqual(3);
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of PORTAL_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
      expect(w.steps.length).toBeGreaterThan(0);
    }
  });

  it('service-request includes consent step before decision', () => {
    const order = SERVICE_REQUEST.steps.map(s => s.id);
    expect(order.indexOf('consent')).toBeLessThan(order.indexOf('decide'));
    expect(order).toContain('appeal');
  });

  it('consent-grant issues a revocable token after citizen review', () => {
    const order = CONSENT_GRANT.steps.map(s => s.id);
    expect(order.indexOf('review')).toBeLessThan(order.indexOf('grant'));
    expect(order.indexOf('grant')).toBeLessThan(order.indexOf('issue'));
    const issue = CONSENT_GRANT.steps.find(s => s.id === 'issue')!;
    expect(issue.title.toLowerCase()).toContain('revocable');
  });

  it('appeal-filing publishes reasoning after decision', () => {
    const order = APPEAL_FILING.steps.map(s => s.id);
    expect(order.indexOf('decide')).toBeLessThan(order.indexOf('publish'));
    const decide = APPEAL_FILING.steps.find(s => s.id === 'decide')!;
    expect(decide.title.toLowerCase()).toContain('reasoning');
  });

  it('every step carries an audit tag namespaced under portal.', () => {
    for (const w of PORTAL_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('portal.')).toBe(true);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  PORTAL_WORKFLOWS,
  SERVICE_REQUEST, CONSENT_GRANT, APPEAL_FILING,
} from './portal-workflows';

describe('PORTAL_WORKFLOWS', () => {
  it('includes the three documented citizen workflows', () => {
    expect(PORTAL_WORKFLOWS).toEqual(expect.arrayContaining([
      SERVICE_REQUEST, CONSENT_GRANT, APPEAL_FILING,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = PORTAL_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under portal.', () => {
    for (const w of PORTAL_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('portal.')).toBe(true);
      }
    }
  });

  it('CONSENT_GRANT requires the citizen to sign the grant', () => {
    expect(CONSENT_GRANT.steps.some(s => s.requiresSignature)).toBe(true);
  });
});

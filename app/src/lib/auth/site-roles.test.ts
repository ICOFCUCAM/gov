import { describe, it, expect } from 'vitest';
import { apiPermission, canCertifyForAgency, canSignForSite } from './roles';

describe('who may act on the national facility register', () => {
  it('changes to the facility policy are for administrators only', () => {
    expect(apiPermission({ role: 'signatory' }, 'POST', '/api/facilities/policy')).toMatch(/administrator/);
    expect(apiPermission({ role: 'administrator' }, 'POST', '/api/facilities/policy/FPC-1')).toBeNull();
  });
  it('an institution records its own sites only', () => {
    expect(apiPermission({ role: 'officer', institution: 'min-health' }, 'POST', '/api/org/ministries/min-health/facilities')).toBeNull();
    expect(apiPermission({ role: 'officer', institution: 'min-health' }, 'POST', '/api/org/ministries/min-interior/facilities')).toMatch(/own institution/);
  });
  it('publishing and certifying for the institution need someone who can sign for it', () => {
    expect(canSignForSite({ role: 'officer', institution: 'min-health' }, 'min-health')).toMatch(/can sign/);
    expect(canSignForSite({ role: 'signatory', institution: 'min-health' }, 'min-health')).toBeNull();
    expect(canSignForSite({ role: 'signatory', institution: 'min-interior' }, 'min-health')).toMatch(/own institution/);
  });
  it('the mapping agency\'s officials certify at its stage', () => {
    expect(canCertifyForAgency({ role: 'officer', institution: 'survey' }, 'survey')).toBeNull();
    expect(canCertifyForAgency({ role: 'signatory', institution: 'min-health' }, 'survey')).toMatch(/mapping agency/);
    expect(canCertifyForAgency({ role: 'auditor', institution: 'survey' }, 'survey')).toMatch(/Auditors/);
    expect(canCertifyForAgency({ role: 'administrator' }, undefined)).toBeNull();
  });
});

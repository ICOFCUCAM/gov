import { describe, it, expect } from 'vitest';
import { apiPermission, canActForSite, canDecidePermit, canReadInstitution, canReadPermits, installationAdmin, canCertifyParcel, canRecordParcel, canSeeParcelRights, canSignDirective, canSeeDraft, directiveIssuer, ministryPermission, roleFromSubstrate, roleOf, ROLES } from './roles';

describe('the land parcel register', () => {
  it('lets the cadastre authority record, its signatories publish, and keeps holders to those with need', () => {
    const lands = 'min-lands';
    expect(canRecordParcel({ role: 'officer', institution: lands }, lands)).toBeNull();
    expect(canRecordParcel({ role: 'auditor', institution: lands }, lands)).toMatch(/Auditors/);
    expect(canRecordParcel({ role: 'signatory', institution: 'min-health' }, lands)).toMatch(/cadastre authority/);
    expect(canRecordParcel({ role: 'administrator' }, lands)).toBeNull();
    expect(canRecordParcel({ role: 'officer' }, lands)).toMatch(/cadastre authority/);
    expect(canCertifyParcel({ role: 'officer', institution: lands }, lands)).toMatch(/can sign/);
    expect(canCertifyParcel({ role: 'signatory', institution: lands }, lands)).toBeNull();
    expect(canCertifyParcel({ role: 'administrator' }, undefined)).toBeNull();
    expect(canCertifyParcel({ role: 'signatory' }, lands)).toMatch(/can sign/);
    expect(canSeeParcelRights({ role: 'auditor', institution: lands }, lands)).toBeNull();
    expect(canSeeParcelRights({ role: 'auditor' }, lands)).toBeNull();
    expect(canSeeParcelRights({ role: 'administrator' }, lands)).toBeNull();
    expect(canSeeParcelRights({ role: 'officer' }, lands)).toMatch(/need/);
    expect(canSeeParcelRights({ role: 'administrator', institution: 'min-health' }, lands)).toMatch(/need/);
    // The policy is for administrators; the register's own routes check the authority themselves.
    expect(apiPermission({ role: 'signatory' }, 'POST', '/api/parcels/policy')).toMatch(/administrator/);
    expect(apiPermission({ role: 'officer' }, 'POST', '/api/parcels')).toBeNull();
    expect(apiPermission({ role: 'auditor' }, 'POST', '/api/parcels/PCL-000001')).toMatch(/Auditors/);
  });
});

describe('what an official may do', () => {
  it('keeps accounts and sessions from before roles able to do everything', () => {
    expect(roleOf({})).toBe('administrator');
    expect(apiPermission({}, 'POST', '/api/auth/officials')).toBeNull();
  });

  it('lets auditors read everything and change nothing but their own sign-in', () => {
    const a = { role: 'auditor' as const };
    expect(apiPermission(a, 'GET', '/api/directives')).toBeNull();
    expect(apiPermission(a, 'POST', '/api/directives')).toMatch(/Auditors/);
    expect(apiPermission(a, 'DELETE', '/api/auth/official')).toBeNull();
  });

  it('keeps accounts, setup and the structure of government for administrators', () => {
    const s = { role: 'signatory' as const };
    for (const p of ['/api/auth/officials', '/api/auth/officials/abc', '/api/org/ministries', '/api/org/ministries/m1/merge', '/api/setup', '/api/sovereign', '/api/sovereign/preset']) {
      expect(apiPermission(s, 'POST', p)).toMatch(/administrator/);
      expect(apiPermission({ role: 'administrator' }, 'POST', p)).toBeNull();
    }
  });

  it('limits an official with an institution to that ministry\'s workspace', () => {
    const o = { role: 'officer' as const, institution: 'fed-treasury' };
    expect(apiPermission(o, 'POST', '/api/org/ministries/fed-treasury/queue/q1/act')).toBeNull();
    expect(apiPermission(o, 'POST', '/api/org/ministries/fed-health/queue/q1/act')).toMatch(/own institution/);
    expect(ministryPermission({ role: 'officer' }, 'fed-health')).toBeNull();
  });

  it('lets only those who can sign sign or withdraw, for their own institution', () => {
    expect(canSignDirective({ role: 'officer' }, 'platform')).toMatch(/can sign/);
    expect(canSignDirective({ role: 'signatory', institution: 'fed-treasury' }, 'fed-treasury')).toBeNull();
    expect(canSignDirective({ role: 'signatory', institution: 'fed-treasury' }, 'fed-health')).toMatch(/own institution/);
    expect(canSignDirective({ role: 'signatory' }, 'fed-health')).toBeNull();
    expect(canSeeDraft({ role: 'officer', institution: 'fed-treasury' }, 'fed-health')).toBe(false);
    expect(directiveIssuer({ role: 'officer', institution: 'fed-treasury' }, 'fed-health')).toBe('fed-treasury');
    // Whole government issues as the executive office, never in another institution's name (plan phase 2).
    expect(directiveIssuer({ role: 'officer' }, 'fed-health')).toBe('executive-office');
    expect(directiveIssuer(null, 'fed-health')).toBe('fed-health');
    const bounds = { independent: ['court'], judicial: ['court'], institutions: ['court', 'fed-health', 'fed-treasury'] };
    expect(canSignDirective({ role: 'signatory', bounds }, 'fed-health')).toMatch(/needs an account of that institution/);
    expect(canSignDirective({ role: 'signatory', bounds }, 'executive-office')).toBeNull();
    expect(canSignDirective({ role: 'administrator', bounds }, 'court')).toMatch(/needs an account/);
    expect(canSeeDraft({ role: 'officer', bounds }, 'court')).toBe(false);
    expect(canSeeDraft({ role: 'officer', bounds }, 'fed-health')).toBe(true);
  });

  it('maps the substrate\'s officer roles, and labels roles in plain words', () => {
    expect(roleFromSubstrate('platform-admin')).toBe('administrator');
    expect(roleFromSubstrate('minister')).toBe('signatory');
    expect(roleFromSubstrate('duty-officer')).toBe('officer');
    expect(ROLES.map(r => r.label)).toEqual(['Administrator', 'Can sign', 'Officer', 'Auditor (read only)']);
  });
});

describe('role-less sessions and accounts (deny by default)', () => {
  it('only records from before roles existed keep administrator; anything newer without a role is an officer', async () => {
    const { roleOf, ROLES_SINCE } = await import('./roles');
    expect(roleOf({ role: 'auditor', iat: ROLES_SINCE + 10 })).toBe('auditor');
    expect(roleOf({ iat: ROLES_SINCE - 3600 })).toBe('administrator');
    expect(roleOf({ iat: ROLES_SINCE + 3600 })).toBe('officer');
    expect(roleOf({ createdAt: '2026-01-01T00:00:00Z' })).toBe('administrator');
    expect(roleOf({ createdAt: '2026-12-01T00:00:00Z' })).toBe('officer');
  });
});

describe('signing in with the identity provider and passkeys', () => {
  it('keeps the provider for administrators, and one\'s own passkeys open to every role', async () => {
    const { mutationRule } = await import('./roles');
    expect(mutationRule('/api/auth/officials/identity-provider')).toBe('admin');
    expect(apiPermission({ role: 'signatory' }, 'POST', '/api/auth/officials/identity-provider')).toMatch(/administrator/);
    expect(apiPermission({ role: 'administrator' }, 'POST', '/api/auth/officials/identity-provider')).toBeNull();
    expect(mutationRule('/api/auth/passkeys')).toBe('any-role');
    expect(mutationRule('/api/auth/passkeys/options')).toBe('any-role');
    // Setting up a passkey is how an official the policy requires a second step of gets one.
    expect(apiPermission({ role: 'auditor', twoStepRequired: true }, 'POST', '/api/auth/passkeys')).toBeNull();
  });
});

describe('installation, sites and reads (go-live review H-4, M-2, M-3)', () => {
  it('installation-level decisions: government-wide administrators of this nation only', () => {
    expect(installationAdmin({ role: 'administrator' })).toBeNull();
    expect(installationAdmin({})).toBeNull(); // accounts from before roles keep what they could do
    for (const s of [{ role: 'administrator' as const, institution: 'min-health' }, { role: 'signatory' as const }, { role: 'officer' as const, institution: 'min-agriculture' }, { role: 'auditor' as const }]) {
      expect(installationAdmin(s)).toMatch(/whole government/);
    }
    expect(apiPermission({ role: 'officer', institution: 'min-agriculture' }, 'POST', '/api/releases/sovereignty')).toMatch(/whole government/);
    expect(apiPermission({ role: 'officer', institution: 'min-agriculture' }, 'POST', '/api/releases/requests')).toBeNull();
    expect(apiPermission({ role: 'officer' }, 'GET', '/api/releases/sovereignty')).toBeNull();
  });

  it('a site is changed by its own institution or the whole government', () => {
    expect(canActForSite({ role: 'officer', institution: 'min-health' }, 'min-health')).toBeNull();
    expect(canActForSite({ role: 'officer', institution: 'min-agriculture' }, 'min-health')).toMatch(/owns this website/);
    expect(canActForSite({ role: 'officer', institution: 'min-agriculture' }, undefined)).toMatch(/owns this website/);
    expect(canActForSite({ role: 'officer' }, undefined)).toBeNull();
    expect(canActForSite({ role: 'auditor', institution: 'min-health' }, 'min-health')).toMatch(/Auditors/);
  });

  it('personal data is read by the institution, the whole government and auditors', () => {
    expect(canReadInstitution({ role: 'officer', institution: 'min-health' }, 'min-health')).toBeNull();
    expect(canReadInstitution({ role: 'officer', institution: 'min-agriculture' }, 'min-health')).toMatch(/own institution/);
    expect(canReadInstitution({ role: 'officer' }, 'min-health')).toBeNull();
    expect(canReadInstitution({ role: 'auditor', institution: 'min-agriculture' }, 'min-health')).toBeNull();
    expect(canReadPermits({ role: 'officer', institution: 'min-interior' }, ['min-interior'])).toBeNull();
    expect(canReadPermits({ role: 'signatory', institution: 'min-health' }, ['min-interior'])).toMatch(/issues them/);
    expect(canReadPermits({ role: 'auditor', institution: 'min-health' }, ['min-interior'])).toBeNull();
    expect(canDecidePermit({ role: 'auditor' }, ['min-interior'])).toMatch(/Auditors/);
    expect(canDecidePermit({ role: 'officer', institution: 'min-health' }, ['min-interior'])).toMatch(/issues them/);
  });
});

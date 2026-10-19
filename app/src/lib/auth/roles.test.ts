import { describe, it, expect } from 'vitest';
import { apiPermission, canCertifyParcel, canRecordParcel, canSeeParcelRights, canSignDirective, canSeeDraft, directiveIssuer, ministryPermission, roleFromSubstrate, roleOf, ROLES } from './roles';

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
    expect(directiveIssuer({ role: 'officer' }, 'fed-health')).toBe('fed-health');
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

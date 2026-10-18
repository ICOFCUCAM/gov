import { describe, it, expect } from 'vitest';
import { apiPermission, canSignDirective, canSeeDraft, directiveIssuer, ministryPermission, roleFromSubstrate, roleOf, ROLES } from './roles';

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

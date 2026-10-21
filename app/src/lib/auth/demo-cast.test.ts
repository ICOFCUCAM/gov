// The demo cast (lib/auth/demo-cast.ts): planned from who is responsible in the
// deployment profile, refreshed in place, and refused everywhere — creation,
// password sign-in, identity-provider sign-in and the current session — once
// the installation may not hold samples (production).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));

import { resetOfficials, createAccount, listDemoAccounts, checkPassword, issueReset, resetPassword, sessionSecret, linkIdentity, accountByIdentity, DEMO_CAST_DOMAIN } from './officials';
import { planCast, refreshCast, castGroups, castClaims, actAsRefusal } from './demo-cast';
import { currentOfficial } from './official';
import { signClaims } from './session-token';
import { setSovereign, listMinistries, listAudit } from '@/lib/data/store';

process.env.CIVICOS_SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SCRYPT_N = '16384';

let CIVIL = '', TAX = '';
beforeEach(async () => {
  resetOfficials(); cookie = undefined;
  const ids = listMinistries().map(m => m.id);
  CIVIL = ids[0]!; TAX = ids[1]!;
  setSovereign({ deployment: { authorities: { civilRegistration: CIVIL!, dataProtection: CIVIL!, tax: TAX! } } }, 'test');
  await createAccount({ email: 'admin@gov.test', name: 'Admin', office: 'Head of Service', password: 'correct horse battery', setupToken: process.env.CIVICOS_SETUP_TOKEN }, null);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('demo cast', () => {
  it('plans an officer and two signatories per responsible institution, an administrator pair and an auditor', () => {
    const plan = planCast();
    const civil = plan.filter(s => s.institution === CIVIL);
    expect(civil.map(s => s.role)).toEqual(['officer', 'signatory', 'signatory']);
    expect(civil.map(s => s.name)).toEqual(['Demo registrar (sample)', 'Demo registrar A (sample)', 'Demo registrar B (sample)']);
    expect(plan.filter(s => s.institution === TAX).map(s => s.name)).toEqual(['Demo tax officer (sample)', 'Demo tax officer A (sample)', 'Demo tax officer B (sample)']);
    const whole = plan.filter(s => !s.institution);
    expect(whole.map(s => s.role)).toEqual(['administrator', 'administrator', 'auditor']);
    // The data-protection authority shares its institution with civil registration: one set of accounts, not two.
    expect(plan).toHaveLength(9);
    expect(new Set(plan.map(s => s.key)).size).toBe(plan.length);
  });

  it('creates the cast as separate demo accounts with no password, refreshes in place and retires, all audited', async () => {
    const r = refreshCast('Admin');
    expect(r).toMatchObject({ created: 9, updated: 0, retired: 0 });
    const cast = listDemoAccounts();
    expect(cast).toHaveLength(9);
    expect(cast.every(a => a.demo === true && a.noPassword && a.email.endsWith(`@${DEMO_CAST_DOMAIN}`))).toBe(true);
    expect(new Set(cast.map(a => a.id)).size).toBe(9);
    expect(listAudit().filter(e => e.action === 'demo.cast.create')).toHaveLength(9);
    // No password reaches a cast account.
    expect(await checkPassword(cast[0]!.email, 'none')).toHaveProperty('error');
    // Again: nothing changes.
    expect(refreshCast('Admin')).toMatchObject({ created: 0, updated: 0, retired: 0 });
    // Tax no longer named: its three are retired (disabled, not deleted), the rest stay.
    setSovereign({ deployment: { authorities: { civilRegistration: CIVIL!, dataProtection: CIVIL! } } }, 'test');
    expect(refreshCast('Admin')).toMatchObject({ retired: 3 });
    expect(listDemoAccounts()).toHaveLength(9);
    expect(castGroups().map(g => g.institution)).toEqual([CIVIL, '']);
    expect(listAudit().filter(e => e.action === 'demo.cast.retire')).toHaveLength(3);
  });

  it('lets only an administrator or a cast member switch', () => {
    refreshCast('Admin');
    const b = listDemoAccounts().find(a => a.name === 'Demo registrar B (sample)')!;
    const now = Math.floor(Date.now() / 1000);
    expect(actAsRefusal(null)).toMatch(/Sign in/);
    expect(actAsRefusal({ sub: 'local:x', role: 'administrator', iat: now })).toBeNull();
    expect(actAsRefusal({ sub: `local:${b.id}`, role: 'signatory', iat: now })).toBeNull();
    expect(actAsRefusal({ sub: 'local:someone', role: 'signatory', iat: now })).toMatch(/Only an administrator or a member of the demo cast/);
    expect(castClaims(b.id)).toMatchObject({ sub: `local:${b.id}`, role: 'signatory', institution: CIVIL, method: 'local', twoStep: false });
    expect(castClaims('not-cast')).toHaveProperty('error');
  });

  it('is refused everywhere in a production installation', async () => {
    refreshCast('Admin');
    const a = listDemoAccounts().find(x => x.name === 'Demo registrar A (sample)')!;
    // Give the cast account a password (an administrator's reset) and an identity link, to show each path refuses it.
    const reset = issueReset(a.id, 'Admin');
    if ('error' in reset) throw new Error(reset.error);
    expect(await resetPassword(a.email, reset.code, 'a long new password 1')).not.toHaveProperty('error');
    linkIdentity(a.id, { issuer: 'https://idp.test', claim: 'sub', value: 'cast-a' }, 'Admin');
    const now = Math.floor(Date.now() / 1000);
    cookie = await signClaims({ sub: `local:${a.id}`, name: a.name, method: 'local', role: 'signatory', iat: now + 5, exp: now + 600 }, sessionSecret());

    // Demonstration: each works.
    expect(await checkPassword(a.email, 'a long new password 1')).not.toHaveProperty('error');
    expect(accountByIdentity('https://idp.test', 'sub', 'cast-a')?.id).toBe(a.id);
    expect((await currentOfficial())?.sub).toBe(`local:${a.id}`);

    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await checkPassword(a.email, 'a long new password 1')).toEqual({ error: 'Wrong email or password' });
    expect(accountByIdentity('https://idp.test', 'sub', 'cast-a')).toBeUndefined();
    expect(await currentOfficial()).toBeNull();
    expect(refreshCast('Admin')).toEqual({ error: 'A production installation has no demo cast' });
    // Accounts that are not the cast are untouched.
    expect(await checkPassword('admin@gov.test', 'correct horse battery')).not.toHaveProperty('error');
  });
});

// Screens for capabilities that had a backend and no screen (wiring audit,
// Part 1 §4, §10, §15): who keeps each register (GET /api/platform/owners),
// the partner's client certificate for a federation grant
// (/api/federation/grants/[id]/certificate), the findings the access and
// harvest watches raise (GET /api/access-log `raised`), and the plain notice
// for platform-account officials on pages that need an officer's sign-in to
// the shared database.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RegisterOwners, legalText } from './RegisterOwners';
import { GrantCertificate, formatFingerprint } from './GrantCertificate';
import { OfficerSignInNeeded } from '@/components/ui/SubstrateEmpty';
import { REGISTER_OWNERS, legalOwners } from '@/lib/data/register-owners';
import { CONSOLE_NAV } from '@/lib/nav/console-nav';

const src = (p: string) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

describe('who keeps each register', () => {
  it('reads the owners route and is a tab of National settings', () => {
    expect(src('components/features/RegisterOwners.tsx')).toContain("'/api/platform/owners'");
    const page = src('app/(gov)/gov/configuration/responsible/page.tsx');
    expect(page).toContain('<ResponsibleAuthorities />');
    expect(page).toContain('<RegisterOwners />');
    const cfg = CONSOLE_NAV.flatMap(s => s.items).find(i => i.key === 'cfg')!;
    expect(cfg.tabs.map(t => t.href)).toContain('/gov/configuration/responsible');
    expect(JSON.parse(src('app/route-lock.json'))).toContain('/gov/configuration/responsible');
  });

  it('names the institution, or says plainly that none is named, never choosing one', () => {
    const name = (id: string) => (id === 'min-civil' ? 'Civil Registry Office' : id);
    const none = legalOwners({});
    const named = legalOwners({ civilRegistration: 'min-civil' });
    const civil = (rows: ReturnType<typeof legalOwners>) => rows.find(r => r.legal.kind === 'authority' && r.legal.key === 'civilRegistration');
    expect(civil(none)).toBeDefined();
    expect(legalText(civil(none), name)).toMatch(/^No institution named yet for Civil registration/);
    expect(legalText(civil(named), name)).toBe('Civil Registry Office (Civil registration)');
    expect(legalText(undefined, name)).toBe('Not recorded');
    expect(legalText({ id: 'x', name: 'X', legal: { kind: 'installation' }, named: true }, name)).toMatch(/administrators/);
    expect(REGISTER_OWNERS.length).toBeGreaterThan(0);
  });

  it('renders without data while it loads', () => {
    expect(renderToStaticMarkup(createElement(RegisterOwners))).toMatch(/Who keeps each register.*Loading/s);
  });
});

describe('federation grant certificate', () => {
  it('is shown on every grant that is not revoked, through the certificate route', () => {
    expect(src('app/(admin)/integrations/InteropConsole.tsx')).toMatch(/g\.status !== 'revoked' \? <GrantCertificate grantId=\{g\.id\} \/>/);
    expect(src('components/features/GrantCertificate.tsx')).toContain('/api/federation/grants/${encodeURIComponent(grantId)}/certificate');
    expect(renderToStaticMarkup(createElement(GrantCertificate, { grantId: 'G-1' }))).toMatch(/client certificate \(mutual TLS\)/);
  });

  it('shows a fingerprint in the colon-separated form partners read out', () => {
    expect(formatFingerprint('ab'.repeat(32))).toBe(Array(32).fill('AB').join(':'));
  });
});

describe('watch findings on the access log', () => {
  it('the route returns them and the screen lists them', () => {
    expect(src('app/api/access-log/route.ts')).toMatch(/raised: raisedFindings\(\)/);
    expect(src('components/features/AccessLog.tsx')).toContain('Findings raised');
  });
});

describe('pages that need an officer sign-in to the shared database', () => {
  it('keep the sign-in link with the page to come back to', () => {
    const html = renderToStaticMarkup(createElement(OfficerSignInNeeded, { title: 'Officer Home', from: '/gov/home', what: 'shows your day', signedOut: 'Sign in as an officer to see your personalised landing.' }));
    expect(html).toContain('Sign in as an officer to see your personalised landing.');
    expect(html).toContain('href="/sign-in?from=%2Fgov%2Fhome"');
  });

  it('are used where these pages ask for a sign-in', () => {
    for (const f of ['OfficerWorkbench', 'OfficerHome', 'CitizenIntakeQueue']) {
      expect(src(`components/features/${f}.tsx`), f).toContain('<OfficerSignInNeeded');
    }
  });
});

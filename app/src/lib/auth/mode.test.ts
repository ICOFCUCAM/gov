// Go-live review L-2: a production server fails closed. Sign-in is enforced
// there unless CIVICOS_AUTH=open (or CIVICOS_ALLOW_OPEN=1) says otherwise, and
// an open production server says so; development and tests stay open.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { authMode, authEnforced, openInProduction } from './mode';
import { sessionSecretProblem } from './officials';
import { middleware } from '@/middleware';

const nav = vi.hoisted(() => ({ path: '/gov/home' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.path }));
import { OpenModeBanner } from '@/components/ui/OpenModeBanner';

describe('authMode', () => {
  it('enforces in a production build without an explicit choice', () => {
    expect(authMode({ NODE_ENV: 'production' })).toEqual({ enforced: true, why: 'production default' });
    expect(authEnforced({ NODE_ENV: 'production', CIVICOS_AUTH: '' })).toBe(true);
    expect(authEnforced({ NODE_ENV: 'production', CIVICOS_AUTH: 'anything' })).toBe(true);
  });

  it('opens a production build only when told to, and says so', () => {
    expect(authEnforced({ NODE_ENV: 'production', CIVICOS_AUTH: 'open' })).toBe(false);
    expect(authEnforced({ NODE_ENV: 'production', CIVICOS_ALLOW_OPEN: '1' })).toBe(false);
    expect(openInProduction({ NODE_ENV: 'production', CIVICOS_AUTH: 'open' })).toBe(true);
    // enforce wins over the allowance.
    expect(authEnforced({ NODE_ENV: 'production', CIVICOS_AUTH: 'enforce', CIVICOS_ALLOW_OPEN: '1' })).toBe(true);
    expect(openInProduction({ NODE_ENV: 'production', CIVICOS_AUTH: 'enforce' })).toBe(false);
  });

  it('keeps development and tests open unless enforce is set', () => {
    expect(authEnforced({ NODE_ENV: 'development' })).toBe(false);
    expect(authEnforced({ NODE_ENV: 'test' })).toBe(false);
    expect(authEnforced({ NODE_ENV: 'development', CIVICOS_AUTH: 'enforce' })).toBe(true);
    expect(openInProduction({ NODE_ENV: 'development' })).toBe(false);
  });

  it('a production server without a session key says why nobody can sign in', () => {
    expect(sessionSecretProblem({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toMatch(/CIVICOS_SESSION_SECRET is not set/);
    expect(sessionSecretProblem({ NODE_ENV: 'production', CIVICOS_AUTH: 'open' } as NodeJS.ProcessEnv)).toBeNull();
  });
});

describe('the middleware in a production build', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('refuses unsigned reads and changes when CIVICOS_AUTH is not set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CIVICOS_AUTH', '');
    vi.stubEnv('CIVICOS_ALLOW_OPEN', '');
    vi.stubEnv('CIVICOS_SESSION_SECRET', 'test-secret-0123456789-0123456789');
    expect((await middleware(new NextRequest('http://localhost/api/audit'))).status).toBe(401);
    expect((await middleware(new NextRequest('http://localhost/api/ops/incidents', { method: 'POST' }))).status).toBe(401);
    expect((await middleware(new NextRequest('http://localhost/gov/home'))).headers.get('location')).toMatch(/\/sign-in\?from=/);
    // The cover, the public sites and the first-run sign-in stay open.
    expect((await middleware(new NextRequest('http://localhost/'))).status).toBe(200);
    expect((await middleware(new NextRequest('http://localhost/health'))).status).toBe(200);
    expect((await middleware(new NextRequest('http://localhost/api/setup'))).status).toBe(200);
  });

  it('stays open with CIVICOS_AUTH=open', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CIVICOS_AUTH', 'open');
    expect((await middleware(new NextRequest('http://localhost/api/audit'))).status).toBe(200);
  });
});

describe('the open-mode banner', () => {
  it('shows on console pages and not on the public sites or the cover', () => {
    nav.path = '/gov/home';
    expect(renderToStaticMarkup(createElement(OpenModeBanner))).toMatch(/Sign-in is off on this server/);
    for (const p of ['/', '/cover/stack', '/health', '/sign-in', '/embed/services']) {
      nav.path = p;
      expect(renderToStaticMarkup(createElement(OpenModeBanner)), p).toBe('');
    }
  });
});

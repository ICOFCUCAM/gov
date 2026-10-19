// Go-live review L-5: a change that carries a session cookie is refused when
// the browser says it comes from another site (a sibling subdomain is
// same-site, so SameSite=Lax alone does not stop it).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { resetRateLimits } from './lib/ops/rate-limit-core';

const send = (path: string, headers: Record<string, string>, method = 'POST') =>
  middleware(new NextRequest(`https://gov.example${path}`, { method, headers: { host: 'gov.example', ...headers } }));
const COOKIE = { cookie: 'civicos_official=x.y' };
const DEMO = { cookie: 'civicos_session=demo' };

afterEach(() => { vi.unstubAllEnvs(); resetRateLimits(); });

describe('cross-site changes', () => {
  it('refuses a change with a session cookie from a sibling subdomain or another site', async () => {
    for (const site of ['same-site', 'cross-site']) {
      expect((await send('/api/directives', { ...COOKIE, 'sec-fetch-site': site })).status, site).toBe(403);
      expect((await send('/api/ops/incidents', { ...DEMO, 'sec-fetch-site': site }, 'PUT')).status, site).toBe(403);
    }
  });

  it('lets the platform\'s own pages through', async () => {
    expect((await send('/api/ops/incidents', { ...COOKIE, 'sec-fetch-site': 'same-origin' })).status).not.toBe(403);
    expect((await send('/api/ops/incidents', { ...COOKIE, origin: 'https://gov.example' })).status).not.toBe(403);
  });

  it('without Sec-Fetch-Site, checks Origin against the platform\'s host', async () => {
    expect((await send('/api/ops/incidents', { ...COOKIE, origin: 'https://health.gov.example' })).status).toBe(403);
    expect((await send('/api/ops/incidents', { ...COOKIE, origin: 'null' })).status).toBe(403);
    // A proxy that forwards the public host, or CIVICOS_PUBLIC_URL, counts as the platform's own.
    expect((await send('/api/ops/incidents', { ...COOKIE, origin: 'https://portal.gov.example', 'x-forwarded-host': 'portal.gov.example' })).status).not.toBe(403);
    vi.stubEnv('CIVICOS_PUBLIC_URL', 'https://civic.gov.example');
    expect((await send('/api/ops/incidents', { ...COOKIE, origin: 'https://civic.gov.example' })).status).not.toBe(403);
    // Not a browser (no Origin): a script with its own cookie jar has no one else's authority.
    expect((await send('/api/ops/incidents', COOKIE)).status).not.toBe(403);
  });

  it('leaves reads, cookie-less requests and self-authenticating machine routes alone', async () => {
    expect((await send('/api/directives', { ...COOKIE, 'sec-fetch-site': 'cross-site' }, 'GET')).status).not.toBe(403);
    expect((await send('/api/public-sites/health/subscribe', { 'sec-fetch-site': 'cross-site' })).status).not.toBe(403);
    expect((await send('/api/oauth/token', { ...COOKIE, 'sec-fetch-site': 'cross-site' })).status).not.toBe(403);
    expect((await send('/api/releases/publisher/releases', { ...COOKIE, 'sec-fetch-site': 'cross-site', authorization: 'Bearer t' })).status).not.toBe(403);
    // A bearer on a route that does not verify one gives no exemption.
    expect((await send('/api/directives', { ...COOKIE, 'sec-fetch-site': 'cross-site', authorization: 'Bearer t' })).status).toBe(403);
  });
});

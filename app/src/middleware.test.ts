import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { middleware, clearReadChecks } from './middleware';
import { signClaims } from './lib/auth/session-token';

const CRON = path.join(__dirname, 'app', 'api', 'cron');
const cronJobs = fs.readdirSync(CRON).filter(d => fs.existsSync(path.join(CRON, d, 'route.ts')));
const call = async (p: string, cookie?: string, headers: Record<string, string> = {}) =>
  middleware(new NextRequest(`http://localhost${p}`, { headers: { ...headers, ...(cookie ? { cookie } : {}) } }));
const SECRET = 'test-secret-0123456789';
/** A signed official's session cookie (and the page cookie the sign-in also sets). */
async function officialCookie(extra: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return `civicos_session=official; civicos_official=${await signClaims({ sub: 'local:1', name: 'A. Official', method: 'local', iat: now, exp: now + 600, ...extra }, SECRET)}`;
}

/** Stand-in for the platform's GET /api/auth/official: answers from the session cookie, unless `answer` says otherwise. */
function standInPlatform(answer: () => ((cookie: string) => unknown) | 'down' | null) {
  return (async (_url: unknown, init?: { headers?: Record<string, string> }) => {
    const a = answer();
    if (a === 'down') throw new Error('unreachable');
    const cookie = init?.headers?.cookie ?? '';
    const token = /civicos_official=([^;]+)/.exec(cookie)?.[1];
    const official = a ? a(cookie) : token ? JSON.parse(Buffer.from(token.split('.')[0]!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) : null;
    return new Response(JSON.stringify({ official }), { status: 200 });
  }) as typeof fetch;
}

describe('access gate (CIVICOS_AUTH=enforce)', () => {
  const before = { auth: process.env.CIVICOS_AUTH, secret: process.env.CIVICOS_SESSION_SECRET };
  const realFetch = globalThis.fetch;
  let live: ((cookie: string) => unknown) | 'down' | null = null;
  beforeEach(() => { live = null; clearReadChecks(); globalThis.fetch = standInPlatform(() => live); });
  afterEach(() => { process.env.CIVICOS_AUTH = before.auth; process.env.CIVICOS_SESSION_SECRET = before.secret; globalThis.fetch = realFetch; });

  it('lets every scheduled job reach its route without a session', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect(cronJobs.length).toBeGreaterThan(10);
    for (const job of cronJobs) {
      const r = await call(`/api/cron/${job}`);
      expect(r.headers.get('location'), job).toBeNull();
      expect(r.status, job).toBe(200);
    }
  });

  it('refuses unsigned reads: API reads get 401, console pages go to sign-in', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    expect((await call('/api/releases')).status).toBe(401);
    expect((await call('/api/cron/sla/extra')).status).toBe(401);
    expect((await call('/gov/twin')).headers.get('location')).toMatch(/\/sign-in\?from=%2Fgov%2Ftwin$/);
    expect((await call('/welcome')).headers.get('location')).toMatch(/\/sign-in\?from=%2Fwelcome$/);
  });

  it('opens the public facility tile archive without sign-in, never the viewer-aware tiles', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    expect((await call('/api/twin/tiles/facilities.pmtiles')).status).toBe(200);
    expect((await call('/api/twin/tiles/facilities/6/38/32.mvt')).status).toBe(401);
    expect((await call('/api/twin/tiles/facilities')).status).toBe(401);
    expect((await call('/api/twin/tiles/facilities.pmtiles.json')).status).toBe(401);
    // the boundary tiles and an institution's own archive stay behind sign-in
    expect((await call('/api/twin/tiles/boundaries/5/19/15.mvt')).status).toBe(401);
    expect((await call('/api/twin/tiles/boundaries')).status).toBe(401);
    expect((await call('/api/org/ministries/min-x/facilities/tiles.pmtiles')).status).toBe(401);
  });

  it('opens the open-data charter directory and accountability aggregates the public pages read (review D8)', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    expect((await call('/api/public/charters')).status).toBe(200);
    expect((await call('/api/public/accountability')).status).toBe(200);
    expect((await call('/api/public/directives')).status).toBe(200);
    // reads only, and nothing beside them
    expect((await middleware(new NextRequest('http://localhost/api/public/charters', { method: 'POST' }))).status).toBe(401);
    expect((await call('/api/directives')).status).toBe(401);
  });

  it('does not take the page cookie (the cover\'s demo session) as a verified official for reads', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    expect((await call('/api/twin/state', 'civicos_session=demo')).status).toBe(401);
    expect((await call('/api/releases', 'civicos_session=x')).status).toBe(401);
    expect((await call('/api/audit', 'civicos_session=official')).status).toBe(401);
    expect((await call('/gov/twin', 'civicos_session=demo')).headers.get('location')).toMatch(/\/sign-in/);
    const now = Math.floor(Date.now() / 1000);
    const forged = await signClaims({ sub: 'local:1', name: 'A', method: 'local', iat: now, exp: now + 600 }, 'another-secret');
    expect((await call('/api/twin/state', `civicos_session=demo; civicos_official=${forged}`)).status).toBe(401);
    const signed = await officialCookie();
    expect((await call('/api/twin/state', signed)).status).toBe(200);
    expect((await call('/gov/twin', signed)).headers.get('location')).toBeNull();
  });

  it('refuses reads with a session that no longer counts, within seconds, and fails closed when it cannot ask (review M-1)', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    const signed = await officialCookie();
    expect((await call('/api/audit', signed)).status).toBe(200);
    // The account is disabled (or the session signed out): the answer kept for READ_CHECK_MS still counts...
    live = () => null;
    expect((await call('/api/audit', signed)).status).toBe(200);
    // ...and once it is older than that, the platform is asked again and reads stop.
    clearReadChecks();
    const ended = await call('/api/audit', signed);
    expect(ended.status).toBe(401);
    expect((await ended.json()).error).toMatch(/session has ended/);
    expect((await call('/gov/home', signed)).headers.get('location')).toMatch(/\/sign-in\?from=%2Fgov%2Fhome$/);
    expect((await call('/api/parcels', signed)).status).toBe(401);
    // The platform cannot be asked: refused, never waved through.
    clearReadChecks();
    live = 'down';
    expect((await call('/api/audit', signed)).status).toBe(503);
    expect((await call('/gov/home', signed)).status).toBe(503);
  });

  it('asks the platform at most once per token within READ_CHECK_MS', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    let asked = 0;
    const inner = standInPlatform(() => null);
    globalThis.fetch = (async (...a: Parameters<typeof fetch>) => { asked++; return inner(...a); }) as typeof fetch;
    const signed = await officialCookie();
    for (const p of ['/api/audit', '/api/parcels', '/gov/home', '/api/releases']) await call(p, signed);
    expect(asked).toBe(1);
  });

  it('keeps the citizen demo session for the Civic Wallet pages only', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    expect((await call('/wallet', 'civicos_session=demo')).headers.get('location')).toBeNull();
    expect((await call('/wallet/permits', 'civicos_session=demo')).headers.get('location')).toBeNull();
    expect((await call('/wallet')).headers.get('location')).toMatch(/\/login\?from=%2Fwallet$/);
    expect((await call('/api/permits', 'civicos_session=demo')).status).toBe(401);
  });

  it('accepts a bearer instead of a session only on routes that verify it themselves', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    const bearer = { authorization: 'Bearer x' };
    expect((await call('/api/releases/publisher', undefined, bearer)).status).toBe(200);
    expect((await call('/api/substrate/export', undefined, bearer)).status).toBe(200);
    expect((await call('/api/twin/state', undefined, bearer)).status).toBe(401);
    expect((await call('/api/audit', 'civicos_session=demo', bearer)).status).toBe(401);
  });

  it('refuses any request carrying the internal subrequest header (CVE-2025-29927)', async () => {
    for (const mode of ['enforce', undefined]) {
      process.env.CIVICOS_AUTH = mode;
      expect((await call('/api/twin/state', undefined, { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' })).status).toBe(400);
      expect((await call('/police', undefined, { 'x-middleware-subrequest': 'src/middleware' })).status).toBe(400);
    }
  });

  it('stays open without enforcement, so the demo flow keeps working', async () => {
    delete process.env.CIVICOS_AUTH;
    expect((await call('/gov/twin', 'civicos_session=demo')).headers.get('location')).toBeNull();
    expect((await call('/api/twin/state')).status).toBe(200);
    const post = await middleware(new NextRequest('http://localhost/api/twin/scenarios', { method: 'POST' }));
    expect(post.status).toBe(200);
  });
});

describe('email updates from the public sites', () => {
  const before = process.env.CIVICOS_AUTH;
  afterEach(() => { process.env.CIVICOS_AUTH = before; });
  const post = async (p: string, cookie?: string) => middleware(new NextRequest(`http://localhost${p}`, { method: 'POST', headers: cookie ? { cookie } : {} }));

  it('let citizens subscribe, confirm and unsubscribe without signing in, and nothing else', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect((await post('/api/public-sites/police/subscribe')).headers.get('location')).toBeNull();
    expect((await post('/api/subscriptions')).headers.get('location')).toBeNull();
    expect((await call('/search?q=permit')).headers.get('location')).toBeNull();
    expect((await call('/subscriptions?token=x')).headers.get('location')).toBeNull();
    expect((await call('/api/public-sites/language?lang=fr&next=/police')).headers.get('location')).toBeNull();
    expect((await post('/api/public-sites/police/proposals')).status).toBe(401);
    expect((await call('/api/subscriptions')).status).toBe(401);
  });
});

describe('public websites', () => {
  // Every page in the (public) route group is reachable without a session.
  const PUBLIC_GROUP = path.join(__dirname, 'app', '(public)');
  const pages = (dir: string, base = ''): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? pages(path.join(dir, e.name), `${base}/${e.name.replace(/^\[(.+)\]$/, 'x-$1')}`) : e.name === 'page.tsx' ? [base || '/'] : []);
  const before = { auth: process.env.CIVICOS_AUTH, secret: process.env.CIVICOS_SESSION_SECRET };
  afterEach(() => { process.env.CIVICOS_AUTH = before.auth; process.env.CIVICOS_SESSION_SECRET = before.secret; });

  it('are open to citizens without an account', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    const all = pages(PUBLIC_GROUP);
    expect(all.length).toBeGreaterThan(25);
    for (const p of all) expect((await call(p)).headers.get('location'), p).toBeNull();
  });

  it('resolve entity URIs (/id/*) for the public, reads only', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    for (const p of ['/id/place/KE-30', '/id/nation/KEN/about', '/id/facility/FAC-00001']) {
      const r = await call(p);
      expect(r.headers.get('location'), p).toBeNull();
      expect(r.status, p).toBe(200);
    }
    // Only reads are opened: a change there still needs a verified official.
    const post = await middleware(new NextRequest('http://localhost/id/place/KE-30', { method: 'POST' }));
    expect(post.headers.get('location')).toMatch(/\/sign-in/);
    // A path that only starts the same way is not opened.
    expect((await call('/identity')).headers.get('location')).toMatch(/\/sign-in/);
  });

  it('keep previews of unpublished proposals for signed-in officials', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    expect((await call('/police?preview=SC-1234')).headers.get('location')).toMatch(/\/sign-in/);
    expect((await call('/police?preview=SC-1234', 'civicos_session=x')).headers.get('location')).toMatch(/\/sign-in/);
    expect((await call('/police?preview=SC-1234', await officialCookie())).headers.get('location')).toBeNull();
    expect((await call('/police?preset=response-community')).headers.get('location')).toBeNull();
  });

  it('do not open officer routes that share a prefix', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect((await call('/gov/treasury')).headers.get('location')).toMatch(/\/sign-in/);
    expect((await call('/healthcheck-admin')).headers.get('location')).toMatch(/\/sign-in/);
  });
});

describe('scheduled jobs authenticate themselves', () => {
  // The gate lets /api/cron/* through, so each route must refuse callers
  // without CIVICOS_CRON_SECRET — and refuse to run at all when it is unset.
  for (const job of cronJobs) {
    it(job, () => {
      const src = fs.readFileSync(path.join(CRON, job, 'route.ts'), 'utf8');
      expect(src).toMatch(/if \(!(authorized|cronAuthorized)\(/);
      const local = /function authorized[\s\S]*?\n\}/.exec(src)?.[0];
      if (local) expect(local).toMatch(/CIVICOS_CRON_SECRET[\s\S]*if \(!expected\) return false/);
      else expect(src).toMatch(/import \{[^}]*cronAuthorized[^}]*\} from '@\/lib\/platform-auth'/);
    });
  }
});

describe('changes need a verified official (CIVICOS_AUTH=enforce)', () => {
  const before = { auth: process.env.CIVICOS_AUTH, secret: process.env.CIVICOS_SESSION_SECRET };
  // The middleware asks the platform who the session belongs to now (GET /api/auth/official).
  // Stand-in platform: answers from the session cookie, unless a test overrides `live`.
  let live: ((cookie: string) => unknown) | 'down' | null = null;
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    live = null;
    globalThis.fetch = (async (_url: unknown, init?: { headers?: Record<string, string> }) => {
      if (live === 'down') throw new Error('unreachable');
      const cookie = init?.headers?.cookie ?? '';
      const token = /civicos_official=([^;]+)/.exec(cookie)?.[1];
      const official = live ? live(cookie) : token ? JSON.parse(Buffer.from(token.split('.')[0]!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) : null;
      return new Response(JSON.stringify({ official }), { status: 200 });
    }) as typeof fetch;
  });
  afterEach(() => { process.env.CIVICOS_AUTH = before.auth; process.env.CIVICOS_SESSION_SECRET = before.secret; globalThis.fetch = realFetch; });
  const send = async (p: string, cookie?: string, method = 'POST') => middleware(new NextRequest(`http://localhost${p}`, { method, headers: cookie ? { cookie } : {} }));

  it('refuses a change with only the page cookie or a forged session, and accepts a signed one', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = 'test-secret-0123456789';
    expect((await send('/api/org/ministries/min-x/queue/q1/act', 'civicos_session=demo')).status).toBe(401);
    const now = Math.floor(Date.now() / 1000);
    const claims = { sub: 'local:1', name: 'A. Official', method: 'local' as const, iat: now, exp: now + 600 };
    const good = await signClaims(claims, 'test-secret-0123456789');
    const forged = await signClaims(claims, 'another-secret');
    expect((await send('/api/org/ministries/min-x/queue/q1/act', `civicos_session=demo; civicos_official=${forged}`)).status).toBe(401);
    expect((await send('/api/org/ministries/min-x/queue/q1/act', `civicos_session=demo; civicos_official=${good}`)).status).toBe(200);
    expect((await send('/api/org/ministries/min-x/queue/q1/act', `civicos_session=demo; civicos_official=${good}`, 'GET')).status).toBe(200);
  });

  it('applies the official\'s role: auditors change nothing, ministries act only for themselves', async () => {
    process.env.CIVICOS_SESSION_SECRET = 'test-secret-0123456789';
    const now = Math.floor(Date.now() / 1000);
    const as = (role: string, institution?: string) => signClaims({ sub: 'local:1', name: 'A', method: 'local', role: role as 'officer', institution, iat: now, exp: now + 600 }, 'test-secret-0123456789')
      .then(t => `civicos_session=demo; civicos_official=${t}`);
    for (const mode of ['enforce', undefined]) {
      process.env.CIVICOS_AUTH = mode;
      expect((await send('/api/org/ministries/min-x/queue/q1/act', await as('auditor'))).status).toBe(403);
      expect((await send('/api/org/ministries/min-x/queue/q1/act', await as('officer', 'min-y'))).status).toBe(403);
      expect((await send('/api/org/ministries/min-x/queue/q1/act', await as('officer', 'min-x'))).status).toBe(200);
      expect((await send('/api/org/ministries/min-x/rename', await as('signatory'))).status).toBe(403);
      expect((await send('/api/org/ministries/min-x/rename', await as('administrator'))).status).toBe(200);
      expect((await send('/api/auth/official', await as('auditor'), 'DELETE')).status).toBe(200);
      expect((await send('/api/org/ministries/min-x/queue', await as('auditor'), 'GET')).status).toBe(200);
    }
  });

  it('lets a ministry\'s case system reach its feed with its own key, not a session', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect((await send('/api/org/ministries/min-x/queue/feed')).status).toBe(200);
    expect((await send('/api/org/ministries/min-x/queue/feed', undefined, 'GET')).status).toBe(200);
    expect((await send('/api/org/ministries/min-x/queue/feeds')).status).toBe(401);
  });

  it('lets a ministry\'s system of record reach the facility feed with its own key, not a session', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect((await send('/api/org/ministries/min-x/facilities/feed')).status).toBe(200);
    expect((await send('/api/org/ministries/min-x/facilities/feeds')).status).toBe(401);
    expect((await send('/api/org/ministries/min-x/facilities')).status).toBe(401);
  });

  it('refuses a session that no longer counts, uses the account as it stands now, and fails closed when it cannot ask', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = 'test-secret-0123456789';
    const now = Math.floor(Date.now() / 1000);
    const token = await signClaims({ sub: 'local:1', name: 'A', method: 'local', role: 'administrator', iat: now, exp: now + 600 }, 'test-secret-0123456789');
    const cookie = `civicos_session=demo; civicos_official=${token}`;
    live = () => null; // password changed or account disabled since sign-in
    const ended = await send('/api/directives', cookie);
    expect(ended.status).toBe(401);
    expect((await ended.json()).error).toMatch(/session has ended/);
    expect((await send('/api/auth/official', cookie)).status).toBe(200); // signing in again still works
    expect((await send('/api/auth/password', cookie)).status).toBe(200);
    live = () => ({ sub: 'local:1', name: 'A', method: 'local', role: 'auditor', iat: now, exp: now + 600 }); // demoted since sign-in
    expect((await send('/api/directives', cookie)).status).toBe(403);
    live = 'down';
    expect((await send('/api/directives', cookie)).status).toBe(503);
  });

  it('does not let an Authorization header skip the gate on routes that do not verify it', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = 'test-secret-0123456789';
    const bogus = (p: string, cookie?: string) => middleware(new NextRequest(`http://localhost${p}`, { method: 'POST', headers: { authorization: 'x', ...(cookie ? { cookie } : {}) } }));
    for (const p of ['/api/twin/sources', '/api/twin/scenarios', '/api/platform/backups/B-1/restore', '/api/platform/config/C-1/apply', '/api/federation/propose', '/api/integrations', '/api/webhooks']) {
      expect((await bogus(p)).status, p).toBe(401);
      expect((await bogus(p, 'civicos_session=demo')).status, p).toBe(401);
    }
    // Routes that check the bearer themselves still receive it (and refuse a wrong one there).
    expect((await bogus('/api/releases/publisher')).status).toBe(200);
    expect((await bogus('/api/admin/officers/bulk')).status).toBe(200);
    expect((await bogus('/api/cron/sla')).status).toBe(200);
  });

  it('applies the role rules even when a bearer is sent alongside a session', async () => {
    process.env.CIVICOS_SESSION_SECRET = 'test-secret-0123456789';
    const now = Math.floor(Date.now() / 1000);
    const t = await signClaims({ sub: 'local:1', name: 'A', method: 'local', role: 'officer', iat: now, exp: now + 600 }, 'test-secret-0123456789');
    for (const mode of ['enforce', undefined]) {
      process.env.CIVICOS_AUTH = mode;
      const r = await middleware(new NextRequest('http://localhost/api/platform/backups/B-1/restore', { method: 'POST', headers: { authorization: 'x', cookie: `civicos_official=${t}` } }));
      expect(r.status).toBe(403);
    }
  });

  it('refuses changes on a server that does not hold the state writer\'s lease', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = 'test-secret-0123456789';
    const now = Math.floor(Date.now() / 1000);
    const claims = { sub: 'local:1', name: 'A', method: 'local' as const, role: 'administrator' as const, iat: now, exp: now + 600 };
    const t = await signClaims(claims, 'test-secret-0123456789');
    globalThis.fetch = (async () => new Response(JSON.stringify({ official: claims, state: { writable: false } }))) as typeof fetch;
    const r = await send('/api/directives', `civicos_official=${t}`);
    expect(r.status).toBe(503);
    expect((await r.json()).error).toMatch(/state writer/);
  });

  it('lets anyone reach sign-in', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect((await send('/api/auth/official')).status).toBe(200);
    // The sign-in form first asks how officials sign in, before anyone has a session.
    expect((await send('/api/auth/official', undefined, 'GET')).status).toBe(200);
    // A forgotten password is reset with an administrator's code, without a session.
    expect((await send('/api/auth/password')).status).toBe(200);
    // Signing in with a passkey alone starts with a challenge, without a session.
    expect((await send('/api/auth/passkeys/options')).status).toBe(200);
  });

  it('opens the identity provider\'s start and callback without a session (the route checks the state), and nothing beside them', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    process.env.CIVICOS_SESSION_SECRET = SECRET;
    expect((await send('/api/auth/oidc/start', undefined, 'GET')).status).toBe(200);
    expect((await send('/api/auth/oidc/callback?code=x&state=y', undefined, 'GET')).status).toBe(200);
    // Reads only: a change there, and the administrators' configuration, still need an official.
    expect((await send('/api/auth/oidc/callback')).status).toBe(401);
    expect((await send('/api/auth/officials/identity-provider', undefined, 'GET')).status).toBe(401);
    expect((await send('/api/auth/officials/identity-provider')).status).toBe(401);
    // Managing one's own passkeys needs a session.
    expect((await send('/api/auth/passkeys')).status).toBe(401);
    expect((await send('/api/auth/passkeys', await officialCookie({ role: 'auditor' }))).status).toBe(200);
    // Only administrators configure the provider.
    expect((await send('/api/auth/officials/identity-provider', await officialCookie({ role: 'officer' }))).status).toBe(403);
    expect((await send('/api/auth/officials/identity-provider', await officialCookie({ role: 'administrator' }))).status).toBe(200);
  });
});

describe('request ids', () => {
  it('every answer carries a request id: the caller\'s when well formed, a new one otherwise', async () => {
    const kept = await middleware(new NextRequest('http://localhost/api/sovereign', { headers: { 'x-request-id': 'ingress-abc12345' } }));
    expect(kept.headers.get('x-request-id')).toBe('ingress-abc12345');
    const made = await middleware(new NextRequest('http://localhost/api/sovereign', { headers: { 'x-request-id': 'bad id<script>' } }));
    expect(made.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    // Route handlers see the same id on the request.
    expect(made.headers.get('x-middleware-request-x-request-id')).toBe(made.headers.get('x-request-id'));
  });
});

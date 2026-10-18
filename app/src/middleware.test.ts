import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { signClaims } from './lib/auth/session-token';

const CRON = path.join(__dirname, 'app', 'api', 'cron');
const cronJobs = fs.readdirSync(CRON).filter(d => fs.existsSync(path.join(CRON, d, 'route.ts')));
const call = (p: string, cookie?: string) => syncRes(
  middleware(new NextRequest(`http://localhost${p}`, { headers: cookie ? { cookie } : {} })));
// GET requests are answered synchronously; only API changes under enforcement await a session check.
function syncRes(r: ReturnType<typeof middleware>) { if (r instanceof Promise) throw new Error('expected a synchronous answer'); return r; }

describe('access gate (CIVICOS_AUTH=enforce)', () => {
  const before = process.env.CIVICOS_AUTH;
  afterEach(() => { process.env.CIVICOS_AUTH = before; });

  it('lets every scheduled job reach its route without a session', () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect(cronJobs.length).toBeGreaterThan(10);
    for (const job of cronJobs) expect(call(`/api/cron/${job}`).headers.get('location'), job).toBeNull();
  });

  it('still sends other unsigned requests to /login', () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect(call('/api/releases').headers.get('location')).toMatch(/\/login\?from=%2Fapi%2Freleases$/);
    expect(call('/api/cron/sla/extra').headers.get('location')).toMatch(/\/login/);
    expect(call('/api/releases', 'civicos_session=x').headers.get('location')).toBeNull();
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
    expect(call('/search?q=permit').headers.get('location')).toBeNull();
    expect(call('/subscriptions?token=x').headers.get('location')).toBeNull();
    expect(call('/api/public-sites/language?lang=fr&next=/police').headers.get('location')).toBeNull();
    expect((await post('/api/public-sites/police/proposals')).status).toBe(401);
    expect(call('/api/subscriptions').headers.get('location')).toMatch(/\/login/);
  });
});

describe('public websites', () => {
  // Every page in the (public) route group is reachable without a session.
  const PUBLIC_GROUP = path.join(__dirname, 'app', '(public)');
  const pages = (dir: string, base = ''): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? pages(path.join(dir, e.name), `${base}/${e.name.replace(/^\[(.+)\]$/, 'x-$1')}`) : e.name === 'page.tsx' ? [base || '/'] : []);
  const before = process.env.CIVICOS_AUTH;
  afterEach(() => { process.env.CIVICOS_AUTH = before; });

  it('are open to citizens without an account', () => {
    process.env.CIVICOS_AUTH = 'enforce';
    const all = pages(PUBLIC_GROUP);
    expect(all.length).toBeGreaterThan(25);
    for (const p of all) expect(call(p).headers.get('location'), p).toBeNull();
  });

  it('keep previews of unpublished proposals for signed-in officials', () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect(call('/police?preview=SC-1234').headers.get('location')).toMatch(/\/login/);
    expect(call('/police?preview=SC-1234', 'civicos_session=x').headers.get('location')).toBeNull();
    expect(call('/police?preset=response-community').headers.get('location')).toBeNull();
  });

  it('do not open officer routes that share a prefix', () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect(call('/gov/treasury').headers.get('location')).toMatch(/\/login/);
    expect(call('/healthcheck-admin').headers.get('location')).toMatch(/\/login/);
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

  it('lets anyone reach sign-in', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect((await send('/api/auth/official')).status).toBe(200);
    // The sign-in form first asks how officials sign in, before anyone has a session.
    expect((await send('/api/auth/official', undefined, 'GET')).status).toBe(200);
    // A forgotten password is reset with an administrator's code, without a session.
    expect((await send('/api/auth/password')).status).toBe(200);
  });
});

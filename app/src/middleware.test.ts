import { describe, it, expect, afterEach } from 'vitest';
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
  afterEach(() => { process.env.CIVICOS_AUTH = before.auth; process.env.CIVICOS_SESSION_SECRET = before.secret; });
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

  it('lets anyone reach sign-in', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect((await send('/api/auth/official')).status).toBe(200);
  });
});

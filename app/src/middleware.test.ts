import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const CRON = path.join(__dirname, 'app', 'api', 'cron');
const cronJobs = fs.readdirSync(CRON).filter(d => fs.existsSync(path.join(CRON, d, 'route.ts')));
const call = (p: string, cookie?: string) =>
  middleware(new NextRequest(`http://localhost${p}`, { headers: cookie ? { cookie } : {} }));

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
  const post = (p: string) => middleware(new NextRequest(`http://localhost${p}`, { method: 'POST' }));

  it('let citizens subscribe, confirm and unsubscribe without signing in, and nothing else', () => {
    process.env.CIVICOS_AUTH = 'enforce';
    expect(post('/api/public-sites/police/subscribe').headers.get('location')).toBeNull();
    expect(post('/api/subscriptions').headers.get('location')).toBeNull();
    expect(call('/search?q=permit').headers.get('location')).toBeNull();
    expect(call('/subscriptions?token=x').headers.get('location')).toBeNull();
    expect(post('/api/public-sites/police/proposals').headers.get('location')).toMatch(/\/login/);
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

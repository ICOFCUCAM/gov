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

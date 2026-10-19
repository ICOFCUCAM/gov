// Institution scope through the routes, with real signed sessions:
//  - review M-2: a ministry's public website (Site editor proposals and
//    publishing, its settings and feed) is changed only by that ministry's
//    officials or the whole government; publishing still needs a different
//    official;
//  - review M-3: an institution's cases and permit applicants are read only
//    by its own officials (the permit register's issuing institution), the
//    whole government and auditors.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { resetSiteSettings, siteOwner, getSiteSettings } from '@/lib/data/site-settings';
import { resetSiteEditorial } from '@/lib/data/site-editorial';
import { permitHolders } from '@/lib/data/store';

process.env.CIVICOS_SCRYPT_N = '16384';
let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const settings = await import('./public-sites/[id]/route');
const proposals = await import('./public-sites/[id]/proposals/route');
const decide = await import('./public-sites/[id]/proposals/[pid]/route');
const sync = await import('./public-sites/[id]/sync/route');
const queue = await import('./org/ministries/[id]/queue/route');
const imports = await import('./org/ministries/[id]/queue/import/route');
const feeds = await import('./org/ministries/[id]/queue/feeds/route');
const permits = await import('./permits/route');
const permit = await import('./permits/[id]/route');
const permitDecide = await import('./permits/[id]/decide/route');
const work = await import('./work/route');

const PW = 'correct horse battery';
const sessions: Record<string, string> = {};
async function account(key: string, name: string, role?: string, institution?: string) {
  const a = await createAccount({ email: `${key}@gov.test`, name, office: 'Office', password: PW, role, institution }, role ? 'Admin' : null);
  if ('error' in a) throw new Error(a.error);
  const now = Math.floor(Date.now() / 1000);
  sessions[key] = await signClaims({ sub: `local:${a.id}`, name: 'typed', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const as = (key: string | undefined) => { cookie = key ? sessions[key] : undefined; };
const req = (path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') =>
  new NextRequest(`http://localhost${path}`, body === undefined ? { method } : { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(async () => {
  resetOfficials(); resetSiteSettings(); resetSiteEditorial(); cookie = undefined;
  await account('admin', 'Grace Admin');
  await account('health1', 'Hana Health', 'officer', 'min-health');
  await account('health2', 'Hugo Health', 'officer', 'min-health');
  await account('agri', 'Otto Agriculture', 'officer', 'min-agriculture');
  await account('interior', 'Ina Interior', 'officer', 'min-interior');
  await account('auditor', 'Ada Auditor', 'auditor', 'min-agriculture');
  await account('whole', 'Wes Whole', 'officer');
});

describe('a ministry\'s website is changed by its own officials (M-2)', () => {
  it('maps each site to the institution that owns it', () => {
    expect(siteOwner('health')).toBe('min-health');
    expect(siteOwner('police')).toBe('police-command');
    expect(siteOwner('portal')).toBeUndefined();
  });

  it('refuses another ministry\'s officer; its own officials propose and a different one publishes', async () => {
    as('agri');
    const put = await settings.PUT(req('/api/public-sites/health', { website: 'https://evil.example', mode: 'embed' }, 'PUT'), params({ id: 'health' }));
    expect(put.status).toBe(403);
    expect(getSiteSettings('health').website).toBeUndefined();
    const change = { change: { content: { alert: { label: 'NOTICE', text: 'Changed by another ministry.' } } } };
    expect((await proposals.POST(req('/api/public-sites/health/proposals', change), params({ id: 'health' }))).status).toBe(403);
    expect((await sync.POST(req('/api/public-sites/health/sync', {}), params({ id: 'health' }))).status).toBe(403);
    // A site no institution owns (the national portal) is for the whole government.
    expect((await proposals.POST(req('/api/public-sites/portal/proposals', change), params({ id: 'portal' }))).status).toBe(403);

    as('health1');
    const p = await proposals.POST(req('/api/public-sites/health/proposals', { change: { content: { alert: { label: 'NOTICE', text: 'Clinics open on Saturdays.' } } } }), params({ id: 'health' }));
    expect(p.status).toBe(200);
    const pid = (await p.json()).proposal.id as string;
    // Another ministry cannot publish it, and the proposer cannot publish their own.
    as('agri');
    expect((await decide.POST(req(`/api/public-sites/health/proposals/${pid}`, { action: 'publish' }), params({ id: 'health', pid }))).status).toBe(403);
    as('health1');
    expect((await decide.POST(req(`/api/public-sites/health/proposals/${pid}`, { action: 'publish' }), params({ id: 'health', pid }))).status).toBe(422);
    as('health2');
    expect((await decide.POST(req(`/api/public-sites/health/proposals/${pid}`, { action: 'publish' }), params({ id: 'health', pid }))).status).toBe(200);
    // The whole government still may change any site.
    as('whole');
    expect((await settings.PUT(req('/api/public-sites/health', { website: 'https://www.health.example.gov' }, 'PUT'), params({ id: 'health' }))).status).toBe(200);
  });
});

describe('cases and permit applicants are read by their own institution (M-3)', () => {
  it('scopes an institution\'s queue, its loads and its connected systems', async () => {
    as('agri');
    for (const [route, path] of [[queue, 'queue'], [imports, 'queue/import'], [feeds, 'queue/feeds']] as const) {
      const r = await route.GET(req(`/api/org/ministries/min-health/${path}`), params({ id: 'min-health' }));
      expect(r.status, path).toBe(403);
    }
    expect((await queue.GET(req('/api/org/ministries/min-agriculture/queue'), params({ id: 'min-agriculture' }))).status).toBe(200);
    for (const who of ['health1', 'whole', 'auditor', 'admin']) {
      as(who);
      expect((await queue.GET(req('/api/org/ministries/min-health/queue'), params({ id: 'min-health' }))).status, who).toBe(200);
    }
  });

  it('shows permits and applicants only to the issuing institution, the whole government and auditors', async () => {
    expect(permitHolders()).toContain('min-interior');
    expect(permitHolders()).not.toContain('min-agriculture');
    as('agri');
    expect((await permits.GET()).status).toBe(403);
    expect((await permit.GET(req('/api/permits/x'), params({ id: 'x' }))).status).toBe(403);
    expect((await permitDecide.POST(req('/api/permits/x/decide', { decision: 'approve' }), params({ id: 'x' }))).status).toBe(403);
    for (const who of ['interior', 'whole', 'auditor']) {
      as(who);
      const r = await permits.GET();
      expect(r.status, who).toBe(200);
      expect((await r.json()).permits.length, who).toBeGreaterThan(0);
    }
  });

  it('keeps the work overview to what the official may read', async () => {
    as('agri');
    const mine = await (await work.GET()).json();
    expect(mine.queue.length).toBeGreaterThan(0);
    expect(mine.queue.every((q: { ministryId: string }) => q.ministryId === 'min-agriculture')).toBe(true);
    expect(mine.permits).toEqual([]);
    expect(mine.counts.decisions).toBe(mine.queue.length);
    as('whole');
    const all = await (await work.GET()).json();
    expect(new Set(all.queue.map((q: { ministryId: string }) => q.ministryId)).size).toBeGreaterThan(1);
    expect(all.permits.length).toBeGreaterThan(0);
  });
});

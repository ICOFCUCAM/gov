import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Publisher auth delegates to the platform tier; stub it so the enforce path is testable.
const platformAuth = vi.fn();
vi.mock('@/lib/platform-auth', () => ({ platformOrCronAuthorized: (req: Request) => platformAuth(req) }));

import { GET as chamberGET } from './route';
import { GET as releaseGET } from './[id]/route';
import { POST as decisionPOST } from './[id]/decision/route';
import { GET as requestsGET, POST as requestsPOST } from './requests/route';
import { GET as downloadGET } from './download/[key]/[artifact]/route';
import { GET as publisherGET, POST as publisherPOST } from './publisher/route';
import { POST as advancePOST } from './publisher/requests/[id]/route';
import { POST as enrolPOST } from './publisher/nations/route';
import { resetUpdates } from '@/lib/data/updates';
import { resetSecurity } from '@/lib/data/security-store';
import type { UpdateChamber, PublisherOverview } from '@/lib/api/types';

const get = (url: string) => new Request(`http://x${url}`) as never;
const post = (url: string, body: unknown) => new Request(`http://x${url}`, {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' },
}) as never;

async function chamber(link?: string): Promise<UpdateChamber> {
  const res = chamberGET(get(`/api/releases${link ? `?link=${link}` : ''}`));
  expect(res.status).toBe(200);
  return (await res.json()).chamber;
}
async function overview(): Promise<PublisherOverview> {
  return (await (await publisherGET(get('/api/releases/publisher'))).json()).overview;
}

beforeEach(() => { resetUpdates(); resetSecurity(); platformAuth.mockReset(); });
afterEach(() => { delete process.env.CIVICOS_AUTH; });

describe('GET /api/releases (update chamber)', () => {
  it('returns the installed nation’s chamber by default', async () => {
    const c = await chamber();
    expect(c.nation.home).toBe(true);
    expect(c.installed).toBe('1.4.0');
    expect(c.releases.every(r => r.channel === 'global' || r.nationId === c.nation.id)).toBe(true);
  });

  it('a nation’s private link returns only that nation’s builds', async () => {
    const sandbox = (await overview()).nations.find(n => n.id === 'sandbox')!;
    const c = await chamber(sandbox.channelKey);
    expect(c.nation.id).toBe('sandbox');
    expect(c.releases.map(r => r.id)).not.toContain('DR-141-H1');
    expect(c.requests.every(q => q.nationId === 'sandbox')).toBe(true);
  });

  it('an unknown link is refused', async () => {
    expect(chamberGET(get('/api/releases?link=nk_nope')).status).toBe(404);
  });
});

describe('GET /api/releases/[id]', () => {
  it('returns a visible release with the chamber', async () => {
    const res = releaseGET(get('/api/releases/DR-141'), { params: { id: 'DR-141' } });
    expect(res.status).toBe(200);
    expect((await res.json()).release.version).toBe('1.4.1');
  });

  it('404s on another nation’s build', () => {
    expect(releaseGET(get('/api/releases/DR-141-S1'), { params: { id: 'DR-141-S1' } }).status).toBe(404);
  });
});

describe('POST /api/releases/[id]/decision', () => {
  const decide = (id: string, body: unknown) => decisionPOST(post(`/api/releases/${id}/decision`, body), { params: { id } });

  it('rejects invalid JSON, unknown actions and missing names', async () => {
    expect((await decide('DR-141', 'nope')).status).toBe(400);
    expect((await decide('DR-141', { action: 'auto-install', by: 'CIO' })).status).toBe(422);
    expect((await decide('DR-141', { action: 'approve' })).status).toBe(422);
  });

  it('approves then installs, never skipping the approval', async () => {
    expect((await decide('DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true })).status).toBe(409);
    const a = await decide('DR-141', { action: 'approve', by: 'Chief Information Officer' });
    expect(a.status).toBe(200);
    expect((await a.json()).install.state).toBe('approved');
    // No restore point yet: refused.
    expect((await decide('DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true })).status).toBe(409);
    expect((await decide('DR-141', { action: 'prepare', by: 'Ops' })).status).toBe(200);
    const i = await decide('DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    expect(i.status).toBe(200);
    const body = await i.json();
    expect(body.chamber.installed).toBe('1.4.1');
    expect(body.install.state).toBe('probation');
  });

  it('schedules a hosted upgrade into a chosen window', async () => {
    await decide('DR-141-H1', { action: 'approve', by: 'CIO' });
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 90000000).toISOString();
    const res = await decide('DR-141-H1', { action: 'schedule', by: 'CIO', window: { start, end } });
    expect(res.status).toBe(200);
    expect((await res.json()).install).toMatchObject({ state: 'scheduled', window: { start, end } });
  });

  it('cannot decide on another nation’s build', async () => {
    expect((await decide('DR-141-S1', { action: 'approve', by: 'CIO' })).status).toBe(404);
  });
});

describe('/api/releases/requests', () => {
  it('lists only this nation’s requests', async () => {
    const res = requestsGET(get('/api/releases/requests'));
    const { requests } = await res.json();
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((q: { nationId: string }) => q.nationId === 'home')).toBe(true);
  });

  it('validates and creates a request', async () => {
    expect((await requestsPOST(post('/api/releases/requests', 'x'))).status).toBe(400);
    expect((await requestsPOST(post('/api/releases/requests', { title: 'Hi' }))).status).toBe(422);
    const res = await requestsPOST(post('/api/releases/requests', {
      title: 'Court calendar sync', description: 'Sync hearings into the officer console calendar.', priority: 'normal', institution: 'Judiciary', by: 'Registrar',
    }));
    expect(res.status).toBe(201);
    expect((await res.json()).request.stage).toBe('requested');
  });
});

describe('GET /api/releases/download/[key]/[artifact]', () => {
  it('serves a labelled placeholder manifest for the nation’s own artifacts only', async () => {
    const o = await overview();
    const home = o.nations.find(n => n.home)!;
    const sandbox = o.nations.find(n => n.id === 'sandbox')!;
    const own = o.releases.find(r => r.id === 'DR-141-H1')!.artifacts[0]!;
    const res = downloadGET(get('/x'), { params: { key: home.channelKey, artifact: own.id } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename=".*\.manifest\.json"/);
    const m = await res.json();
    expect(m.placeholder).toBe(true);
    expect(m.artifact.sha256).toBe(own.sha256);
    // The same artifact through another nation's link does not exist.
    expect(downloadGET(get('/x'), { params: { key: sandbox.channelKey, artifact: own.id } }).status).toBe(404);
    expect(downloadGET(get('/x'), { params: { key: 'nk_nope', artifact: own.id } }).status).toBe(404);
  });
});

describe('publisher routes', () => {
  it('lists every nation and the install matrix', async () => {
    const o = await overview();
    expect(o.nations.map(n => n.id)).toEqual(expect.arrayContaining(['home', 'sandbox']));
    expect(o.installs.home!['DR-140']).toBe('installed');
    expect(o.installs.home!['DR-141-S1']).toBeUndefined();
  });

  it('publishes a release that arrives as available, never installed', async () => {
    const res = await publisherPOST(post('/api/releases/publisher', {
      channel: 'global', version: '1.4.2', title: 'Maintenance', summary: 'Small fixes for the operations centre.',
      severity: 'maintenance', minCompatibleVersion: '1.4.0', changes: [{ kind: 'fix', text: 'Fix' }], delivery: ['saas'],
    }));
    expect(res.status).toBe(201);
    const c = await chamber();
    expect(c.releases.find(r => r.version === '1.4.2')!.install.state).toBe('available');
    expect(c.installed).toBe('1.4.0');
  });

  it('rejects invalid releases', async () => {
    expect((await publisherPOST(post('/api/releases/publisher', 'x'))).status).toBe(400);
    expect((await publisherPOST(post('/api/releases/publisher', { channel: 'global' }))).status).toBe(422);
  });

  it('advances requests and enrols nations', async () => {
    const a = await advancePOST(post('/x', { to: 'under-review' }), { params: { id: 'FR-1003' } });
    expect(a.status).toBe(200);
    expect((await advancePOST(post('/x', { to: 'under-review' }), { params: { id: 'FR-9999' } })).status).toBe(404);
    expect((await advancePOST(post('/x', {}), { params: { id: 'FR-1003' } })).status).toBe(422);
    const e = await enrolPOST(post('/x', { name: 'Coastal deployment', deliveryMode: 'saas', installedVersion: '1.4.1' }));
    expect(e.status).toBe(201);
    expect((await e.json()).nation.channelKey).toMatch(/^nk_/);
  });

  it('under CIVICOS_AUTH=enforce, requires a platform-tier session', async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    platformAuth.mockResolvedValue(false);
    expect((await publisherGET(get('/api/releases/publisher'))).status).toBe(401);
    expect((await publisherPOST(post('/api/releases/publisher', {}))).status).toBe(401);
    expect((await advancePOST(post('/x', { to: 'under-review' }), { params: { id: 'FR-1003' } })).status).toBe(401);
    expect((await enrolPOST(post('/x', {}))).status).toBe(401);
    platformAuth.mockResolvedValue(true);
    expect((await publisherGET(get('/api/releases/publisher'))).status).toBe(200);
  });
});

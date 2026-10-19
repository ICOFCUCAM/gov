import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const platformAuth = vi.fn();
vi.mock('@/lib/platform-auth', () => ({ platformOrCronAuthorized: (req: Request) => platformAuth(req), cronAuthorized: () => false }));

import { GET as hostingGET, POST as hostingPOST } from './hosting/route';
import { POST as nationPOST } from './hosting/[id]/route';
import { GET as queueGET } from './publisher/hosting/route';
import { POST as reviewPOST } from './publisher/hosting/[id]/route';
import { resetUpdates, getChamber } from '@/lib/data/updates';
import { resetSecurity } from '@/lib/data/security-store';
import { resetHosting } from '@/lib/data/hosting';
import { listAudit } from '@/lib/data/store';
import type { HostingCenter, HostingRequest } from '@/lib/api/types';

const post = (body: unknown, url = 'http://x/api') => new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;
const center = async (link?: string): Promise<HostingCenter> => (await hostingGET(new Request(`http://x/api/releases/hosting${link ? `?link=${link}` : ''}`) as never).json()).hosting;
const sandboxKey = () => { const c = getChamber('sandbox'); if ('error' in c) throw new Error(c.error); return c.nation.channelKey; };
const answers = { population: 5_000_000, activeUsers: 250_000, institutions: 12, services: 40, residency: 'in-country', availability: 99.9, rtoHours: 4, rpoMinutes: 15, existingFacility: 'partial', power: 'reliable', connectivity: 'redundant-fibre', itStaff: 20 };
async function request(path: string, body: Record<string, unknown> = {}): Promise<HostingRequest> {
  const res = await hostingPOST(post({ path, questionnaire: answers, by: 'Minister of ICT', ...body }));
  expect(res.status).toBe(201);
  return (await res.json()).request;
}
const nationAct = (id: string, body: Record<string, unknown>) => nationPOST(post(body), { params: Promise.resolve({ id }) });
const review = (id: string, body: Record<string, unknown>) => reviewPOST(post(body), { params: Promise.resolve({ id }) });

beforeEach(() => { resetUpdates(); resetSecurity(); resetHosting(); platformAuth.mockReset(); });
afterEach(() => { delete process.env.CIVICOS_AUTH; });

describe('hosting & deployment', () => {
  it('compares all four paths with indicative estimates', async () => {
    const c = await center();
    expect(Object.keys(c.comparison).sort()).toEqual(['hosted', 'other-cloud', 'perpetual', 'sovereign-dc']);
    expect(c.model.unitCosts.length).toBeGreaterThan(5);
    expect(c.requests).toEqual([]);
  });

  it('request → preliminary → review → issued v1 → revise → issued v2 → accepted, all audited', async () => {
    const r = await request('sovereign-dc');
    expect(r.stage).toBe('preliminary');
    expect(r.preliminary.capexTotal).toBeGreaterThan(0);
    expect((await nationAct(r.id, { action: 'accept', by: 'Minister' })).status).toBe(409); // not issued yet
    expect((await review(r.id, { action: 'issue', notes: 'Looks right after the site visit' })).status).toBe(409); // review first
    expect((await review(r.id, { action: 'review', by: 'Infrastructure architect' })).status).toBe(200);
    expect((await review(r.id, { action: 'issue', notes: 'x' })).status).toBe(422);
    expect((await review(r.id, { action: 'issue', capexFactor: 5, notes: 'Too big a factor here' })).status).toBe(422);
    const v1 = await (await review(r.id, { action: 'issue', by: 'Infrastructure architect', capexFactor: 1.1, notes: 'Site survey adds cooling upgrades' })).json();
    expect(v1.request).toMatchObject({ stage: 'issued' });
    expect(v1.request.assessments[0]).toMatchObject({ version: 1, estimate: { adjustments: { capexFactor: 1.1 } } });
    expect((await nationAct(r.id, { action: 'revise', by: 'Minister' })).status).toBe(422); // reason required
    expect((await nationAct(r.id, { action: 'revise', by: 'Minister', note: 'Plan for 99.95% availability instead' })).status).toBe(200);
    await review(r.id, { action: 'review' });
    await review(r.id, { action: 'issue', notes: 'Revised for 99.95% with 24/7 staffing' });
    const accepted = await (await nationAct(r.id, { action: 'accept', by: 'Minister', note: 'Approved by cabinet' })).json();
    expect(accepted.request).toMatchObject({ stage: 'accepted', decision: { version: 2, by: 'Minister' } });
    expect((await center()).currentPath).toBe('sovereign-dc');
    const actions = listAudit().slice(0, 12).map(a => a.action);
    expect(actions).toEqual(expect.arrayContaining(['hosting.request', 'hosting.review', 'hosting.issue', 'hosting.revise', 'hosting.accept']));
  });

  it('a perpetual licence is issued at once from the price list — no consultation needed', async () => {
    const r = await request('perpetual');
    expect(r.stage).toBe('issued');
    expect(r.assessments[0]!.issuedBy).toBe('Price list');
    expect(r.assessments[0]!.estimate.licence!.independent).toMatch(/entirely on your own/);
    expect((await nationAct(r.id, { action: 'accept', by: 'Minister' })).status).toBe(200);
  });

  it('switching later is a new request with a migration plan and guarantees', async () => {
    const hosted = await request('hosted', { questionnaire: { ...answers, plan: 'enterprise', term: 5 } });
    expect(hosted.preliminary.subscription!.term).toBe(5);
    await review(hosted.id, { action: 'review' });
    await review(hosted.id, { action: 'issue', notes: 'Confirmed: enterprise plan, five-year prepaid' });
    await nationAct(hosted.id, { action: 'accept', by: 'Minister' });
    const move = await request('sovereign-dc');
    expect(move.currentPath).toBe('hosted');
    expect(move.preliminary.migration!.guarantees.join(' ')).toMatch(/No lock-in/);
  });

  it('validates requests', async () => {
    expect((await hostingPOST(post({ path: 'moon-base', questionnaire: answers, by: 'x' }))).status).toBe(422);
    expect((await hostingPOST(post({ path: 'hosted', questionnaire: { ...answers, population: 5 }, by: 'x' }))).status).toBe(422);
    expect((await hostingPOST(post({ path: 'hosted', questionnaire: answers }))).status).toBe(422);
  });

  it('isolation: a nation sees and acts only on its own requests', async () => {
    const mine = await request('other-cloud');
    expect((await center(sandboxKey())).requests).toEqual([]);
    expect((await nationAct(mine.id, { action: 'withdraw', by: 'x', link: sandboxKey() })).status).toBe(404);
    expect((await center()).requests.map(r => r.id)).toEqual([mine.id]);
  });

  it('the publisher queue lists every nation’s requests and is gated under enforce', async () => {
    await request('sovereign-dc');
    const res = await hostingPOST(post({ path: 'hosted', questionnaire: answers, by: 'Sandbox owner', link: sandboxKey() }));
    expect(res.status).toBe(201);
    const q = await (await queueGET(new Request('http://x') as never)).json();
    expect(q.requests).toHaveLength(2);
    expect(q.nations.sandbox).toBe('Pre-production sandbox');
    process.env.CIVICOS_AUTH = 'enforce';
    platformAuth.mockResolvedValue(false);
    expect((await queueGET(new Request('http://x') as never)).status).toBe(401);
    expect((await review(q.requests[0].id, { action: 'review' })).status).toBe(401);
  });
});

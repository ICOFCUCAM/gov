// Plan I0.2: structural changes to institutions, departments, modules,
// integrations and webhooks record the verified official from the session,
// never 'operator' and never a name typed into the request; a department is
// ended with a reason and kept (the earlier DELETE route ends it).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { createMinistry, getMinistry, listAudit, listWebhooks } from '@/lib/data/store';

const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
process.env.CIVICOS_SCRYPT_N = '16384';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }), headers: () => new Headers() }));

const rename = await import('./[id]/rename/route');
const modules = await import('./[id]/modules/route');
const depts = await import('./[id]/departments/route');
const dept = await import('./[id]/departments/[deptId]/route');
const create = await import('./route');
const integrations = await import('../../integrations/route');
const webhooks = await import('../../webhooks/route');
const pause = await import('../../webhooks/[id]/pause/route');

const PW = 'correct horse battery';
const post = (url: string, body: unknown, method = 'POST') => new NextRequest(`http://localhost${url}`, { method, body: JSON.stringify(body) });
const ctx = <T extends object>(p: T) => ({ params: Promise.resolve(p) });
const LABEL = 'Ama Mensah, Head of Service';
let mid = '';

beforeEach(async () => {
  resetOfficials(); cookie = undefined;
  const a = await createAccount({ email: 'ama@gov.test', name: 'Ama Mensah', office: 'Head of Service', password: PW, setupToken: SETUP_TOKEN }, null);
  if ('error' in a) throw new Error(a.error);
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${a.id}`, name: 'x', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
  const m = createMinistry({ archetype: 'GENERIC', name: 'Structure Test', slug: `structure-${Math.random().toString(36).slice(2, 8)}` });
  if ('error' in m) throw new Error(m.error);
  mid = m.id;
});

const lastAudit = (action: string) => listAudit().find(e => e.action === action)!; // newest first

describe('structural changes record the verified official (plan I0.2)', () => {
  it('institutions, departments and modules: the session name, never a typed name or operator', async () => {
    expect((await create.POST(post('/api/org/ministries', { archetype: 'GENERIC', name: 'Made by session', slug: `made-${Math.random().toString(36).slice(2, 8)}`, by: 'Typed Name' }))).status).toBe(201);
    expect(lastAudit('ministry.create').actor).toBe(LABEL);
    expect((await rename.POST(post(`/api/org/ministries/${mid}/rename`, { name: 'Renamed', by: 'Typed Name' }), ctx({ id: mid }))).status).toBe(200);
    expect(lastAudit('ministry.rename').actor).toBe(LABEL);
    expect((await modules.POST(post(`/api/org/ministries/${mid}/modules`, { moduleKey: 'documents', enabled: false, by: 'operator' }), ctx({ id: mid }))).status).toBe(200);
    expect(lastAudit('module.set').actor).toBe(LABEL);
    expect((await depts.POST(post(`/api/org/ministries/${mid}/departments`, { name: 'Records', by: 'Typed' }), ctx({ id: mid }))).status).toBe(200);
    expect(lastAudit('department.add').actor).toBe(LABEL);
  });

  it('integrations and webhooks: the session name', async () => {
    const i = await integrations.POST(post('/api/integrations', { name: `partner-${Math.random()}`, ownerOrg: 'Partner', contact: 'ops@partner.example', scopes: ['service:person.verify'], by: 'Typed' }));
    expect(i.status).toBe(201);
    expect(lastAudit('integration.register').actor).toBe(LABEL);
    const w = await webhooks.POST(post('/api/webhooks', { topic: 'boundary', url: 'https://hooks.example.gov/x', by: 'Typed' }));
    expect(w.status).toBe(201);
    expect(lastAudit('webhook.subscribe').actor).toBe(LABEL);
    const id = listWebhooks()[0]!.id;
    expect((await pause.POST(post(`/api/webhooks/${id}/pause`, {}), ctx({ id }))).status).toBe(200);
    expect(lastAudit('webhook.paused').actor).toBe(LABEL);
  });

  it('no store writes the placeholder actor operator', () => {
    const root = join(process.cwd(), 'src', 'lib');
    const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
    const hits = walk(root).filter(p => /\.(ts|tsx)$/.test(p) && !/\.test\./.test(p))
      .filter(p => /recordAudit\(\s*'operator'|\|\|\s*'operator'|\?\?\s*'operator'/.test(readFileSync(p, 'utf8')));
    expect(hits).toEqual([]);
    const apis = walk(join(process.cwd(), 'src', 'app', 'api')).filter(p => p.endsWith('route.ts'))
      .filter(p => /\?\?\s*'operator'/.test(readFileSync(p, 'utf8')));
    expect(apis).toEqual([]);
  });
});

describe('a department is ended with a reason and kept (plan I0.2)', () => {
  it('the earlier DELETE route ends it with the reason given, and refuses without one', async () => {
    const d = getMinistry(mid)!.departments[0]!;
    const n = getMinistry(mid)!.departments.length;
    const refused = await dept.DELETE(post(`/api/org/ministries/${mid}/departments/${d.id}`, {}, 'DELETE'), ctx({ id: mid, deptId: d.id }));
    expect(refused.status).toBe(422);
    expect((await refused.json()).error).toMatch(/reason/);
    const r = await dept.DELETE(post(`/api/org/ministries/${mid}/departments/${d.id}`, { reason: 'Merged with Planning', by: 'Typed' }, 'DELETE'), ctx({ id: mid, deptId: d.id }));
    expect(r.status).toBe(200);
    const kept = getMinistry(mid)!;
    expect(kept.departments).toHaveLength(n);
    expect(kept.departments.find(x => x.id === d.id)).toMatchObject({ status: 'ended', endReason: 'Merged with Planning', endedBy: LABEL });
    expect(lastAudit('department.end').actor).toBe(LABEL);
  });

  it('POST { op: end } ends a department; ending it again is refused', async () => {
    const d = getMinistry(mid)!.departments[0]!;
    expect((await dept.POST(post(`/api/org/ministries/${mid}/departments/${d.id}`, { op: 'end', reason: 'No longer needed' }), ctx({ id: mid, deptId: d.id }))).status).toBe(200);
    expect((await dept.POST(post(`/api/org/ministries/${mid}/departments/${d.id}`, { op: 'end', reason: 'Again' }), ctx({ id: mid, deptId: d.id }))).status).toBe(409);
  });
});

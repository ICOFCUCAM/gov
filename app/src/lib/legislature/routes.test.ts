// The /api/legislature routes (plan phase 7): the legislature's own signed-in
// officials keep the record; a whole-government administrator and a ministry's
// official are refused with 403; someone not signed in reads only what the
// chamber makes public, never the staff who recorded a step. Mechanism tests;
// the institutions are illustrative.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { createMinistry, setSovereign, recordTermsDuringSetup, completeSetup } from '@/lib/data/store';
import { resetLegislature } from './register';

const SETUP_TOKEN = 'test-setup-token-legislature-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
process.env.CIVICOS_SCRYPT_N = '16384';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }), headers: () => new Headers() }));

const procedure = await import('@/app/api/legislature/procedure/route');
const bills = await import('@/app/api/legislature/bills/route');
const bill = await import('@/app/api/legislature/bills/[id]/route');
const akn = await import('@/app/api/legislature/bills/[id]/akn/route');

const post = (url: string, body: unknown) => new NextRequest(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body) });
const get = (url: string) => new NextRequest(`http://localhost${url}`);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
async function as(id: string | null) {
  if (!id) { cookie = undefined; return; }
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${id}`, name: 'x', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const PW = 'correct horse battery';
const ids: Record<string, string> = {};

beforeAll(async () => {
  resetOfficials(); resetLegislature();
  const mk = (name: string) => { const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 6)}` }); if ('error' in m) throw new Error(m.error); return m.id; };
  const assembly = mk('National Assembly'), finance = mk('Ministry of Finance');
  recordTermsDuringSetup(assembly, { standing: 'legislature' }, 'Setup');
  setSovereign({ deployment: { authorities: { legislature: assembly } } }, 'Setup');
  ids.admin = (await createAccount({ email: 'admin@gov.test', name: 'Admin', office: 'Head of Service', password: PW, setupToken: SETUP_TOKEN }, null) as { id: string }).id;
  const acc = async (email: string, role: string, institution?: string) => { const a = await createAccount({ email, name: email.split('@')[0], office: 'Office', password: PW, role, institution }, 'Setup'); if ('error' in a) throw new Error(a.error); return a.id; };
  ids.clerk = await acc('clerk@assembly.test', 'signatory', assembly);
  ids.deputy = await acc('deputy@assembly.test', 'signatory', assembly);
  ids.finance = await acc('signer@finance.test', 'signatory', finance);
  completeSetup('Setup');
});

describe('/api/legislature', () => {
  it('keeps the record for the legislature\'s own officials; refuses the whole government and a ministry', async () => {
    await as(ids.clerk!);
    const d = await procedure.POST(post('/api/legislature/procedure', { op: 'draft', fromReference: true, chambers: ['National Assembly'], publicRecord: { bills: 'introduced', votes: 'counts' } }));
    expect(d.status).toBe(201);
    const version = (await d.json()).procedure.version;
    expect((await procedure.POST(post('/api/legislature/procedure', { op: 'approve', version, activeFrom: '2026-01-01' }))).status).toBe(422); // the author
    await as(ids.deputy!);
    expect((await procedure.POST(post('/api/legislature/procedure', { op: 'approve', version, activeFrom: '2026-01-01' }))).status).toBe(200);
    for (const who of ['admin', 'finance'] as const) {
      await as(ids[who]!);
      const r = await bills.POST(post('/api/legislature/bills', { title: 'A Bill', provisions: [{ eId: 'sec_1', num: '1', text: 'Text.' }] }));
      expect(r.status, who).toBe(403);
      expect((await r.json()).error).toMatch(/kept by its own officials/);
    }
    await as(ids.clerk!);
    const r = await bills.POST(post('/api/legislature/bills', { title: 'Public Records Bill', provisions: [{ eId: 'sec_1', num: '1', text: 'Every public body keeps its records.' }] }));
    expect(r.status).toBe(201);
    const id = (await r.json()).bill.id as string;
    expect((await bill.POST(post(`/api/legislature/bills/${id}`, { op: 'stage', stage: 'second-reading' }), ctx(id))).status).toBe(200);
    expect((await bill.POST(post(`/api/legislature/bills/${id}`, { op: 'vote', yes: 10, no: 2 }), ctx(id))).status).toBe(200);
    await as(ids.finance!);
    expect((await bill.POST(post(`/api/legislature/bills/${id}`, { op: 'correct', target: { kind: 'vote', id: 'x' }, values: { yes: 9 }, reason: 'x' }), ctx(id))).status).toBe(403);
    // Not signed in: the public projection only, without the staff who recorded steps.
    await as(null);
    const pub = await (await bill.GET(get(`/api/legislature/bills/${id}`), ctx(id))).json();
    expect(pub.full).toBe(false);
    expect(pub.bill.votes[0]).toMatchObject({ yes: 10, no: 2, result: 'carried' });
    expect(JSON.stringify(pub)).not.toMatch(/clerk@|"by"/);
    const list = await (await bills.GET(get('/api/legislature/bills'))).json();
    expect(list.bills.map((b: { full: boolean }) => b.full)).toEqual([false]);
    const xml = await (await akn.GET(get(`/api/legislature/bills/${id}/akn?version=1`), ctx(id))).text();
    expect(xml).toMatch(/<bill name="act">/);
    // The clerk reads the full record.
    await as(ids.clerk!);
    const full = await (await bill.GET(get(`/api/legislature/bills/${id}`), ctx(id))).json();
    expect(full).toMatchObject({ full: true, ownOfficial: true });
    expect(full.bill.votes[0].by).toMatch(/clerk/);
  });
});

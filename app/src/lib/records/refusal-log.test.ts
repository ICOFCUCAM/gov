// Step I0.1 (baseline audit §3.3, spec Part 4 test 14): refused requests are
// written to the access log as reference and rule only — the routes'
// refusal() / readRefusal() and the middleware's own 403 (written by the
// platform when the middleware asks it about the change) — deduplicated so a
// loop cannot flood the log. Also the personal-data reads the audit found
// unlogged that go through real sessions here: a normal case and the case
// list, permits.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { listMinistries, setSovereign, createPermit, permitHolders } from '@/lib/data/store';
import { listAccess, resetAccessLog } from './access-log';
import { logRefusal, resetRefusalLog, DEDUPE_MS, PER_OFFICIAL_MAX } from './refusal-log';
import { resetSearchLog } from './access-search';
import { ROUTE_HEADER, CHANGE_METHOD_HEADER } from './route-ref';
import { CHANGE_PATH_HEADER } from '@/lib/data/persist';
import { resetCases, openCase } from '@/lib/casework/engine';
import { resetPackages, draftPackage, approvePackage } from '@/lib/casework/packages';
import { samplePackage } from '@/lib/casework/testkit';

const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
process.env.CIVICOS_SCRYPT_N = '16384';

let cookie: string | undefined;
let forwarded = new Headers();
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }), headers: () => forwarded }));

const parcels = await import('@/app/api/parcels/route');
const permits = await import('@/app/api/permits/route');
const permit = await import('@/app/api/permits/[id]/route');
const cases = await import('@/app/api/cases/route');
const oneCase = await import('@/app/api/cases/[id]/route');
const signedIn = await import('@/app/api/auth/official/route');

const PW = 'correct horse battery';
const ids: Record<string, string> = {};
let M1 = '', M2 = '';
async function as(key: string) {
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${ids[key]}`, name: key, method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const account = async (key: string, role: string, institution?: string, first = false) => {
  const a = await createAccount({ email: `${key}@gov.example`, name: key, office: 'Office', password: PW, role, ...(institution ? { institution } : {}), ...(first ? { setupToken: SETUP_TOKEN } : {}) }, first ? null : 'Setup');
  if ('error' in a) throw new Error(a.error);
  ids[key] = a.id;
};

beforeAll(async () => {
  resetOfficials();
  [M1, M2] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
  await account('admin', 'administrator', undefined, true);
  await account('clerk', 'officer', M1);
  await account('outsider', 'signatory', M2);
  await account('auditor', 'auditor');
  await account('gov', 'officer');
});

beforeEach(() => { resetAccessLog(); resetRefusalLog(); resetSearchLog(); forwarded = new Headers(); cookie = undefined; });

describe('logRefusal()', () => {
  const who = { id: 'local:z', label: 'Z. Official', institution: 'min-x' };
  it('writes a refused entry with reference and rule only (format 2)', () => {
    expect(logRefusal(who, { register: 'api', id: 'POST /api/cases' }, 'Only an administrator can make this change')).toBe(true);
    const [e] = listAccess();
    expect(e).toMatchObject({ v: 2, action: 'refused', result: 'refused', by: { id: 'local:z', name: 'Z. Official', institution: 'min-x' }, record: { register: 'api', id: 'POST /api/cases' }, rule: 'Only an administrator can make this change' });
    expect(Object.keys(e!).sort()).toEqual(['action', 'at', 'by', 'hash', 'id', 'prev', 'record', 'result', 'rule', 'seq', 'v']);
  });

  it('writes the same refusal once a window, and at most PER_OFFICIAL_MAX of one official a window', () => {
    const t0 = new Date('2026-10-21T10:00:00Z');
    for (let i = 0; i < 5; i++) logRefusal(who, { register: 'api', id: 'POST /api/x' }, 'no', new Date(t0.getTime() + i * 1000));
    expect(listAccess()).toHaveLength(1);
    logRefusal(who, { register: 'api', id: 'POST /api/x' }, 'no', new Date(t0.getTime() + DEDUPE_MS + 1));
    expect(listAccess()).toHaveLength(2);
    resetAccessLog(); resetRefusalLog();
    for (let i = 0; i < PER_OFFICIAL_MAX + 20; i++) logRefusal(who, { register: 'api', id: `POST /api/x/${i}` }, 'no', t0);
    expect(listAccess()).toHaveLength(PER_OFFICIAL_MAX);
    // Another official is not held back by the first one's loop.
    expect(logRefusal({ id: 'local:other', label: 'Other' }, { register: 'api', id: 'POST /api/x/0' }, 'no', t0)).toBe(true);
  });
});

describe('refusals in the routes (refusal() / readRefusal())', () => {
  it('a change refused by refusal() names the method and path the middleware forwarded, and the rule; never the body', async () => {
    await as('outsider');
    forwarded = new Headers({ [ROUTE_HEADER]: 'POST /api/parcels' });
    const res = await parcels.POST(new NextRequest('http://localhost/api/parcels', { method: 'POST', body: JSON.stringify({ parcelId: 'X/1', rights: [{ holder: 'Kipchoge Testholder' }] }) }));
    expect(res.status).toBe(403);
    const why = (await res.json()).error as string;
    const log = listAccess({ action: 'refused' });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ v: 2, result: 'refused', by: { id: `local:${ids.outsider}`, institution: M2 }, record: { register: 'api', id: 'POST /api/parcels' }, rule: why });
    expect(JSON.stringify(log)).not.toMatch(/Kipchoge|Testholder|X\/1/);
  });

  it('a read refused by readRefusal() names the record the route gives; repeats within the window are written once', async () => {
    const holders = permitHolders();
    const m = listMinistries().find(x => !holders.includes(x.id))!;
    await account(`reader-${m.id}`, 'officer', m.id).catch(() => undefined);
    await as(`reader-${m.id}`);
    const p = createPermit({ type: 'building', title: 'Extension', applicantName: 'Amina Applicant', municipality: 'Central', fields: {} });
    const ctx = { params: Promise.resolve({ id: p.id }) };
    expect((await permit.GET(new Request('http://localhost'), ctx)).status).toBe(403);
    expect((await permit.GET(new Request('http://localhost'), ctx)).status).toBe(403);
    expect((await permits.GET()).status).toBe(403);
    const log = listAccess({ register: 'permits' });
    expect(log.map(e => [e.action, e.record.id ?? null])).toEqual([['refused', null], ['refused', p.id]]);
    expect(JSON.stringify(log)).not.toContain('Amina');
  });
});

describe('the middleware\'s 403, written by the platform it asks (GET /api/auth/official)', () => {
  const ask = (method: string, path: string) => {
    forwarded = new Headers({ [CHANGE_PATH_HEADER]: path, [CHANGE_METHOD_HEADER]: method });
    return signedIn.GET();
  };

  it('writes the refusal the middleware will answer, with the same rule (apiPermission), once per window', async () => {
    await as('auditor');
    const r = await (await ask('POST', '/api/cases')).json();
    expect(r.official).toMatchObject({ role: 'auditor' });
    await ask('POST', '/api/cases');
    const log = listAccess({ action: 'refused' });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ v: 2, by: { id: `local:${ids.auditor}` }, record: { register: 'api', id: 'POST /api/cases' }, rule: 'Auditors can read records but not change them' });
  });

  it('writes nothing for an allowed change, a read, a question without a change, or no session', async () => {
    await as('admin');
    await ask('POST', '/api/sovereign');
    await as('clerk');
    await ask('GET', '/api/sovereign');
    forwarded = new Headers();
    await signedIn.GET();
    cookie = undefined;
    await ask('POST', '/api/sovereign');
    expect(listAccess()).toHaveLength(0);
    // The clerk's change to the structure of government is refused and written.
    await as('clerk');
    await ask('POST', '/api/sovereign');
    expect(listAccess({ action: 'refused' })).toHaveLength(1);
  });
});

describe('personal-data reads (step I0.1)', () => {
  beforeEach(() => {
    resetCases(); resetPackages();
    setSovereign({ deployment: { authorities: { businessRegister: M1 } } }, 'test');
    const d = draftPackage({ ...samplePackage(), owner: 'businessRegister' }, 'Author', 'author-1', []);
    if ('error' in d) throw new Error(d.error);
    const a = approvePackage('test.licence', 1, 'Approver', 'approver-2', '2026-01-01', []);
    if ('error' in a) throw new Error(a.error);
  });

  it('writes every read of a normal case (it carries personal fields) and each case list as one search with the count', async () => {
    const c = openCase({ procedure: 'test.licence', fields: { name: 'Ade Personal' }, subject: [{ kind: 'person', name: 'Ade Subject' }] }, { name: 'Clerk', scope: null });
    if ('error' in c) throw new Error(c.error);
    await as('clerk');
    const read = await oneCase.GET(new NextRequest('http://localhost/api/cases/x'), { params: Promise.resolve({ id: c.ref }) });
    expect((await read.json()).case.fields.name).toBe('Ade Personal');
    const list = await (await cases.GET(new NextRequest('http://localhost/api/cases?open=true'))).json();
    expect(list.cases[0].subject[0].name).toBe('Ade Subject');
    await cases.GET(new NextRequest('http://localhost/api/cases?open=true'));
    const log = listAccess({ register: 'cases' });
    expect(log.map(e => [e.action, e.record.id ?? e.record.query])).toEqual([['search', 'open=true → 1'], ['view', c.ref]]);
    expect(log.every(e => e.v === 2 && e.result === 'allowed' && e.by.id === `local:${ids.clerk}`)).toBe(true);
    expect(JSON.stringify(log)).not.toMatch(/Ade/);
  });

  it('writes permit reads: the list as one search with the count, one permit as a view; never the applicant', async () => {
    const p = createPermit({ type: 'building', title: 'Extension', applicantName: 'Amina Applicant', municipality: 'Central', fields: {} });
    await as('gov');
    const all = await (await permits.GET()).json();
    expect((await permit.GET(new Request('http://localhost'), { params: Promise.resolve({ id: p.id }) })).status).toBe(200);
    const log = listAccess({ register: 'permits' });
    expect(log.map(e => [e.action, e.record.id ?? e.record.query])).toEqual([['view', p.id], ['search', `(all) → ${all.permits.length}`]]);
    expect(JSON.stringify(log)).not.toContain('Amina');
  });
});

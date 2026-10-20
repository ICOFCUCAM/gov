import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let scope: { id: string; name: string; label: string; role: string; institution?: string } | null = null;
vi.mock('@/lib/auth/official', () => ({ caseScope: async () => scope }));
vi.mock('@/lib/casework/actor', () => ({ routeActor: async () => ({ id: scope?.id ?? 'x', name: scope?.label ?? 'Official' }) }));

const { GET, POST } = await import('./route');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetAccessLog, listAccess } = await import('@/lib/records/access-log');
const { resetEducation } = await import('@/lib/education/register');
const { resetOrganisations, createOrganisation, setStanding } = await import('@/lib/organisations/register');

let EDU = '', OTHER = '', SCHOOL = '';
const get = (qs: string) => GET(new NextRequest(`http://x/api/education${qs}`));
const post = (b: unknown) => POST(new NextRequest('http://x/api/education', { method: 'POST', body: JSON.stringify(b) }));

describe('/api/education', () => {
  beforeEach(() => {
    resetAccessLog(); resetEducation(); resetOrganisations();
    [EDU, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { education: EDU } } }, 'Administrator');
    const o = createOrganisation({ name: 'Lakeside Primary', kind: 'school' }, 'case-1', 'Registrar') as { id: string; number: string };
    setStanding(o.id, { register: 'schools', state: 'granted', reason: 'Registered', case: 'case-2' }, 'Registrar');
    SCHOOL = o.number;
  });

  it('lets only the education authority record a return, and auditors and other institutions are refused', async () => {
    scope = { id: 'o1', name: 'Officer', label: 'Officer', role: 'officer', institution: EDU };
    const ok = await post({ organisation: SCHOOL, period: '2026/2027', counts: { 'enrolment.total': 420, 'enrolment.female': 210, 'enrolment.male': 205, 'staff.teaching': 18 } });
    expect(ok.status).toBe(201);
    expect((await post({ organisation: SCHOOL, period: '2026/2027', counts: { 'enrolment.total': 10, 'enrolment.female': 9, 'enrolment.male': 9 } })).status).toBe(422);
    expect((await post({ organisation: SCHOOL, period: '2026/2027', counts: { pupils: [{ name: 'A child' }] } })).status).toBe(422);
    scope = { id: 'a1', name: 'Auditor', label: 'Auditor', role: 'auditor', institution: EDU };
    expect((await post({ organisation: SCHOOL, period: '2027', counts: { 'enrolment.total': 1 } })).status).toBe(403);
    scope = { id: 'x1', name: 'Other', label: 'Other', role: 'signatory', institution: OTHER };
    expect((await post({ organisation: SCHOOL, period: '2027', counts: { 'enrolment.total': 1 } })).status).toBe(403);
  });

  it('refuses reads outside the education authority, needs a purpose from auditors, and logs every read and refusal', async () => {
    scope = { id: 'x1', name: 'Other', label: 'Other', role: 'signatory', institution: OTHER };
    expect((await get(`?organisation=${SCHOOL}`)).status).toBe(403);
    scope = { id: 'a1', name: 'Auditor', label: 'Auditor', role: 'auditor', institution: OTHER };
    expect((await get('?holder=BR-1')).status).toBe(403);
    expect((await get('?holder=BR-1&purpose=Annual%20audit')).status).toBe(200);
    scope = { id: 'o1', name: 'Officer', label: 'Officer', role: 'officer', institution: EDU };
    const r = await (await get(`?organisation=${SCHOOL}`)).json();
    expect(r).toMatchObject({ inspections: [], returns: [], awarded: 0 });
    const log = listAccess({}).filter(e => e.record.register === 'education');
    expect([...log].sort((a, b) => a.seq - b.seq).map(e => e.result)).toEqual(['refused', 'refused', 'allowed', 'allowed']);
    expect(JSON.stringify(log)).not.toMatch(/BR-1/);
  });
});

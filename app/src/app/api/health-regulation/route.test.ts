import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let scope: { id: string; name: string; label: string; role: string; institution?: string } | null = null;
vi.mock('@/lib/auth/official', () => ({ caseScope: async () => scope }));
vi.mock('@/lib/casework/actor', () => ({ routeActor: async () => ({ id: scope?.id ?? 'x', name: scope?.label ?? 'Official' }) }));

const { GET, POST } = await import('./route');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetHealth } = await import('@/lib/health/register');
const { resetOrganisations, createOrganisation, setStanding } = await import('@/lib/organisations/register');

let HR = '', OTHER = '', CLINIC = '';
const post = (b: unknown) => POST(new NextRequest('http://x/api/health-regulation', { method: 'POST', body: JSON.stringify(b) }));

describe('/api/health-regulation', () => {
  beforeEach(() => {
    resetHealth(); resetOrganisations();
    [HR, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { healthRegulation: HR } } }, 'Administrator');
    const o = createOrganisation({ name: 'Bay Hospital', kind: 'hospital' }, 'c', 'R') as { id: string; number: string };
    setStanding(o.id, { register: 'health-facilities', state: 'granted', reason: 'Licensed' }, 'R');
    CLINIC = o.number;
  });

  it('takes returns only from the health regulator, refuses anything that is not an aggregate count', async () => {
    scope = { id: 'o', name: 'O', label: 'Officer', role: 'officer', institution: HR };
    expect((await post({ organisation: CLINIC, period: '2026-09', counts: { 'beds.total': 120, 'staff.total': 300 } })).status).toBe(201);
    expect((await post({ organisation: CLINIC, period: '2026-09', counts: { patientNames: 'x' } })).status).toBe(422);
    scope = { id: 'x', name: 'X', label: 'Other', role: 'signatory', institution: OTHER };
    expect((await post({ organisation: CLINIC, period: '2026-10', counts: { 'beds.total': 1 } })).status).toBe(403);
    scope = { id: 'a', name: 'A', label: 'Auditor', role: 'auditor', institution: HR };
    expect((await post({ organisation: CLINIC, period: '2026-10', counts: { 'beds.total': 1 } })).status).toBe(403);
    const r = await (await GET(new NextRequest(`http://x/api/health-regulation?organisation=${CLINIC}`))).json();
    expect(r.returns[0].versions[0].counts).toEqual({ 'beds.total': 120, 'staff.total': 300 });
  });
});

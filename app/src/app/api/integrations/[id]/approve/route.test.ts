import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { registerIntegration } from '@/lib/data/store';

const call = (id: string, body: Record<string, unknown>) =>
  POST(new NextRequest(`http://x/api/integrations/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });

function client(): string {
  const r = registerIntegration({ kind: 'integration', name: `route-approve-${Date.now()}-${Math.random()}`, ownerOrg: 'Identity authority', contact: 'ops@example.gov', scopes: ['service:person.verify'] });
  if ('error' in r) throw new Error(r.error);
  return r.id;
}

describe('POST /api/integrations/<id>/approve', () => {
  it('proposes with purposes per service, refuses the proposer as confirmer, and a different official confirms', async () => {
    const id = client();
    const p = await call(id, { op: 'propose', purposes: { 'person.verify': ['enrolment'] }, by: 'Admin A' });
    expect(p.status).toBe(202);
    expect((await p.json()).integration).toMatchObject({ status: 'pending', pendingApproval: { by: 'Admin A', purposes: { 'person.verify': ['enrolment'] } } });
    const same = await call(id, { op: 'confirm', by: 'Admin A' });
    expect(same.status).toBe(422);
    expect((await same.json()).error).toMatch(/different official/);
    const ok = await call(id, { op: 'confirm', by: 'Admin B' });
    expect(ok.status).toBe(200);
    expect((await ok.json()).integration).toMatchObject({ status: 'approved', purposes: { 'person.verify': ['enrolment'] }, approval: { by: 'Admin A', confirmedBy: 'Admin B' } });
  });

  it('refuses purposes for a service the directory does not offer, and an unknown op', async () => {
    const id = client();
    expect((await call(id, { purposes: { 'nope.service': ['x'] }, by: 'Admin A' })).status).toBe(422);
    expect((await call(id, { op: 'approve-now', by: 'Admin A' })).status).toBe(422);
    expect((await call('IC-missing', { op: 'confirm', by: 'Admin B' })).status).toBe(404);
  });
});

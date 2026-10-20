import { describe, it, expect } from 'vitest';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { NextRequest } from 'next/server';
import { registerIntegration, renameMinistry, listMinistries, auditHead, subscribeWebhook } from '@/lib/data/store';
import { GET } from './route';

const get = (q = '', auth?: string) =>
  GET(new NextRequest(`http://x/api/platform/mirror${q}`, auth ? { headers: { authorization: `Bearer ${auth}` } } : {}));

function key(scopes: string[], approve = true): string {
  const r = registerIntegration({ kind: 'integration', name: `mirror-${Math.random()}`, ownerOrg: 'civic-api', contact: 'ops@example.gov', scopes });
  if ('error' in r) throw new Error(r.error);
  if (approve) approveIntegration(r.id);
  return r.apiKey;
}

describe('GET /api/platform/mirror (civic-api\'s follower, review D8)', () => {
  it('answers every register with the audit sequence it is current to, for a key of scope mirror:read', async () => {
    const k = key(['mirror:read']);
    const m = listMinistries()[0]!;
    renameMinistry(m.id, 'Renamed for the mirror');
    const res = await get('', k);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.auditSeq).toBe(auditHead()!.seq);
    expect(j.tenant).toMatchObject({ name: 'home', state: 'active' });
    expect(Object.keys(j.registers).sort()).toEqual(['backups', 'configs', 'deployments', 'grants', 'incidents', 'institutions', 'integrations', 'lifecycle', 'payments', 'permits', 'releases', 'webhooks']);
    expect(j.registers.institutions.find((x: { id: string }) => x.id === m.id).name).toBe('Renamed for the mirror');
    expect(j.registers.payments).toHaveProperty('bills');
  });

  it('never carries a key or a signing secret', async () => {
    const k = key(['mirror:read']);
    const hook = subscribeWebhook({ topic: '*', url: 'https://civic-api.example.gov/api/mirror/events' });
    const text = await (await get('?registers=integrations,webhooks', k)).text();
    expect(text).not.toContain(k);
    expect(text).not.toContain(hook.signingSecret);
    expect(text).not.toMatch(/keyPrefix|keyHash|secret/i);
  });

  it('narrows to the registers asked for, and refuses unknown ones', async () => {
    const k = key(['mirror:read']);
    const j = await (await get('?registers=permits,lifecycle', k)).json();
    expect(Object.keys(j.registers).sort()).toEqual(['lifecycle', 'permits']);
    expect((await get('?registers=permits,passwords', k)).status).toBe(400);
  });

  it('refuses a key without the scope, an unapproved key and an unknown key', async () => {
    expect((await get('', key(['ogc:read']))).status).toBe(403);
    expect((await get('', key(['mirror:read'], false))).status).toBe(403);
    const res = await get('', 'civ_00000000_nope');
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('scope="mirror:read"');
  });
});

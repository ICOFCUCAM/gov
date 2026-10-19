import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({ serverClient: () => serverClientMock(), publicClient: () => null }));
const official = vi.fn();
vi.mock('@/lib/auth/official', async () => {
  const { adminOnly } = await import('@/lib/auth/roles');
  return {
    withOfficial: async <T,>(b: T) => { const o = official(); return o ? { ...(b as object), by: o.name } as T : b; },
    refusal: async () => {
      const o = official();
      const why = o ? adminOnly(o) : null;
      return why ? Response.json({ error: why }, { status: 403 }) : null;
    },
  };
});

import { POST, DELETE } from './route';
import { apiPermission } from '@/lib/auth/roles';

const JWK = generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ format: 'jwk' });

beforeEach(() => { serverClientMock.mockReset(); official.mockReset(); });

describe('/api/audit/witnesses/keys', () => {
  it('is for administrators only in the permission rules; attestations verify their own signature', () => {
    expect(apiPermission({ role: 'auditor' }, 'POST', '/api/audit/witnesses/keys')).not.toBeNull();
    expect(apiPermission({ role: 'officer' }, 'POST', '/api/audit/witnesses/keys')).not.toBeNull();
    expect(apiPermission({ role: 'administrator' }, 'POST', '/api/audit/witnesses/keys')).toBeNull();
    // the attestation route itself needs no session: the registered key's signature is the credential
    expect(apiPermission({ role: 'auditor' }, 'POST', '/api/audit/witnesses')).toBeNull();
  });

  it('refuses an officer in the route as well', async () => {
    official.mockReturnValue({ name: 'O', role: 'officer' });
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ label: 'a', jwk: JWK }) }));
    expect(res.status).toBe(403);
  });

  it('registers the public half under the signed-in administrator', async () => {
    official.mockReturnValue({ name: 'Ada Admin', role: 'administrator' });
    const rpc = vi.fn(async () => ({ data: { id: 'k1' }, error: null }));
    serverClientMock.mockReturnValue({ rpc });
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ label: 'auditor-1', jwk: { ...JWK, ext: true }, by: 'typed name' }) }));
    expect(res.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('civicos_register_witness_key', {
      p_witness_label: 'auditor-1', p_public_jwk: { kty: 'EC', crv: 'P-256', x: JWK.x, y: JWK.y }, p_registered_by: 'Ada Admin',
    });
  });

  it('refuses a private key', async () => {
    official.mockReturnValue({ name: 'Ada Admin', role: 'administrator' });
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ label: 'a', jwk: { ...JWK, d: 'secret' } }) }));
    expect(res.status).toBe(400);
  });

  it('revokes a key', async () => {
    official.mockReturnValue({ name: 'Ada Admin', role: 'administrator' });
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    serverClientMock.mockReturnValue({ rpc });
    const id = '0f0e0d0c-0b0a-4908-8706-050403020100';
    const res = await DELETE(new Request(`http://x?id=${id}`, { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('civicos_revoke_witness_key', { p_id: id, p_revoked_by: 'Ada Admin' });
  });
});

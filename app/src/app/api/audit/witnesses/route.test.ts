import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { canonicalWitnessMaterial } from '@/lib/db/signatures';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({ serverClient: () => serverClientMock() }));

import { POST } from './route';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const JWK = publicKey.export({ format: 'jwk' });
const other = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const sig = (scope: string, seq: number, hash: string, label: string, key = privateKey) =>
  sign('sha256', Buffer.from(canonicalWitnessMaterial(scope, seq, hash, label)), { key, dsaEncoding: 'ieee-p1363' }).toString('hex');

function substrate(keys: { id: string; witness_label: string; public_jwk: unknown; revoked_at: string | null }[], rpcResult: { data: unknown; error: unknown } = {
  data: { id: 'w1', scope: 's', observed_seq: 3, observed_hash: 'h', witness_label: 'auditor-1', at: '2026-10-19T00:00:00Z', recorded_by: 'auditor-1' }, error: null,
}) {
  const rpc = vi.fn(async () => rpcResult);
  serverClientMock.mockReturnValue({
    from: () => ({ select: () => ({ eq: async () => ({ data: keys, error: null }) }) }),
    rpc,
  });
  return rpc;
}

const post = (body: unknown) => POST(new Request('http://x/api/audit/witnesses', { method: 'POST', body: JSON.stringify(body) }));
const good = () => ({ scope: 's', observedSeq: 3, observedHash: 'h', label: 'auditor-1', jwk: JWK, signature: sig('s', 3, 'h', 'auditor-1') });
const KEY = { id: 'k1', witness_label: 'auditor-1', public_jwk: JWK, revoked_at: null };

beforeEach(() => serverClientMock.mockReset());

describe('POST /api/audit/witnesses', () => {
  it('records a statement signed by the registered key of the label', async () => {
    const rpc = substrate([KEY]);
    const res = await post(good());
    expect(res.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('civicos_record_witness_attestation', expect.objectContaining({
      p_scope: 's', p_observed_seq: 3, p_observed_hash: 'h', p_witness_label: 'auditor-1', p_witness_jwk: JWK,
    }));
  });

  it('refuses an unsigned statement (the old anonymous path)', async () => {
    const rpc = substrate([KEY]);
    const res = await post({ ...good(), signature: null });
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a key that is not registered for the label', async () => {
    const rpc = substrate([]);
    const res = await post(good());
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a self-made key presented with the label of a registered witness', async () => {
    const rpc = substrate([KEY]);
    const forgedJwk = other.publicKey.export({ format: 'jwk' });
    const res = await post({ ...good(), jwk: forgedJwk, signature: sig('s', 3, 'h', 'auditor-1', other.privateKey) });
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a signature that does not cover the statement (hash swapped)', async () => {
    const rpc = substrate([KEY]);
    const res = await post({ ...good(), observedHash: 'ROGUE' });
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a revoked key', async () => {
    const rpc = substrate([{ ...KEY, revoked_at: '2026-10-01T00:00:00Z' }]);
    const res = await post(good());
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('answers 409 when the witness already attested that point (never replaced)', async () => {
    substrate([KEY], { data: null, error: { code: '23505', message: 'dup' } });
    const res = await post(good());
    expect(res.status).toBe(409);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import {
  recentWitnessRows, recordWitnessAttestationRow, witnessAgreementRow,
} from './audit';

beforeEach(() => {
  publicClientMock.mockReset();
});

// Build a chainable query stub that resolves to a fixed result on await.
function chainable(result: { data: unknown; error: unknown }): Record<string, unknown> {
  const self: Record<string, unknown> = {};
  for (const m of ['select','order','limit','eq','is','in','or','filter','range']) {
    self[m] = () => self;
  }
  self.then = (resolve: (r: typeof result) => void) => { resolve(result); return self; };
  return self;
}

describe('recentWitnessRows', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await recentWitnessRows()).toEqual([]);
  });

  it('maps view rows into the camelCase Witness shape', async () => {
    publicClientMock.mockReturnValue({
      from: () => chainable({
        data: [
          { id: 'w-1', scope: 'substrate:self', observed_seq: 4, observed_hash: 'deadbeef',
            witness_label: 'auditor-1', has_jwk: true, has_signature: true,
            at: '2026-05-20T00:00:00.000Z', recorded_by: 'auditor-1' },
        ],
        error: null,
      }),
    });
    const out = await recentWitnessRows();
    expect(out).toHaveLength(1);
    expect(out[0]!.observedSeq).toBe(4);
    expect(out[0]!.hasJwk).toBe(true);
    expect(out[0]!.at).toBeTypeOf('number');
  });
});

describe('recordWitnessAttestationRow', () => {
  it('returns null when substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    const out = await recordWitnessAttestationRow({
      scope: 'substrate:self', observedSeq: 1, observedHash: 'h', label: 'l',
    });
    expect(out).toBeNull();
  });

  it('passes parameters and maps the substrate row into a Witness', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        id: 'w-1', scope: 'substrate:self', observed_seq: 4, observed_hash: 'deadbeef',
        witness_label: 'auditor-1', witness_jwk: { kty: 'EC' }, witness_signature: '0011',
        at: '2026-05-20T00:00:00.000Z', recorded_by: 'auditor-1',
      },
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await recordWitnessAttestationRow({
      scope: 'substrate:self', observedSeq: 4, observedHash: 'deadbeef',
      label: 'auditor-1', jwk: { kty: 'EC' }, signature: '0011',
    });
    expect(rpc).toHaveBeenCalledWith('civicos_record_witness_attestation', expect.objectContaining({
      p_scope: 'substrate:self', p_observed_seq: 4, p_observed_hash: 'deadbeef',
      p_witness_label: 'auditor-1',
    }));
    expect(out?.hasJwk).toBe(true);
    expect(out?.hasSignature).toBe(true);
  });

  it('returns null on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'boom' } }),
    });
    const out = await recordWitnessAttestationRow({
      scope: 'x', observedSeq: 1, observedHash: 'y', label: 'z',
    });
    expect(out).toBeNull();
  });
});

describe('witnessAgreementRow', () => {
  it('returns null when substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await witnessAgreementRow('x')).toBeNull();
  });

  it('reports zero attestations with consistent=true when no witnesses exist', async () => {
    publicClientMock.mockReturnValue({
      from: () => chainable({ data: [], error: null }),
    });
    const out = await witnessAgreementRow('substrate:self');
    expect(out?.attestations).toBe(0);
    expect(out?.consistent).toBe(true);
  });

  it('reports consistent=true when the live hash matches the attestation', async () => {
    publicClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_witnesses') {
          return chainable({ data: [
            { id: 'w', scope: 'x', observed_seq: 5, observed_hash: 'abc',
              witness_label: 'l', has_jwk: false, has_signature: false,
              at: '2026-05-20T00:00:00.000Z', recorded_by: null }],
            error: null });
        }
        return chainable({ data: [{ seq: 5, hash: 'abc' }], error: null });
      },
    });
    const out = await witnessAgreementRow('x');
    expect(out?.consistent).toBe(true);
  });

  it('reports consistent=false when the live hash diverges from the attestation', async () => {
    publicClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_witnesses') {
          return chainable({ data: [
            { id: 'w', scope: 'x', observed_seq: 5, observed_hash: 'abc',
              witness_label: 'l', has_jwk: false, has_signature: false,
              at: '2026-05-20T00:00:00.000Z', recorded_by: null }],
            error: null });
        }
        return chainable({ data: [{ seq: 5, hash: 'ROGUE' }], error: null });
      },
    });
    const out = await witnessAgreementRow('x');
    expect(out?.consistent).toBe(false);
  });
});

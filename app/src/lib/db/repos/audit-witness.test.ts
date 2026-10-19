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
  it('refuses an unsigned statement without calling anything', async () => {
    const f = vi.fn();
    const out = await recordWitnessAttestationRow({
      scope: 'substrate:self', observedSeq: 1, observedHash: 'h', label: 'l',
    }, f as unknown as typeof fetch);
    expect(out).toHaveProperty('error');
    expect(f).not.toHaveBeenCalled();
    expect(publicClientMock).not.toHaveBeenCalled();
  });

  it('submits through the platform route, never the substrate RPC directly', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ witness: {
      id: 'w-1', scope: 'substrate:self', observedSeq: 4, observedHash: 'deadbeef', label: 'auditor-1',
      hasJwk: true, hasSignature: true, registeredKey: true, at: 1, recordedBy: 'auditor-1',
    } }), { status: 201 }));
    const out = await recordWitnessAttestationRow({
      scope: 'substrate:self', observedSeq: 4, observedHash: 'deadbeef',
      label: 'auditor-1', jwk: { kty: 'EC' }, signature: '0011',
    }, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('/api/audit/witnesses');
    expect(JSON.parse(String(init.body))).toMatchObject({ scope: 'substrate:self', observedSeq: 4, label: 'auditor-1', signature: '0011' });
    expect(publicClientMock).not.toHaveBeenCalled();
    expect(out).toMatchObject({ registeredKey: true, hasSignature: true });
  });

  it('passes on the platform\'s refusal', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: 'not registered' }), { status: 403 }));
    const out = await recordWitnessAttestationRow({
      scope: 'x', observedSeq: 1, observedHash: 'y', label: 'z', jwk: { kty: 'EC' }, signature: 'ab',
    }, f as unknown as typeof fetch);
    expect(out).toEqual({ error: 'not registered' });
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
              witness_label: 'l', has_jwk: true, has_signature: true, registered_key: true,
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
              witness_label: 'l', has_jwk: true, has_signature: true, registered_key: true,
              at: '2026-05-20T00:00:00.000Z', recorded_by: null }],
            error: null });
        }
        return chainable({ data: [{ seq: 5, hash: 'ROGUE' }], error: null });
      },
    });
    const out = await witnessAgreementRow('x');
    expect(out?.consistent).toBe(false);
  });

  it('ignores divergent attestations not recorded with a registered key', async () => {
    publicClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_witnesses') {
          return chainable({ data: [
            { id: 'w', scope: 'x', observed_seq: 5, observed_hash: 'abc',
              witness_label: 'l', has_jwk: false, has_signature: false, registered_key: false,
              at: '2026-05-20T00:00:00.000Z', recorded_by: null }],
            error: null });
        }
        return chainable({ data: [{ seq: 5, hash: 'ROGUE' }], error: null });
      },
    });
    const out = await witnessAgreementRow('x');
    expect(out?.consistent).toBe(true);
  });
});

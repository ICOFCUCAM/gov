import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { canonicalWitnessMaterial } from '@/lib/db/signatures';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
}));

import { GET } from './route';

function chainable(result: { data: unknown; error: unknown }): Record<string, unknown> {
  const self: Record<string, unknown> = {};
  for (const m of ['select','order','limit','eq','is','in','or']) {
    self[m] = () => self;
  }
  self.then = (resolve: (r: typeof result) => void) => { resolve(result); return self; };
  return self;
}

// A witness's ECDSA P-256 device key, as the browser makes it (raw r||s signatures).
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const JWK = publicKey.export({ format: 'jwk' });
const signed = (scope: string, seq: number, hash: string, label: string): string =>
  sign('sha256', Buffer.from(canonicalWitnessMaterial(scope, seq, hash, label)), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('hex');

interface Att { observed_hash: string; witness_label: string; witness_signature: string | null; public_jwk: unknown; key_revoked_at: string | null; at: string }
const att = (hash: string, label: string, over: Partial<Att> = {}): Att => ({
  observed_hash: hash, witness_label: label, witness_signature: signed('X', 7, hash, label),
  public_jwk: JWK, key_revoked_at: null, at: '2026-10-01T00:00:00Z', ...over,
});

/** A substrate whose live chain for scope X is at seq 7 with `liveHash`, with these signed attestations. */
function substrate(atts: Att[], opts: { liveHash?: string; openEscalation?: boolean } = {}) {
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const views: string[] = [];
  serverClientMock.mockReturnValue({
    from: (view: string) => {
      views.push(view);
      if (view === 'civicos_signed_witnesses') {
        let phase: 'scopes' | 'attestations' = 'scopes';
        const self: Record<string, unknown> = {
          select: () => self,
          limit: () => Promise.resolve({ data: [{ scope: 'X' }], error: null }),
          eq: (col: string) => { if (col === 'observed_seq') phase = 'attestations'; return self; },
          order: () => self,
          then: (resolve: (r: { data: unknown; error: unknown }) => void) => {
            resolve({ data: phase === 'scopes' ? [{ scope: 'X' }] : atts, error: null });
            return self;
          },
        };
        return self;
      }
      if (view === 'civicos_audit_entries') return chainable({ data: [{ seq: 7, hash: opts.liveHash ?? 'truth' }], error: null });
      if (view === 'civicos_escalations') return chainable({ data: opts.openEscalation ? [{ id: 'e-existing' }] : [], error: null });
      return chainable({ data: [], error: null });
    },
    rpc,
  });
  return { rpc, views };
}

beforeEach(() => {
  serverClientMock.mockReset();
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('GET /api/cron/witness-divergence', () => {
  it('returns 401 without the secret', async () => {
    const res = await GET(new Request('http://x?token=x'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(503);
  });

  it('returns ok:true and no alarms when every signed witness agrees with the live chain', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const { rpc, views } = substrate([att('truth', 'auditor-1')]);
    const json = await (await GET(new Request('http://x?token=correct'))).json();
    expect(json.ok).toBe(true);
    expect(json.alarmed).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
    // only signed rows are read, never the unsigned public view
    expect(views).not.toContain('civicos_audit_witnesses');
  });

  it('records an escalation + federation event for a divergent attestation whose signature verifies', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const { rpc } = substrate([att('ROGUE', 'auditor-1')]);
    const json = await (await GET(new Request('http://x?token=correct'))).json();
    expect(json.alarmed).toBe(1);
    expect(json.ok).toBe(false);
    expect(rpc).toHaveBeenCalledWith('civicos_record_escalation', expect.objectContaining({
      p_severity: 'major',
      p_reason: 'witness-divergence:X@7',
      p_triggered_by_actor: 'witness-divergence-watch',
    }));
    expect(rpc).toHaveBeenCalledWith('civicos_publish_event', expect.objectContaining({
      p_type: 'audit.divergence',
      p_channel: 'constitutional',
    }));
  });

  it('raises no alarm for a divergent row whose signature does not verify (forged), and counts it', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    // signed over the true hash, then the hash swapped: the signature no longer matches
    const forged = att('ROGUE', 'auditor-1', { witness_signature: signed('X', 7, 'truth', 'auditor-1') });
    const noSig = att('ROGUE', 'auditor-2', { witness_signature: null });
    const junk = att('ROGUE', 'auditor-3', { witness_signature: 'ab'.repeat(64) });
    const { rpc } = substrate([forged, noSig, junk]);
    const json = await (await GET(new Request('http://x?token=correct'))).json();
    expect(json.alarmed).toBe(0);
    expect(json.results[0].unverified).toBe(3);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not trust a row recorded after its key was revoked', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const { rpc } = substrate([att('ROGUE', 'auditor-1', { key_revoked_at: '2026-09-01T00:00:00Z', at: '2026-10-01T00:00:00Z' })]);
    const json = await (await GET(new Request('http://x?token=correct'))).json();
    expect(json.alarmed).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not record a second escalation when one is already open for the same reason', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const { rpc } = substrate([att('ROGUE', 'a')], { openEscalation: true });
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
}));

import { GET } from './route';

beforeEach(() => {
  serverClientMock.mockReset();
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('GET /api/cron/witness-sweep', () => {
  it('returns 401 without the secret', async () => {
    const res = await GET(new Request('http://x/api/cron/witness-sweep?token=x'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x/api/cron/witness-sweep?token=correct'));
    expect(res.status).toBe(503);
  });

  it('attests every visible scope and reports the count', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_entries') {
          return {
            select: () => {
              const order = (_col: string, _opts: unknown) => ({
                limit: () => Promise.resolve({
                  data: [{ scope: 'MIN-A' }, { scope: 'MIN-B' }, { scope: 'MIN-A' }],
                  error: null,
                }),
              });
              const eq = (_col: string, _val: string) => ({
                order: () => ({
                  limit: () => Promise.resolve({
                    data: [{ seq: 4, hash: 'h' }],
                    error: null,
                  }),
                }),
              });
              return { order, eq };
            },
          };
        }
        return {};
      },
      rpc: rpcMock,
    });
    const res = await GET(new Request('http://x/api/cron/witness-sweep?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.scopes_swept).toBe(2);
    expect(json.attested).toBe(2);
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenCalledWith('civicos_record_witness_attestation',
      expect.objectContaining({
        p_witness_label: 'substrate-self-witness',
        p_observed_seq: 4,
      }));
  });

  it('marks empty scopes as not-attested without an RPC call', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_entries') {
          return {
            select: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [{ scope: 'EMPTY' }], error: null }),
              }),
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      },
      rpc: rpcMock,
    });
    const res = await GET(new Request('http://x/api/cron/witness-sweep?token=correct'));
    const json = await res.json();
    expect(json.attested).toBe(0);
    expect(json.results[0].latestSeq).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('honours the scopes query-param cap', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({
              data: Array.from({ length: 20 }, (_, i) => ({ scope: `MIN-${i}` })),
              error: null,
            }),
          }),
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [{ seq: 1, hash: 'h' }], error: null }),
            }),
          }),
        }),
      }),
      rpc: async () => ({ data: null, error: null }),
    });
    const res = await GET(new Request('http://x/api/cron/witness-sweep?token=correct&scopes=5'));
    const json = await res.json();
    expect(json.scopes_swept).toBe(5);
  });
});

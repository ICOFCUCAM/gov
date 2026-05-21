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

describe('GET /api/cron/audit-self', () => {
  it('returns 401 when CIVICOS_CRON_SECRET is unset', async () => {
    const res = await GET(new Request('http://x/api/cron/audit-self?token=anything'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x/api/cron/audit-self?token=correct'));
    expect(res.status).toBe(503);
  });

  it('appends an audit entry and returns the seq', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpcMock = vi.fn(async () => ({ data: { seq: 42 }, error: null }));
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ count: 7, error: null }),
          // For totalAudit which has no .eq
          ...({ then: undefined } as Record<string, unknown>),
        }),
      }),
      rpc: rpcMock,
    });
    // The implementation chains differently on the two views; provide a richer mock.
    serverClientMock.mockReturnValue({
      from: (view: string) => ({
        select: () => view === 'civicos_work_items'
          ? { eq: () => Promise.resolve({ count: 7, error: null }) }
          : Promise.resolve({ count: 123, error: null }),
      }),
      rpc: rpcMock,
    });
    const res = await GET(new Request('http://x/api/cron/audit-self?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.seq).toBe(42);
    expect(json.open_work_items).toBe(7);
    expect(json.audit_entries).toBe(123);
    expect(rpcMock).toHaveBeenCalledWith('civicos_append_audit', expect.objectContaining({
      p_scope: 'substrate:self', p_actor: 'audit-self-cron', p_action: 'heartbeat',
    }));
  });

  it('returns 500 with the error message when the RPC fails', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: (view: string) => ({
        select: () => view === 'civicos_work_items'
          ? { eq: () => Promise.resolve({ count: 0, error: null }) }
          : Promise.resolve({ count: 0, error: null }),
      }),
      rpc: async () => ({ data: null, error: { message: 'boom' } }),
    });
    const res = await GET(new Request('http://x/api/cron/audit-self?token=correct'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('boom');
  });
});

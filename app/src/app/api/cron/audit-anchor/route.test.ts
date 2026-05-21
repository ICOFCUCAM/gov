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

describe('GET /api/cron/audit-anchor', () => {
  it('returns 401 without the secret', async () => {
    const res = await GET(new Request('http://x?token=x'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(503);
  });

  it('returns 500 when the scopes query errors', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => ({ limit: () => Promise.resolve({ data: null, error: { message: 'denied' } }) }),
        }),
      }),
      rpc: vi.fn(),
    });
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(500);
  });

  it('broadcasts an audit.anchor event for every scope with a head entry', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_entries') {
          return {
            select: () => {
              const order = () => ({
                limit: () => Promise.resolve({
                  data: [{ scope: 'A' }, { scope: 'B' }, { scope: 'A' }],
                  error: null,
                }),
              });
              const eq = () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [{ seq: 5, hash: 'h' }], error: null }),
                }),
              });
              return { order, eq };
            },
          };
        }
        return {};
      },
      rpc,
    });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.scopes_swept).toBe(2);
    expect(json.scopes_anchored).toBe(2);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith('civicos_publish_event', expect.objectContaining({
      p_type: 'audit.anchor', p_channel: 'constitutional', p_source: 'substrate',
    }));
  });

  it('marks scopes with no head entry as not anchored, without an RPC call', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn();
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_entries') {
          return {
            select: () => ({
              order: () => ({ limit: () => Promise.resolve({ data: [{ scope: 'EMPTY' }], error: null }) }),
              eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
            }),
          };
        }
        return {};
      },
      rpc,
    });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.scopes_anchored).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('honours the scopes query-param cap', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => ({ limit: () => Promise.resolve({
            data: Array.from({ length: 50 }, (_, i) => ({ scope: `S-${i}` })),
            error: null,
          }) }),
          eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [{ seq: 1, hash: 'h' }], error: null }) }) }),
        }),
      }),
      rpc: async () => ({ data: null, error: null }),
    });
    const res = await GET(new Request('http://x?token=correct&scopes=10'));
    const json = await res.json();
    expect(json.scopes_swept).toBe(10);
  });
});

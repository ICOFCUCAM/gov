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

function clientFor({
  charters, openByCharter, urgentByCharter, escByCharter, rpcMock,
}: {
  charters: string[];
  openByCharter: Record<string, number>;
  urgentByCharter: Record<string, number>;
  escByCharter: Record<string, number>;
  rpcMock: ReturnType<typeof vi.fn>;
}) {
  return {
    from: (view: string) => {
      if (view === 'civicos_institutions') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: charters.map(c => ({ charter_id: c })), error: null }),
            }),
          }),
        };
      }
      if (view === 'civicos_work_items') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              // first .eq returns another query with .eq, .in chainable
              return {
                eq: () => ({
                  in: () => Promise.resolve({ count: urgentByCharter[val] ?? 0, error: null }),
                  // The "open" variant doesn't call .in — it just chains .eq twice and returns.
                  // The above is wrong — let's branch differently.
                  then: undefined,
                  // The supabase chain: select().eq(...).eq('closed', false) → returns promise
                  // We need to make this work as both a thenable and an in-able.
                }),
              };
            },
          }),
        };
      }
      if (view === 'civicos_escalations') {
        return {
          select: () => ({
            or: () => ({
              is: () => Promise.resolve({ count: escByCharter[charters[0] ?? ''] ?? 0, error: null }),
            }),
          }),
        };
      }
      return { select: () => Promise.resolve({ count: 0, error: null }) };
    },
    rpc: rpcMock,
  };
}

describe('GET /api/cron/posture-digest', () => {
  it('returns 401 without the secret', async () => {
    const res = await GET(new Request('http://x/api/cron/posture-digest?token=x'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x/api/cron/posture-digest?token=correct'));
    expect(res.status).toBe(503);
  });

  it('returns 500 when the institutions list errors', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ limit: () => Promise.resolve({ data: null, error: { message: 'denied' } }) }),
        }),
      }),
      rpc: vi.fn(),
    });
    const res = await GET(new Request('http://x/api/cron/posture-digest?token=correct'));
    expect(res.status).toBe(500);
  });

  it('records one snapshot per activated institution', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    // Two charters, each path returns counts via a stub that responds to whatever
    // chain shape arrives.
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_institutions') {
          return { select: () => ({ eq: () => ({ limit: () => Promise.resolve({
            data: [{ charter_id: 'MIN-A' }, { charter_id: 'MIN-B' }], error: null,
          }) }) }) };
        }
        if (view === 'civicos_work_items') {
          // The open-count chain: .eq(...).eq('closed', false) → thenable count.
          // The urgent-count chain: .eq(...).eq('closed', false).in(...) → thenable count.
          const second = {
            then: (resolve: (r: { count: number; error: null }) => void) =>
              resolve({ count: 1, error: null }),
            in: () => Promise.resolve({ count: 0, error: null }),
          };
          return { select: () => ({ eq: () => ({ eq: () => second }) }) };
        }
        // escalations
        return { select: () => ({ or: () => ({ is: () => Promise.resolve({ count: 0, error: null }) }) }) };
      },
      rpc: rpcMock,
    });
    const res = await GET(new Request('http://x/api/cron/posture-digest?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.snapshots).toHaveLength(2);
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenCalledWith('civicos_record_posture', expect.objectContaining({
      p_charter_id: expect.any(String),
      p_posture: expect.any(String),
    }));
  });
});

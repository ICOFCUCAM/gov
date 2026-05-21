import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
}));

import { GET } from './route';

function viewBuilder(count: number) {
  return {
    select: () => ({
      // head/count selector
      head: true,
      then: undefined,
    }),
  };
}

beforeEach(() => {
  serverClientMock.mockReset();
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('GET /api/substrate/digest', () => {
  it('returns 401 when CIVICOS_CRON_SECRET is unset', async () => {
    const res = await GET(new Request('http://x/api/substrate/digest'));
    expect(res.status).toBe(401);
  });

  it('returns 401 with the wrong token', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const res = await GET(new Request('http://x/api/substrate/digest?token=wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x/api/substrate/digest?token=correct'));
    expect(res.status).toBe(503);
  });

  it('emits per-view counts and totals on a happy path (without verify)', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => Promise.resolve({ count: 5, error: null }),
      }),
    });
    const res = await GET(new Request('http://x/api/substrate/digest?token=correct'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Object.keys(json.counts).length).toBeGreaterThan(10);
    expect(json.totals.tables_visible).toBeGreaterThan(0);
    expect(json.totals.total_rows).toBe(5 * Object.keys(json.counts).length);
    expect(json.chains).toBeNull();
  });

  it('includes a chain verification block when verify=1', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_entries') {
          return {
            select: () => ({
              order: () => ({
                limit: () => Promise.resolve({
                  data: [{ scope: 'institution:MIN-A' }, { scope: 'institution:MIN-B' }, { scope: 'institution:MIN-A' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => Promise.resolve({ count: 1, error: null }) };
      },
      rpc: async (_fn: string, args: { p_scope: string }) => ({
        data: [{ entries: 4, intact: args.p_scope === 'institution:MIN-A' }],
        error: null,
      }),
    });
    const res = await GET(new Request('http://x/api/substrate/digest?token=correct&verify=1'));
    const json = await res.json();
    expect(json.chains.scopes_checked).toBe(2);
    expect(json.chains.results).toHaveLength(2);
    expect(json.chains.all_intact).toBe(false);
  });

  it('marks broken views as -1 in counts', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => Promise.resolve({ count: null, error: { message: 'oops' } }),
      }),
    });
    const res = await GET(new Request('http://x/api/substrate/digest?token=correct'));
    const json = await res.json();
    for (const v of Object.values(json.counts)) {
      expect(v).toBe(-1);
    }
  });
});

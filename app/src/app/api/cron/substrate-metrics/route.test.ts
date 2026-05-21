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

describe('GET /api/cron/substrate-metrics', () => {
  it('returns 401 without the secret', async () => {
    const res = await GET(new Request('http://x/api/cron/substrate-metrics?token=x'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x/api/cron/substrate-metrics?token=correct'));
    expect(res.status).toBe(503);
  });

  it('defines and samples every documented metric', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      rpc: rpcMock,
      from: () => {
        // Build a chain that supports .eq(), .is(), and thenable resolution.
        const builder: Record<string, unknown> = {
          eq: () => builder,
          is: () => builder,
          then: (resolve: (r: { count: number; error: null }) => void) =>
            resolve({ count: 4, error: null }),
        };
        return {
          select: () => builder,
        };
      },
    });
    const res = await GET(new Request('http://x/api/cron/substrate-metrics?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.samples.length).toBe(6);
    expect(json.samples.every((s: { defined: boolean; sampled: boolean }) => s.defined && s.sampled)).toBe(true);

    // 6 define + 6 sample RPC calls.
    expect(rpcMock).toHaveBeenCalledTimes(12);
    const calls = rpcMock.mock.calls.map(c => c[0]);
    expect(calls.filter(c => c === 'civicos_define_telemetry_stream')).toHaveLength(6);
    expect(calls.filter(c => c === 'civicos_record_telemetry_sample')).toHaveLength(6);
  });

  it('marks a metric as not-sampled when the head-count fails', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: null }),
      from: () => {
        const builder: Record<string, unknown> = {
          eq: () => builder,
          is: () => builder,
          then: (resolve: (r: { count: null; error: { message: string } }) => void) =>
            resolve({ count: null, error: { message: 'denied' } }),
        };
        return { select: () => builder };
      },
    });
    const res = await GET(new Request('http://x/api/cron/substrate-metrics?token=correct'));
    const json = await res.json();
    expect(json.samples.every((s: { value: number; sampled: boolean }) => s.value === -1 && !s.sampled)).toBe(true);
  });
});

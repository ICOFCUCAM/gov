import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
}));

import { POST } from './route';

beforeEach(() => {
  serverClientMock.mockReset();
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('POST /api/cron/telemetry-stale', () => {
  it('returns 401 when CIVICOS_CRON_SECRET is unset', async () => {
    const res = await POST(new Request('http://x/api/cron/telemetry-stale?token=anything'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token does not match', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const res = await POST(new Request('http://x/api/cron/telemetry-stale?token=wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await POST(new Request('http://x/api/cron/telemetry-stale?token=correct'));
    expect(res.status).toBe(503);
  });

  it('escalates stale streams and reports the count', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async (fn: string) => fn === 'civicos_escalate_stale_telemetry_streams'
      ? { data: 2, error: null } : { data: null, error: null });
    serverClientMock.mockReturnValue({ rpc });
    const res = await POST(new Request('http://x/api/cron/telemetry-stale', {
      headers: { authorization: 'Bearer correct' },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.escalated).toBe(2);
    expect(rpc).toHaveBeenCalledWith('civicos_escalate_stale_telemetry_streams', { p_stale_minutes: 120 });
  });

  it('parses the minutes query parameter with a positive floor', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: 0, error: null }));
    serverClientMock.mockReturnValue({ rpc });
    await POST(new Request('http://x/api/cron/telemetry-stale?token=correct&minutes=30'));
    expect(rpc).toHaveBeenCalledWith('civicos_escalate_stale_telemetry_streams', { p_stale_minutes: 30 });
  });

  it('propagates RPC errors as 500', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'boom' } }),
    });
    const res = await POST(new Request('http://x/api/cron/telemetry-stale?token=correct'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('boom');
  });
});

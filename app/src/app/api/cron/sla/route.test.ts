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

describe('POST /api/cron/sla', () => {
  it('returns 401 when CIVICOS_CRON_SECRET is unset', async () => {
    const res = await POST(new Request('http://x/api/cron/sla?token=anything'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token does not match', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const res = await POST(new Request('http://x/api/cron/sla?token=wrong'));
    expect(res.status).toBe(401);
  });

  it('accepts the secret via the Authorization Bearer header', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpcMock = vi.fn(async () => ({ data: 3, error: null }));
    serverClientMock.mockReturnValue({ rpc: rpcMock });
    const res = await POST(new Request('http://x/api/cron/sla', {
      headers: { authorization: 'Bearer correct' },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.escalated).toBe(3);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await POST(new Request('http://x/api/cron/sla?token=correct'));
    expect(res.status).toBe(503);
  });

  it('propagates RPC errors as 500', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'boom' } }),
    });
    const res = await POST(new Request('http://x/api/cron/sla?token=correct'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('boom');
  });

  it('parses the hours query parameter with a positive floor', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpcMock = vi.fn(async () => ({ data: 0, error: null }));
    serverClientMock.mockReturnValue({ rpc: rpcMock });
    await POST(new Request('http://x/api/cron/sla?token=correct&hours=24'));
    expect(rpcMock).toHaveBeenCalledWith('civicos_escalate_stale_service_requests',
      { p_threshold_hours: 24 });
  });

  it('defaults the hours window to 48 when omitted', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpcMock = vi.fn(async () => ({ data: 0, error: null }));
    serverClientMock.mockReturnValue({ rpc: rpcMock });
    await POST(new Request('http://x/api/cron/sla?token=correct'));
    expect(rpcMock).toHaveBeenCalledWith('civicos_escalate_stale_service_requests',
      { p_threshold_hours: 48 });
  });
});

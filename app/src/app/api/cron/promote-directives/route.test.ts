import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({ serverClient: () => serverClientMock() }));

import { POST } from './route';

beforeEach(() => {
  serverClientMock.mockReset();
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('POST /api/cron/promote-directives', () => {
  it('returns 401 when CIVICOS_CRON_SECRET is unset', async () => {
    const res = await POST(new Request('http://x/api/cron/promote-directives?token=anything'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token does not match', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const res = await POST(new Request('http://x/api/cron/promote-directives?token=wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await POST(new Request('http://x/api/cron/promote-directives?token=correct'));
    expect(res.status).toBe(503);
  });

  it('promotes due directives and reports the count', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async (fn: string) => fn === 'civicos_promote_due_directives'
      ? { data: 2, error: null } : { data: null, error: null });
    serverClientMock.mockReturnValue({ rpc });
    const res = await POST(new Request('http://x/api/cron/promote-directives', {
      headers: { authorization: 'Bearer correct' },
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).promoted).toBe(2);
    expect(rpc).toHaveBeenCalledWith('civicos_promote_due_directives');
  });

  it('propagates RPC errors as 500', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    const res = await POST(new Request('http://x/api/cron/promote-directives?token=correct'));
    expect(res.status).toBe(500);
  });
});

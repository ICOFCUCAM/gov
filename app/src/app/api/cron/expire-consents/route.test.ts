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

describe('GET /api/cron/expire-consents', () => {
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

  it('reports zero expirations and still emits a telemetry sample', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async (fn: string) => {
      if (fn === 'civicos_expire_due_consents') return { data: [], error: null };
      return { data: null, error: null };
    });
    serverClientMock.mockReturnValue({ rpc });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.expired_count).toBe(0);
    // expire + stream define + sample
    expect(rpc).toHaveBeenCalledWith('civicos_expire_due_consents');
    expect(rpc).toHaveBeenCalledWith('civicos_define_telemetry_stream', expect.objectContaining({
      p_stream_id: 'substrate.consents.expired',
    }));
    expect(rpc).toHaveBeenCalledWith('civicos_record_telemetry_sample', expect.objectContaining({
      p_stream_id: 'substrate.consents.expired', p_value: 0,
    }));
  });

  it('counts and returns the expired rows on a real run', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async (fn: string) => {
      if (fn === 'civicos_expire_due_consents') return {
        data: [
          { consent_id: 'c-1', citizen_id: 'ci-1', target_charter_id: 'MIN-A', expired_at: '2026-05-20T00:00:00Z' },
          { consent_id: 'c-2', citizen_id: 'ci-2', target_charter_id: 'MIN-B', expired_at: '2026-05-20T00:00:00Z' },
        ],
        error: null,
      };
      return { data: null, error: null };
    });
    serverClientMock.mockReturnValue({ rpc });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.expired_count).toBe(2);
    expect(json.rows).toHaveLength(2);
    expect(rpc).toHaveBeenCalledWith('civicos_record_telemetry_sample', expect.objectContaining({ p_value: 2 }));
  });

  it('returns 500 with the substrate error message on RPC failure', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'boom' } }),
    });
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('boom');
  });
});

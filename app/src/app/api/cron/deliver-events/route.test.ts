import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({ serverClient: () => serverClientMock() }));

import { GET } from './route';

const fetchMock = vi.fn();

beforeEach(() => {
  serverClientMock.mockReset();
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  delete process.env.CIVICOS_CRON_SECRET;
});

/** Build a serverClient stub with given webhooks + per-channel events. */
function client(opts: {
  webhooks: { id: string; channel: string; url: string; secret: string; cursor_at_ms: number }[];
  events: Record<string, { id: string; at_ms: number; type?: string; payload?: unknown }[]>;
  rpc?: ReturnType<typeof vi.fn>;
}) {
  const rpc = opts.rpc ?? vi.fn(async () => ({ data: null, error: null }));
  return {
    rpc,
    schema: () => ({
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: opts.webhooks, error: null }) }),
      }),
    }),
    from: (_view: string) => ({
      select: () => ({
        eq: (_c: string, channel: string) => ({
          gt: () => ({
            order: () => ({
              limit: () => Promise.resolve({
                data: (opts.events[channel] ?? []).map(e => ({
                  id: e.id, type: e.type ?? 'audit.anchor', source: 'substrate',
                  target: null, channel, payload: e.payload ?? {}, at: '2026-05-21T00:00:00Z', at_ms: e.at_ms,
                })),
                error: null,
              }),
            }),
          }),
        }),
      }),
    }),
    _rpc: rpc,
  };
}

describe('GET /api/cron/deliver-events', () => {
  it('401 without the secret', async () => {
    const res = await GET(new Request('http://x?token=x'));
    expect(res.status).toBe(401);
  });

  it('503 when substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(503);
  });

  it('delivers events, signs them with HMAC-SHA256, and advances the cursor', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue(client({
      webhooks: [{ id: 'w1', channel: 'constitutional', url: 'https://hook.test', secret: 'topsecret', cursor_at_ms: 0 }],
      events: { constitutional: [{ id: 'e1', at_ms: 100 }, { id: 'e2', at_ms: 200 }] },
      rpc,
    }));
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.total_delivered).toBe(2);
    expect(json.ok).toBe(true);

    // Both events POSTed with a sha256 signature header.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[0]!;
    const body = init.body as string;
    const expected = 'sha256=' + createHmac('sha256', 'topsecret').update(body).digest('hex');
    expect(init.headers['x-civicos-signature']).toBe(expected);

    // Cursor advanced to the last event's at_ms.
    expect(rpc).toHaveBeenCalledWith('civicos_mark_webhook_delivered', expect.objectContaining({
      p_id: 'w1', p_last_event_id: 'e2', p_cursor_at_ms: 200, p_delivered: 2,
    }));
  });

  it('stops at the first failure, advances only past delivered events, records the failure', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue(client({
      webhooks: [{ id: 'w1', channel: 'constitutional', url: 'https://hook.test', secret: 'topsecret', cursor_at_ms: 0 }],
      events: { constitutional: [{ id: 'e1', at_ms: 100 }, { id: 'e2', at_ms: 200 }, { id: 'e3', at_ms: 300 }] },
      rpc,
    }));
    // first OK, second fails (500)
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.total_delivered).toBe(1);
    expect(json.ok).toBe(false);
    // third event never attempted
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // cursor advanced only to e1
    expect(rpc).toHaveBeenCalledWith('civicos_mark_webhook_delivered', expect.objectContaining({
      p_last_event_id: 'e1', p_cursor_at_ms: 100, p_delivered: 1,
    }));
    expect(rpc).toHaveBeenCalledWith('civicos_record_webhook_failure', expect.objectContaining({ p_id: 'w1' }));
  });

  it('does not advance the cursor when the very first event fails', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue(client({
      webhooks: [{ id: 'w1', channel: 'constitutional', url: 'https://hook.test', secret: 's3cret!!', cursor_at_ms: 50 }],
      events: { constitutional: [{ id: 'e1', at_ms: 100 }] },
      rpc,
    }));
    fetchMock.mockResolvedValue({ ok: false, status: 502 });

    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.total_delivered).toBe(0);
    const markCalls = rpc.mock.calls.filter((c: unknown[]) => c[0] === 'civicos_mark_webhook_delivered');
    expect(markCalls).toHaveLength(0);
    expect(rpc).toHaveBeenCalledWith('civicos_record_webhook_failure', expect.objectContaining({ p_id: 'w1' }));
  });

  it('treats a fetch exception (timeout) as a failure', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue(client({
      webhooks: [{ id: 'w1', channel: 'constitutional', url: 'https://hook.test', secret: 's3cret!!', cursor_at_ms: 0 }],
      events: { constitutional: [{ id: 'e1', at_ms: 100 }] },
      rpc,
    }));
    fetchMock.mockRejectedValue(new Error('aborted'));

    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.total_delivered).toBe(0);
  });

  it('reports an empty run when there are no active webhooks', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(client({ webhooks: [], events: {} }));
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.webhooks_processed).toBe(0);
    expect(json.total_delivered).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

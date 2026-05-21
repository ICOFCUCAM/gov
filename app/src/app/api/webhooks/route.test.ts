import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
const subscribeMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listWebhooks: () => listMock(),
  subscribeWebhook: (input: unknown) => subscribeMock(input),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listMock.mockReset();
  subscribeMock.mockReset();
});

describe('GET /api/webhooks', () => {
  it('returns the webhook subscription list', async () => {
    listMock.mockReturnValue([{ id: 'w-1' }]);
    const res = GET();
    const json = await res.json();
    expect(json.webhooks).toHaveLength(1);
  });
});

describe('POST /api/webhooks', () => {
  it('rejects invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing topic/url', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ topic: 'X' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('subscribes and returns 201', async () => {
    subscribeMock.mockReturnValue({ id: 'w-new', secret: 's' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ topic: 'permit.decided', url: 'https://example.com/hook' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
    expect(subscribeMock).toHaveBeenCalledWith({ topic: 'permit.decided', url: 'https://example.com/hook' });
  });
});

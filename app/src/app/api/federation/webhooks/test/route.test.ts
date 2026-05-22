import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
const tokenScopedClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
  tokenScopedClient: (t: string) => tokenScopedClientMock(t),
}));

import { POST } from './route';

const JWT = 'aaa.bbb.ccc';

// A chainable stub for sb.schema(...).from(...).select(...).eq(...).maybeSingle()
function webhookQuery(result: { data: unknown; error: unknown }) {
  const chain = {
    schema: () => chain,
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => result,
  };
  return chain;
}

beforeEach(() => {
  serverClientMock.mockReset();
  tokenScopedClientMock.mockReset();
  tokenScopedClientMock.mockReturnValue(null);
  delete process.env.CIVICOS_CRON_SECRET;
  vi.restoreAllMocks();
});

function platformSession() {
  tokenScopedClientMock.mockReturnValue({
    rpc: async () => ({ data: { kind: 'officer', role: 'platform-admin' }, error: null }),
  });
}

describe('POST /api/federation/webhooks/test', () => {
  it('returns 401 without any credential', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await POST(new Request('http://x?token=correct', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'w1' }),
    }));
    expect(res.status).toBe(503);
  });

  it('returns 400 when id is missing', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(webhookQuery({ data: null, error: null }));
    const res = await POST(new Request('http://x?token=correct', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wrong: 1 }),
    }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the webhook does not exist', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(webhookQuery({ data: null, error: null }));
    const res = await POST(new Request('http://x?token=correct', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'missing' }),
    }));
    expect(res.status).toBe(404);
  });

  it('sends a signed ping and reports a 2xx as ok', async () => {
    platformSession();
    serverClientMock.mockReturnValue(webhookQuery({
      data: { id: 'w1', channel: 'metric', url: 'https://hook.test/x', secret: 'sssssssss', active: true },
      error: null,
    }));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.status).toBe(200);
    // the ping carried an HMAC signature header
    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['x-civicos-signature']).toMatch(/^sha256=/);
    expect(headers['x-civicos-ping']).toBe('true');
  });

  it('reports a non-2xx response as not ok without throwing', async () => {
    platformSession();
    serverClientMock.mockReturnValue(webhookQuery({
      data: { id: 'w1', channel: 'metric', url: 'https://hook.test/x', secret: 'sssssssss', active: true },
      error: null,
    }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(false);
    expect(json.status).toBe(500);
  });

  it('reports a fetch failure as ok:false', async () => {
    platformSession();
    serverClientMock.mockReturnValue(webhookQuery({
      data: { id: 'w1', channel: 'metric', url: 'https://hook.test/x', secret: 'sssssssss', active: true },
      error: null,
    }));
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.detail).toContain('ECONNREFUSED');
  });

  it('rejects a non-platform officer session with 401', async () => {
    tokenScopedClientMock.mockReturnValue({
      rpc: async () => ({ data: { kind: 'officer', role: 'field-officer' }, error: null }),
    });
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    expect(res.status).toBe(401);
  });
});

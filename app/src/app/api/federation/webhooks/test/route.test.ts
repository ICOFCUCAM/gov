import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
const tokenScopedClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
  tokenScopedClient: (t: string) => tokenScopedClientMock(t),
}));

// The real safe fetch, with the network replaced: `netFetch` answers, `resolveMock` is DNS.
const netFetch = vi.fn();
const resolveMock = vi.fn(async (_host: string) => ['93.184.216.34']);
vi.mock('@/lib/net/safe-fetch', async (orig) => {
  const real = await orig<typeof import('@/lib/net/safe-fetch')>();
  return {
    ...real,
    safeFetchText: (url: string, o: import('@/lib/net/safe-fetch').SafeFetchOptions) =>
      real.safeFetchText(url, { ...o, fetch: netFetch as unknown as typeof fetch, resolve: resolveMock }),
  };
});

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
  delete process.env.CIVICOS_PROVISIONING_SECRET;
  delete process.env.CIVICOS_WEBHOOKS_PRIVATE;
  vi.restoreAllMocks();
  netFetch.mockReset();
  resolveMock.mockReset();
  resolveMock.mockImplementation(async () => ['93.184.216.34']);
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
    process.env.CIVICOS_PROVISIONING_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await POST(new Request('http://x', {
      method: 'POST', headers: { authorization: 'Bearer correct', 'content-type': 'application/json' }, body: JSON.stringify({ id: 'w1' }),
    }));
    expect(res.status).toBe(503);
  });

  it('returns 400 when id is missing', async () => {
    process.env.CIVICOS_PROVISIONING_SECRET = 'correct';
    serverClientMock.mockReturnValue(webhookQuery({ data: null, error: null }));
    const res = await POST(new Request('http://x', {
      method: 'POST', headers: { authorization: 'Bearer correct', 'content-type': 'application/json' }, body: JSON.stringify({ wrong: 1 }),
    }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the webhook does not exist', async () => {
    process.env.CIVICOS_PROVISIONING_SECRET = 'correct';
    serverClientMock.mockReturnValue(webhookQuery({ data: null, error: null }));
    const res = await POST(new Request('http://x', {
      method: 'POST', headers: { authorization: 'Bearer correct', 'content-type': 'application/json' }, body: JSON.stringify({ id: 'missing' }),
    }));
    expect(res.status).toBe(404);
  });

  it('sends a signed ping and reports a 2xx as ok', async () => {
    platformSession();
    serverClientMock.mockReturnValue(webhookQuery({
      data: { id: 'w1', channel: 'metric', url: 'https://hook.test/x', secret: 'sssssssss', active: true },
      error: null,
    }));
    netFetch.mockResolvedValue(new Response('ok', { status: 200 }));
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // the ping carried an HMAC signature header
    const [, init] = netFetch.mock.calls[0]!;
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
    netFetch.mockResolvedValue(new Response('nope', { status: 500 }));
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(false);
    // coarse: neither the remote status nor its text is reported
    expect(json.status).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain('500');
  });

  it('reports a fetch failure as ok:false', async () => {
    platformSession();
    serverClientMock.mockReturnValue(webhookQuery({
      data: { id: 'w1', channel: 'metric', url: 'https://hook.test/x', secret: 'sssssssss', active: true },
      error: null,
    }));
    netFetch.mockRejectedValue(new Error('connect ECONNREFUSED 10.1.2.3:4000'));
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    // the error text is not an oracle for the caller
    expect(json.detail).not.toContain('ECONNREFUSED');
    expect(json.detail).not.toContain('10.1.2.3');
  });

  it.each([
    ['cloud metadata', 'http://169.254.169.254/latest/meta-data/', ['169.254.169.254']],
    ['an internal service name', 'http://civicos-api:4000/x', ['10.0.0.12']],
    ['loopback', 'http://127.0.0.1:5432/', ['127.0.0.1']],
  ])('refuses %s without connecting, and answers the same as any failure', async (_n, url, addrs) => {
    platformSession();
    resolveMock.mockImplementation(async () => addrs);
    serverClientMock.mockReturnValue(webhookQuery({
      data: { id: 'w1', channel: 'metric', url, secret: 'sssssssss', active: true }, error: null,
    }));
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(netFetch).not.toHaveBeenCalled();
    expect(Object.keys(json).sort()).toEqual(['at', 'detail', 'ok']);
  });

  it('does not follow a redirect', async () => {
    platformSession();
    serverClientMock.mockReturnValue(webhookQuery({
      data: { id: 'w1', channel: 'metric', url: 'https://hook.test/x', secret: 'sssssssss', active: true }, error: null,
    }));
    netFetch.mockResolvedValue(new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } }));
    const json = await (await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }))).json();
    expect(json.ok).toBe(false);
    expect(netFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects an auditor (platform tier, read only) with 401', async () => {
    tokenScopedClientMock.mockReturnValue({
      rpc: async () => ({ data: { kind: 'officer', role: 'auditor' }, error: null }),
    });
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
      body: JSON.stringify({ id: 'w1' }),
    }));
    expect(res.status).toBe(401);
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

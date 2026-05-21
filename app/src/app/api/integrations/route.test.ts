import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
const registerMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listIntegrations: () => listMock(),
  registerIntegration: (input: unknown) => registerMock(input),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listMock.mockReset();
  registerMock.mockReset();
});

const valid = { name: 'svc', ownerOrg: 'Org', contact: 'a@b', scopes: ['read'] };

describe('GET /api/integrations', () => {
  it('lists current integrations', async () => {
    listMock.mockReturnValue([{ id: 'i-1' }]);
    const res = GET();
    const json = await res.json();
    expect(json.integrations).toHaveLength(1);
  });
});

describe('POST /api/integrations', () => {
  it('rejects invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ name: 'x' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('rejects empty scopes array', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ ...valid, scopes: [] }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('defaults kind to "integration" unless explicitly "extension"', async () => {
    registerMock.mockReturnValue({ id: 'i-new' });
    await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify(valid),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ kind: 'integration' }));
  });

  it('passes through kind="extension" when supplied', async () => {
    registerMock.mockReturnValue({ id: 'i-new' });
    await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ ...valid, kind: 'extension' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ kind: 'extension' }));
  });

  it('returns 409 when the store reports a duplicate', async () => {
    registerMock.mockReturnValue({ error: 'duplicate' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify(valid),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(409);
  });

  it('returns 201 with the new record on success', async () => {
    registerMock.mockReturnValue({ id: 'i-new', token: 'tok' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify(valid),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
  });
});

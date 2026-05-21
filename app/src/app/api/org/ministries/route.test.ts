import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
const createMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listMinistries: () => listMock(),
  createMinistry: (input: unknown) => createMock(input),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listMock.mockReset();
  createMock.mockReset();
});

describe('GET /api/org/ministries', () => {
  it('returns the ministries list', async () => {
    listMock.mockReturnValue([{ id: 'min-a' }]);
    const res = GET();
    const json = await res.json();
    expect(json.ministries).toHaveLength(1);
  });
});

describe('POST /api/org/ministries', () => {
  it('rejects invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ archetype: 'GENERIC' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('returns 422 when the store reports a conflict', async () => {
    createMock.mockReturnValue({ error: 'slug taken' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ archetype: 'GENERIC', name: 'X', slug: 'x' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('returns 201 with the new ministry on success', async () => {
    createMock.mockReturnValue({ id: 'min-new', slug: 'x' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ archetype: 'GENERIC', name: 'X', slug: 'x' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({ archetype: 'GENERIC', name: 'X', slug: 'x' });
  });
});

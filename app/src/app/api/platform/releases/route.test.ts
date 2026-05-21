import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
const createMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listReleases: () => listMock(),
  createRelease: (input: unknown) => createMock(input),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listMock.mockReset();
  createMock.mockReset();
});

describe('GET /api/platform/releases', () => {
  it('returns the release history', async () => {
    listMock.mockReturnValue([{ id: 'r-1', version: 'v1.0' }]);
    const res = GET();
    const json = await res.json();
    expect(json.releases).toHaveLength(1);
  });
});

describe('POST /api/platform/releases', () => {
  it('rejects invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ version: 'v1' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('returns 422 on store conflict', async () => {
    createMock.mockReturnValue({ error: 'version exists' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ version: 'v1', notes: 'first' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('returns 201 with the new release on success', async () => {
    createMock.mockReturnValue({ id: 'r-new' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ version: 'v1', notes: 'first' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
  });
});

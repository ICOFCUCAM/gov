import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
const startMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listDeployments: () => listMock(),
  startDeployment: (id: string, strategy: string) => startMock(id, strategy),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listMock.mockReset();
  startMock.mockReset();
});

describe('GET /api/platform/deployments', () => {
  it('returns the deployments list', async () => {
    listMock.mockReturnValue([{ id: 'd-1' }]);
    const res = GET();
    const json = await res.json();
    expect(json.deployments).toHaveLength(1);
  });
});

describe('POST /api/platform/deployments', () => {
  it('rejects invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ releaseId: 'r-1' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('returns 404 when the release is not found', async () => {
    startMock.mockReturnValue({ error: 'release not found' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ releaseId: 'r-x', strategy: 'canary' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(404);
  });

  it('starts the deployment and returns 201', async () => {
    startMock.mockReturnValue({ id: 'd-new', strategy: 'canary' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ releaseId: 'r-1', strategy: 'canary' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
    expect(startMock).toHaveBeenCalledWith('r-1', 'canary');
  });
});

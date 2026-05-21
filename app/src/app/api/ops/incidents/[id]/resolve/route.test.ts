import { describe, it, expect, vi, beforeEach } from 'vitest';

const resolveMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  resolveIncident: (id: string, by: string, note?: string) => resolveMock(id, by, note),
}));

import { POST } from './route';

beforeEach(() => resolveMock.mockReset());

describe('POST /api/ops/incidents/[id]/resolve', () => {
  it('returns 404 when the incident is not found', async () => {
    resolveMock.mockReturnValue({ error: 'not found' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ by: 'NOC' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params: { id: 'i-1' } });
    expect(res.status).toBe(404);
  });

  it('returns 200 with the resolved incident', async () => {
    resolveMock.mockReturnValue({ id: 'i-1', status: 'resolved' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ by: 'NOC', note: 'restored' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params: { id: 'i-1' } });
    expect(res.status).toBe(200);
    expect(resolveMock).toHaveBeenCalledWith('i-1', 'NOC', 'restored');
  });

  it('defaults operator to "operator"', async () => {
    resolveMock.mockReturnValue({ id: 'i-1' });
    await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    }) as never, { params: { id: 'i-1' } });
    expect(resolveMock).toHaveBeenCalledWith('i-1', 'operator', undefined);
  });
});

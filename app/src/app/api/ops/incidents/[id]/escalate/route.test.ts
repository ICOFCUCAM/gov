import { describe, it, expect, vi, beforeEach } from 'vitest';

const escalateMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  escalateIncident: (id: string, by: string, note?: string) => escalateMock(id, by, note),
}));

import { POST } from './route';

beforeEach(() => escalateMock.mockReset());

describe('POST /api/ops/incidents/[id]/escalate', () => {
  it('returns 404 when the incident is not found', async () => {
    escalateMock.mockReturnValue({ error: 'not found' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ by: 'NOC' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params: { id: 'i-1' } });
    expect(res.status).toBe(404);
  });

  it('escalates with the supplied operator and note', async () => {
    escalateMock.mockReturnValue({ id: 'i-1', severity: 'sev1' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ by: 'NOC', note: 'cascading' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params: { id: 'i-1' } });
    expect(res.status).toBe(200);
    expect(escalateMock).toHaveBeenCalledWith('i-1', 'NOC', 'cascading');
  });

  it('tolerates invalid JSON', async () => {
    escalateMock.mockReturnValue({ id: 'i-1' });
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never,
      { params: { id: 'i-1' } });
    expect(res.status).toBe(200);
    expect(escalateMock).toHaveBeenCalledWith('i-1', 'operator', undefined);
  });
});

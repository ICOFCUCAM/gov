import { describe, it, expect, vi, beforeEach } from 'vitest';

const decideMock = vi.fn();
const permitMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  decidePermit: (id: string, input: unknown) => decideMock(id, input),
  getPermit: (id: string) => permitMock(id),
  authorityFor: () => undefined,
  permitHolders: () => [],
}));

import { POST } from './route';

const params = Promise.resolve({ id: 'p-1' });

beforeEach(() => {
  decideMock.mockReset();
  permitMock.mockReset();
  vi.unstubAllEnvs();
});

describe('POST /api/permits/[id]/decide', () => {
  it('rejects invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never, { params });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown decision verb', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ decision: 'shrug', officerName: 'Amina' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/approve, decline/);
  });

  it('rejects a missing officerName (named accountability)', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ decision: 'approve' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/officerName/);
  });

  it('returns 404 when the permit is not found', async () => {
    decideMock.mockReturnValue({ error: 'Permit not found' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ decision: 'approve', officerName: 'Amina' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params });
    expect(res.status).toBe(404);
  });

  it('returns 409 when the decision conflicts', async () => {
    decideMock.mockReturnValue({ error: 'Permit already decided' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ decision: 'approve', officerName: 'Amina' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params });
    expect(res.status).toBe(409);
  });

  it('returns the updated permit on success', async () => {
    decideMock.mockReturnValue({ id: 'p-1', status: 'approved' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ decision: 'approve', officerName: 'Amina' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.permit.status).toBe('approved');
    expect(decideMock).toHaveBeenCalledWith('p-1', expect.objectContaining({
      decision: 'approve', officerName: 'Amina',
    }));
  });

  it('refuses an approval in production while no authority mapping is approved for the permit type', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    permitMock.mockReturnValue({ id: 'p-1', type: 'building', status: 'in-review' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ decision: 'approve', officerName: 'Amina' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/No approved authority mapping governs building-permit/);
    expect(decideMock).not.toHaveBeenCalled();
  });
});

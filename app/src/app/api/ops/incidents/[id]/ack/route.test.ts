import { describe, it, expect, vi, beforeEach } from 'vitest';

const ackMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  ackIncident: (id: string, by: string, note?: string) => ackMock(id, by, note),
}));

import { POST } from './route';

beforeEach(() => ackMock.mockReset());

describe('POST /api/ops/incidents/[id]/ack', () => {
  it('returns 404 when the incident is not found', async () => {
    ackMock.mockReturnValue({ error: 'not found' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ by: 'NOC' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params: { id: 'i-1' } });
    expect(res.status).toBe(404);
  });

  it('acks the incident with the supplied operator', async () => {
    ackMock.mockReturnValue({ id: 'i-1', status: 'acked' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ by: 'NOC', note: 'eyes on' }),
      headers: { 'content-type': 'application/json' },
    }) as never, { params: { id: 'i-1' } });
    expect(res.status).toBe(200);
    expect(ackMock).toHaveBeenCalledWith('i-1', 'NOC', 'eyes on');
  });

  it('defaults the operator to "operator" when omitted', async () => {
    ackMock.mockReturnValue({ id: 'i-1' });
    await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    }) as never, { params: { id: 'i-1' } });
    expect(ackMock).toHaveBeenCalledWith('i-1', 'operator', undefined);
  });

  it('tolerates invalid JSON bodies', async () => {
    ackMock.mockReturnValue({ id: 'i-1' });
    const res = await POST(new Request('http://x', { method: 'POST', body: 'not json' }) as never,
      { params: { id: 'i-1' } });
    expect(res.status).toBe(200);
    expect(ackMock).toHaveBeenCalledWith('i-1', 'operator', undefined);
  });
});

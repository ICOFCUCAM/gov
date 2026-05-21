import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
const createMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listIncidents: () => listMock(),
  createIncident: (input: unknown) => createMock(input),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listMock.mockReset();
  createMock.mockReset();
});

describe('GET /api/ops/incidents', () => {
  it('returns the current incident list', async () => {
    listMock.mockReturnValue([{ id: 'i-1' }]);
    const res = GET();
    const json = await res.json();
    expect(json.incidents).toHaveLength(1);
  });
});

describe('POST /api/ops/incidents', () => {
  it('rejects invalid JSON with 400', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing title/scope with 422', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ severity: 'sev1' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('creates the incident and defaults unknown severity to sev3', async () => {
    createMock.mockReturnValue({ id: 'i-new' });
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ title: 'Outage', scope: 'energy', severity: 'unknown' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Outage', scope: 'energy', severity: 'sev3', by: 'operator',
    }));
  });

  it('honours an explicit valid severity and operator name', async () => {
    createMock.mockReturnValue({ id: 'i-new' });
    await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ title: 'Outage', scope: 'energy', severity: 'sev1', by: 'NOC' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'sev1', by: 'NOC',
    }));
  });
});

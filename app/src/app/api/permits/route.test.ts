import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
const createMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listPermits: () => listMock(),
  createPermit: (input: unknown) => createMock(input),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listMock.mockReset();
  createMock.mockReset();
});

describe('GET /api/permits', () => {
  it('returns the current permit list', async () => {
    listMock.mockReturnValue([{ id: 'p-1' }, { id: 'p-2' }]);
    const res = GET();
    const json = await res.json();
    expect(json.permits).toHaveLength(2);
  });
});

describe('POST /api/permits', () => {
  it('rejects invalid JSON with 400', async () => {
    const res = await POST(new Request('http://x/api/permits', {
      method: 'POST', body: 'not json',
    }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields with 422', async () => {
    const res = await POST(new Request('http://x/api/permits', {
      method: 'POST', body: JSON.stringify({ type: 'building' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it('creates the permit and returns 201 with the new record', async () => {
    createMock.mockReturnValue({ id: 'p-new', type: 'building' });
    const res = await POST(new Request('http://x/api/permits', {
      method: 'POST',
      body: JSON.stringify({
        type: 'building', title: 'House', applicantName: 'Amina', municipality: 'Capital',
      }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.permit.id).toBe('p-new');
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'building', title: 'House', applicantName: 'Amina',
    }));
  });

  it('defaults fields to an empty object when omitted', async () => {
    createMock.mockReturnValue({ id: 'p-new' });
    await POST(new Request('http://x/api/permits', {
      method: 'POST',
      body: JSON.stringify({
        type: 'event', title: 'Festival', applicantName: 'Org', municipality: 'Coastal',
      }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ fields: {} }));
  });
});

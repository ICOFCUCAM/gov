import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const pageMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listAuditPage: (q: unknown) => pageMock(q),
}));

import { GET } from './route';

beforeEach(() => pageMock.mockReset());

describe('GET /api/audit', () => {
  it('returns one page of the audit event list', async () => {
    pageMock.mockReturnValue({ events: [{ id: 'e-1', action: 'sign' }], total: 1 });
    const res = GET(new NextRequest('http://localhost/api/audit'));
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.events[0].action).toBe('sign');
    expect(pageMock).toHaveBeenCalledWith({ before: undefined, limit: undefined });
  });

  it('passes the cursor and page size on', async () => {
    pageMock.mockReturnValue({ events: [], total: 0 });
    const json = await GET(new NextRequest('http://localhost/api/audit?before=120&limit=50')).json();
    expect(json.events).toEqual([]);
    expect(pageMock).toHaveBeenCalledWith({ before: 120, limit: 50 });
  });
});

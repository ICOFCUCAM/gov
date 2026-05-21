import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listAudit: () => listMock(),
}));

import { GET } from './route';

beforeEach(() => listMock.mockReset());

describe('GET /api/audit', () => {
  it('returns the audit event list', async () => {
    listMock.mockReturnValue([{ id: 'e-1', action: 'sign' }]);
    const res = GET();
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.events[0].action).toBe('sign');
  });

  it('returns an empty list when the store is empty', async () => {
    listMock.mockReturnValue([]);
    const res = GET();
    const json = await res.json();
    expect(json.events).toEqual([]);
  });
});

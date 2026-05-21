import { describe, it, expect, vi, beforeEach } from 'vitest';

const mock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  cabinetOverview: () => mock(),
}));

import { GET } from './route';

beforeEach(() => mock.mockReset());

describe('GET /api/cabinet', () => {
  it('returns the cabinet overview', async () => {
    mock.mockReturnValue({ overall: { stress: 42 }, ministries: [] });
    const res = GET();
    const json = await res.json();
    expect(json.overall.stress).toBe(42);
  });
});

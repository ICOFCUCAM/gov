import { describe, it, expect, vi, beforeEach } from 'vitest';

const mock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  opsOverview: () => mock(),
}));

import { GET } from './route';

beforeEach(() => mock.mockReset());

describe('GET /api/ops/overview', () => {
  it('returns the ops overview snapshot', async () => {
    mock.mockReturnValue({ posture: 'steady', incidents: [] });
    const res = GET();
    const json = await res.json();
    expect(json.posture).toBe('steady');
  });
});

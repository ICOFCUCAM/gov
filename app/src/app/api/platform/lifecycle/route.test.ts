import { describe, it, expect, vi, beforeEach } from 'vitest';

const mock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  getLifecycle: () => mock(),
}));

import { GET } from './route';

beforeEach(() => mock.mockReset());

describe('GET /api/platform/lifecycle', () => {
  it('returns the lifecycle snapshot', async () => {
    mock.mockReturnValue({ state: 'active' });
    const res = GET();
    const json = await res.json();
    expect(json.lifecycle.state).toBe('active');
  });
});

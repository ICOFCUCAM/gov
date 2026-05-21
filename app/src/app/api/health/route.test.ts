import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
}));

import { GET } from './route';

beforeEach(() => {
  publicClientMock.mockReset();
});

describe('GET /api/health', () => {
  it('returns ok:false and not-configured when substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    const res = await GET();
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.substrate.configured).toBe(false);
    expect(json.substrate.reachable).toBe(false);
    expect(json.substrate.latency_ms).toBeNull();
  });

  it('returns ok:true when the substrate responds without error', async () => {
    const fromMock = vi.fn(() => ({
      select: () => ({
        limit: () => Promise.resolve({ error: null }),
      }),
    }));
    publicClientMock.mockReturnValue({ from: fromMock });
    const res = await GET();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.substrate.configured).toBe(true);
    expect(json.substrate.reachable).toBe(true);
    expect(typeof json.substrate.latency_ms).toBe('number');
  });

  it('returns ok:false when the substrate query errors', async () => {
    const fromMock = vi.fn(() => ({
      select: () => ({
        limit: () => Promise.resolve({ error: { message: 'denied' } }),
      }),
    }));
    publicClientMock.mockReturnValue({ from: fromMock });
    const res = await GET();
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.substrate.configured).toBe(true);
    expect(json.substrate.reachable).toBe(false);
  });

  it('returns ok:false when the substrate call throws', async () => {
    const fromMock = vi.fn(() => ({
      select: () => ({
        limit: () => Promise.reject(new Error('network')),
      }),
    }));
    publicClientMock.mockReturnValue({ from: fromMock });
    const res = await GET();
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.substrate.reachable).toBe(false);
  });

  it('emits an ISO timestamp', async () => {
    publicClientMock.mockReturnValue(null);
    const res = await GET();
    const json = await res.json();
    expect(json.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
